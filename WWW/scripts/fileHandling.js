import { currentState } from './state.js';
import { showNotification } from './systemAdmin.js';

let currentPage = 1;
let currentSearchTerm = '';
const pageSize = 5; 

// ==================== مدیریت فایل اکسل ====================

// Fixed handleFile function with proper phone normalization

export function handleFile(file) {
    if (!file) return;
    
    const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!validTypes.includes(file.type)) {
        alert('لطفاً یک فایل اکسل معتبر انتخاب کنید (فرمت‌های مجاز: .xlsx, .xls)');
        return;
    }
    else{
        currentState.currentExcel_FileName = file.name;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert('حجم فایل نباید بیشتر از 10 مگابایت باشد');
        return;
    }
    else{
        currentState.currentExcel_FileSize = file.size;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        let rawData = XLSX.utils.sheet_to_json(worksheet, { 
            defval: "",
            raw: false  // This ensures numbers are converted to strings
        });

        if (rawData.length === 0) {
            alert("فایل اکسل خالی است.");
            return;
        }

        const columnMap = {
            "شماره تماس": "phn",
            "نام و نام خانوادگی": "fnm",
            "کدملی": "ncd",
            "خودرو درخواستی": "rcr",
            "شعبه": "brn",
            "کارشناس تماس گیرنده": "agt",
            "آخرین تماس": "lcn",
            "مراحل تغییر حالت": "scs",
            "وضعیت مشتری": "cst",
            "توضیحات 1": "ds1",
            "توضیحات 2": "ds2",
            "توضیحات 3": "ds3",
            "پتانسیل مشتری شدن": "ptn",
            "راه ارتباطی با مجموعه": "cch",
            "نام کمپین": "cmp"
        };

        // *** FIXED: Proper phone number normalization ***
        let mappedData = rawData.map(row => {
            let newRow = {};
            for (const [persianKey, engKey] of Object.entries(columnMap)) {
                let value = row[persianKey] || "";
                
                // Special handling for phone numbers
                if (engKey === 'phn' && value) {
                    value = String(value).trim();
                    
                    // Remove .0 from Excel float format (e.g., "9133003933.0" -> "9133003933")
                    if (value.endsWith('.0')) {
                        value = value.slice(0, -2);
                    }
                    
                    // Remove all non-numeric characters except leading zero (for now)
                    value = value.replace(/[^\d]/g, '');
                    
                    // Remove leading zero (matching SP and database logic)
                    if (value.startsWith('0')) {
                        value = value.substring(1);
                    }
                } else {
                    // For other fields, just convert to string
                    value = String(value);
                }
                
                newRow[engKey] = value;
            }
            return newRow;
        });

        console.log('Sample normalized phones (first 5):');
        mappedData.slice(0, 5).forEach((row, idx) => {
            console.log(`${idx + 1}. ${row.phn}`);
        });

        currentState.currentExcel_JSON = mappedData;

        displayPreview(rawData.slice(0, 10));
        document.getElementById('row-count').textContent = `تعداد کل ردیف‌ها: ${rawData.length}`;

        document.getElementById('file-preview').classList.remove('hidden');
        document.getElementById('upload-btn').classList.remove('hidden');
    };

    reader.readAsArrayBuffer(file);
}

