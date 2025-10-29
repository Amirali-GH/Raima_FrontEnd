import { showNotification, debounce } from "./systemAdmin.js";
import { currentState } from "./state.js";
// -------------------- إدارة العملاء ---------------------

export function initCustomersTab() {
    console.log("Initializing Customers Tab...");
    
    // التحقق من دور المستخدم
    const user = currentState.user;
    const isAdmin = user && currentState.user.userrolename === 'admin';
    
    // إدارة عرض مرشح الفرع
    const branchFilterContainer = document.getElementById('branch-filter-container');
    if (branchFilterContainer) {
        if (isAdmin) {
            // للمسؤول: تحميل الفلتر وعرض الفلتر
            loadBranchesForFilter().then(() => {
                // التحميل الأولي للإحصائيات والجداول لجميع الفروع
                loadStatusStats(0);
                loadCustomers();
            });
        } else {
            // للمستخدم العادي: قم بإخفاء عامل تصفية الفرع
            branchFilterContainer.style.display = 'none';
            // تحميل الإحصائيات والجداول لفرع المستخدم الحالي
            const userBranchId = user.branchid || 0;
            loadStatusStats(userBranchId);
            loadCustomers();
        }
    }

    // event listener لتغيير الفرع (للمسؤول فقط)
    const branchFilter = document.getElementById('branch-filter');
    if (branchFilter && isAdmin) {
        branchFilter.addEventListener('change', function() {
            const branchId = parseInt(this.value);
            // التحديث المتزامن للإحصائيات والجداول
            loadStatusStats(branchId);
            loadCustomers(1, '', 'both', branchId); // يضيف branchId الى المعلمة
        });
    }
    
    // باقي الكود لم يتغير ...
    // فتح النموذج لإضافة العميل
    const addCustomerBtn = document.getElementById('add-customer-btn');
    if (addCustomerBtn) {
        addCustomerBtn.addEventListener('click', function() {
            document.getElementById('customer-modal-title').textContent = 'إضافة عميل جديد';
            document.getElementById('customer-form').reset();
            document.getElementById('customer-id').value = '';
            document.getElementById('customer-modal').classList.remove('hidden');
        });
    } 
    
    // تسجيل نموذج العميل
    const customerForm = document.getElementById('customer-form');
    if (customerForm) {
        customerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveCustomer();
        });
    }
    
     // تصفية العملاء
    const customerSearch = document.getElementById('customer-search');
    if (customerSearch) {
        customerSearch.addEventListener('input', debounce(function() {
            const search = this.value;
            const status = document.getElementById('customer-status-filter').value;
            const branchId = getCurrentBranchId(); // الحصول branchId حاضِر
            loadCustomers(1, search, status, branchId);
        }, 300));
    }
    
    const customerStatusFilter = document.getElementById('customer-status-filter');
    if (customerStatusFilter) {
        customerStatusFilter.addEventListener('change', function() {
            const search = document.getElementById('customer-search').value;
            const status = this.value;
            const branchId = getCurrentBranchId(); // الحصول branchId حاضِر
            loadCustomers(1, search, status, branchId);
        });
    }
    
    // إغلاق الطرائق
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.classList.add('hidden');
            });
        });
    });
    
    // زر إخراج ممتاز
    const exportCustomersBtn = document.getElementById('export-customers-btn');
    if (exportCustomersBtn) {
        exportCustomersBtn.addEventListener('click', exportCustomers);
    }
}

