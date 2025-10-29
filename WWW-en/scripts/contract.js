import { renderFilesList, renderPagination} from './fileHandling.js';
import { currentState } from './state.js';
import { showNotification } from './systemAdmin.js';


// Mapping the units of Persian columns to English (small three-letter abbreviation)
const columnMap = {
    // Common columns between Lucano and MVM
    "Contract Number": "con",
    "Contract Date (Jalali)": "cdt", 
    "Contract Date (Gregorian)": "cdg",
    "Request Number": "rqn",
    "Request Date (Jalali)": "rqd",
    "Request Date (Gregorian)": "rdg",
    "Customer National ID": "cni",
    "Customer National Code": "cni", // Equivalent MVM
    "Customer Full Name": "cnf",
    "Customer Name": "cnf", // Equivalent MVM
    "Customer Type": "cty",
    "Customer City/County": "ccy",
    "Customer City": "ccy", // Equivalent MVM
    "Dealer Code": "dcd",
    "Dealer Name": "dnm",
    "Dealer City/County": "dcy",
    "Dealer Province": "dpr",
    "Vehicle Type": "vty",
    "Vehicle Color": "vcl",
    "Color Code": "ccd",
    "Gateway": "gtw",
    "Region": "reg",
    "Sales Permit Number": "sln",
    "Sales Permit Description": "sld",
    "Payment Method Description": "pmd",
    "Delivery Date": "dld",
    "Delivery Due Date": "dld", // Equivalent MVM
    "Delivery Lead Days": "ddd",
    "Assignable VIN Tenth Digit": "acd",
    "VIN Tenth Digit": "acd", // Equivalent MVM
    "VIN": "chn",
    "Delivery Month": "dlm",
    "Delivery Dealer Code": "ddc",
    "Delivery Dealer Name": "ddn",
    "Delivery Location": "dll",
    "Vehicle Model Year": "vmd",
    "Registration Documents Delivered": "rds",
    "Final Payment Documents Delivered": "fds",
    "Invoice Blocked": "ins",
    "Invoice Blocked Status": "ins", // Equivalent MVM
    "Verification Documents": "vds",
    "VIN Status": "chs",
    "Allocation Date": "ald",
    "Allocation Date (Gregorian)": "alg",
    "License Plate Date": "pld",
    "License Plate Date (Gregorian)": "plg",
    "License Plate Date 1": "pl1",
    "Title Deed Date": "dmd",
    "Title Deed Status": "dms",
    "Physical Delivery Date": "pdd",
    "License Plate Number": "pln",
    "Cancellation Date": "cnd",
    "Contract Status": "cns",
    "Sales Type": "sly",
    "Customer Payment Date": "cpd",
    "Final Payment Date": "fpd",
    "Accounting Approval Date": "aad",
    "Leasing Approval Date": "aad", // Equivalent MVM
    "Payment Method Code": "pmc",
    "Invitation Number": "inv",
    "Request Submission Time": "rts",
    "Approved Price": "apr",
    "Vehicle Price": "apr", // Equivalent MVM
    "Price Type": "prt",
    "Guarantor National ID": "gni",
    "Discount Amount": "dma",
    "Total Amount Received": "tar",
    "Contract Format": "cft",
    "Assignor National ID": "ani",
    "Assignment Status": "ass",
    "Cancellation Status": "cst",
    "Organization": "org",
    "Cardex Number": "knm",
    "Cardex Date": "kdt",
    "Refund IBAN": "cib",
    "Total Cheque Amount": "tca",
    "Cheque Count": "noc",
    "Organization 1": "org1",
    "Request Created By": "rcu",
    "Document Type": "dty",
    "Blacklisted Contract": "icb",
    "Blacklisted Customer": "icl",
    "Postal Code": "pcd",
    "Last Invitation Issued": "lii",
    "Last Invitation Paid": "lcp",
    "First Signature Date": "fsd",
    "First Signatory": "fsg",
    "Second Signature Date": "ssd",
    "Second Signatory": "ssg",
    "Customer Outstanding Balance": "cob",
    "Cheques After Cardex": "cca",
    "Scrappage Certificate Date": "scd",
    "Dealer Address": "dda",
    
    // MVM-specific columns
    "Row": "row",
    "Brand": "brd",
    "Final Payment / Leasing Approval": "cmp",
    "Invitation Issue Due Date": "isd",
    "Group Sales Company": "csg",
    "Down Payment Amount": "ppd",
    "Leasing Type": "lty",
    "Customer Gender": "gnd",
    "Customer Age": "age",
    "Leasing Status": "lst",
    "Contract Duration Days": "cdd",
    "Guarantor Name": "gnm",
    "Customer Email": "eml",
    "Financial Document": "fnd",
    "Tracking Code": "trc",
    "Guarantee Sheet": "shd",
    "Delivery in Bam": "bmd",
    "Birth Certificate": "idc",
    "National ID Card": "nid",
    "Organization Introduction Letter": "orgd", // renamed from org to orgd to avoid collisions
    "Certificate Number": "lic"
};