export function displayPreview(data) {
    const thead = document.getElementById('preview-table-head');
    const tbody = document.getElementById('preview-table-body');

    tbody.innerHTML = '';
    thead.innerHTML = '';

    if (data.length === 0) return;

    const validColumns = [
        "شماره تماس",
        "نام و نام خانوادگی",
        "کدملی",
        "خودرو درخواستی",
        "شعبه",
        "کارشناس تماس گیرنده",
        "آخرین تماس",
        "مراحل تغییر حالت",
        "وضعیت مشتری",
        "توضیحات 1",
        "توضیحات 2",
        "توضیحات 3",
        "پتانسیل مشتری شدن",
        "راه ارتباطی با مجموعه",
        "نام کمپین"
    ];

    let columns = Object.keys(data[0]).filter(col => validColumns.includes(col));

    let headerRow = `<th class="py-2 px-4 border-b">ردیف</th>`;
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

export async function uploadFile() {
    if (!currentState.currentExcel_JSON) {
        alert('هیچ فایل معتبری انتخاب نشده است.');
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
                const url = `${apiBaseUrl}/api/v1/upload/salesconsultant/sheet`;
                const urlObject = new URL(url);
                urlObject.searchParams.append('filename', currentState.currentExcel_FileName);   
                urlObject.searchParams.append('filesize', currentState.currentExcel_FileSize);   

                const response = await fetch(urlObject, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${currentState.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(currentState.currentExcel_JSON)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || 'خطا در آپلود فایل');
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

                loadUploadedFiles(1);

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

export function downloadSampleExcel() {
    const sampleData = [
        {
            "شماره تماس": "09123456789",
            "نام و نام خانوادگی": "نام نمونه",
            "کدملی": "0012345678",
            "خودرو درخواستی": "Arrizo 5",
            "شعبه": "اکستریم",
            "کارشناس تماس گیرنده": "کارشناس نمونه",
            "آخرین تماس": "1403/01/01",
            "مراحل تغییر حالت": "",
            "وضعیت مشتری": "وضعیت نمونه",
            "توضیحات 1": "توضیحات نمونه",
            "توضیحات 2": "",
            "توضیحات 3": "",
            "پتانسیل مشتری شدن": "A",
            "راه ارتباطی با مجموعه": "اینستاگرام",
            "نام کمپین": "M1"
        }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sample");
    XLSX.writeFile(workbook, "sample_template.xlsx");
}

// ==================== مدیریت شعبه‌ها ====================

export async function loadBranchList() {
    const branchFilter = document.getElementById('branch-filter');
    
    if (!branchFilter) {
        console.error('Branch filter element not found');
        return;
    }

    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken') || currentState.token;
        
        if (!token) {
            console.error('No auth token found');
            return;
        }

        const response = await fetch(`${apiBaseUrl}/api/v1/branch?page=1`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('خطا در دریافت لیست شعبه‌ها');
        }

        const result = await response.json();
        
        if (!result.meta || !result.meta.is_success) {
            throw new Error(result.meta?.description || 'خطا در دریافت اطلاعات');
        }
        
        currentState.branches = result.data || [];
        
        branchFilter.innerHTML = '';
        
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = 'همه شعبه‌ها';
        branchFilter.appendChild(allOption);
        
        if (result.data && Array.isArray(result.data)) {
            result.data.forEach(branch => {
                if (branch.isactive) {
                    const option = document.createElement('option');
                    option.value = branch.branchid;
                    option.textContent = branch.mainname;
                    branchFilter.appendChild(option);
                }
            });
        }

        console.log('Branch list loaded successfully');
        
    } catch (error) {
        console.error('Error loading branches:', error);
        if (typeof showNotification === 'function') {
            showNotification('خطا در بارگذاری لیست شعبه‌ها', 'error');
        }
    }
}

export function handleBranchChange_LastUploaded(e) {
    currentState.selectedBranch = e.target.value;
    currentPage = 1;
    loadUploadedFiles(currentPage, currentSearchTerm);
}

// ==================== مدیریت فایل‌های آپلود شده ====================

export async function loadUploadedFiles(page = 1, searchTerm = '') {
    const filesContainer = document.getElementById('files-container');
    const paginationContainer = document.getElementById('pagination-container');
    
    currentPage = page;
    currentSearchTerm = searchTerm;
    
    filesContainer.innerHTML = `
        <div class="loading">
            <i class="material-icons">hourglass_empty</i>
            <p>در حال بارگذاری فایل‌ها...</p>
        </div>
    `;
    paginationContainer.innerHTML = '';
    
    if (!currentState.branches || currentState.branches.length === 0) {
        await loadBranchList();
    }
    
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const apiUrl = new URL(`${apiBaseUrl}/api/v1/file-result`);
        apiUrl.searchParams.append('page-number', page);
        apiUrl.searchParams.append('page-size', pageSize); // اضافه شد
        
        let branchIdForQuery;
        if (currentState.user && currentState.user.userrolename === 'admin') {
            branchIdForQuery = currentState.selectedBranch;
        } else {
            branchIdForQuery = currentState.user?.branchid;
        }
        
        if (branchIdForQuery) {
            apiUrl.searchParams.append('branchid', branchIdForQuery);
        }
        
        if (searchTerm) {
            apiUrl.searchParams.append('context', searchTerm);
        }
        
        const response = await fetch(apiUrl.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('خطا در دریافت اطلاعات از سرور');
        
        const data = await response.json();
        
        if (data.meta && data.meta.is_success) {
            renderFilesList(data.data);
            renderPagination(data.meta);
        } else {
            throw new Error(data.meta?.description || 'خطا در دریافت اطلاعات');
        }

    } catch (error) {
        console.error('Error loading files:', error);
        filesContainer.innerHTML = `
            <div class="loading flex flex-col items-center justify-center p-6">
                <i class="material-icons text-4xl text-red-400 mb-2">error</i>
                <p class="text-red-500">خطا در بارگذاری فایل‌ها</p>
            </div>
        `;
        if (typeof showNotification === 'function') {
            showNotification('خطا در دریافت داده‌ها', 'error');
        }
    }
}
function getBranchName(branchId) {
    if (!branchId) return 'نامشخص';
    if (!currentState.branches || currentState.branches.length === 0) {
        console.warn('Branch list not loaded yet');
        return 'در حال بارگذاری...';
    }
    const branch = currentState.branches.find(b => b.branchid === parseInt(branchId));
    return branch ? branch.mainname : `شعبه ${branchId}`;
}

export function renderFilesList(files) {
    const filesContainer = document.getElementById('files-container');
    
    if (!files || files.length === 0) {
        filesContainer.innerHTML = `
            <div class="loading flex flex-col items-center justify-center p-6">
                <i class="material-icons text-4xl text-gray-400 mb-2">folder_open</i>
                <p class="text-gray-500">هیچ فایلی یافت نشد.</p>
            </div>
        `;
        return;
    }
    
    let filesHTML = '';
    
    files.forEach(file => {
        const fileSize = file.filesize ? formatFileSize(file.filesize) : 'نامشخص';
        const uploadDate = file.uploadedat ? formatDate(file.uploadedat) : 'نامشخص';
        const branchName = getBranchName(file.branchid);
        const statusClass = file.errormessage ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
        const statusText = file.errormessage ? 'ناموفق' : 'موفق';
        const errorIcon = file.errormessage ? 'error' : 'check_circle';
        
        filesHTML += `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow mb-3">
                <div class="flex items-center flex-1">
                    <i class="material-icons text-gray-500 mr-3">description</i>
                    <div class="flex-1">
                        <p class="text-sm font-medium text-gray-800">${file.filename}</p>
                        <div class="flex items-center mt-2 text-xs text-gray-500 flex-wrap gap-3">
                            <span class="flex items-center">
                                <i class="material-icons text-xs mr-1">business</i> 
                                ${branchName}
                            </span>
                            <span class="flex items-center">
                                <i class="material-icons text-xs mr-1">storage</i> 
                                ${fileSize}
                            </span>
                            <span class="flex items-center">
                                <i class="material-icons text-xs mr-1">schedule</i> 
                                ${uploadDate}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center space-x-2 rtl:space-x-reverse gap-2">
                    <span class="px-3 py-1 ${statusClass} text-xs rounded-full flex items-center">
                        <i class="material-icons text-xs mr-1">${errorIcon}</i>
                        ${statusText}
                    </span>
                    <button 
                        class="download-excel-btn px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-xs rounded-lg flex items-center transition-colors"
                        data-file-id="${file.fileuploadid}"
                        data-filename="${file.filename}">
                        <i class="material-icons text-sm mr-1">download</i>
                        دانلود اکسل
                    </button>
                </div>
            </div>
        `;
    });
    
    filesContainer.innerHTML = filesHTML;
    
    // اضافه کردن event listener به دکمه‌های دانلود
    const downloadButtons = filesContainer.querySelectorAll('.download-excel-btn');
    downloadButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const fileId = e.currentTarget.getAttribute('data-file-id');
            const filename = e.currentTarget.getAttribute('data-filename');
            await downloadFileAsExcel(fileId, filename);
        });
    });
}