// وظيفة تحميل الفروع في الفلتر
export async function loadBranchesForFilter() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('No auth token found');
            return;
        }

        const response = await fetch(`${apiBaseUrl}/api/v1/branch`, {
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            }
        });
        
        if (!response.ok) throw new Error(`خطأ في استلام الفروع: ${response.status}`);
        
        const data = await response.json();
        if (!data.data || !Array.isArray(data.data)) {
            throw new Error('بنية البيانات المستلمة غير صالحة');
        }
        
        const branchSelect = document.getElementById('branch-filter');
        
        if (branchSelect) {
            // يمسح الخيارات الحالية (باستثناء الخيار الأول)
            branchSelect.innerHTML = '<option value="0">جميع الفروع </option>';
            
            data.data.forEach(branch => {
                if (branch.branchid && branch.mainname) {
                    const option = document.createElement('option');
                    option.value = branch.branchid;
                    option.textContent = branch.mainname;
                    branchSelect.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('Error loading branches for filter:', error);
        const branchSelect = document.getElementById('branch-filter');
        if (branchSelect) {
            branchSelect.innerHTML = '<option value="0">خطأ في تحميل الفروع </option>';
        }
    }
}

// وظيفة مساعدة للحصول عليها branchId يعتمد حاليا على دور المستخدم
function getCurrentBranchId() {
    const user = currentState.user;
    const isAdmin = user && currentState.user.userrolename === 'admin';
    
    if (!isAdmin) {
        return user.branchid || 0;
    }
    
    // نحن نستخدم المرشحات للمسؤول
    const branchFilter = document.getElementById('branch-filter');
    if (branchFilter) {
        return parseInt(branchFilter.value) || 0;
    }
    
    return 0;
}

export async function loadCustomers(page = 1, search = '', status = 'both', branchId = null) {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        // لو branchId دون تغيير، نستخدم الوظيفة المساعدة
        if (branchId === null) {
            branchId = getCurrentBranchId();
        }
        
        let url = `${apiBaseUrl}/api/v1/customer?page=${page}`;
        if (search) url += `&context=${encodeURIComponent(search)}`;
        
        // يضيف branchId ل URL إذا كان لديه المبلغ
        if (branchId !== 0) {
            url += `&branchid=${branchId}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('خطأ في تلقي البيانات');
        
        const data = await response.json();
        
        renderCustomersTable(data.data);
        renderCustomersPagination(data.meta, page, search, status, branchId);
    } catch (error) {
        console.error('Error loading customers:', error);
        showNotification('خطأ في تلقي البيانات', 'error');
    }
}

export function renderCustomersPagination(meta, currentPage, search, status, branchId = null) {
    const paginationContainer = document.getElementById('customers-pagination');
    if (!paginationContainer || !meta) return;

    const currentPageNum = Math.max(1, parseInt(currentPage, 10));
    const totalSize = parseInt(meta.page.total_size, 10);
    const pageSize = parseInt(meta.page.page_size || meta.page.default_page_size, 10);
    const totalPages = Math.max(1, Math.ceil(totalSize / pageSize));

    // نحن نحد من الصفحة الحالية التي تزيد عن totalPages لا
    const safeCurrentPage = Math.min(currentPageNum, totalPages);

    const hasPrevPage = safeCurrentPage > 1;
    const hasNextPage = safeCurrentPage < totalPages;

    // منطق عرض الصفحات
    let paginationHTML = `
        <div class="flex justify-between items-center">
            <div class="flex items-center space-x-2 space-x-reverse">
                <button class="pagination-btn px-3 py-1 border border-gray-300 rounded ${!hasPrevPage ? 'bg-gray-200 cursor-not-allowed text-gray-400' : 'hover:bg-gray-100'}" 
                    ${!hasPrevPage ? 'disabled' : ''} id="customers-prev-page">
                    سابق
                </button>
                
                <div class="flex items-center space-x-1 space-x-reverse" id="customers-pagination-numbers">
    `;

    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
            if (i === safeCurrentPage) {
                paginationHTML += `<span class="px-3 py-1 border border-purple-500 bg-purple-500 text-white rounded">${i}</span>`;
            } else {
                paginationHTML += `<button class="pagination-page-btn px-3 py-1 border border-gray-300 rounded hover:bg-gray-100" data-page="${i}">${i}</button>`;
            }
        }
    } else {
        if (safeCurrentPage > 1) {
            paginationHTML += `<button class="pagination-page-btn px-3 py-1 border border-gray-300 rounded hover:bg-gray-100" data-page="1">1</button>`;
        }

        let startPage = Math.max(2, safeCurrentPage - 2);
        let endPage = Math.min(totalPages - 1, safeCurrentPage + 2);

        if (safeCurrentPage <= 4) {
            startPage = 2;
            endPage = 5;
        } else if (safeCurrentPage >= totalPages - 3) {
            startPage = totalPages - 4;
            endPage = totalPages - 1;
        }

        if (startPage > 2) paginationHTML += `<span class="px-2">...</span>`;

        for (let i = startPage; i <= endPage; i++) {
            if (i === safeCurrentPage) {
                paginationHTML += `<span class="px-3 py-1 border border-purple-500 bg-purple-500 text-white rounded">${i}</span>`;
            } else {
                paginationHTML += `<button class="pagination-page-btn px-3 py-1 border border-gray-300 rounded hover:bg-gray-100" data-page="${i}">${i}</button>`;
            }
        }

        if (endPage < totalPages - 1) paginationHTML += `<span class="px-2">...</span>`;

        if (safeCurrentPage < totalPages) {
            paginationHTML += `<button class="pagination-page-btn px-3 py-1 border border-gray-300 rounded hover:bg-gray-100" data-page="${totalPages}">${totalPages}</button>`;
        }
    }

    paginationHTML += `
                </div>
                
                <button class="pagination-btn px-3 py-1 border border-gray-300 rounded ${!hasNextPage ? 'bg-gray-200 cursor-not-allowed text-gray-400' : 'hover:bg-gray-100'}" 
                    ${!hasNextPage ? 'disabled' : ''} id="customers-next-page">
                    التالي
                </button>
            </div>
        </div>
    `;

    paginationContainer.innerHTML = paginationHTML;

    // event listener الزر السابق
    const prevButton = document.getElementById('customers-prev-page');
    if (prevButton && hasPrevPage) {
        prevButton.addEventListener('click', () => {
            const currentBranchId = getCurrentBranchId();
            loadCustomers(safeCurrentPage - 1, search, status, currentBranchId);
        });
    }

    // event listener الزر التالي
    const nextButton = document.getElementById('customers-next-page');
    if (nextButton && hasNextPage) {
        nextButton.addEventListener('click', () => {
            const currentBranchId = getCurrentBranchId();
            loadCustomers(safeCurrentPage + 1, search, status, currentBranchId);
        });
    }

    // event listener أزرار أرقام الصفحات
    const pageButtons = paginationContainer.querySelectorAll('.pagination-page-btn');
    pageButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const page = parseInt(e.target.getAttribute('data-page'), 10);
            if (page !== safeCurrentPage) {
                const currentBranchId = getCurrentBranchId();
                loadCustomers(page, search, status, currentBranchId);
            }
        });
    });
}

export function renderCustomersTable(customers) {
    const tbody = document.getElementById('customers-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!customers || customers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-4 text-center text-gray-500">
                    لم يتم العثور على أي حالة
                </td>
            </tr>
        `;
        return;
    }
    
    customers.forEach(customer => {
        const row = document.createElement('tr');
        
        const cleanPhone = customer.phone ? customer.phone.replace('$', '') : '-';
        const cleanNationalId = customer.nationalid ? customer.nationalid.replace('$', '') : '-';
           
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                ${customer.customerid}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                ${customer.fullname || ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                ${customer.phone || ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                ${customer.customerstatus || ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                ${customer.requestedcarname || ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                ${customer.branchname || ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                ${customer.saleagentname || ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                <button class="text-blue-600 hover:text-blue-900 view-customer mr-3" data-id="${customer.customerid}">
                    <i class="material-icons text-base">visibility</i>
                </button>
                <button class="text-purple-600 hover:text-purple-900 edit-customer mr-3" data-id="${customer.customerid}">
                    <i class="material-icons text-base">edit</i>
                </button>
                <button class="text-red-600 hover:text-red-900 delete-customer" data-id="${customer.customerid}">
                    <i class="material-icons text-base">delete</i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    document.querySelectorAll('.view-customer').forEach(button => {
        button.addEventListener('click', function() {
            const customerId = this.getAttribute('data-id');
            viewCustomerDetails(customerId);
        });
    });
    
    document.querySelectorAll('.edit-customer').forEach(button => {
        button.addEventListener('click', function() {
            const customerId = this.getAttribute('data-id');
            editCustomer(customerId);
        });
    });
    
    document.querySelectorAll('.delete-customer').forEach(button => {
        button.addEventListener('click', function() {
            const customerId = this.getAttribute('data-id');
            deleteCustomer(customerId);
        });
    });
}

export async function saveCustomer() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        const customerId = document.getElementById('customer-id').value;
        
        const customerData = {
            firstname: document.getElementById('customer-firstname').value,
            lastname: document.getElementById('customer-lastname').value,
            phone: document.getElementById('customer-phone').value,
            email: document.getElementById('customer-email').value,
            nationalid: document.getElementById('customer-nationalid').value,
            address: document.getElementById('customer-address').value,
            budget: document.getElementById('customer-budget').value ? parseInt(document.getElementById('customer-budget').value) : null,
            isactive: document.getElementById('customer-isactive').checked,
            description: document.getElementById('customer-description').value
        };
        
        const url = customerId 
            ? `${apiBaseUrl}/api/v1/customer/${customerId}`
            : `${apiBaseUrl}/api/v1/customer`;
            
        const method = customerId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(customerData)
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            if (response.status === 409) {
                throw new Error(responseData.meta.description || 'البريد الإلكتروني أو رقم الهاتف أو ترميز العميل مكرر');
            } else if (response.status === 404) {
                throw new Error('لم يتم العثور على العميل');
            } else {
                throw new Error(responseData.meta.description || 'خطأ في حفظ البيانات');
            }
        }
        
        document.getElementById('customer-modal').classList.add('hidden');
        showNotification(responseData.meta.description || 'تم تخزين المعلومات بنجاح', 'success');
        loadCustomers();
    } catch (error) {
        console.error('Error saving customer:', error);
        showNotification(error.message || 'خطأ في حفظ البيانات', 'error');
    }
}

export async function editCustomer(customerId) {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/customer/${customerId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('لم يتم العثور على العميل');
            } else {
                throw new Error('خطأ في تلقي البيانات');
            }
        }
        
        const data = await response.json();
        const customer = data.data;
        
        document.getElementById('customer-modal-title').textContent = 'تحرير العملاء';
        document.getElementById('customer-id').value = customer.customerid;
        document.getElementById('customer-firstname').value = customer.firstname || '';
        document.getElementById('customer-lastname').value = customer.lastname || '';
        document.getElementById('customer-phone').value = customer.phone || '';
        document.getElementById('customer-email').value = customer.email || '';
        document.getElementById('customer-nationalid').value = customer.nationalid || '';
        document.getElementById('customer-address').value = customer.address || '';
        document.getElementById('customer-budget').value = customer.budget || '';
        document.getElementById('customer-description').value = customer.description || '';
        document.getElementById('customer-isactive').checked = customer.isactive;
        
        document.getElementById('customer-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading customer:', error);
        showNotification(error.message || 'خطأ في تلقي البيانات', 'error');
    }
}

export async function viewCustomerDetails(customerId) {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/customer/${customerId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('لم يتم العثور على العميل');
            } else {
                throw new Error('خطأ في تلقي البيانات');
            }
        }
        
        const data = await response.json();
        const customer = data.data;
        
        const customerInfo = document.getElementById('customer-detail-info');
        customerInfo.innerHTML = `
            <div>
                <p class="text-sm text-gray-600">المعرف: <span class="font-medium">${customer.customerid}</span></p>
                <p class="text-sm text-gray-600">الاسم الكامل: <.span class="font-medium">${customer.firstname} ${customer.lastname}</span></p>
                <p class="text-sm text-gray-600">الهاتف: <.span class="font-medium">${customer.phone || '-'}</span></p>
                <p class="text-sm text-gray-600">البريد الإلكتروني: <.span class="font-medium">${customer.email || '-'}</span></p>
            </div>
            <div>
                <p class="text-sm text-gray-600">الرمز الوطني: <.span class="font-medium">${customer.nationalid || '-'}</span></p>
                <p class="text-sm text-gray-600">الميزانية: <.span class="font-medium">${customer.budget ? new Intl.NumberFormat('fa-IR').format(customer.budget) + ' تومان' : '-'}</span></p>
                <p class="text-sm text-gray-600">العنوان: <.span class="font-medium">${customer.address || '-'}</span></p>
                <p class="text-sm text-gray-600">الحالة: <.span class="font-medium">${customer.isactive ? 'نشيط' : 'عاجز'}</span></p>
            </div>
            ${customer.description ? `
            <div class="col-span-2">
                <p class="text-sm text-gray-600">الوصف: <.span class="font-medium">${customer.description}</span></p>
            </div>
            ` : ''}
        `;
        
        document.getElementById('customer-detail-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading customer details:', error);
        showNotification(error.message || 'خطأ في تلقي البيانات', 'error');
    }
}

export async function deleteCustomer(customerId) {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟ لا يمكن إرجاع هذا الإجراء.')) return;
    
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/customer/${customerId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('لم يتم العثور على العميل!');
            } else {
                throw new Error(responseData.meta.description || 'خطأ في حذف البيانات');
            }
        }
        
        showNotification(responseData.meta.description || 'تمت إزالة العميل بنجاح', 'success');
        loadCustomers();
    } catch (error) {
        console.error('Error deleting customer:', error);
        showNotification(error.message || 'خطأ في حذف البيانات', 'error');
    }
}
// --------------------------- NEW FUNCTION ---------------------------
export async function exportCustomers() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        if (!token) {
            showNotification('الرجاء تسجيل الدخول أولا');
            return;
        }

        createProcessingModalIfNotExists();
        const processingModal = document.getElementById('export-processing-modal');
        processingModal.classList.remove('hidden');

        const search = document.getElementById('customer-search')?.value || '';
        const status = document.getElementById('customer-status-filter')?.value || 'both';
        const branchId = getCurrentBranchId(); // استخدام الوظيفة المساعدة

        let requestUrl = `${apiBaseUrl}/api/v1/customer`;
        const params = new URLSearchParams();
        if (search) params.set('context', encodeURIComponent(search));
        if (status !== 'both') params.set('status', status);
        
        // يضيف branchId إلى المعلمات إذا كان لديه المبلغ
        if (branchId !== 0) {
            params.set('branchid', branchId);
        }
        
        if (params.toString()) {
            requestUrl += `?${params.toString()}`;
        }

        // باقي الكود لم يتغير ...
        const allItems = [];
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        let nextUrl = requestUrl;
        while (nextUrl) {
            const resp = await fetch(nextUrl, { headers });
            if (!resp.ok) throw new Error(`خطأ في تلقي البيانات: ${resp.status}`);

            const json = await resp.json();

            if (!json.data || !Array.isArray(json.data)) {
                throw new Error('البيانات المستلمة لا تحتوي على البنية المتوقعة.');
            }

            allItems.push(...json.data);

            const pageMeta = json.meta && json.meta.page;
            if (pageMeta && pageMeta.next_page_uri) {
                if (pageMeta.next_page_uri.startsWith('http')) {
                    nextUrl = pageMeta.next_page_uri;
                } else {
                    nextUrl = apiBaseUrl.replace(/\/$/, '') + pageMeta.next_page_uri;
                }
            } else {
                nextUrl = null;
            }
        }

        if (allItems.length === 0) {
            showNotification('لا توجد بيانات للإخراج.', 'error');
            return;
        }

        // إظهار الرسالة أثناء إنشاء الملفات
        updateProcessingMessage('في إنشاء ملف Excel ...');

        // تعيين الحقل إلى أعمدة Excel
        const normalized = allItems.map(item => {
            return {
                'هاتف': item.phone || '',
                'الاسم الكامل': item.fullname || '',
                'الرمز الوطني': item.nationalid || '',
                'حالة': item.customerstatus || (item.isactive ? 'نشيط' : 'عاجز'),
                'طلبت السيارة': item.requestedcarname || '',
                'فرع': item.branchname || '',
                'خبير': item.saleagentname || '',
                'تاريخ المكالمة الأخيرة': item.lastcontactdate_shams || '',
                'ملاحظة 1': item.notes1 || '',
                'ملاحظة 1': item.notes2 || '',
                'ملاحظة 1': item.notes3 || '',
                'محتمل': item.potentialcode || '',
                'حملة': item.campaigncode || ''
            };
        });

        // التحويل إلى أوراق وإنشاء ملف Excel
        const worksheet = XLSX.utils.json_to_sheet(normalized);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'عملاء');

        const nowStr = new Date().toLocaleDateString('fa-IR').replace(/\//g, '-');
        const filename = `export_customers_${nowStr}.xlsx`;
        
        // إظهار الرسالة النهائية
        updateProcessingMessage('حمل الملف...');
        
        // قم بإنشاء تأخير بسيط لعرض الرسالة
        await new Promise(resolve => setTimeout(resolve, 500));
        
        XLSX.writeFile(workbook, filename);
        
        showNotification('تم إنتاج ملف Excel وتنزيله بنجاح.', 'success');

    } catch (error) {
        console.error('exportCustomers error:', error);
        showNotification('خطأ عند الخروج: ' + (error.message || error), 'error');
    } finally {
        // يخفي modal يعالج
        const processingModal = document.getElementById('export-processing-modal');
        if (processingModal) {
            processingModal.classList.add('hidden');
        }
    }
}

