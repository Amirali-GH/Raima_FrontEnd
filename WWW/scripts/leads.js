import { currentState } from './state.js';
import { showNotification } from './systemAdmin.js';

function formatNumber(num) {
    return new Intl.NumberFormat('fa-IR').format(num);
}

export function renderPagination() {
    const paginationNumbers = document.getElementById('pagination-numbers');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const currentPageSpan = document.getElementById('current-page');
    const totalPagesSpan = document.getElementById('total-pages');
    
    // محافظت در برابر مقادیر نامعتبر
    const totalPages = Math.max(1, parseInt(currentState.totalPages) || 1);
    let currentPage = Math.min(Math.max(1, parseInt(currentState.currentPage) || 1), totalPages);
    currentState.currentPage = currentPage;

    currentPageSpan.textContent = currentPage;
    totalPagesSpan.textContent = totalPages;

    paginationNumbers.innerHTML = '';

    function addPageButton(page, isActive = false) {
        const btn = document.createElement('button');
        btn.textContent = page;
        btn.className = "pagination-btn border border-gray-300 px-3 py-1 mx-1 rounded";
        if (isActive) {
            btn.classList.add("bg-purple-500", "text-white");
            btn.setAttribute('aria-current', 'page');
            btn.disabled = true;
        } else {
            btn.onclick = () => {
                if (currentState.currentPage !== page) {
                    currentState.currentPage = page;
                    fetchLeads();
                }
            };
        }
        paginationNumbers.appendChild(btn);
    }

    function addEllipsis() {
        const span = document.createElement('span');
        span.textContent = "...";
        span.className = "px-2";
        paginationNumbers.appendChild(span);
    }

    // اگر تعداد صفحات کم است، همه را نشان بده
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
            addPageButton(i, i === currentPage);
        }
    } else {
        // همیشه صفحه ۱
        addPageButton(1, currentPage === 1);

        let start, end;
        
        // منطق ساده‌تر برای تعیین بازه صفحات
        if (currentPage <= 4) {
            // نزدیک ابتدا: صفحات ۲ تا ۵
            start = 2;
            end = Math.min(5, totalPages - 1);
            
            for (let i = start; i <= end; i++) {
                addPageButton(i, i === currentPage);
            }
            
            if (totalPages > 6) {
                addEllipsis();
            }
            
        } else if (currentPage >= totalPages - 3) {
            // نزدیک انتها: صفحات totalPages-4 تا totalPages-1
            addEllipsis();
            
            start = Math.max(2, totalPages - 4);
            end = totalPages - 1;
            
            for (let i = start; i <= end; i++) {
                addPageButton(i, i === currentPage);
            }
            
        } else {
            // وسط لیست: صفحات currentPage-2 تا currentPage+2
            addEllipsis();
            
            start = currentPage - 2;
            end = currentPage + 2;
            
            for (let i = start; i <= end; i++) {
                addPageButton(i, i === currentPage);
            }
            
            addEllipsis();
        }

        // همیشه صفحه آخر (اگر بیشتر از ۱ صفحه داریم)
        if (totalPages > 1) {
            addPageButton(totalPages, currentPage === totalPages);
        }
    }

    // کنترل prev/next
    prevPageBtn.style.display = (currentPage === 1) ? 'none' : 'inline-block';
    nextPageBtn.style.display = (currentPage === totalPages) ? 'none' : 'inline-block';
    
    // دکمه‌های قبلی و بعدی
    prevPageBtn.onclick = () => {
        if (currentPage > 1) {
            currentState.currentPage = currentPage - 1;
            fetchLeads();
        }
    };
    
    nextPageBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentState.currentPage = currentPage + 1;
            fetchLeads();
        }
    };
}

let searchTimeout;
export function handleSearch(e) {
    clearTimeout(searchTimeout);
    currentState.searchQuery = e.target.value;
    
    searchTimeout = setTimeout(() => {
        currentState.currentPage = 1;
        fetchLeads();
    }, 500);
}

