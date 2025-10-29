import { currentState } from './state.js';
import { showNotification } from './systemAdmin.js';

export function handleFile(file) {
    if (!file) return;
    
    const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!validTypes.includes(file.type)) {
        alert('الرجاء تحديد ملف Excel صالح (التنسيقات المعتمدة :.xlsx, .xls)');
        return;
    }
    else{
        currentState.currentExcel_FileName = file.name;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert('يجب ألا يتجاوز حجم الملف 10 ميغابايت');
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

        // البيانات الأولية ذات الركائز الفارسية - نتلقى جميع القيم كسلسلة
        let rawData = XLSX.utils.sheet_to_json(worksheet, { 
            defval: "",
            raw: false // يؤدي هذا الخيار إلى إعادة جميع القيم إلى الحقل
        });

        if (rawData.length === 0) {
            alert("ملف Excel فارغ.");
            return;
        }

        // تعيين الأعمدة الفارسية إلى مفاتيح ثلاثية
        const columnMap = {
            "رقم الاتصال": "phn",
            "الاسم والاسم الأخير": "fnm",
            "شفرة": "ncd",
            "طلبت السيارة": "rcr",
            "فرع": "brn",
            "خبير المتصل": "agt",
            "المكالمة الأخيرة": "lcn",
            "تغيير الخطوات": "scs",
            "حالة العميل": "cst",
            "الوصف 1": "ds1",
            "الوصف 2": "ds2",
            "الوصف 3": "ds3",
            "إمكانات العملاء": "ptn",
            "طريقة التواصل مع المجموعة": "cch",
            "اسم الحملة": "cmp"
        };

        // إنشاء بيانات جديدة باستخدام مفاتيح ثلاثية - التأكد من وجود جميع القيم
        let mappedData = rawData.map(row => {
            let newRow = {};
            for (const [persianKey, engKey] of Object.entries(columnMap)) {
                // تحويل جميع القيم إلى سلسلة
                newRow[engKey] = String(row[persianKey] || "");
            }
            return newRow;
        });

        // حفظ في state
        currentState.currentExcel_JSON = mappedData;

        // Preview بالأعمدة الفارسية
        displayPreview(rawData.slice(0, 10));
        document.getElementById('row-count').textContent = `إجمالي عدد الصفوف: ${rawData.length}`;

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

    // الأعمدة الصالحة (الفارسية)
    const validColumns = [
        "رقم الاتصال",
        "الاسم والاسم الأخير",
        "شفرة",
        "طلبت السيارة",
        "فرع",
        "خبير المتصل",
        "المكالمة الأخيرة",
        "تغيير الخطوات",
        "حالة العميل",
        "الوصف 1",
        "الوصف 2",
        "الوصف 3",
        "إمكانات العملاء",
        "طريقة التواصل مع المجموعة",
        "اسم الحملة"
    ];

    // احتفظ فقط بالأعمدة المعتمدة
    let columns = Object.keys(data[0]).filter(col => validColumns.includes(col));

    // بناء رأس
    let headerRow = `<th class="py-2 px-4 border-b">الصف </th>`;
    columns.forEach(col => {
        headerRow += `<th class="py-2 px-4 border-b text-center">${col}</th>`;
    });
    thead.innerHTML = `<tr>${headerRow}</tr>`;

    // صنع الصفوف
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
        alert('لم يتم اختيار أي ملفات حسنة السمعة.');
        return;
    }

    // منظر modal تأكيد
    const confirmModal = document.getElementById('confirm-upload-modal');
    confirmModal.classList.remove('hidden');

    // يعود promise لإدارة asynchronous
    return new Promise((resolve) => {
        // يضيف event listener بالنسبة لزر التأكيد
        document.getElementById('confirm-upload-btn').onclick = async () => {
            // يغلق modal تأكيد
            confirmModal.classList.add('hidden');
            
            // منظر modal يعالج
            const processingModal = document.getElementById('processing-modal');
            processingModal.classList.remove('hidden');
            
            const uploadBtn = document.getElementById('upload-btn');
            const uploadResultEl = document.getElementById('upload-result');

            // تعطيل زر التحميل (سواء في المظهر أو الوظيفة)
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
                    throw new Error(errorData.message || 'خطأ في تحميل الملف');
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

                // تحديث قائمة الملفات التي تم تحميلها
                loadUploadedFiles();

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
                // يخفي modal يعالج
                const processingModal = document.getElementById('processing-modal');
                processingModal.classList.add('hidden');
                
                // تفعيل زر التحميل
                uploadBtn.disabled = false;
                uploadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                
                resolve();
            }
        };

        // event listener لزر الانسحاب
        document.getElementById('confirm-upload-cancel').onclick = () => {
            confirmModal.classList.add('hidden');
            resolve();
        };
    });
}