// وظيفة لإنشاء modal المعالجة في حالة الغياب
function createProcessingModalIfNotExists() {
    if (document.getElementById('export-processing-modal')) {
        return;
    }

    const modalHtml = `
        <div id="export-processing-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
            <div class="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
                <div class="flex flex-col items-center">
                    <div class="spinner mb-4"></div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">قيد المعالجة </h3>
                    <p id="export-processing-message" class="text-gray-600 text-center">استقبال البيانات من الخادم ... </p>
                </div>
            </div>
        </div>
    `;

    // إضافة نمط ل spinner إذا لم يكن هناك
    if (!document.querySelector('style#export-spinner-style')) {
        const style = document.createElement('style');
        style.id = 'export-spinner-style';
        style.textContent = `
            .spinner {
                border: 4px solid rgba(0, 0, 0, 0.1);
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border-left-color: #6d28d9;
                animation: spin 1s ease infinite;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// وظيفة لتحديث الرسالة في modal يعالج
function updateProcessingMessage(message) {
    const messageEl = document.getElementById('export-processing-message');
    if (messageEl) {
        messageEl.textContent = message;
    }
}


// -------------------- إدارة الإحصائيات --------------------
export async function loadStatusStats(branchId = 0) {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('No auth token found');
            return;
        }

        // التحقق من دور المستخدم
        const user = currentState.user;
        const isAdmin = user && currentState.user.userrolename === 'admin';
        
        // إذا كان المستخدم طبيعيا، من branchid نحن نستخدم المستخدم
        if (!isAdmin && user && user.branchid) {
            branchId = user.branchid;
        }

        const statusCodes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const container = document.getElementById('status-cards-container');
        
        if (!container) return;

        // منظر loading
        container.innerHTML = `
            <div class="col-span-full text-center py-4">
                <div class="spinner mx-auto mb-2"></div>
                <p class="text-gray-600">يتم استلام الإحصائيات...</p>
            </div>
        `;

        const statsData = [];
        let totalPhones = 0;
        
        // تلقي إحصائيات لكل status_code
        for (const statusCode of statusCodes) {
            try {
                let url = `${apiBaseUrl}/api/v1/phoneassignment/result/header_assignment?status_code=${statusCode}`;
                
                // يضيف branchId لطلب جميع المستخدمين (إذا كان له قيمة)
                if (branchId !== 0) {
                    url += `&branchid=${branchId}`;
                }

                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    const count = data.data.total_phones || 0;
                    statsData.push({
                        status_code: statusCode,
                        total_phones: count
                    });
                    totalPhones += count;
                } else {
                    console.error(`Error loading status ${statusCode}:`, response.status);
                    statsData.push({
                        status_code: statusCode,
                        total_phones: 0
                    });
                }
            } catch (error) {
                console.error(`Error loading status ${statusCode}:`, error);
                statsData.push({
                    status_code: statusCode,
                    total_phones: 0
                });
            }
        }

        // عرض البطاقات
        renderStatusCards(statsData, totalPhones, branchId);

    } catch (error) {
        console.error('Error loading status stats:', error);
        const container = document.getElementById('status-cards-container');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full text-center py-4 text-red-600">
                    خطأ في تلقي الإحصائيات
                </div>
            `;
        }
    }
}