export function renderLeadsTable() {
    const tbody = document.getElementById('leads-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (currentState.leads.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-gray-500">
                    <i class="material-icons text-4xl mb-2">info</i>
                    <p>موردی یافت نشد</p>
                </td>
            </tr>
        `;
        return;
    }

    currentState.leads.forEach((lead) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                <input type="checkbox" class="lead-checkbox" data-id="${lead.id}">
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">${lead.phone || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">${lead.name || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">${lead.status || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                <button class="text-purple-600 hover:text-purple-900 edit-assignment" data-id="${lead.id}" title="ویرایش">
                    <i class="material-icons text-base">edit</i>
                </button>
                <button class="text-red-600 hover:text-red-900 delete-assignment" data-id="${lead.id}" title="حذف">
                    <i class="material-icons text-base">delete</i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

export async function fetchLeads() {
    const tableBody = document.getElementById('leads-table-body');
    showLoading(tableBody); // نمایش لودینگ

    try {
        const totalPages = Math.max(1, parseInt(currentState.totalPages) || 1);
        if (currentState.currentPage < 1 || currentState.currentPage > totalPages) {
            currentState.currentPage = Math.min(Math.max(1, currentState.currentPage), totalPages);
        }

        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        if (!token) {
            showNotification('لطفاً ابتدا وارد سیستم شوید');
            return;
        }

        const urlObj = new URL('/api/v1/phoneassignment', apiBaseUrl);
        const params = new URLSearchParams();
        params.set('page', currentState.currentPage);
        params.set('page_size', currentState.pageSize);

        let branchIdForQuery;
        if (currentState.user && currentState.user.userrolename === 'admin') {
            branchIdForQuery = currentState.selectedBranch;
            if (branchIdForQuery === '') { // "" به معنی "همه شعب"
                branchIdForQuery = '0';
            }
        } else {
            // اگر ادمین نیست => فقط شعبه خودش
            branchIdForQuery = currentState.user?.branchid;
        }

        if (branchIdForQuery) {
            params.set('branchid', branchIdForQuery);
        }

        if (currentState.searchQuery) {
            params.set('search', currentState.searchQuery);
        }

        urlObj.search = params.toString();
        const url = urlObj.toString();

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`خطا در دریافت داده‌ها: ${response.status}`);
        
        const data = await response.json();
        if (data.meta && data.meta.is_success) {
            const mappedData = (data.data || []).map(item => ({
                id: item.assignmentid,
                phone: item.phone || '',
                name: item.username || '',
                status: item.sourcename || ''
            }));
            currentState.leads = mappedData;
            currentState.currentPage = parseInt(data.meta.page.page_num) || currentState.currentPage;
            currentState.totalRecords = data.meta.page.total_size;
            currentState.pageSize = parseInt(data.meta.page.page_size) || currentState.pageSize;
            currentState.totalPages = Math.ceil(currentState.totalRecords / currentState.pageSize) || 1;
            renderLeadsTable();
            renderPagination();
        } else {
            showNotification('خطا در دریافت داده‌ها از سرور', 'error');
            renderLeadsTable(); // جدول را خالی نشان می‌دهد
        }
    } catch (error) {
        console.error('Error fetching leads:', error);
        showNotification('خطا در ارتباط با سرور: ' + (error.message || error), 'error');
    } finally {
        // در هر صورت (موفقیت یا خطا) لودینگ را پنهان می‌کنیم
        // با یک تاخیر کوچک تا کاربر متوجه تغییر شود
        setTimeout(() => {
            hideLoading(tableBody);
            if (currentState.leads.length === 0) {
                renderLeadsTable(); // برای نمایش پیام "موردی یافت نشد"
            }
        }, 300);
    }
}

export async function loadBranchesInLeads() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('No auth token found');
            return;
        }
        const response = await fetch(`${apiBaseUrl}/api/v1/branch`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error(`خطا در دریافت شعب: ${response.status}`);
        
        const data = await response.json();
        if (!data.data || !Array.isArray(data.data)) throw new Error('ساختار داده‌های دریافتی نامعتبر است');
        
        currentState.branches = data.data;
        const branchSelect = document.getElementById('branch-filter');
        
        if (branchSelect) {
            branchSelect.innerHTML = '<option value="">همه شعب</option>';
            currentState.branches.forEach(branch => {
                if (branch.branchid && branch.mainname) {
                    const option = document.createElement('option');
                    option.value = branch.branchid;
                    option.textContent = branch.mainname;
                    branchSelect.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('Error loading branches:', error);
        const branchSelect = document.getElementById('branch-filter');
        if (branchSelect) {
            branchSelect.innerHTML = '<option value="">خطا در بارگذاری شعب</option>';
        }
    }
}

export function closeAssignmentModal() {
    document.getElementById('assignment-modal').classList.add('hidden');
}

export async function saveAssignment(e) {
    e.preventDefault();
    const assignmentId = document.getElementById('assignment-id').value;
    const assignmentData = {
        phone: document.getElementById('assignment-phone').value,
        username: document.getElementById('assignment-username').value,
        branchid: parseInt(document.getElementById('assignment-branch').value),
        sourcecollectingdataid: 3 // Fixed value as requested
    };

    if (!assignmentData.phone || !assignmentData.branchid) {
        showNotification('لطفا شماره تماس و شعبه را انتخاب کنید.');
        return;
    }

    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        const url = assignmentId ? `${apiBaseUrl}/api/v1/phoneassignment/${assignmentId}` : `${apiBaseUrl}/api/v1/phoneassignment`;
        const method = assignmentId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(assignmentData)
        });

        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.meta.description || 'خطا در ذخیره‌سازی');

        showNotification(responseData.meta.description, 'success');
        closeAssignmentModal();
        fetchLeads(); // Refresh table
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

export async function deleteAssignment(assignmentId) {
    if (!confirm('آیا از حذف این تخصیص اطمینان دارید؟')) return;

    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${apiBaseUrl}/api/v1/phoneassignment/${assignmentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.meta.description || 'خطا در حذف');
        
        showNotification(responseData.meta.description, 'success');
        fetchLeads(); // Refresh table
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

export function handleSort(field) {
    showNotification('مرتب سازی در این نسخه پشتیبانی نمی شود.');
}

export function handleBranchChange(e) {
    currentState.selectedBranch = e.target.value;

    ensureGalleryState();

    currentState.gallery.currentPage = 1;
    currentState.currentPage = 1;
    
    fetchBranchImages();
    fetchLeads();
}


export function toggleSelectAll(e) {
    const isChecked = e.target.checked;
    currentState.selectedLeads = isChecked ? currentState.leads.map(lead => lead.id) : [];
    document.querySelectorAll('.lead-checkbox').forEach(checkbox => checkbox.checked = isChecked);
}

export function handlePageSizeChange(e) {
    const newPageSize = parseInt(e.target.value);
    if (newPageSize > 0) {
        currentState.pageSize = newPageSize;
        currentState.currentPage = 1;
        fetchLeads();
    }
}

export function changePage(direction) {
    const newPage = currentState.currentPage + direction;
    if (newPage >= 1 && newPage <= currentState.totalPages) {
        currentState.currentPage = newPage;
        fetchLeads();
    }
}

export async function exportLeads() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        if (!token) {
            showNotification('لطفاً ابتدا وارد سیستم شوید');
            return;
        }

        // ایجاد modal پردازش در صورت عدم وجود
        createProcessingModalIfNotExists();

        // نمایش modal پردازش
        const processingModal = document.getElementById('export-processing-modal');
        processingModal.classList.remove('hidden');

        // تعیین branchid (اولویت به فیلتر انتخاب‌شده، در غیر اینصورت branch کاربر)
        let branchId;
        if (currentState.user && currentState.user.userrolename === 'admin') {
            branchId = currentState.selectedBranch;
            if (branchId === '') { // "" به معنی "همه شعب"
                branchId = '0';
            }
        } else {
            // اگر ادمین نیست => فقط شعبه خودش
            branchId = currentState.user?.branchid;
        }

        // نقطه شروع درخواست (بدون page => طبق گفته شما سرور کل مخزن را برمی‌فرستد)
        let requestUrl = `${apiBaseUrl}/api/v1/phoneassignment?branchid=${encodeURIComponent(branchId)}`;

        // اگر خواستید فیلتر جستجو را هم اعمال کنید:
        if (currentState.searchQuery) {
            requestUrl += `&context=${encodeURIComponent(currentState.searchQuery)}`;
        }

        const allItems = [];

        // تابع کمکی برای ساخت headers
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // به‌روزرسانی پیام پردازش
        updateProcessingMessage('در حال دریافت داده‌ها از سرور...');

        // فراخوانی اول و احتمال دنبال کردن pagination اگر سرور صفحات را برگرداند
        let nextUrl = requestUrl;
        let pageCount = 0;
        
        while (nextUrl) {
            pageCount++;
            updateProcessingMessage(`در حال دریافت داده‌ها از سرور... (صفحه ${pageCount})`);
            
            const resp = await fetch(nextUrl, { headers });
            if (!resp.ok) throw new Error(`خطا در دریافت داده‌ها: ${resp.status}`);

            const json = await resp.json();

            // ساختار داده‌ی مورد انتظار: json.data => array
            if (!json.data || !Array.isArray(json.data)) {
                throw new Error('داده‌های دریافتی ساختار مورد انتظار را ندارند.');
            }

            allItems.push(...json.data);

            // اگر متا شامل next_page_uri باشد، آن را دنبال کن (ممکن است مقدار نسبی باشد)
            const pageMeta = json.meta && json.meta.page;
            if (pageMeta && pageMeta.next_page_uri) {
                // next_page_uri ممکن است آدرس نسبی باشد؛ اگر نسبی بود آن را به apiBaseUrl وصل می‌کنیم
                if (pageMeta.next_page_uri.startsWith('http')) {
                    nextUrl = pageMeta.next_page_uri;
                } else {
                    // حذف اسلش اضافی
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
        updateProcessingMessage(`در حال تولید فایل اکسل... (${allItems.length} رکورد)`);

        // نگاشت تمام فیلدها به ستون‌های اکسل با نام‌های فارسی
        const normalized = allItems.map(item => {
            return {
                'شناسه تخصیص': item.assignmentid || '',
                'شماره تماس': item.phone || '',
                'شناسه شعبه': item.branchid || '',
                'نام شعبه': item.branchname || '',
                'شناسه منبع': item.sourcecollectingdataid || '',
                'نام منبع': item.sourcename || '',
                'نام کاربری': item.username || '',
                'تاریخ افزودن': item.addedat || '',
                
                // اطلاعات Gravity
                'شناسه Gravity': item.gravityentryid || '',
                'نام کامل Gravity': item.gravityfullname || '',
                'کد ملی Gravity': item.gravitynationalcode || '',
                'خودرو درخواستی Gravity': item.gravitycarrequested || '',
                'شرایط فروش Gravity': item.gravitysaleterms || '',
                'آدرس Gravity': item.gravityaddress || '',
                'شهر Gravity': item.gravitycity || '',
                'رنگ Gravity': item.gravitycolor || '',
                'آدرس منبع Gravity': item.gravitysourceurl || '',
                'آی‌پی Gravity': item.gravityip || '',
                'تاریخ ایجاد Gravity': item.gravitydatecreated || '',
                
                // اطلاعات Goftino
                'شناسه گفتینو': item.goftinoid || '',
                'نام گفتینو': item.goftinoname || '',
                'خودرو درخواستی گفتینو': item.goftinocarrequested || '',
                'ایمیل گفتینو': item.goftinoemail || '',
                'توضیحات گفتینو': item.goftinodescription || ''
            };
        });

        // تبدیل به شیت و ساخت فایل اکسل
        const worksheet = XLSX.utils.json_to_sheet(normalized);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'تخصیص_شماره_ها');

        const nowStr = new Date().toLocaleDateString('fa-IR').replace(/\//g, '-');
        const filename = `export_leads_branch_${branchId}_${nowStr}.xlsx`;
        
        // نمایش پیام نهایی
        updateProcessingMessage('در حال دانلود فایل...');
        
        // ایجاد تأخیر کوچک برای نمایش پیام
        await new Promise(resolve => setTimeout(resolve, 500));
        
        XLSX.writeFile(workbook, filename);
        
        showNotification(`فایل اکسل با ${allItems.length} رکورد با موفقیت تولید و دانلود شد.`, 'success');

    } catch (error) {
        console.error('exportLeads error:', error);
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
                animation: spin 1s linear infinite;
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


//-- :) -------------------------------------------------------------------------------------------

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

export function setupTabIndicator() {
    const tabs = document.querySelectorAll('.tab-item');
    const indicator = document.getElementById('tab-indicator');
    
    if (!indicator || tabs.length === 0) return;

    function updateIndicator() {
        const activeTab = document.querySelector('.tab-item.active');
        if (!activeTab) return;

        const rect = activeTab.getBoundingClientRect();
        const parentRect = activeTab.parentElement.getBoundingClientRect();
        
        indicator.style.width = `${rect.width}px`;
        indicator.style.left = `${rect.left - parentRect.left}px`;
    }

    // ابتدا موقعیت اندیکاتور را تنظیم کنید
    updateIndicator();
    
    // هنگام تغییر سایز پنجره موقعیت را به روز کنید
    window.addEventListener('resize', updateIndicator);
}

// تابع برای تغییر تب‌ها
function switchTab(tabName) {
    const assignmentsPanel = document.getElementById('assignments-panel');
    const galleryPanel = document.getElementById('gallery-panel');
    const bulkAssignPanel = document.getElementById('bulk-assign-panel');
    const buttonBoxAssignment = document.getElementById('button-box-assignment');
    const assignmetHeader = document.getElementById('assignmet-header');
    
    const tabAssignments = document.getElementById('tab-assignments');
    const tabGallery = document.getElementById('tab-gallery');
    const tabBulkAssign = document.getElementById('tab-bulk-assign');
    
    // مخفی کردن همه پنل‌ها
    assignmentsPanel.classList.add('hidden');
    galleryPanel.classList.add('hidden');
    if (bulkAssignPanel) bulkAssignPanel.classList.add('hidden');
    
    // غیرفعال کردن همه تب‌ها
    tabAssignments.classList.remove('active');
    tabGallery.classList.remove('active');
    if (tabBulkAssign) tabBulkAssign.classList.remove('active');
    
    // نمایش پنل و فعال کردن تب مربوطه
    if (tabName === 'assignments') {
        assignmentsPanel.classList.remove('hidden');
        tabAssignments.classList.add('active');
        buttonBoxAssignment.classList.remove('hidden');
        assignmetHeader.classList.remove('hidden');
    } else if (tabName === 'gallery') {
        galleryPanel.classList.remove('hidden');
        tabGallery.classList.add('active');
        buttonBoxAssignment.classList.add('hidden');
        assignmetHeader.classList.remove('hidden');
        
        if (tabName === 'gallery') {
            ensureGalleryState();
            currentState.gallery.currentPage = 1;
            fetchBranchImages().catch(error => {
                console.error('Error loading gallery:', error);
                showNotification('خطا در بارگذاری گالری', 'error');
            });
        }
    } else if (tabName === 'bulk-assign' && bulkAssignPanel && tabBulkAssign) {
        bulkAssignPanel.classList.remove('hidden');
        tabBulkAssign.classList.add('active');
        assignmetHeader.classList.add('hidden');
    }
    
    setupTabIndicator();
}

export function initAssignmentTabs() {
    const tabAssignments = document.getElementById('tab-assignments');
    const tabGallery = document.getElementById('tab-gallery');
    const assignmentsPanel = document.getElementById('assignments-panel');
    const galleryPanel = document.getElementById('gallery-panel');
    const buttonBoxAssignment = document.getElementById('button-box-assignment');

    if (!tabAssignments || !tabGallery || !assignmentsPanel || !galleryPanel) return;

    // رویداد کلیک برای تب‌ها
    tabAssignments.addEventListener('click', () => switchTab('assignments'));
    tabGallery.addEventListener('click', () => switchTab('gallery'));

    // مقداردهی اولیه
    switchTab('assignments');
    
    // Lightbox events
    const lightbox = document.getElementById('image-lightbox');
    const lightboxClose = document.getElementById('lightbox-close');
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightbox) lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });
}

export async function fetchBranchImages(page = null) {
    const galleryContainer = document.getElementById('gallery-container');
    showLoading(galleryContainer); // نمایش لودینگ

    ensureGalleryState();
    const g = currentState.gallery;
    const token = localStorage.getItem('authToken');
    const apiBaseUrl = window.location.origin;

    if (page !== null) g.currentPage = page;
    const pageNum = g.currentPage || 1;
    const pageSize = g.pageSize || 5;

    // --- شروع اصلاح منطق Branch ID ---
    let branchIdForQuery;
    if (currentState.user && currentState.user.userrolename === 'admin') {
        branchIdForQuery = currentState.selectedBranch;
        if (branchIdForQuery === '') { // "" به معنی "همه شعب"
            branchIdForQuery = '0';
        }
    } else {
        // اگر ادمین نیست => فقط شعبه خودش
        branchIdForQuery = currentState.user.branchid;
    }
    
    if (!branchIdForQuery) {
        showNotification('شناسه شعبه یافت نشد.', 'error');
        hideLoading(galleryContainer);
        galleryContainer.innerHTML = '<div>لطفا یک شعبه انتخاب کنید.</div>';
        return;
    }
    // --- پایان اصلاح منطق Branch ID ---

    try {
        const url = new URL('/api/v1/images/by-branch', apiBaseUrl);
        url.searchParams.set('branchid', branchIdForQuery);
        url.searchParams.set('page', pageNum);
        url.searchParams.set('pageSize', pageSize);

        const resp = await fetch(url.toString(), {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!resp.ok) throw new Error(`خطا در دریافت تصاویر: ${resp.status}`);
        const json = await resp.json();

        if (!json.items) throw new Error('پاسخ سرور برای تصاویر ساختار معتبری ندارد.');
        
        g.items = (json.items || []).map(item => {
            const guid = item.url.replace('/images/', '').replace(/[{}]/g, '');
            const finalImageUrl = `${apiBaseUrl}/api/v1/images/get/${guid}`;
            return { url: finalImageUrl, filename: item.fileName };
        });

        g.currentPage = parseInt(json.page) || pageNum;
        g.pageSize = parseInt(json.pageSize) || pageSize;
        g.totalRecords = parseInt(json.total) || 0;
        g.totalPages = Math.max(1, Math.ceil(g.totalRecords / g.pageSize));
        
        renderGallery();
    } catch (err) {
        console.error('fetchBranchImages error:', err);
        showNotification(err.message || 'خطا در دریافت تصاویر', 'error');
    } finally {
        setTimeout(() => {
            hideLoading(galleryContainer);
            if (g.items.length === 0) {
                renderGallery(); // برای نمایش پیام "هیچ تصویری یافت نشد"
            }
        }, 300);
    }
}

/** render gallery thumbnails + pagination */
export function renderGallery() {
    ensureGalleryState();
    const g = currentState.gallery;
    const container = document.getElementById('gallery-container');
    const paginationEl = document.getElementById('gallery-pagination');
    const currentPageSpan = document.getElementById('gallery-current-page');
    const totalPagesSpan = document.getElementById('gallery-total-pages');

    if (!container || !paginationEl || !currentPageSpan || !totalPagesSpan) return;

    container.innerHTML = '';
    paginationEl.innerHTML = '';

    if (!g.items || g.items.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-gray-500 py-8">
            <i class="material-icons text-4xl mb-2">photo_library</i>
            <div>هیچ تصویری یافت نشد</div>
        </div>`;
        currentPageSpan.textContent = '0';
        totalPagesSpan.textContent = '0';
        return;
    }

    g.items.forEach(img => {
        const col = document.createElement('div');
        col.className = 'relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer shadow-sm';
        col.style.minHeight = '180px';

        const imgEl = document.createElement('img');
        imgEl.src = img.url; // اکنون URL کامل است
        imgEl.alt = img.filename || 'تصویر';
        imgEl.className = 'w-full h-44 object-cover';
        col.appendChild(imgEl);

        const meta = document.createElement('div');
        meta.className = 'p-2 text-right';
        
        // --- شروع اصلاحات ---
        // حذف نمایش تاریخ آپلود چون در پاسخ API وجود ندارد
        meta.innerHTML = `<div class="text-sm text-gray-700 font-medium">${img.filename || ''}</div>`;
        // --- پایان اصلاحات ---

        col.appendChild(meta);
        col.addEventListener('click', () => openImageLightbox(img));
        container.appendChild(col);
    });

    // بخش صفحه‌بندی بدون تغییر باقی می‌ماند...
    const startPage = Math.max(1, g.currentPage - 2);
    const endPage = Math.min(g.totalPages, g.currentPage + 2);

    if (g.currentPage > 1) {
        const btn = document.createElement('button');
        btn.className = 'px-2 py-1 border rounded';
        btn.textContent = '«';
        btn.onclick = () => changeGalleryPage(-1);
        paginationEl.appendChild(btn);
    }

    for (let p = startPage; p <= endPage; p++) {
        const btn = document.createElement('button');
        btn.className = 'px-3 py-1 border rounded mx-1';
        if (p === g.currentPage) {
            btn.classList.add('bg-purple-500', 'text-white');
            btn.disabled = true;
        } else {
            btn.onclick = () => fetchBranchImages(p);
        }
        btn.textContent = p;
        paginationEl.appendChild(btn);
    }

    if (g.currentPage < g.totalPages) {
        const btn = document.createElement('button');
        btn.className = 'px-2 py-1 border rounded';
        btn.textContent = '»';
        btn.onclick = () => changeGalleryPage(1);
        paginationEl.appendChild(btn);
    }

    currentPageSpan.textContent = String(g.currentPage);
    totalPagesSpan.textContent = String(g.totalPages);
}

