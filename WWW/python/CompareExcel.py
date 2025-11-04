import sys
import os

# Change working directory to file location
os.chdir(os.path.dirname(os.path.abspath(__file__)))

import pandas as pd
import mysql.connector
from mysql.connector import Error
import re

def normalize_phone(phone):
    """
    Normalize phone number EXACTLY as SP does:
    1. Trim and convert to string
    2. Remove .0 suffix (Excel float format)
    3. Remove all non-numeric characters
    4. Handle different formats (0098, 98, 0, or 10 digits)
    5. Validate: must be 10 digits starting with 9
    """
    if pd.isna(phone):
        return None
    
    # Convert to string and trim
    phone_str = str(phone).strip()
    
    # Handle empty string
    if phone_str == '' or phone_str.lower() == 'nan':
        return None
    
    # Remove .0 suffix (Excel format: "9133003933.0" -> "9133003933")
    if phone_str.endswith('.0'):
        phone_str = phone_str[:-2]
    
    # Remove all non-numeric characters
    phone_clean = re.sub(r'[^\d]', '', phone_str)
    
    if not phone_clean:
        return None
    
    # Handle different formats (matching SP logic exactly)
    phone_normalized = None
    
    # Format 1: Starts with 0098 (country code) -> Remove 0098
    if phone_clean.startswith('0098') and len(phone_clean) == 14:
        phone_normalized = phone_clean[4:]
    # Format 2: Starts with 98 (country code without 00) -> Remove 98
    elif phone_clean.startswith('98') and len(phone_clean) == 12:
        phone_normalized = phone_clean[2:]
    # Format 3: Starts with 0 (local format) -> Remove leading 0
    elif phone_clean.startswith('0') and len(phone_clean) == 11:
        phone_normalized = phone_clean[1:]
    # Format 4: Already 10 digits
    elif len(phone_clean) == 10:
        phone_normalized = phone_clean
    else:
        # Invalid format
        return None
    
    # Validate: must be exactly 10 digits and start with 9
    if phone_normalized and len(phone_normalized) == 10 and phone_normalized[0] == '9':
        return phone_normalized
    
    return None

def connect_to_database():
    """Connect to MySQL database"""
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='salamatiancrm',
            user='webuser',
            password='bfrgV#%svNB871@42#jhgvds!'
        )
        
        if connection.is_connected():
            print("✓ Connected to database successfully")
            return connection
    except Error as e:
        print(f"✗ Database connection error: {e}")
        return None

def get_existing_phones(connection):
    """Get all existing phone numbers from database"""
    try:
        cursor = connection.cursor()
        query = "SELECT DISTINCT Phone FROM customer_customer WHERE Phone IS NOT NULL AND Phone != ''"
        cursor.execute(query)
        
        phones = set()
        for (phone,) in cursor:
            if phone:  # Extra safety check
                phones.add(phone.strip())
        
        cursor.close()
        print(f"✓ Retrieved {len(phones)} unique phone numbers from database")
        return phones
    except Error as e:
        print(f"✗ Data retrieval error: {e}")
        return set()

