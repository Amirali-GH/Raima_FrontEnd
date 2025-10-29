import { showNotification, debounce } from "./systemAdmin.js";
import { currentState } from "./state.js";
// -------------------- مدیریت مشتریان --------------------

export function initCustomersTab() {
    console.log("Initializing Customers Tab...");
    
    // بررسی نقش کاربر
    const user = currentState.user;
    const isAdmin = user && currentState.user.userrolename === 'admin';
    
    // مدیریت نمایش فیلتر شعبه
    const branchFilterContainer = document.getElementById('branch-filter-container');
    if (branchFilterContainer) {
        if (isAdmin) {
            // برای ادمین: بارگذاری شعب و نمایش فیلتر
            loadBranchesForFilter().then(() => {
                // بارگذاری اولیه آمار و جدول برای همه شعب
                loadStatusStats(0);
                loadCustomers();
            });
        } else {
            // برای کاربر عادی: مخفی کردن فیلتر شعبه
            branchFilterContainer.style.display = 'none';
            // بارگذاری آمار و جدول برای شعبه کاربر جاری
            const userBranchId = user.branchid || 0;
            loadStatusStats(userBranchId);
            loadCustomers();
        }
    }

    // event listener برای تغییر شعبه (فقط برای ادمین)
    const branchFilter = document.getElementById('branch-filter');
    if (branchFilter && isAdmin) {
        branchFilter.addEventListener('change', function() {
            const branchId = parseInt(this.value);
            // به‌روزرسانی همزمان آمار و جدول
            loadStatusStats(branchId);
            loadCustomers(1, '', 'both', branchId); // اضافه کردن branchId به پارامتر
        });
    }
    
    // بقیه کد بدون تغییر...
    // باز کردن مودال برای افزودن مشتری
    const addCustomerBtn = document.getElementById('add-customer-btn');
    if (addCustomerBtn) {
        addCustomerBtn.addEventListener('click', function() {
            document.getElementById('customer-modal-title').textContent = 'افزودن مشتری جدید';
            document.getElementById('customer-form').reset();
            document.getElementById('customer-id').value = '';
            document.getElementById('customer-modal').classList.remove('hidden');
        });
    } 
    
    // ثبت فرم مشتری
    const customerForm = document.getElementById('customer-form');
    if (customerForm) {
        customerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveCustomer();
        });
    }
    
     // فیلتر کردن مشتریان
    const customerSearch = document.getElementById('customer-search');
    if (customerSearch) {
        customerSearch.addEventListener('input', debounce(function() {
            const search = this.value;
            const status = document.getElementById('customer-status-filter').value;
            const branchId = getCurrentBranchId(); // گرفتن branchId فعلی
            loadCustomers(1, search, status, branchId);
        }, 300));
    }
    
    const customerStatusFilter = document.getElementById('customer-status-filter');
    if (customerStatusFilter) {
        customerStatusFilter.addEventListener('change', function() {
            const search = document.getElementById('customer-search').value;
            const status = this.value;
            const branchId = getCurrentBranchId(); // گرفتن branchId فعلی
            loadCustomers(1, search, status, branchId);
        });
    }
    
    // بستن مودال‌ها
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.classList.add('hidden');
            });
        });
    });
    
    // دکمه خروجی اکسل
    const exportCustomersBtn = document.getElementById('export-customers-btn');
    if (exportCustomersBtn) {
        exportCustomersBtn.addEventListener('click', exportCustomers);
    }
}

// تابع برای بارگذاری شعب در فیلتر
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
        
        if (!response.ok) throw new Error(`خطا در دریافت شعب: ${response.status}`);
        
        const data = await response.json();
        if (!data.data || !Array.isArray(data.data)) {
            throw new Error('ساختار داده‌های دریافتی نامعتبر است');
        }
        
        const branchSelect = document.getElementById('branch-filter');
        
        if (branchSelect) {
            // پاک کردن options فعلی (به جز option اول)
            branchSelect.innerHTML = '<option value="0">همه شعب</option>';
            
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
            branchSelect.innerHTML = '<option value="0">خطا در بارگذاری شعب</option>';
        }
    }
}