export function downloadSampleExcel() {
    const sampleData = [
        {
            "رقم الاتصال": "09123456789",
            "الاسم والاسم الأخير": "اسم العينة",
            "شفرة": "0012345678",
            "طلبت السيارة": "Arrizo 5",
            "فرع": "أقصى",
            "خبير المتصل": "خبير العينة",
            "المكالمة الأخيرة": "1403/01/01",
            "تغيير الخطوات": "",
            "حالة العميل": "حالة العينة",
            "الوصف 1": "وصف العينة",
            "الوصف 2": "",
            "الوصف 3": "",
            "إمكانات العملاء": "A",
            "طريقة التواصل مع المجموعة": "انستغرام",
            "اسم الحملة": "M1"
        }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sample");
    XLSX.writeFile(workbook, "sample_template.xlsx");
}

// المتغيرات العالمية لإدارة الحالة
let currentPage = 1;
let currentSearchTerm = '';
const pageSize = 5; // عدد العناصر في كل صفحة

// وظيفة إدارة البحث
export function handleSearch() {
    const searchInput = document.getElementById('search-input');
    currentSearchTerm = searchInput.value.trim();
    currentPage = 1; // العودة إلى الصفحة الأولى عند البحث
    loadUploadedFiles();
}

// تحميل الملفات تحميل وظائف API
export async function loadUploadedFiles(currentPage = 1, currentSearchTerm = '') {
    const filesContainer = document.getElementById('files-container');
    const paginationContainer = document.getElementById('pagination-container');
    
    // عرض حالة التحميل
    filesContainer.innerHTML = `
        <div class="loading">
            <i class="material-icons">hourglass_empty</i>
            <p>جاري تحميل الملفات ... </p>
        </div>
    `;
    paginationContainer.innerHTML = '';
    
    // يبني URL مع معلمات الصفحة والبحث
    const apiBaseUrl = window.location.origin;
    const token = localStorage.getItem('authToken');
    
    const apiUrl = new URL(`${apiBaseUrl}/api/v1/file-result`);
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
        
        if (!response.ok) throw new Error('خطأ في تلقي المعلومات من الخادم');
        
        const data = await response.json();
        
        if (data.meta && data.meta.is_success) {
            renderFilesList(data.data);
            renderPagination(data.meta);
        } else {
            throw new Error(data.meta?.description || 'خطأ في تلقي المعلومات');
        }

    } catch (error) {
        console.error('Error loading files:', error);
        showNotification('خطأ في تلقي البيانات', 'error');
    }
}

// وظيفة renderFilesList تصحيح على النحو التالي:
export function renderFilesList(files) {
    const filesContainer = document.getElementById('files-container');
    
    if (!files || files.length === 0) {
        filesContainer.innerHTML = `
            <div class="loading flex flex-col items-center justify-center p-6">
                <i class="material-icons text-4xl text-gray-400 mb-2">folder_open</i>
                <p class="text-gray-500">لم يتم العثور على ملفات. </p>
            </div>
        `;
        return;
    }
    
    let filesHTML = '';
    
    files.forEach(file => {
        const fileSize = file.filesize ? formatFileSize(file.filesize) : 'مجهول';
        const uploadDate = file.uploadedat ? formatDate(file.uploadedat) : 'مجهول';
        const statusClass = file.errormessage ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
        const statusText = file.errormessage ? 'فشل' : 'ناجح';
        const errorIcon = file.errormessage ? 'error' : 'check_circle';
        
        filesHTML += `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow mb-3">
                <div class="flex items-center flex-1">
                    <i class="material-icons text-gray-500 mr-3">description</i>
                    <div class="flex-1">
                        <p class="text-sm font-medium text-gray-800">${file.filename}</p>
                        <div class="flex items-center mt-2 text-xs text-gray-500">
                            <span class="ml-3"><i class="material-icons text-xs mr-1">storage</i> ${fileSize}</span>
                            <span><i class="material-icons text-xs mr-1">schedule</i> ${uploadDate}</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center space-x-2 rtl:space-x-reverse">
                    <span class="px-3 py-1 ${statusClass} text-xs rounded-full flex items-center">
                        <i class="material-icons text-xs mr-1">${errorIcon}</i>
                        ${statusText}
                    </span>
                </div>
            </div>
        `;
    });
    
    filesContainer.innerHTML = filesHTML;
}

// وظيفة الخلق pagination
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
    
    // إذا كانت هناك صفحة واحدة فقط، pagination لا تظهر
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // الزر السابق
    paginationHTML += `
        <button class="page-btn" ${pageNum === 1 ? 'disabled' : ''} data-page="${pageNum - 1}">
            <i class="material-icons">chevron_right</i>
        </button>
    `;
    
    // إنتاج أزرار الصفحات
    const startPage = Math.max(1, pageNum - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="page-btn ${i === pageNum ? 'active' : ''}" data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    // الزر التالي
    paginationHTML += `
        <button class="page-btn" ${pageNum === totalPages ? 'disabled' : ''} data-page="${pageNum + 1}">
            <i class="material-icons">chevron_left</i>
        </button>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
    
    // يضيف event listener إلى الأزرار pagination
    const pageButtons = paginationContainer.querySelectorAll('.page-btn');
    pageButtons.forEach(button => {
        button.addEventListener('click', () => {
            const page = parseInt(button.getAttribute('data-page'));
            if (page && page !== currentPage) {
                currentPage = page;
                loadUploadedFiles();
            }
        });
    });
}

// وظيفة مساعدة لتنسيق حجم الملف
export function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// وظيفة مساعدة لتنسيق التاريخ
export function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}