function normalizeKey(key) {
    return key ? key.replace(/_/g, ' ').trim() : '';
}

function detectContractType(headers, previewData, filename = '') {
    const lowerHeaders = headers.map(h => (h || '').toString().toLowerCase());
    
    // Inspect sample data in the 'vehicle type' or 'brand' column
    const carTypeColIndex = lowerHeaders.findIndex(h => 
        h.includes('vehicle type') || h.includes('car model') || h.includes('model') || h.includes('brand')
    );
    
    if (carTypeColIndex !== -1 && previewData && previewData.length > 0) {
        const sampleVal = (Object.values(previewData[0])[carTypeColIndex] || '').toString().toLowerCase();
        if (/lucano|locano|l7/.test(sampleVal)) return { type: 'locano', id: 1 };
        if (/mvm|arrizo|cbu/.test(sampleVal)) return { type: 'mvm', id: 2 };
    }

    // Check headers for specific keywords
    if (lowerHeaders.some(h => /lucano|locano|l7/.test(h))) return { type: 'locano', id: 1 };
    if (lowerHeaders.some(h => /mvm|arrizo|cbu/.test(h))) return { type: 'mvm', id: 2 };

    // Check file name
    const lowerFilename = (filename || '').toLowerCase();
    if (/lucano|locano|l7/.test(lowerFilename)) return { type: 'locano', id: 1 };
    if (/mvm|arrizo|cbu/.test(lowerFilename)) return { type: 'mvm', id: 2 };

    // Look for headers that only appear in MVM exports
    const mvmSpecificHeaders = ['brand', 'group sales company', 'customer gender', 'customer age', 'term of installments'];
    if (mvmSpecificHeaders.some(header => lowerHeaders.some(h => h.includes(header)))) {
        return { type: 'mvm', id: 2 };
    }

    // Look for headers that indicate a Lucano export
    const locanoSpecificHeaders = ['contract date', 'request date', 'delivery month'];
    if (locanoSpecificHeaders.some(header => lowerHeaders.some(h => h.includes(header)))) {
        return { type: 'locano', id: 1 };
    }

    return { type: 'unknown', id: 0 };
}

function showDetectedContractTypeUI(typeObj) {
    const container = document.getElementById('detected-contract-type');
    const textEl = document.getElementById('detected-contract-type-text');
    const badgeEl = document.getElementById('detected-contract-type-badge');
    if (!container || !textEl || !badgeEl) return;

    let displayText = 'Uncertain';
    let badgeClass = 'bg-gray-100 text-gray-800';
    
    if (typeObj.type === 'locano') {
        displayText = 'Lucano';
        badgeClass = 'bg-blue-100 text-blue-800';
    } else if (typeObj.type === 'mvm') {
        displayText = 'MVM';
        badgeClass = 'bg-green-100 text-green-800';
    } else {
        displayText = 'Uncertain';
        badgeClass = 'bg-gray-100 text-gray-800';
    }

    textEl.textContent = displayText;
    badgeEl.className = `px-3 py-1 rounded-lg border ${badgeClass}`;
    container.classList.remove('hidden');
}