// تابع کمکی برای گرفتن branchId فعلی بر اساس نقش کاربر
function getCurrentBranchId() {
    const user = currentState.user;
    const isAdmin = user && currentState.user.userrolename === 'admin';
    
    if (!isAdmin) {
        return user.branchid || 0;
    }
    
    // برای ادمین از فیلتر استفاده می‌کنیم
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
        
        // اگر branchId مشخص نشده، از تابع کمکی استفاده می‌کنیم
        if (branchId === null) {
            branchId = getCurrentBranchId();
        }
        
        let url = `${apiBaseUrl}/api/v1/customer?page=${page}`;
        if (search) url += `&context=${encodeURIComponent(search)}`;
        
        // اضافه کردن branchId به URL اگر مقدار داشته باشد
        if (branchId !== 0) {
            url += `&branchid=${branchId}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('خطا در دریافت داده‌ها');
        
        const data = await response.json();
        
        renderCustomersTable(data.data);
        renderCustomersPagination(data.meta, page, search, status, branchId);
    } catch (error) {
        console.error('Error loading customers:', error);
        showNotification('خطا در دریافت داده‌ها', 'error');
    }
}

export function renderCustomersPagination(meta, currentPage, search, status, branchId = null) {
    const paginationContainer = document.getElementById('customers-pagination');
    if (!paginationContainer || !meta) return;

    const currentPageNum = Math.max(1, parseInt(currentPage, 10));
    const totalSize = parseInt(meta.page.total_size, 10);
    const pageSize = parseInt(meta.page.page_size || meta.page.default_page_size, 10);
    const totalPages = Math.max(1, Math.ceil(totalSize / pageSize));

    // صفحه جاری رو محدود می‌کنیم که بیشتر از totalPages نشه
    const safeCurrentPage = Math.min(currentPageNum, totalPages);

    const hasPrevPage = safeCurrentPage > 1;
    const hasNextPage = safeCurrentPage < totalPages;

    // منطق نمایش صفحات
    let paginationHTML = `
        <div class="flex justify-between items-center">
            <div class="flex items-center space-x-2 space-x-reverse">
                <button class="pagination-btn px-3 py-1 border border-gray-300 rounded ${!hasPrevPage ? 'bg-gray-200 cursor-not-allowed text-gray-400' : 'hover:bg-gray-100'}" 
                    ${!hasPrevPage ? 'disabled' : ''} id="customers-prev-page">
                    قبلی
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
                    بعدی
                </button>
            </div>
        </div>
    `;

    paginationContainer.innerHTML = paginationHTML;

    // event listener دکمه قبلی
    const prevButton = document.getElementById('customers-prev-page');
    if (prevButton && hasPrevPage) {
        prevButton.addEventListener('click', () => {
            const currentBranchId = getCurrentBranchId();
            loadCustomers(safeCurrentPage - 1, search, status, currentBranchId);
        });
    }

    // event listener دکمه بعدی
    const nextButton = document.getElementById('customers-next-page');
    if (nextButton && hasNextPage) {
        nextButton.addEventListener('click', () => {
            const currentBranchId = getCurrentBranchId();
            loadCustomers(safeCurrentPage + 1, search, status, currentBranchId);
        });
    }

    // event listener دکمه‌های شماره صفحات
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
                    موردی یافت نشد
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
                throw new Error(responseData.meta.description || 'ایمیل یا شماره تلفن یا کدملی مشتری تکراری است');
            } else if (response.status === 404) {
                throw new Error('مشتری یافت نشد');
            } else {
                throw new Error(responseData.meta.description || 'خطا در ذخیره داده‌ها');
            }
        }
        
        document.getElementById('customer-modal').classList.add('hidden');
        showNotification(responseData.meta.description || 'اطلاعات با موفقیت ذخیره شد', 'success');
        loadCustomers();
    } catch (error) {
        console.error('Error saving customer:', error);
        showNotification(error.message || 'خطا در ذخیره داده‌ها', 'error');
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
                throw new Error('مشتری یافت نشد');
            } else {
                throw new Error('خطا در دریافت داده‌ها');
            }
        }
        
        const data = await response.json();
        const customer = data.data;
        
        document.getElementById('customer-modal-title').textContent = 'ویرایش مشتری';
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
        showNotification(error.message || 'خطا در دریافت داده‌ها', 'error');
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
                throw new Error('مشتری یافت نشد');
            } else {
                throw new Error('خطا در دریافت داده‌ها');
            }
        }
        
        const data = await response.json();
        const customer = data.data;
        
        const customerInfo = document.getElementById('customer-detail-info');
        customerInfo.innerHTML = `
            <div>
                <p class="text-sm text-gray-600">شناسه: <span class="font-medium">${customer.customerid}</span></p>
                <p class="text-sm text-gray-600">نام کامل: <span class="font-medium">${customer.firstname} ${customer.lastname}</span></p>
                <p class="text-sm text-gray-600">تلفن: <span class="font-medium">${customer.phone || '-'}</span></p>
                <p class="text-sm text-gray-600">ایمیل: <span class="font-medium">${customer.email || '-'}</span></p>
            </div>
            <div>
                <p class="text-sm text-gray-600">کد ملی: <span class="font-medium">${customer.nationalid || '-'}</span></p>
                <p class="text-sm text-gray-600">بودجه: <span class="font-medium">${customer.budget ? new Intl.NumberFormat('fa-IR').format(customer.budget) + ' تومان' : '-'}</span></p>
                <p class="text-sm text-gray-600">آدرس: <span class="font-medium">${customer.address || '-'}</span></p>
                <p class="text-sm text-gray-600">وضعیت: <span class="font-medium">${customer.isactive ? 'فعال' : 'غیرفعال'}</span></p>
            </div>
            ${customer.description ? `
            <div class="col-span-2">
                <p class="text-sm text-gray-600">توضیحات: <span class="font-medium">${customer.description}</span></p>
            </div>
            ` : ''}
        `;
        
        document.getElementById('customer-detail-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading customer details:', error);
        showNotification(error.message || 'خطا در دریافت داده‌ها', 'error');
    }
}

export async function deleteCustomer(customerId) {
    if (!confirm('آیا از حذف این مشتری اطمینان دارید؟ این عمل قابل بازگشت نیست.')) return;
    
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
                throw new Error('مشتری مورد نظر یافت نشد!');
            } else {
                throw new Error(responseData.meta.description || 'خطا در حذف داده‌ها');
            }
        }
        
        showNotification(responseData.meta.description || 'مشتری با موفقیت حذف شد', 'success');
        loadCustomers();
    } catch (error) {
        console.error('Error deleting customer:', error);
        showNotification(error.message || 'خطا در حذف داده‌ها', 'error');
    }
}
// --------------------------- NEW FUNCTION ---------------------------
export async function exportCustomers() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        if (!token) {
            showNotification('لطفاً ابتدا وارد سیستم شوید');
            return;
        }

        createProcessingModalIfNotExists();
        const processingModal = document.getElementById('export-processing-modal');
        processingModal.classList.remove('hidden');

        const search = document.getElementById('customer-search')?.value || '';
        const status = document.getElementById('customer-status-filter')?.value || 'both';
        const branchId = getCurrentBranchId(); // استفاده از تابع کمکی

        let requestUrl = `${apiBaseUrl}/api/v1/customer`;
        const params = new URLSearchParams();
        if (search) params.set('context', encodeURIComponent(search));
        if (status !== 'both') params.set('status', status);
        
        // اضافه کردن branchId به پارامترها اگر مقدار داشته باشد
        if (branchId !== 0) {
            params.set('branchid', branchId);
        }
        
        if (params.toString()) {
            requestUrl += `?${params.toString()}`;
        }

        // بقیه کد بدون تغییر...
        const allItems = [];
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        let nextUrl = requestUrl;
        while (nextUrl) {
            const resp = await fetch(nextUrl, { headers });
            if (!resp.ok) throw new Error(`خطا در دریافت داده‌ها: ${resp.status}`);

            const json = await resp.json();

            if (!json.data || !Array.isArray(json.data)) {
                throw new Error('داده‌های دریافتی ساختار مورد انتظار را ندارند.');
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
            showNotification('هیچ داده‌ای برای خروجی وجود ندارد.', 'error');
            return;
        }

        // نمایش پیام در حال تولید فایل
        updateProcessingMessage('در حال تولید فایل اکسل...');

        // نگاشت فیلدها به ستون‌های اکسل
        const normalized = allItems.map(item => {
            return {
                'تلفن': item.phone || '',
                'نام کامل': item.fullname || '',
                'کد ملی': item.nationalid || '',
                'وضعیت': item.customerstatus || (item.isactive ? 'فعال' : 'غیرفعال'),
                'خودرو درخواستی': item.requestedcarname || '',
                'شعبه': item.branchname || '',
                'کارشناس': item.saleagentname || '',
                'تاریخ آخرین تماس': item.lastcontactdate_shams || '',
                'یادداشت ۱': item.notes1 || '',
                'یادداشت ۲': item.notes2 || '',
                'یادداشت ۳': item.notes3 || '',
                'پتانسیل': item.potentialcode || '',
                'کمپین': item.campaigncode || ''
            };
        });

        // تبدیل به شیت و ساخت فایل اکسل
        const worksheet = XLSX.utils.json_to_sheet(normalized);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'مشتریان');

        const nowStr = new Date().toLocaleDateString('fa-IR').replace(/\//g, '-');
        const filename = `export_customers_${nowStr}.xlsx`;
        
        // نمایش پیام نهایی
        updateProcessingMessage('در حال دانلود فایل...');
        
        // ایجاد تأخیر کوچک برای نمایش پیام
        await new Promise(resolve => setTimeout(resolve, 500));
        
        XLSX.writeFile(workbook, filename);
        
        showNotification('فایل اکسل با موفقیت تولید و دانلود شد.', 'success');

    } catch (error) {
        console.error('exportCustomers error:', error);
        showNotification('خطا هنگام خروجی گرفتن: ' + (error.message || error), 'error');
    } finally {
        // مخفی کردن modal پردازش
        const processingModal = document.getElementById('export-processing-modal');
        if (processingModal) {
            processingModal.classList.add('hidden');
        }
    }
}

// تابع برای ایجاد modal پردازش در صورت عدم وجود
function createProcessingModalIfNotExists() {
    if (document.getElementById('export-processing-modal')) {
        return;
    }

    const modalHtml = `
        <div id="export-processing-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
            <div class="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
                <div class="flex flex-col items-center">
                    <div class="spinner mb-4"></div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">در حال پردازش</h3>
                    <p id="export-processing-message" class="text-gray-600 text-center">در حال دریافت داده‌ها از سرور...</p>
                </div>
            </div>
        </div>
    `;

    // اضافه کردن استایل برای spinner اگر وجود ندارد
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

// تابع برای به‌روزرسانی پیام در modal پردازش
function updateProcessingMessage(message) {
    const messageEl = document.getElementById('export-processing-message');
    if (messageEl) {
        messageEl.textContent = message;
    }
}


// -------------------- مدیریت آمار وضعیت‌ها --------------------
export async function loadStatusStats(branchId = 0) {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('No auth token found');
            return;
        }

        // بررسی نقش کاربر
        const user = currentState.user;
        const isAdmin = user && currentState.user.userrolename === 'admin';
        
        // اگر کاربر عادی است، از branchid کاربر استفاده می‌کنیم
        if (!isAdmin && user && user.branchid) {
            branchId = user.branchid;
        }

        const statusCodes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const container = document.getElementById('status-cards-container');
        
        if (!container) return;

        // نمایش loading
        container.innerHTML = `
            <div class="col-span-full text-center py-4">
                <div class="spinner mx-auto mb-2"></div>
                <p class="text-gray-600">در حال دریافت آمار...</p>
            </div>
        `;

        const statsData = [];
        let totalPhones = 0;
        
        // دریافت آمار برای هر status_code
        for (const statusCode of statusCodes) {
            try {
                let url = `${apiBaseUrl}/api/v1/phoneassignment/result/header_assignment?status_code=${statusCode}`;
                
                // اضافه کردن branchId به درخواست برای همه کاربران (اگر مقدار داشته باشد)
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

        // نمایش کارت‌ها
        renderStatusCards(statsData, totalPhones, branchId);

    } catch (error) {
        console.error('Error loading status stats:', error);
        const container = document.getElementById('status-cards-container');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full text-center py-4 text-red-600">
                    خطا در دریافت آمار
                </div>
            `;
        }
    }
}