/** change page by delta (±1) */
export function changeGalleryPage(delta) {
    ensureGalleryState();
    const g = currentState.gallery;
    const newPage = Math.min(Math.max(1, g.currentPage + delta), g.totalPages);
    if (newPage === g.currentPage) return;
    fetchBranchImages(newPage);
}

/** open lightbox */
export function openImageLightbox(imgObj) {
    const lb = document.getElementById('image-lightbox');
    const lbImg = document.getElementById('lightbox-image');
    const lbMeta = document.getElementById('lightbox-meta');

    if (!lb || !lbImg) return;

    lbImg.src = imgObj.url;
    lbImg.alt = imgObj.filename || 'تصویر';
    if (lbMeta) {
        // --- شروع اصلاحات ---
        // حذف نمایش تاریخ آپلود
        lbMeta.innerHTML = `<div>${imgObj.filename || ''}</div>`;
        // --- پایان اصلاحات ---
    }
    lb.classList.remove('hidden');
}

/** close lightbox */
export function closeLightbox() {
    const lb = document.getElementById('image-lightbox');
    const lbImg = document.getElementById('lightbox-image');
    if (lb) lb.classList.add('hidden');
    if (lbImg) lbImg.src = '';
}

export function initBulkAssignmentTab() {
    const tabBulkAssign = document.getElementById('tab-bulk-assign');
    const bulkAssignPanel = document.getElementById('bulk-assign-panel');
    
    if (!tabBulkAssign || !bulkAssignPanel) return;
    
    // رویداد کلیک برای تب
    tabBulkAssign.addEventListener('click', () => {
        switchTab('bulk-assign');
        loadBulkAssignmentData();
    });
    
    // تنظیم شنونده برای فیلتر منبع
    setupSourceFilterListener();
    
    // اتصال توابع جدید به دکمه‌ها
    const equalDistBtn = document.getElementById('equal-distribution-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const saveAssignmentsBtn = document.getElementById('save-assignments-btn');
    const undoAssignmentsBtn = document.getElementById('undo-assignments-btn');
    
    if (equalDistBtn) {
        equalDistBtn.addEventListener('click', distributeEqually);
    }
    
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllAssignments);
    }
    
    if (saveAssignmentsBtn) {
        saveAssignmentsBtn.addEventListener('click', saveAssignments);
    }

    if (undoAssignmentsBtn){
        undoAssignmentsBtn.addEventListener('click', undoAssignments);
    }
}