export function handleFileContract(file) {
    if (!file) return;

    const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!validTypes.includes(file.type)) {
        alert('Please select a valid Excel file (allowed formats: .xlsx, .xls)');
        return;
    } else {
        currentState.currentExcel_FileName = file.name;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert('The file size should not be more than 10 MB');
        return;
    } else {
        currentState.currentExcel_FileSize = file.size;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        let rawData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: "",
            raw: false 
        });

        if (rawData.length <= 1) {
            alert("The Excel file is empty or only contains headers.");
            return;
        }

        const headers = rawData[0].map(h => normalizeKey(h));
        const dataRows = rawData.slice(1);

        // Build previewData to display and detect the contract type
        let previewData = dataRows.map((row, index) => {
            let previewRow = {};
            for (let i = 0; i < headers.length; i++) {
                previewRow[headers[i]] = String(row[i] || "");
            }
            return previewRow;
        }).filter(row => Object.values(row).some(val => val.trim() !== ""));

        // Identify the contract type
        const detected = detectContractType(headers, previewData.slice(0, 5), file.name);
        currentState.currentExcel_contractType = detected.type;
        currentState.currentExcel_contractTypeId = detected.id;

        // Map headers to English codes using columnMap
        const englishHeaders = headers.map(persianHeader => {
            return columnMap[persianHeader] || persianHeader;
        });

        // Build mappedData with English keys
        let mappedData = dataRows.map(row => {
            let newRow = {};
            for (let i = 0; i < englishHeaders.length; i++) {
                newRow[englishHeaders[i]] = String(row[i] || "");
            }
            return newRow;
        }).filter(row => Object.values(row).some(val => val.trim() !== ""));

        if (mappedData.length === 0) {
            alert("No valid data was found in the file.");
            return;
        }

        currentState.currentExcel_JSON = mappedData;

        showDetectedContractTypeUI(detected);
        displayPreview(previewData.slice(0, 10));
        document.getElementById('row-count').textContent = `Total number of rows: ${mappedData.length}`;

        document.getElementById('file-preview').classList.remove('hidden');
        document.getElementById('upload-btn').classList.remove('hidden');
    };

    reader.readAsArrayBuffer(file);
}

// The rest of the functions remain unchanged.
export function displayPreview(data) {
    const thead = document.getElementById('preview-table-head');
    const tbody = document.getElementById('preview-table-body');

    tbody.innerHTML = '';
    thead.innerHTML = '';

    if (data.length === 0) return;

    let columns = Object.keys(data[0]).filter(col => col);

    let headerRow = `<th class="py-2 px-4 border-b">row</th>`;
    columns.forEach(col => {
        headerRow += `<th class="py-2 px-4 border-b text-center">${col}</th>`;
    });
    thead.innerHTML = `<tr>${headerRow}</tr>`;

    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

        let rowHtml = `<td class="py-2 px-4 border-b">${index + 1}</td>`;
        columns.forEach(col => {
            rowHtml += `<td class="py-2 px-4 border-b">${row[col] || '-'}</td>`;
        });

        tr.innerHTML = rowHtml;
        tbody.appendChild(tr);
    });
}