// تابع برای نمایش کارت‌های وضعیت
function renderStatusCards(statsData, totalPhones, branchId) {
    const container = document.getElementById('status-cards-container');
    if (!container) return;

    if (!statsData || statsData.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-4 text-gray-500">
                داده‌ای برای نمایش وجود ندارد
            </div>
        `;
        return;
    }

    // بررسی نقش کاربر
    const user = currentState.user;
    const isAdmin = user && currentState.user.userrolename === 'admin';
    
    const statusConfig = {
        1: { 
            name: 'عدم پاسخگویی', 
            color: 'red', 
            icon: 'phone_disabled',
            description: 'تماس گرفته شده اما پاسخ داده نشد'
        },
        2: { 
            name: 'منتظر ارسال مدارک', 
            color: 'blue', 
            icon: 'description',
            description: 'توضیحات داده شد - منتظر ارسال مدارک'
        },
        3: { 
            name: 'قصد مراجعه حضوری', 
            color: 'green', 
            icon: 'directions_walk',
            description: 'توضیحات داده شد - قصد مراجعه حضوری دارند'
        },
        4: { 
            name: 'پیگیری در آینده', 
            color: 'purple', 
            icon: 'schedule',
            description: 'توضیحات داده شد - پیگیری در آینده لازم است'
        },
        5: { 
            name: 'قصد خرید اقساط', 
            color: 'teal', 
            icon: 'credit_card',
            description: 'مشتاق به خرید به صورت اقساط'
        },
        6: { 
            name: 'قصد خرید ندارند', 
            color: 'gray', 
            icon: 'cancel',
            description: 'فعلاً قصد خرید ندارند'
        },
        7: { 
            name: 'مراجعه کرده‌اند', 
            color: 'emerald', 
            icon: 'how_to_reg',
            description: 'مراجعه کرده‌اند / فرم پر شده در مجموعه سلامتیان'
        },
        8: { 
            name: 'خرید از جای دیگر', 
            color: 'orange', 
            icon: 'store',
            description: 'خرید خود را از بازار آزاد یا مجموعه دیگری انجام داده‌اند'
        },
        9: { 
            name: 'شماره اشتباه', 
            color: 'slate', 
            icon: 'error_outline',
            description: 'شماره اشتباه / مخاطب اشتباه'
        },
        10: { 
            name: 'سایر موارد خاص', 
            color: 'indigo', 
            icon: 'more_horiz',
            description: 'سایر موارد خاص و استثنا'
        }
    };

    let cardsHTML = '';

    // کارت‌های وضعیت‌ها
    statsData.forEach(item => {
        const config = statusConfig[item.status_code] || { 
            name: 'نامشخص', 
            color: 'gray', 
            icon: 'help',
            description: 'وضعیت تعریف نشده'
        };
        
        cardsHTML += `
            <div class="bg-${config.color}-50 p-4 rounded-lg border border-${config.color}-200 transition-all duration-300 hover:shadow-md" title="${config.description}">
                <div class="flex items-center">
                    <i class="material-icons text-${config.color}-600 mr-2">${config.icon}</i>
                    <span class="text-sm text-${config.color}-800 font-medium">${config.name}</span>
                </div>
                <div class="text-xl font-bold text-${config.color}-700 mt-2">${item.total_phones.toLocaleString('fa-IR')}</div>
                <div class="text-xs text-${config.color}-800 opacity-75 mt-1">شناسه: ${item.status_code}</div>
            </div>
        `;
    });

    // تعیین عنوان بر اساس نقش کاربر
    let branchTitle = '';
    if (isAdmin) {
        branchTitle = branchId === 0 ? 'همه شعب' : `شعبه ${branchId}`;
    } else {
        branchTitle = `شعبه ${user.branchid || 'جاری'}`;
    }

    // کارت جمع کل
    cardsHTML += `
        <div class="bg-gradient-to-r from-purple-500 to-indigo-500 p-4 rounded-lg text-white col-span-full md:col-span-2 lg:col-span-1">
            <div class="flex items-center">
                <i class="material-icons text-white mr-2">summarize</i>
                <span class="text-sm font-medium">جمع کل (${branchTitle})</span>
            </div>
            <div class="text-2xl font-bold mt-2">${totalPhones.toLocaleString('fa-IR')}</div>
            <div class="text-xs opacity-90 mt-1">تعداد کل شماره‌ها در ${branchTitle}</div>
        </div>
    `;

    container.innerHTML = cardsHTML;
}

// تابع برای بارگذاری شعب در بخش آمار
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
        
        if (!response.ok) throw new Error(`خطا در دریافت شعب: ${response.status}`);
        
        const data = await response.json();
        if (!data.data || !Array.isArray(data.data)) {
            throw new Error('ساختار داده‌های دریافتی نامعتبر است');
        }
        
        const branchSelect = document.getElementById('branch-stats-filter');
        
        if (branchSelect) {
            // پاک کردن options فعلی (به جز option اول)
            branchSelect.innerHTML = '<option value="0">همه شعب</option>';
            
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
            branchSelect.innerHTML = '<option value="0">خطا در بارگذاری شعب</option>';
        }
    }
}