export async function undoAssignments() {
    try {
        const sourceFilter = document.getElementById('source-filter');
        const sourceId = sourceFilter ? parseInt(sourceFilter.value) : 0;

        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('لطفاً ابتدا وارد سیستم شوید.', 'error');
            return;
        }

        // نمایش وضعیت در حال پردازش
        const undoBtn = document.getElementById('undo-assignments-btn');
        const originalText = undoBtn.innerHTML;
        undoBtn.innerHTML = '<i class="material-icons mr-2 animate-spin">refresh</i>در حال بازیابی...';
        undoBtn.disabled = true;

        const response = await fetch(
            `${apiBaseUrl}/api/v1/phoneassignment/undo_assign_phones_from_branches?source_id=${sourceId}`, 
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // بازگرداندن حالت دکمه به حالت اول
        undoBtn.innerHTML = originalText;
        undoBtn.disabled = false;

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.meta?.description || `خطا در بازیابی تخصیص‌ها: ${response.status}`);
        }

        const responseData = await response.json();
        
        if (responseData.meta && responseData.meta.is_success) {
            const data = responseData.data;

            if (data.has_changes) {
                // نمایش گزارش تخصیص
                showAssignmentReport(data.report);

                // به‌روزرسانی داده‌ها
                const currentSourceId = sourceFilter ? sourceFilter.value : '0';
                await updateUnassignedCountsBoxes(currentSourceId);
                await updateAssignmentSummary(currentSourceId);

                showNotification('عملیات بازگردانی تخصیص‌ها انجام شد.', 'success');
            } else {
                // هیچ تغییری در یک ساعت گذشته نبوده
                showNotification(data.message || 'هیچ تغییری برای بازگردانی وجود ندارد.', 'info');
            }
        } else {
            throw new Error(responseData.meta?.description || 'خطا در بازیابی تخصیص‌ها');
        }
        
    } catch (error) {
        console.error('Error undoing assignments:', error);
        showNotification(error.message, 'error');
        
        // بازگرداندن حالت دکمه در صورت خطا
        const undoBtn = document.getElementById('undoAssignmentsBtn');
        if (undoBtn) {
            undoBtn.innerHTML = '<i class="material-icons mr-2">undo</i>بازیابی شماره ها';
            undoBtn.disabled = false;
        }
    }
}