export async function uploadFileContract() {
    if (!currentState.currentExcel_JSON) {
        alert('No valid files have been selected.');
        return;
    }

    const confirmModal = document.getElementById('confirm-upload-modal');
    confirmModal.classList.remove('hidden');

    return new Promise((resolve) => {
        document.getElementById('confirm-upload-btn').onclick = async () => {
            confirmModal.classList.add('hidden');
            
            const processingModal = document.getElementById('processing-modal');
            processingModal.classList.remove('hidden');
            
            const uploadBtn = document.getElementById('upload-btn');
            const uploadResultEl = document.getElementById('upload-result');

            uploadBtn.disabled = true;
            uploadBtn.classList.add('opacity-50', 'cursor-not-allowed');
            uploadResultEl.classList.add('hidden');

            try {
                const apiBaseUrl = window.location.origin;
                const url = `${apiBaseUrl}/api/v1/upload/contract/sheet`;
                const urlObject = new URL(url);
                urlObject.searchParams.append('filename', currentState.currentExcel_FileName);
                urlObject.searchParams.append('filesize', currentState.currentExcel_FileSize);

                // send contract_type_id and contract_type
                const ctypeId = currentState.currentExcel_contractTypeId !== undefined ? currentState.currentExcel_contractTypeId : 0;
                const ctype = currentState.currentExcel_contractType || 'unknown';
                urlObject.searchParams.append('contract_type_id', String(ctypeId));
                urlObject.searchParams.append('contract_type', String(ctype));

                const response = await fetch(urlObject.toString(), {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${currentState.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(currentState.currentExcel_JSON)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || 'Error uploading the file');
                }

                const result = await response.text();

                uploadResultEl.innerHTML = `
                    <div class="bg-green-50 text-green-700 p-3 rounded-lg">
                        <div class="flex items-center">
                            <i class="material-icons mr-2">check_circle</i>
                            <span>${result}</span>
                        </div>
                    </div>
                `;
                uploadResultEl.classList.remove('hidden');
                loadUploadedFilesContract();

            } catch (error) {
                console.error('Upload failed:', error);
                uploadResultEl.innerHTML = `
                    <div class="bg-red-50 text-red-700 p-3 rounded-lg">
                        <i class="material-icons mr-2">error</i>
                        <span>${error.message}</span>
                    </div>
                `;
                uploadResultEl.classList.remove('hidden');
            } finally {
                processingModal.classList.add('hidden');
                uploadBtn.disabled = false;
                uploadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                resolve();
            }
        };

        document.getElementById('confirm-upload-cancel').onclick = () => {
            confirmModal.classList.add('hidden');
            resolve();
        };
    });
}

export function addSingleContract() {
    // Create the modal if it doesn't exist
    createSingleContractModalIfNotExists();
    
    // Show the modal
    const modal = document.getElementById('single-contract-modal');
    modal.classList.remove('hidden');
    
    // Set up the form
    document.getElementById('single-contract-form').reset();
    document.getElementById('single-contract-result').classList.add('hidden');
}

function createSingleContractModalIfNotExists() {
    if (document.getElementById('single-contract-modal')) {
        return;
    }

    const modalHtml = `
        <div id="single-contract-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
            <div class="bg-white rounded-lg p-6 w-11/12 md:w-1/2 lg:w-1/3">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold">Add Contract by National Code</h3>
                    <button class="text-gray-500 hover:text-gray-700 close-single-contract-modal">
                        <i class="material-icons">close</i>
                    </button>
                </div>
                
                <form id="single-contract-form">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Customer National ID *</label>
                        <input 
                            type="text" 
                            id="national-code-input" 
                            required 
                            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="Example: 1234567890"
                            pattern="[0-9]{10}"
                            title="Please enter a valid 10-digit national ID"
                        >
                    </div>
                    
                    <div id="single-contract-result" class="mb-4 hidden"></div>
                    
                    <div class="flex justify-end space-x-2 rtl:space-x-reverse">
                        <button type="button" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 close-single-contract-modal">
                            Cancel
                        </button>
                        <button type="submit" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center">
                            <i class="material-icons mr-1">add</i>
                            Add
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Add event listeners
    const modal = document.getElementById('single-contract-modal');
    const closeBtn = modal.querySelector('.close-single-contract-modal');
    const form = document.getElementById('single-contract-form');

    // Close the modal
    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    // Click outside the modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    // Submit the form
    form.addEventListener('submit', handleSingleContractSubmit);
}

async function handleSingleContractSubmit(e) {
    e.preventDefault();
    
    const nationalCode = document.getElementById('national-code-input').value.trim();
    const resultEl = document.getElementById('single-contract-result');
    
    // Initial validation
    if (!nationalCode || !/^\d{10}$/.test(nationalCode)) {
        showNotification('Please enter a valid 10-digit national code', 'error');
        return;
    }

    // Display the processing status
    showNotification('Searching...', 'loading');

    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            throw new Error('Please login first');
        }

        const response = await fetch(`${apiBaseUrl}/api/v1/contract/summary/${nationalCode}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.meta?.description || 'Error in receiving contract information');
        }

        if (data.meta?.is_success) {
            showNotification(
                `The contract was created successfully.<br>
                 <strong>Contract ID:</strong> ${data.data.id}<br>
                 <strong>Message:</strong> ${data.meta.description}`,
                'success'
            );
            
            // Clear the field after success
            document.getElementById('national-code-input').value = '';
        } else {
            throw new Error(data.meta?.description || 'Error creating contract');
        }

    } catch (error) {
        console.error('Error in single contract search:', error);
        showNotification(error.message || 'Error connecting to the server', 'error');
    }
}

