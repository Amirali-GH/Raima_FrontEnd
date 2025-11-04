import sys
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

import pandas as pd
import mysql.connector
from mysql.connector import Error
import re

def normalize_phone_python(phone):
    """Python normalization - same as our comparison script"""
    if pd.isna(phone):
        return None
    phone_str = str(phone).strip()
    phone_clean = re.sub(r'[^\d+]', '', phone_str)
    return phone_clean if phone_clean else None

def normalize_phone_sp(phone):
    """SP normalization logic - mimics the stored procedure"""
    if pd.isna(phone) or str(phone).strip() == '':
        return None
    phone_str = str(phone).strip()
    # SP logic: remove leading '0'
    if phone_str.startswith('0'):
        phone_str = phone_str[1:]
    return phone_str.strip()

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

def check_raw_data(connection, file_upload_id=None):
    """Check raw data table"""
    try:
        cursor = connection.cursor(dictionary=True)
        
        if file_upload_id:
            query = "SELECT COUNT(*) as count FROM lead_resultcontactcustomer_raw WHERE FileUploadID = %s"
            cursor.execute(query, (file_upload_id,))
        else:
            query = "SELECT COUNT(*) as count FROM lead_resultcontactcustomer_raw"
            cursor.execute(query)
        
        result = cursor.fetchone()
        count = result['count']
        
        print(f"\n{'='*60}")
        print(f"📊 Raw Data Table Check:")
        print(f"{'='*60}")
        print(f"Total records in raw table: {count}")
        
        if count > 0:
            # Get sample data
            if file_upload_id:
                query = "SELECT * FROM lead_resultcontactcustomer_raw WHERE FileUploadID = %s LIMIT 5"
                cursor.execute(query, (file_upload_id,))
            else:
                query = "SELECT * FROM lead_resultcontactcustomer_raw ORDER BY RawID DESC LIMIT 5"
                cursor.execute(query)
            
            samples = cursor.fetchall()
            print(f"\nSample records (last 5):")
            for i, row in enumerate(samples, 1):
                print(f"\n  Record {i}:")
                print(f"    RawID: {row['RawID']}")
                print(f"    Phone (phn): {row['phn']}")
                print(f"    Name (fnm): {row['fnm']}")
                print(f"    FileUploadID: {row['FileUploadID']}")
        
        cursor.close()
        return count
    except Error as e:
        print(f"✗ Error checking raw data: {e}")
        return 0

def analyze_phone_normalization(connection, excel_path):
    """Analyze phone number normalization differences"""
    try:
        # Read Excel
        df = pd.read_excel(excel_path)
        phone_column = df.columns[1]
        
        print(f"\n{'='*60}")
        print(f"📱 Phone Number Normalization Analysis:")
        print(f"{'='*60}")
        
        # Get phones from customer table
        cursor = connection.cursor()
        query = "SELECT Phone FROM customer_customer WHERE Phone IS NOT NULL"
        cursor.execute(query)
        db_phones = set(row[0] for row in cursor.fetchall())
        cursor.close()
        
        print(f"\nTotal phones in database: {len(db_phones)}")
        
        # Analyze Excel phones
        comparison_data = []
        mismatches = []
        
        for idx, phone in enumerate(df[phone_column], 1):
            if pd.isna(phone):
                continue
                
            original = str(phone).strip()
            python_norm = normalize_phone_python(phone)
            sp_norm = normalize_phone_sp(phone)
            
            in_db_python = python_norm in db_phones if python_norm else False
            in_db_sp = sp_norm in db_phones if sp_norm else False
            
            comparison_data.append({
                'Row': idx,
                'Original': original,
                'Python_Normalized': python_norm,
                'SP_Normalized': sp_norm,
                'Match': python_norm == sp_norm,
                'In_DB_Python': in_db_python,
                'In_DB_SP': in_db_sp
            })
            
            if python_norm != sp_norm:
                mismatches.append({
                    'Row': idx,
                    'Original': original,
                    'Python': python_norm,
                    'SP': sp_norm
                })
        
        # Summary
        total_phones = len(comparison_data)
        matching_norms = sum(1 for d in comparison_data if d['Match'])
        found_python = sum(1 for d in comparison_data if d['In_DB_Python'])
        found_sp = sum(1 for d in comparison_data if d['In_DB_SP'])
        
        print(f"\nNormalization Comparison:")
        print(f"  Total phones in Excel: {total_phones}")
        print(f"  Matching normalizations: {matching_norms}")
        print(f"  Mismatched normalizations: {len(mismatches)}")
        print(f"\nDatabase Matches:")
        print(f"  Found with Python normalization: {found_python}")
        print(f"  Found with SP normalization: {found_sp}")
        
        if mismatches:
            print(f"\n⚠️  NORMALIZATION MISMATCHES FOUND!")
            print(f"\nFirst 10 mismatches:")
            for i, m in enumerate(mismatches[:10], 1):
                print(f"  {i}. Row {m['Row']}: '{m['Original']}'")
                print(f"     Python: {m['Python']}")
                print(f"     SP:     {m['SP']}")
        
        # Save detailed report
        comparison_df = pd.DataFrame(comparison_data)
        comparison_df.to_excel('phone_normalization_analysis.xlsx', index=False)
        print(f"\n✓ Detailed analysis saved to 'phone_normalization_analysis.xlsx'")
        
        return comparison_data, mismatches
        
    except Exception as e:
        print(f"✗ Error in analysis: {e}")
        return [], []