export async function saveAssignments() {
    try {
        // جمع‌آوری branch_ids و counts
        const branchIds = [];
        const counts = [];
        
        const inputs = document.querySelectorAll('.assignment-count-input');
        inputs.forEach(input => {
            const branchId = input.getAttribute('data-branch-id');
            const count = parseInt(input.value) || 0;
            
            if (count > 0) {
                branchIds.push(parseInt(branchId));
                counts.push(count);
            }
        });

        if (branchIds.length === 0) {
            showNotification('هیچ تخصیصی برای ذخیره وجود ندارد.', 'warning');
            return;
        }

        // تعیین source_id
        const sourceFilter = document.getElementById('source-filter');
        const sourceId = sourceFilter ? parseInt(sourceFilter.value) : 0;

        // ساخت داده‌های درخواست
        const requestData = {
            branch_ids: branchIds,
            counts: counts,
            source_id: sourceId
        };

        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('لطفاً ابتدا وارد سیستم شوید.', 'error');
            return;
        }

        // نمایش وضعیت در حال پردازش
        const saveBtn = document.getElementById('save-assignments-btn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="material-icons mr-2 animate-spin">refresh</i>در حال ذخیره...';
        saveBtn.disabled = true;

        const response = await fetch(`${apiBaseUrl}/api/v1/phoneassignment/assign_phones_to_branches`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        // بازگرداندن حالت دکمه به حالت اول
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.meta?.description || `خطا در ذخیره تخصیص‌ها: ${response.status}`);
        }

        const responseData = await response.json();
        
        if (responseData.meta && responseData.meta.is_success) {
            // نمایش گزارش تخصیص
            showAssignmentReport(responseData.data.report);
            
            // به‌روزرسانی داده‌ها
            const currentSourceId = sourceFilter ? sourceFilter.value : '0';
            await updateUnassignedCountsBoxes(currentSourceId);
            await updateAssignmentSummary(currentSourceId);
            
            showNotification(responseData.meta.description, 'success');
        } else {
            throw new Error(responseData.meta?.description || 'خطا در ذخیره تخصیص‌ها');
        }
        
    } catch (error) {
        console.error('Error saving assignments:', error);
        showNotification(error.message, 'error');
        
        // بازگرداندن حالت دکمه در صورت خطا
        const saveBtn = document.getElementById('save-assignments-btn');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="material-icons mr-2">save</i>ذخیره تخصیص‌ها';
            saveBtn.disabled = false;
        }
    }
}

export async function updateAvailableNumbers() {
    try {
        // استفاده از داده‌های تستی
        const sourceFilter = document.getElementById('source-filter')?.value || '0';
        
        // محاسبه تعداد بر اساس فیلتر منبع
        let totalCount = TEST_SOURCES.total;
        let novinhabCount = TEST_SOURCES.bySource.novinhab;
        let goftinoCount = TEST_SOURCES.bySource.goftino;
        let websiteCount = TEST_SOURCES.bySource.website;
        
        // اعمال فیلتر منبع
        if (sourceFilter === '1') {
            totalCount = novinhabCount;
            goftinoCount = 0;
            websiteCount = 0;
        } else if (sourceFilter === '2') {
            totalCount = goftinoCount;
            novinhabCount = 0;
            websiteCount = 0;
        } else if (sourceFilter === '3') {
            totalCount = websiteCount;
            novinhabCount = 0;
            goftinoCount = 0;
        }
        
        // به‌روزرسانی اعداد در رابط کاربری
        document.getElementById('total-unassigned-count').textContent = totalCount;
        document.getElementById('source-novinhab-count').textContent = novinhabCount;
        document.getElementById('source-goftino-count').textContent = goftinoCount;
        document.getElementById('source-website-count').textContent = websiteCount;
        
    } catch (error) {
        console.error('Error updating available numbers:', error);
        showNotification('خطا در به‌روزرسانی تعداد شماره‌های موجود', 'error');
    }
}