export function downloadSampleContractExcel() {
    const sampleData = [
        {
            "Contract Number": "123456",
            "Contract Date (Jalali)": "1403/06/19",
            "Contract Date (Gregorian)": "2024/09/10",
            "Request Number": "15000001",
            "Request Date (Jalali)": "1403/06/15",
            "Request Date (Gregorian)": "2024/09/06",
            "Customer National ID": "1234567890",
            "Customer Full Name": "Ali Rezaei",
            "Customer Type": "Individual",
            "Customer City/County": "Tehran",
            "Customer City": "Tehran",
            "Dealer Code": "101",
            "Dealer Name": "Example Dealer",
            "Dealer City/County": "Tehran",
            "Dealer Province": "Tehran",
            "Vehicle Type": "Lucano L7",
            "Vehicle Color": "White Metallic",
            "Color Code": "W12",
            "Gateway": "DEALER",
            "Region": "North",
            "Sales Permit Number": "INS.SAMPLE.1403.01.01",
            "Sales Permit Description": "Lucano L7 - 1403 model - 29,500,000,000 IRR - Sample Bank",
            "Payment Method Description": "Lucano L7 - installment sale - 60% down payment - 24 month plan (12 cheques + 1)",
            "Delivery Date": "1403/08/19",
            "Delivery Lead Days": "60",
            "Assignable VIN Tenth Digit": "S",
            "VIN": "123456789012345678",
            "Delivery Month": "Aban 1403",
            "Delivery Dealer Code": "101",
            "Delivery Dealer Name": "Sample Dealer",
            "Delivery Location": "Sample Dealer Branch",
            "Vehicle Model Year": "1403",
            "Registration Documents Delivered": "Delivered",
            "Final Payment Documents Delivered": "Pending",
            "Invoice Blocked": "Inactive",
            "Verification Documents": "Delivered",
            "VIN Status": "Not allocated",
            "Allocation Date": "1403/06/20",
            "Allocation Date (Gregorian)": "2024/09/11",
            "License Plate Date": "1403/06/25",
            "License Plate Date (Gregorian)": "2024/09/16",
            "License Plate Date 1": "2024/09/16",
            "Title Deed Date": "1403/06/30",
            "Title Deed Status": "Not issued",
            "Physical Delivery Date": "1403/07/01",
            "License Plate Number": "12AB345",
            "Cancellation Date": "",
            "Contract Status": "Active",
            "Sales Type": "Immediate - Down Payment",
            "Customer Payment Date": "1403/06/19",
            "Final Payment Date": "1403/08/19",
            "Accounting Approval Date": "1403/06/20",
            "Leasing Approval Date": "1403/06/20",
            "Payment Method Code": "L7.60%.24M.SAMPLE",
            "Invitation Number": "",
            "Request Submission Time": "2024/09/06 10:00:00",
            "Approved Price": "29500000000",
            "Vehicle Price": "29500000000",
            "Price Type": "Fixed",
            "Guarantor National ID": "0987654321",
            "Discount Amount": "1000000",
            "Total Amount Received": "18300000000",
            "Contract Format": "Standard",
            "Assignor National ID": "",
            "Assignment Status": "",
            "Cancellation Status": "",
            "Organization": "",
            "Organization 1": "",
            "Cardex Number": "",
            "Cardex Date": "",
            "Refund IBAN": "",
            "Total Cheque Amount": "11200000000",
            "Cheque Count": "12",
            "Request Created By": "admin",
            "Document Type": "Collateralized Title",
            "Blacklisted Contract": "No",
            "Blacklisted Customer": "No",
            "Postal Code": "1234567890",
            "Last Invitation Issued": "",
            "Last Invitation Paid": "",
            "First Signature Date": "1403/06/19",
            "First Signatory": "Ali Rezaei",
            "Second Signature Date": "1403/06/20",
            "Second Signatory": "Branch Manager",
            "Customer Outstanding Balance": "0",
            "Cheques After Cardex": "0",
            "Scrappage Certificate Date": "",
            "Dealer Address": "Tehran, Sample Street, No. 123"
        }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sample");
    XLSX.writeFile(workbook, "contract_sample_template.xlsx");
}

let currentPage = 1;
let currentSearchTerm = '';
const pageSize = 5;

export async function loadUploadedFilesContract() {
    const filesContainer = document.getElementById('files-container');
    const paginationContainer = document.getElementById('pagination-container');
    
    filesContainer.innerHTML = `
        <div class="loading">
            <i class="material-icons">hourglass_empty</i>
            <p>Loading files...</p>
        </div>
    `;
    paginationContainer.innerHTML = '';
    
    const apiBaseUrl = window.location.origin;
    const token = localStorage.getItem('authToken');
    
    const apiUrl = new URL(`${apiBaseUrl}/api/v1/contract-file-result`);
    apiUrl.searchParams.append('page', currentPage);
    if (currentSearchTerm) {
        apiUrl.searchParams.append('context', currentSearchTerm);
    }
    
    try {
        const response = await fetch(apiUrl.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Error in receiving information from the server');
        
        const data = await response.json();
        
        if (data.meta && data.meta.is_success) {
            renderFilesList(data.data);
            renderPagination(data.meta);
        } else {
            throw new Error(data.meta?.description || 'Error in receiving information');
        }

    } catch (error) {
        console.error('Error loading files:', error);
        showNotification('Error receiving data', 'error');
    }
}