// ==================== دانلود فایل به صورت اکسل ====================

export async function downloadFileAsExcel(fileId, originalFilename) {
    showLoadingModal('در حال دریافت اطلاعات و ساخت فایل اکسل...');
    
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        // دریافت تمام داده‌ها (بدون pagination)
        const allData = [];
        let pageNumber = 1;
        let totalRecords = 0;
        
        do {
            const apiUrl = new URL(`${apiBaseUrl}/api/v1/upload/uploaded/${fileId}`);
            apiUrl.searchParams.append('page-size', '1000');
            apiUrl.searchParams.append('page-number', pageNumber);
            
            const response = await fetch(apiUrl.toString(), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('خطا در دریافت اطلاعات از سرور');
            
            const result = await response.json();
            
            if (!result.meta || !result.meta.is_success) {
                throw new Error(result.meta?.description || 'خطا در دریافت اطلاعات');
            }
            
            if (result.data && result.data.length > 0) {
                allData.push(...result.data);
            }
            
            totalRecords = result.meta.total_records || 0;
            
            updateLoadingModal(`در حال دریافت... ${allData.length} از ${totalRecords} رکورد`);
            
            pageNumber++;
            
        } while (allData.length < totalRecords);
        
        if (allData.length === 0) {
            hideLoadingModal();
            alert('هیچ داده‌ای برای این فایل یافت نشد.');
            return;
        }
        
        // تبدیل داده‌ها به فرمت اکسل با ستون‌های فارسی
        updateLoadingModal('در حال ساخت فایل اکسل...');
        
        const excelData = allData.map((row, index) => ({
            'ردیف': index + 1,
            'شماره تماس': row.phonenumber || '',
            'نام و نام خانوادگی': row.fullname || '',
            'کدملی': row.nationalcode || '',
            'خودرو درخواستی': row.requestedcar || '',
            'شعبه': row.branch || '',
            'کارشناس تماس گیرنده': row.callingagent || '',
            'آخرین تماس': row.lastcontactdate || '',
            'مراحل تغییر حالت': row.statuschangesteps || '',
            'وضعیت مشتری': row.customerstatus || '',
            'توضیحات 1': row.description1 || '',
            'توضیحات 2': row.description2 || '',
            'توضیحات 3': row.description3 || '',
            'پتانسیل مشتری شدن': row.potential || '',
            'راه ارتباطی با مجموعه': row.communicationchannel || '',
            'نام کمپین': row.campaignname || ''
        }));
        
        // ساخت فایل اکسل
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        
        // تنظیم عرض ستون‌ها
        const columnWidths = [
            { wch: 8 },  // ردیف
            { wch: 15 }, // شماره تماس
            { wch: 25 }, // نام
            { wch: 15 }, // کدملی
            { wch: 20 }, // خودرو
            { wch: 15 }, // شعبه
            { wch: 20 }, // کارشناس
            { wch: 15 }, // آخرین تماس
            { wch: 20 }, // مراحل
            { wch: 30 }, // وضعیت
            { wch: 30 }, // توضیحات 1
            { wch: 30 }, // توضیحات 2
            { wch: 30 }, // توضیحات 3
            { wch: 15 }, // پتانسیل
            { wch: 20 }, // راه ارتباطی
            { wch: 15 }  // کمپین
        ];
        worksheet['!cols'] = columnWidths;
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "داده‌ها");
        
        // ساخت نام فایل
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const filename = originalFilename.replace(/\.[^/.]+$/, '') + `_${timestamp}.xlsx`;
        
        // دانلود فایل
        XLSX.writeFile(workbook, filename);
        
        hideLoadingModal();
        
        if (typeof showNotification === 'function') {
            showNotification(`فایل اکسل با موفقیت ساخته شد (${allData.length} رکورد)`, 'success');
        }
        
    } catch (error) {
        console.error('Error downloading file:', error);
        hideLoadingModal();
        
        if (typeof showNotification === 'function') {
            showNotification('خطا در دانلود فایل: ' + error.message, 'error');
        } else {
            alert('خطا در دانلود فایل: ' + error.message);
        }
    }
}