export function showAssignmentReport(report) {
    if (!report || report.length === 0) return;

    const modalHtml = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-xl shadow-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden">
                <div class="flex justify-between items-center p-6 border-b">
                    <h3 class="text-lg font-semibold">گزارش تخصیص شماره‌ها</h3>
                    <button id="close-report-modal" class="text-gray-500 hover:text-gray-700">
                        <i class="material-icons">close</i>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto max-h-[65vh]">
                    <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div class="flex items-center">
                            <i class="material-icons text-green-600 ml-2">check_circle</i>
                            <span class="text-green-800 font-medium">تخصیص با موفقیت انجام شد</span>
                        </div>
                    </div>
                    
                    <div class="overflow-x-auto">
                        <table class="min-w-full border border-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="py-3 px-4 border-b text-right">شعبه</th>
                                    <th class="py-3 px-4 border-b text-center">درخواست شده</th>
                                    <th class="py-3 px-4 border-b text-center">تخصیص یافته</th>
                                    <th class="py-3 px-4 border-b text-center">وضعیت</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${report.map(item => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="py-3 px-4 border-b text-right">${getBranchName(item.BranchID)}</td>
                                        <td class="py-3 px-4 border-b text-center">${formatNumber(item.Requested)}</td>
                                        <td class="py-3 px-4 border-b text-center">${formatNumber(item.Assigned)}</td>
                                        <td class="py-3 px-4 border-b text-center">
                                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                item.Requested === item.Assigned ? 
                                                'bg-green-100 text-green-800' : 
                                                'bg-yellow-100 text-yellow-800'
                                            }">
                                                ${item.Requested === item.Assigned ? 'تکمیل شده' : 'ناقص'}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="mt-4 grid grid-cols-2 gap-4 text-sm">
                        <div class="text-center p-3 bg-blue-50 rounded-lg">
                            <div class="text-blue-600 font-bold">${formatNumber(report.reduce((sum, item) => sum + item.Requested, 0))}</div>
                            <div class="text-blue-800">جمع درخواست شده</div>
                        </div>
                        <div class="text-center p-3 bg-green-50 rounded-lg">
                            <div class="text-green-600 font-bold">${formatNumber(report.reduce((sum, item) => sum + item.Assigned, 0))}</div>
                            <div class="text-green-800">جمع تخصیص یافته</div>
                        </div>
                    </div>
                </div>
                <div class="flex justify-end p-6 border-t pb-4">
                    <button id="confirm-report-modal" class="bg-purple-600 text-white mb-4 px-6 py-2 rounded-md hover:bg-purple-700">
                        فهمیدم
                    </button>
                </div>
            </div>
        </div>
    `;

    // اضافه کردن مودال به صفحه
    const existingModal = document.getElementById('assignment-report-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modalContainer = document.createElement('div');
    modalContainer.id = 'assignment-report-modal';
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);

    // اضافه کردن event listeners
    document.getElementById('close-report-modal').addEventListener('click', closeReportModal);
    document.getElementById('confirm-report-modal').addEventListener('click', closeReportModal);
    
    // بستن مودال با کلیک خارج از آن
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            closeReportModal();
        }
    });
}

function closeReportModal() {
    const modal = document.getElementById('assignment-report-modal');
    if (modal) {
        modal.remove();
    }
}


export async function loadBranchesForBulkAssignment() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('لطفاً ابتدا وارد سیستم شوید', 'error');
            return;
        }

        // دریافت داده‌های شعب از API
        const response = await fetch(`${apiBaseUrl}/api/v1/branch?page=1&status=active`, {
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            }
        });

        if (!response.ok) {
            throw new Error(`خطا در دریافت شعب: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.meta.is_success || !data.data || !Array.isArray(data.data)) {
            throw new Error('ساختار داده‌های دریافتی نامعتبر است');
        }

        const branches = data.data;
        const tbody = document.getElementById('branches-table-body');
                console.log('41');
        if (tbody) {
            tbody.innerHTML = '';
            
            branches.forEach(branch => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50 transition-colors';
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        <div class="font-medium">${branch.mainname || 'بدون نام'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            ${branch.assignedCount || 0}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-center">
                        <input type="number" min="0" 
                               class="assignment-count-input w-24 px-3 py-2 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
                               data-branch-id="${branch.branchid}"
                               data-branch-name="${branch.mainname}"
                               value="0"
                               oninput="validateAssignmentInput(this)">
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                        <button class="text-red-600 hover:text-red-900 clear-branch-btn p-1 rounded-full hover:bg-red-50 transition-colors" 
                                data-branch-id="${branch.branchid}"
                                title="پاک کردن تخصیص">
                            <i class="material-icons text-base">clear</i>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            // اضافه کردن رویداد به دکمه‌های پاک کردن
            document.querySelectorAll('.clear-branch-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const branchId = this.getAttribute('data-branch-id');
                    const branchName = this.closest('tr').querySelector('td:first-child .font-medium').textContent;
                    clearBranchAssignment(branchId, branchName);
                });
            });
            
            // اضافه کردن رویداد به فیلدهای تعداد
            document.querySelectorAll('.assignment-count-input').forEach(input => {
                input.addEventListener('input', updateTotalRequestedCount);
                input.addEventListener('change', updateAssignmentSummary);
            });
            
            updateTotalRequestedCount();
            updateAssignmentSummary();
            
            showNotification(`لیست شعب با موفقیت بارگذاری شد (${branches.length} شعبه)`, 'success');
        }
    } catch (error) {
        console.error('Error loading branches:', error);
        showNotification('خطا در بارگذاری لیست شعب: ' + error.message, 'error');
        
        // نمایش حالت خطا در جدول
        const tbody = document.getElementById('branches-table-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-8 text-center text-red-500">
                        <i class="material-icons text-4xl mb-2">error</i>
                        <div>خطا در بارگذاری داده‌ها</div>
                        <button onclick="loadBranchesForBulkAssignment()" class="mt-2 text-blue-600 hover:text-blue-800 flex items-center justify-center mx-auto">
                            <i class="material-icons text-sm ml-1">refresh</i>
                            تلاش مجدد
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

// تابع برای اعتبارسنجی ورودی تعداد تخصیص
export function validateAssignmentInput(input) {
    const value = parseInt(input.value);
    if (value < 0) {
        input.value = 0;
    }
    
    // به‌روزرسانی خلاصه در زمان تایپ
    updateTotalRequestedCount();
}

// تابع global برای رفع مشکل onclick
window.loadBranchesForBulkAssignment = loadBranchesForBulkAssignment;


function getTotalUnassignedCount(sourceId = '0') {
    if (!currentState.unassignedNumbers) return 0;
    
    if (sourceId === '0') {
        // جمع کل همه منابع
        return currentState.unassignedNumbers.reduce((sum, item) => sum + (item.count || 0), 0);
    } else {
        // فقط منبع انتخاب شده
        const source = currentState.unassignedNumbers.find(item => item.sourceid == sourceId);
        return source ? source.count || 0 : 0;
    }
}

// تابع برای تخصیص مساوی بین شعب
export function distributeEqually() {
    try {
        const sourceFilter = document.getElementById('source-filter');
        const sourceId = sourceFilter ? sourceFilter.value : '0';
        
        if (!currentState.unassignedNumbers || currentState.unassignedNumbers.length === 0) {
            showNotification('لطفاً صبر کنید تا داده‌ها بارگذاری شوند.', 'warning');
            return;
        }

        const totalUnassigned = getTotalUnassignedCount(sourceId);
        
        if (totalUnassigned === 0) {
            showNotification('هیچ شماره‌ای برای تخصیص موجود نیست.', 'warning');
            return;
        }

        const inputs = document.querySelectorAll('.assignment-count-input');
        if (inputs.length === 0) {
            showNotification('هیچ شعبه‌ای برای تخصیص وجود ندارد.', 'warning');
            return;
        }

        // محاسبه تعداد مساوی برای هر شعبه
        const equalCount = Math.floor(totalUnassigned / inputs.length);
        const remainder = totalUnassigned % inputs.length;
        
        // تخصیص مساوی با در نظر گرفتن باقیمانده
        inputs.forEach((input, index) => {
            const count = index < remainder ? equalCount + 1 : equalCount;
            input.value = count;
        });

        updateTotalRequestedCount();
        updateAssignmentSummary();
        
        showNotification(`تعداد ${formatNumber(totalUnassigned)} شماره به صورت مساوی بین ${inputs.length} شعبه تخصیص داده شد.`, 'success');
        
    } catch (error) {
        console.error('Error in equal distribution:', error);
        showNotification('خطا در تخصیص مساوی: ' + error.message, 'error');
    }
}

// تابع برای پاک کردن همه تخصیص‌ها
export function clearAllAssignments() {
    document.querySelectorAll('.assignment-count-input').forEach(input => {
        input.value = 0;
    });
    
    updateTotalRequestedCount();
    updateAssignmentSummary();
    showNotification('همه تخصیص‌ها پاک شدند', 'info');
}

// تابع برای دریافت نام شعبه بر اساس ID
function getBranchName(branchId) {
    if (!currentState.branches || !Array.isArray(currentState.branches)) {
        return `شعبه ${branchId}`;
    }
    
    const branch = currentState.branches.find(b => b.branchid === branchId);
    return branch ? branch.mainname : `شعبه ${branchId}`;
}




// اضافه کردن تابع global برای رفع مشکل onclick
window.distributeEqually = distributeEqually;
window.saveAssignments = saveAssignments;

// تابع برای پاک کردن تخصیص یک شعبه خاص
export function clearBranchAssignment(branchId) {
    const input = document.querySelector(`.assignment-count-input[data-branch-id="${branchId}"]`);
    if (input) {
        const branchName = input.closest('tr').querySelector('td:first-child').textContent;
        input.value = 0;
        updateTotalRequestedCount();
        updateAssignmentSummary();
        showNotification(`تخصیص‌های شعبه ${branchName} پاک شد`, 'info');
    }
}

// تابع برای به‌روزرسانی تعداد کل درخواستی
export function updateTotalRequestedCount() {
    let total = 0;
    document.querySelectorAll('.assignment-count-input').forEach(input => {
        total += parseInt(input.value) || 0;
    });
    
    //document.getElementById('total-requested-count').textContent = total;
}

// // تابع برای به‌روزرسانی خلاصه تخصیص‌ها
// export function updateAssignmentSummary() {
//     const summaryContainer = document.getElementById('assignment-summary');
//     if (!summaryContainer) return;
    
//     let summaryHTML = '';
//     let hasAssignments = false;
//     let totalAssigned = 0;
    
//     document.querySelectorAll('.assignment-count-input').forEach(input => {
//         const count = parseInt(input.value) || 0;
//         if (count > 0) {
//             hasAssignments = true;
//             totalAssigned += count;
//             const branchId = input.getAttribute('data-branch-id');
//             const branchName = input.closest('tr').querySelector('td:first-child').textContent;
            
//             summaryHTML += `
//                 <div class="flex justify-between items-center py-2 border-b border-gray-100">
//                     <span class="text-gray-700">${branchName}</span>
//                     <span class="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">${count} شماره</span>
//                 </div>
//             `;
//         }
//     });
    
//     if (!hasAssignments) {
//         summaryHTML = '<p class="text-gray-500 text-center py-4">هنوز تخصیصی ثبت نشده است</p>';
//     } else {
//         summaryHTML = `
//             <div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
//                 <div class="flex justify-between items-center">
//                     <span class="text-green-800 font-medium">جمع کل تخصیص‌ها:</span>
//                     <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold">${totalAssigned} شماره</span>
//                 </div>
//             </div>
//             ${summaryHTML}
//         `;
//     }
    
//     summaryContainer.innerHTML = summaryHTML;
// }

// تابع برای بازنشانی فرم تخصیص گروهی
export function resetBulkAssignmentForm() {
    clearAllAssignments();
    document.getElementById('source-filter').value = '0';
    updateAvailableNumbers();
}








// آرایه رنگ‌ها برای باکس‌های مختلف
const BOX_COLORS = [
    { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', count: 'text-purple-700', icon: 'text-purple-600' },
    { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', count: 'text-blue-700', icon: 'text-blue-600' },
    { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', count: 'text-green-700', icon: 'text-green-600' },
    { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', count: 'text-orange-700', icon: 'text-orange-600' },
    { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', count: 'text-red-700', icon: 'text-red-600' },
    { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', count: 'text-indigo-700', icon: 'text-indigo-600' },
    { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', count: 'text-yellow-700', icon: 'text-yellow-600' }
];

// تابع برای دریافت داده‌های تخصیص نیافته از API
export async function fetchUnassignedNumbers(sourceId = '0') {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            throw new Error('لطفاً ابتدا وارد سیستم شوید');
        }

        const response = await fetch(
            `${apiBaseUrl}/api/v1/phoneassignment/info/notassignment?sourceid=${sourceId}`, 
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`خطا در دریافت داده‌ها: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.meta && data.meta.is_success) {
            return data.data || [];
        } else {
            throw new Error(data.meta?.description || 'خطا در دریافت داده‌ها از سرور');
        }
    } catch (error) {
        console.error('Error fetching unassigned numbers:', error);
        throw error;
    }
}

// تابع برای ایجاد باکس‌های پویا بر اساس داده‌های API
export function createDynamicCountBoxes(data, selectedSourceId = '0') {
    const container = document.getElementById('dynamic-counts-container');
    if (!container) return;

    // پاک کردن محتوای قبلی
    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center text-gray-500 py-4">
                <i class="material-icons text-4xl mb-2">info</i>
                <p>هیچ داده‌ای یافت نشد</p>
            </div>
        `;
        return;
    }

    // اگر همه منابع انتخاب شده، همه باکس‌ها را نمایش بده
    const sourcesToShow = selectedSourceId === '0' 
        ? data 
        : data.filter(item => item.sourceid == selectedSourceId);

    if (sourcesToShow.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center text-gray-500 py-4">
                <i class="material-icons text-4xl mb-2">search_off</i>
                <p>هیچ داده‌ای برای منبع انتخاب شده یافت نشد</p>
            </div>
        `;
        return;
    }

    // ایجاد باکس برای هر منبع
    sourcesToShow.forEach((source, index) => {
        const colorIndex = index % BOX_COLORS.length;
        const color = BOX_COLORS[colorIndex];
        
        const box = document.createElement('div');
        box.className = `${color.bg} p-4 rounded-lg border ${color.border} transition-all duration-300 hover:shadow-md`;
        box.innerHTML = `
            <div class="flex items-center">
                <i class="material-icons ${color.icon} mr-2">source</i>
                <span class="text-sm ${color.text} font-medium">${source.sourcename || 'منبع ناشناس'}</span>
            </div>
            <div class="text-xl font-bold ${color.count} mt-2">${formatNumber(source.count || 0)}</div>
            <div class="text-xs ${color.text} opacity-75 mt-1">شناسه: ${source.sourceid}</div>
        `;
        container.appendChild(box);
    });

    // اگر همه منابع نمایش داده می‌شوند، باکس جمع کل نیز اضافه کنید
    if (selectedSourceId === '0') {
        const totalCount = data.reduce((sum, item) => sum + (item.count || 0), 0);
        const totalBox = document.createElement('div');
        totalBox.className = 'bg-gradient-to-r from-purple-500 to-indigo-500 p-4 rounded-lg text-white col-span-full md:col-span-2 lg:col-span-1';
        totalBox.innerHTML = `
            <div class="flex items-center">
                <i class="material-icons text-white mr-2">summarize</i>
                <span class="text-sm font-medium">جمع کل همه منابع</span>
            </div>
            <div class="text-2xl font-bold mt-2">${formatNumber(totalCount)}</div>
            <div class="text-xs opacity-90 mt-1">تعداد کل شماره‌های تخصیص نیافته</div>
        `;
        container.appendChild(totalBox);
    }
}

// تابع اصلی برای به‌روزرسانی باکس‌ها
export async function updateUnassignedCountsBoxes(sourceId = '0') {
    try {
        const data = await fetchUnassignedNumbers(sourceId);
        currentState.unassignedNumbers = data; // ذخیره داده‌ها در state
        createDynamicCountBoxes(data, sourceId);
    } catch (error) {
        console.error('Error updating counts boxes:', error);
        showErrorState();
    }
}

// تابع برای نمایش حالت خطا
function showErrorState() {
    const container = document.getElementById('dynamic-counts-container');
    if (container) {
        container.innerHTML = `
            <div class="col-span-full text-center text-red-500 py-4">
                <i class="material-icons text-4xl mb-2">error</i>
                <p>خطا در بارگذاری داده‌ها</p>
                <button onclick="window.updateUnassignedCountsBoxesRetry()" class="text-blue-500 hover:text-blue-700 mt-2">
                    <i class="material-icons text-sm mr-1">refresh</i>
                    تلاش مجدد
                </button>
            </div>
        `;
    }
}

// تابع برای پر کردن dropdown منابع
export async function populateSourceFilter() {
    try {
        await loadBranchesForBulkAssignment();
        const data = await fetchUnassignedNumbers('0');
        const sourceFilter = document.getElementById('source-filter');
        
        if (!sourceFilter || !data) return;
        
        // ذخیره مقدار فعلی
        const currentValue = sourceFilter.value;
        
        // پاک کردن و پر کردن مجدد
        sourceFilter.innerHTML = '<option value="0">همه منابع</option>';
        
        data.forEach(source => {
            if (source.sourceid && source.sourcename) {
                const option = document.createElement('option');
                option.value = source.sourceid;
                option.textContent = `${source.sourcename} (${formatNumber(source.count)})`;
                sourceFilter.appendChild(option);
            }
        });
        
        // بازگرداندن مقدار قبلی اگر وجود دارد
        if (currentValue && Array.from(sourceFilter.options).some(opt => opt.value === currentValue)) {
            sourceFilter.value = currentValue;
        }
        
    } catch (error) {
        console.error('Error populating source filter:', error);
    }
}

// تابع برای مدیریت تغییر منبع
export function setupSourceFilterListener() {
    const sourceFilter = document.getElementById('source-filter');
    
    if (sourceFilter) {
        sourceFilter.addEventListener('change', async function(e) {
            const selectedSourceId = e.target.value;
            await updateUnassignedCountsBoxes(selectedSourceId);
            await updateAssignmentSummary(selectedSourceId); // اضافه کردن این خط
        });
    }
}


export async function loadBulkAssignmentData() {
    try {
        // نمایش حالت لودینگ
        showLoadingState();
        
        // بارگذاری موازی داده‌ها
        await Promise.all([
            populateSourceFilter(),
            updateUnassignedCountsBoxes('0'),
            updateAssignmentSummary('0') // اضافه کردن این خط
        ]);
        
    } catch (error) {
        console.error('Error loading bulk assignment data:', error);
        showNotification('خطا در بارگذاری داده‌های تخصیص گروهی', 'error');
    }
}

// تابع برای نمایش حالت لودینگ
function showLoadingState() {
    const container = document.getElementById('dynamic-counts-container');
    if (container) {
        container.innerHTML = `
            <div class="col-span-full text-center text-gray-500 py-8">
                <div class="spinner"></div>
                <p class="mt-2">در حال بارگذاری داده‌ها...</p>
            </div>
        `;
    }
}

// تابع global برای رفع مشکل onclick
window.updateUnassignedCountsBoxesRetry = function() {
    updateUnassignedCountsBoxes('0');
};







export async function fetchBranchAssignmentSummary(sourceId = '0') {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            throw new Error('لطفاً ابتدا وارد سیستم شوید');
        }

        const response = await fetch(
            `${apiBaseUrl}/api/v1/phoneassignment/info/branchassignment?sourceid=${sourceId}`, 
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`خطا در دریافت داده‌ها: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.meta && data.meta.is_success) {
            return data.data || [];
        } else {
            throw new Error(data.meta?.description || 'خطا در دریافت داده‌ها از سرور');
        }
    } catch (error) {
        console.error('Error fetching branch assignment summary:', error);
        throw error;
    }
}

// تابع برای ایجاد کارت‌های خلاصه تخصیص‌ها
export function createAssignmentSummaryCards(data) {
    const summaryContainer = document.getElementById('assignment-summary');
    if (!summaryContainer) return;

    // پاک کردن محتوای قبلی
    summaryContainer.innerHTML = '';

    if (!data || data.length === 0) {
        summaryContainer.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="material-icons text-4xl mb-2">assignment</i>
                <p>هیچ داده‌ای برای نمایش وجود ندارد</p>
            </div>
        `;
        return;
    }

    // محاسبه مجموع‌های کلی
    const totals = {
        totalAssigned: data.reduce((sum, item) => sum + (item.totalassigned || 0), 0),
        assignedLastHour: data.reduce((sum, item) => sum + (item.assignedlasthour || 0), 0),
        calledCount: data.reduce((sum, item) => sum + (item.calledcount || 0), 0),
        notCalledCount: data.reduce((sum, item) => sum + (item.notcalledcount || 0), 0)
    };

    // ایجاد کارت خلاصه کلی
    const overallCard = document.createElement('div');
    overallCard.className = 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl p-6 mb-6 shadow-lg';
    overallCard.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">خلاصه کلی تخصیص‌ها</h3>
            <i class="material-icons text-2xl">summarize</i>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center">
                <div class="text-2xl font-bold">${formatNumber(totals.totalAssigned)}</div>
                <div class="text-sm opacity-90">کل تخصیص‌ها</div>
            </div>
            <div class="text-center">
                <div class="text-2xl font-bold">${formatNumber(totals.assignedLastHour)}</div>
                <div class="text-sm opacity-90">تخصیص ساعت گذشته</div>
            </div>
            <div class="text-center">
                <div class="text-2xl font-bold">${formatNumber(totals.calledCount)}</div>
                <div class="text-sm opacity-90">تماس گرفته شده</div>
            </div>
            <div class="text-center">
                <div class="text-2xl font-bold">${formatNumber(totals.notCalledCount)}</div>
                <div class="text-sm opacity-90">تماس گرفته نشده</div>
            </div>
        </div>
    `;
    summaryContainer.appendChild(overallCard);

    // ایجاد کارت برای هر شعبه
    data.forEach(branch => {
        const completionRate = branch.totalassigned > 0 
            ? Math.round((branch.calledcount / branch.totalassigned) * 100) 
            : 0;

        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl shadow-md p-5 mb-4 border-l-4 border-purple-500 hover:shadow-lg transition-shadow duration-300';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <h4 class="font-semibold text-gray-800 text-lg">${branch.branchname || 'بدون نام'}</h4>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div class="text-center p-3 bg-blue-50 rounded-lg">
                    <div class="text-blue-600 font-bold text-xl">${formatNumber(branch.totalassigned || 0)}</div>
                    <div class="text-blue-800 text-xs mt-1">کل تخصیص‌ها</div>
                </div>
                <div class="text-center p-3 bg-green-50 rounded-lg">
                    <div class="text-green-600 font-bold text-xl">${formatNumber(branch.assignedlasthour || 0)}</div>
                    <div class="text-green-800 text-xs mt-1">تخصیص ساعت گذشته</div>
                </div>
                <div class="text-center p-3 bg-emerald-50 rounded-lg">
                    <div class="text-emerald-600 font-bold text-xl">${formatNumber(branch.calledcount || 0)}</div>
                    <div class="text-emerald-800 text-xs mt-1">تماس گرفته شده</div>
                </div>
                <div class="text-center p-3 bg-amber-50 rounded-lg">
                    <div class="text-amber-600 font-bold text-xl">${formatNumber(branch.notcalledcount || 0)}</div>
                    <div class="text-amber-800 text-xs mt-1">تماس گرفته نشده</div>
                </div>
            </div>
            
            <div class="flex items-center justify-between text-sm text-gray-600">
                <span>نرخ تکمیل تماس:</span>
                <span class="font-semibold ${completionRate >= 80 ? 'text-green-600' : completionRate >= 50 ? 'text-yellow-600' : 'text-red-600'}">
                    ${completionRate}%
                </span>
            </div>
            
            ${branch.totalassigned > 0 ? `
            <div class="mt-2 bg-gray-200 rounded-full h-2">
                <div class="bg-purple-500 h-2 rounded-full transition-all duration-500" 
                     style="width: ${completionRate}%"></div>
            </div>
            ` : ''}
        `;
        summaryContainer.appendChild(card);
    });
}

// تابع اصلی برای به‌روزرسانی خلاصه تخصیص‌ها
export async function updateAssignmentSummary(sourceId = '0') {
    try {
        const data = await fetchBranchAssignmentSummary(sourceId);
        createAssignmentSummaryCards(data);
    } catch (error) {
        console.error('Error updating assignment summary:', error);
        showErrorStateSummary();
    }
}

// تابع برای نمایش حالت خطا در خلاصه تخصیص‌ها
function showErrorStateSummary() {
    const summaryContainer = document.getElementById('assignment-summary');
    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div class="text-center text-red-500 py-8">
                <i class="material-icons text-4xl mb-2">error</i>
                <p>خطا در بارگذاری داده‌های خلاصه تخصیص‌ها</p>
                <button onclick="window.updateAssignmentSummaryRetry()" class="text-blue-500 hover:text-blue-700 mt-2 flex items-center justify-center mx-auto">
                    <i class="material-icons text-sm ml-1">refresh</i>
                    تلاش مجدد
                </button>
            </div>
        `;
    }
}

// تابع global برای رفع مشکل onclick
window.updateAssignmentSummaryRetry = function() {
    const sourceFilter = document.getElementById('source-filter');
    const sourceId = sourceFilter ? sourceFilter.value : '0';
    updateAssignmentSummary(sourceId);
};












// leads.js

// --- توابع جدید برای نمایش لودینگ ---
function showLoading(containerElement) {
    if (!containerElement) return;
    const loadingHtml = `
        <div class="loading-spinner col-span-full flex items-center justify-center py-16">
            <style>
                .spinner {
                    border: 4px solid rgba(0, 0, 0, 0.1);
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    border-left-color: #6d28d9; /* purple-700 */
                    animation: spin 1s ease infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
            <div class="spinner"></div>
        </div>
    `;
    // برای جدول، محتوا را در tbody قرار می‌دهیم
    if (containerElement.tagName.toLowerCase() === 'tbody') {
        containerElement.innerHTML = `<tr><td colspan="5">${loadingHtml}</td></tr>`;
    } else { // برای گالری، محتوا را مستقیم در کانتینر قرار می‌دهیم
        containerElement.innerHTML = loadingHtml;
    }
}

function hideLoading(containerElement) {
    if (!containerElement) return;
    const spinner = containerElement.querySelector('.loading-spinner');
    if (spinner) {
        // اگر در جدول بود، کل ردیف را پاک کن
        if (containerElement.tagName.toLowerCase() === 'tbody') {
            containerElement.innerHTML = '';
        } else {
            spinner.remove();
        }
    }
}
// --- پایان توابع لودینگ ---