// وظيفة لعرض بطاقات الحالة
function renderStatusCards(statsData, totalPhones, branchId) {
    const container = document.getElementById('status-cards-container');
    if (!container) return;

    if (!statsData || statsData.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-4 text-gray-500">
                لا توجد بيانات لإظهارها
            </div>
        `;
        return;
    }

    // التحقق من دور المستخدم
    const user = currentState.user;
    const isAdmin = user && currentState.user.userrolename === 'admin';
    
    const statusConfig = {
        1: { 
            name: 'انعدام المساءلة', 
            color: 'red', 
            icon: 'phone_disabled',
            description: 'تم الاتصال ولكن لم يتم الرد.'
        },
        2: { 
            name: 'نتطلع إلى إرسال المستندات', 
            color: 'blue', 
            icon: 'description',
            description: 'وأوضح - في انتظار التقديم'
        },
        3: { 
            name: 'نية الزيارة شخصيا', 
            color: 'green', 
            icon: 'directions_walk',
            description: 'وأوضح'
        },
        4: { 
            name: 'المتابعة في المستقبل', 
            color: 'purple', 
            icon: 'schedule',
            description: 'وأوضح - المتابعة ضرورية في المستقبل'
        },
        5: { 
            name: 'نية الشراء بالتقسيط', 
            color: 'teal', 
            icon: 'credit_card',
            description: 'حريصون على الشراء بالتقسيط'
        },
        6: { 
            name: 'انهم لن يشترون', 
            color: 'gray', 
            icon: 'cancel',
            description: 'لا تنوي شراء في الوقت الراهن.'
        },
        7: { 
            name: 'لقد جاءوا', 
            color: 'emerald', 
            icon: 'how_to_reg',
            description: 'تمت إحالته / الاستمارة كاملة في المجموعة الصحية'
        },
        8: { 
            name: 'الشراء من مكان آخر', 
            color: 'orange', 
            icon: 'store',
            description: 'قاموا بمشترياتهم من السوق الحرة أو مجموعة أخرى'
        },
        9: { 
            name: 'الرقم الخطأ', 
            color: 'slate', 
            icon: 'error_outline',
            description: 'الرقم/الجمهور خاطئ'
        },
        10: { 
            name: 'عناصر خاصة أخرى', 
            color: 'indigo', 
            icon: 'more_horiz',
            description: 'بنود واستثناءات محددة أخرى'
        }
    };

    let cardsHTML = '';

    // بطاقات الحالة
    statsData.forEach(item => {
        const config = statusConfig[item.status_code] || { 
            name: 'مجهول', 
            color: 'gray', 
            icon: 'help',
            description: 'وضع لا جدال فيه'
        };
        
        cardsHTML += `
            <div class="bg-${config.color}-50 p-4 rounded-lg border border-${config.color}-200 transition-all duration-300 hover:shadow-md" title="${config.description}">
                <div class="flex items-center">
                    <i class="material-icons text-${config.color}-600 mr-2">${config.icon}</i>
                    <span class="text-sm text-${config.color}-800 font-medium">${config.name}</span>
                </div>
                <div class="text-xl font-bold text-${config.color}-700 mt-2">${item.total_phones.toLocaleString('fa-IR')}</div>
                <div class="text-xs text-${config.color}-800 opacity-75 mt-1">بطاقة تعريف: ${item.status_code}</div>
            </div>
        `;
    });

    // تحديد العنوان بناءً على دور المستخدم
    let branchTitle = '';
    if (isAdmin) {
        branchTitle = branchId === 0 ? 'جميع الفروع' : `فرع ${branchId}`;
    } else {
        branchTitle = `فرع ${user.branchid || 'حاضِر'}`;
    }

    // إجمالي البطاقة الموجزة
    cardsHTML += `
        <div class="bg-gradient-to-r from-purple-500 to-indigo-500 p-4 rounded-lg text-white col-span-full md:col-span-2 lg:col-span-1">
            <div class="flex items-center">
                <i class="material-icons text-white mr-2">summarize</i>
                <span class="text-sm font-medium">المجموع الكلي (${branchTitle})</span>
            </div>
            <div class="text-2xl font-bold mt-2">${totalPhones.toLocaleString('fa-IR')}</div>
            <div class="text-xs opacity-90 mt-1">العدد الإجمالي للأرقام في ${branchTitle}</div>
        </div>
    `;

    container.innerHTML = cardsHTML;
}

// وظيفة تحميل الفروع في قسم الإحصائيات
export async function loadBranchesForStats() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('No auth token found');
            return;
        }

        const response = await fetch(`${apiBaseUrl}/api/v1/branch`, {
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            }
        });
        
        if (!response.ok) throw new Error(`خطأ في استلام الفروع: ${response.status}`);
        
        const data = await response.json();
        if (!data.data || !Array.isArray(data.data)) {
            throw new Error('بنية البيانات المستلمة غير صالحة');
        }
        
        const branchSelect = document.getElementById('branch-stats-filter');
        
        if (branchSelect) {
            // يمسح الخيارات الحالية (باستثناء الخيار الأول)
            branchSelect.innerHTML = '<option value="0">جميع الفروع </option>';
            
            data.data.forEach(branch => {
                if (branch.branchid && branch.mainname) {
                    const option = document.createElement('option');
                    option.value = branch.branchid;
                    option.textContent = branch.mainname;
                    branchSelect.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('Error loading branches for stats:', error);
        const branchSelect = document.getElementById('branch-stats-filter');
        if (branchSelect) {
            branchSelect.innerHTML = '<option value="0">خطأ في تحميل الفروع </option>';
        }
    }
}