// نمایش مودال لودینگ
function showLoadingModal(message) {
    let modal = document.getElementById('excel-loading-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'excel-loading-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-11/12 md:w-1/3 text-center">
                <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
                <h3 class="text-lg font-bold mb-2">در حال پردازش</h3>
                <p id="loading-message" class="text-gray-600">${message}</p>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        modal.classList.remove('hidden');
        const messageEl = modal.querySelector('#loading-message');
        if (messageEl) messageEl.textContent = message;
    }
}

// بروزرسانی پیام لودینگ
function updateLoadingModal(message) {
    const modal = document.getElementById('excel-loading-modal');
    if (modal) {
        const messageEl = modal.querySelector('#loading-message');
        if (messageEl) messageEl.textContent = message;
    }
}

// مخفی کردن مودال لودینگ
function hideLoadingModal() {
    const modal = document.getElementById('excel-loading-modal');
    if (modal) {
        modal.remove();
    }
}

export function renderPagination(meta) {
    const paginationContainer = document.getElementById('pagination-container');
    
    if (!meta || !meta.page || !meta.count) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    const pageNum = parseInt(meta.page.page_num) || 1;
    const pageSize = parseInt(meta.page.page_size) || 5;
    const totalCount = parseInt(meta.count) || 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    paginationHTML += `
        <button class="page-btn" ${pageNum === 1 ? 'disabled' : ''} data-page="${pageNum - 1}">
            <i class="material-icons">chevron_right</i>
        </button>
    `;
    
    const startPage = Math.max(1, pageNum - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="page-btn ${i === pageNum ? 'active' : ''}" data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    paginationHTML += `
        <button class="page-btn" ${pageNum === totalPages ? 'disabled' : ''} data-page="${pageNum + 1}">
            <i class="material-icons">chevron_left</i>
        </button>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
    
    const pageButtons = paginationContainer.querySelectorAll('.page-btn:not([disabled])');
    pageButtons.forEach(button => {
        button.addEventListener('click', () => {
            const page = parseInt(button.getAttribute('data-page'));
            if (page && page !== currentPage) {
                loadUploadedFiles(page, currentSearchTerm);
            }
        });
    });
}

// ==================== توابع کمکی ====================

export function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

export function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

export function handleSearch() {
    const searchInput = document.getElementById('search-input');
    currentSearchTerm = searchInput.value.trim();
    currentPage = 1;
    loadUploadedFiles();
}

export function ensureGalleryState() {
    if (!currentState.gallery) {
        currentState.gallery = {
            currentPage: 1,
            pageSize: 5,
            totalPages: 1,
            totalRecords: 0,
            items: []
        };
    }
}