def check_customer_inserts(connection, excel_path):
    """Check which customers were actually inserted"""
    try:
        df = pd.read_excel(excel_path)
        phone_column = df.columns[1]
        
        print(f"\n{'='*60}")
        print(f"👥 Customer Insert Verification:")
        print(f"{'='*60}")
        
        cursor = connection.cursor(dictionary=True)
        
        inserted = []
        not_inserted = []
        
        for idx, phone in enumerate(df[phone_column], 1):
            if pd.isna(phone):
                continue
            
            original = str(phone).strip()
            sp_norm = normalize_phone_sp(phone)
            
            if not sp_norm:
                continue
            
            # Check if exists in customer table
            query = "SELECT CustomerID, Phone, FirstName, LastName FROM customer_customer WHERE Phone = %s"
            cursor.execute(query, (sp_norm,))
            result = cursor.fetchone()
            
            if result:
                inserted.append({
                    'Excel_Row': idx,
                    'Original_Phone': original,
                    'Normalized_Phone': sp_norm,
                    'CustomerID': result['CustomerID'],
                    'Name': f"{result['FirstName'] or ''} {result['LastName'] or ''}".strip()
                })
            else:
                not_inserted.append({
                    'Excel_Row': idx,
                    'Original_Phone': original,
                    'Normalized_Phone': sp_norm
                })
        
        cursor.close()
        
        print(f"\nResults:")
        print(f"  ✓ Successfully inserted: {len(inserted)}")
        print(f"  ✗ Not inserted: {len(not_inserted)}")
        
        if not_inserted:
            print(f"\n⚠️  {len(not_inserted)} phones from Excel NOT found in customer table!")
            print(f"\nFirst 10 missing phones:")
            for i, item in enumerate(not_inserted[:10], 1):
                print(f"  {i}. Row {item['Excel_Row']}: {item['Original_Phone']} → {item['Normalized_Phone']}")
        
        # Save report
        if not_inserted:
            missing_df = pd.DataFrame(not_inserted)
            missing_df.to_excel('missing_customers.xlsx', index=False)
            print(f"\n✓ Missing customers list saved to 'missing_customers.xlsx'")
        
        return inserted, not_inserted
        
    except Exception as e:
        print(f"✗ Error checking inserts: {e}")
        return [], []

def main():
    print("="*60)
    print("🔍 Excel Import Debug Tool")
    print("="*60)
    
    connection = connect_to_database()
    if not connection:
        return
    
    try:
        excel_path = 'Excel.xlsx'
        
        # Step 1: Check raw data
        print("\n\n" + "="*60)
        print("STEP 1: Checking Raw Data Table")
        print("="*60)
        raw_count = check_raw_data(connection)
        
        # Step 2: Analyze phone normalization
        print("\n\n" + "="*60)
        print("STEP 2: Analyzing Phone Normalization")
        print("="*60)
        comparisons, mismatches = analyze_phone_normalization(connection, excel_path)
        
        # Step 3: Check customer inserts
        print("\n\n" + "="*60)
        print("STEP 3: Verifying Customer Inserts")
        print("="*60)
        inserted, not_inserted = check_customer_inserts(connection, excel_path)
        
        # Final Summary
        print("\n\n" + "="*60)
        print("📋 FINAL SUMMARY")
        print("="*60)
        print(f"Raw data records: {raw_count}")
        print(f"Phone normalization mismatches: {len(mismatches)}")
        print(f"Customers successfully inserted: {len(inserted)}")
        print(f"Customers NOT inserted: {len(not_inserted)}")
        
        if len(mismatches) > 0:
            print(f"\n⚠️  ISSUE: Phone normalization differs between Python and SP")
            print(f"   This is likely causing the import failures!")
        
        if len(not_inserted) > 0:
            print(f"\n⚠️  ISSUE: {len(not_inserted)} customers missing from database")
            print(f"   Check 'missing_customers.xlsx' for details")
        
    finally:
        if connection.is_connected():
            connection.close()
            print("\n✓ Database connection closed")

if __name__ == "__main__":
    main()