def analyze_excel_file(excel_path, db_phones):
    """Analyze Excel file and compare with database"""
    try:
        # Read Excel file
        df = pd.read_excel(excel_path)
        
        print(f"\n✓ Excel file read successfully")
        print(f"  Total rows: {len(df)}")
        print(f"  Available columns: {list(df.columns)}")
        
        # Try to find phone column (check common names)
        phone_column = None
        possible_names = ['phn', 'phone', 'شماره', 'تلفن', 'شماره تماس']
        
        for col in df.columns:
            if any(name in str(col).lower() for name in possible_names):
                phone_column = col
                break
        
        # If not found, use second column (index 1)
        if phone_column is None:
            if len(df.columns) > 1:
                phone_column = df.columns[1]
                print(f"\n⚠ Using column index 1 (second column): '{phone_column}'")
            else:
                print(f"\n✗ Error: Cannot find phone column!")
                return None
        else:
            print(f"\n✓ Phone column detected: '{phone_column}'")
        
        # Show transformation samples
        print(f"\n📱 Phone number transformation samples:")
        print(f"{'Original':<25} → {'Normalized':<15} {'Status'}")
        print("-" * 60)
        
        sample_count = 0
        for idx, phone in enumerate(df[phone_column]):
            if sample_count >= 15:  # Show first 15 samples
                break
            if pd.isna(phone):
                continue
                
            original = str(phone).strip()
            normalized = normalize_phone(phone)
            status = "✓ Valid" if normalized else "✗ Invalid"
            print(f"{original:<25} → {normalized if normalized else 'N/A':<15} {status}")
            sample_count += 1
        
        # Process all phones
        excel_data = []
        invalid_phones = []
        
        for idx, phone in enumerate(df[phone_column], start=2):  # Start from row 2 (Excel row number)
            original = str(phone).strip() if not pd.isna(phone) else ''
            normalized = normalize_phone(phone)
            
            if normalized:
                excel_data.append({
                    'row': idx,
                    'original': original,
                    'normalized': normalized
                })
            elif original and original.lower() != 'nan':
                invalid_phones.append({
                    'row': idx,
                    'original': original,
                    'reason': 'Invalid format or validation failed'
                })
        
        # Remove duplicates within Excel
        unique_phones = {}
        duplicates_in_excel = []
        
        for item in excel_data:
            phone = item['normalized']
            if phone in unique_phones:
                duplicates_in_excel.append(item)
            else:
                unique_phones[phone] = item
        
        # Compare with database
        new_phones = []
        duplicate_phones = []
        
        for phone, item in unique_phones.items():
            if phone in db_phones:
                duplicate_phones.append(item)
            else:
                new_phones.append(item)
        
        # Display results
        print("\n" + "="*70)
        print("📊 ANALYSIS RESULTS")
        print("="*70)
        print(f"Total rows in Excel:                    {len(df)}")
        print(f"Total phone numbers processed:          {len(excel_data)}")
        print(f"Invalid phone numbers (skipped):        {len(invalid_phones)}")
        print(f"Duplicates within Excel:                {len(duplicates_in_excel)}")
        print("-"*70)
        print(f"✓ Unique valid phones in Excel:         {len(unique_phones)}")
        print(f"  ├─ New (will be inserted):            {len(new_phones)}")
        print(f"  └─ Duplicate (already in database):   {len(duplicate_phones)}")
        print("="*70)
        
        # Calculate expected outcome
        print("\n📈 EXPECTED SP EXECUTION OUTCOME:")
        print(f"  • Records that will be inserted:      {len(new_phones)}")
        print(f"  • Records that will be updated:       {len(duplicate_phones)}")
        print(f"  • Records that will be skipped:       {len(invalid_phones) + len(duplicates_in_excel)}")
        
        # Save detailed results
        results = []
        
        # Add new phones
        for item in new_phones:
            results.append({
                'Excel_Row': item['row'],
                'Original_Phone': item['original'],
                'Normalized_Phone': item['normalized'],
                'Status': 'NEW - Will Insert',
                'In_Database': 'No'
            })
        
        # Add duplicates
        for item in duplicate_phones:
            results.append({
                'Excel_Row': item['row'],
                'Original_Phone': item['original'],
                'Normalized_Phone': item['normalized'],
                'Status': 'DUPLICATE - Will Update',
                'In_Database': 'Yes'
            })
        
        # Add invalid phones
        for item in invalid_phones:
            results.append({
                'Excel_Row': item['row'],
                'Original_Phone': item['original'],
                'Normalized_Phone': 'N/A',
                'Status': 'INVALID - Will Skip',
                'In_Database': 'N/A'
            })
        
        # Add Excel duplicates
        for item in duplicates_in_excel:
            results.append({
                'Excel_Row': item['row'],
                'Original_Phone': item['original'],
                'Normalized_Phone': item['normalized'],
                'Status': 'DUPLICATE_IN_EXCEL - Will Skip (first occurrence will be used)',
                'In_Database': 'Maybe'
            })
        
        # Sort by row number
        results.sort(key=lambda x: x['Excel_Row'])
        
        results_df = pd.DataFrame(results)
        output_file = 'phone_analysis_results.xlsx'
        results_df.to_excel(output_file, index=False)
        print(f"\n✓ Detailed results saved to '{output_file}'")
        
        # Show samples
        if new_phones:
            print(f"\n📝 Sample NEW phone numbers (first 10):")
            for item in new_phones[:10]:
                print(f"  Row {item['row']}: {item['original']} → {item['normalized']}")
        
        if duplicate_phones:
            print(f"\n📝 Sample DUPLICATE phone numbers (first 10):")
            for item in duplicate_phones[:10]:
                print(f"  Row {item['row']}: {item['original']} → {item['normalized']} (already exists)")
        
        if invalid_phones:
            print(f"\n⚠ Sample INVALID phone numbers (first 10):")
            for item in invalid_phones[:10]:
                print(f"  Row {item['row']}: {item['original']} (will be skipped)")
        
        return {
            'total_rows': len(df),
            'processed': len(excel_data),
            'invalid': len(invalid_phones),
            'unique_valid': len(unique_phones),
            'new': len(new_phones),
            'duplicate_in_db': len(duplicate_phones),
            'duplicate_in_excel': len(duplicates_in_excel)
        }
        
    except FileNotFoundError:
        print(f"✗ Error: File '{excel_path}' not found!")
        print(f"   Make sure 'Excel.xlsx' is in the same directory as this script.")
        return None
    except Exception as e:
        print(f"✗ Excel file processing error: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    """Main program function"""
    print("="*70)
    print("Excel Phone Number Analysis Tool")
    print("Matches SP logic: sp_lead_storerawdata")
    print("="*70)
    
    # Connect to database
    connection = connect_to_database()
    if not connection:
        print("\n⚠ Cannot proceed without database connection.")
        return
    
    try:
        # Get existing phone numbers from database
        db_phones = get_existing_phones(connection)
        
        # Analyze Excel file
        excel_path = 'Excel.xlsx'
        results = analyze_excel_file(excel_path, db_phones)
        
        if results:
            print("\n" + "="*70)
            print("✓ Analysis completed successfully!")
            print("="*70)
        
    finally:
        if connection.is_connected():
            connection.close()
            print("\n✓ Database connection closed")

if __name__ == "__main__":
    main()
    input("\nPress Enter to exit...")