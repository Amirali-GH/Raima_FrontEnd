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
    
    // الحماية ضد القيم غير الصالحة
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

    // إذا كان عدد الصفحات منخفضا، أظهر للجميع
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
            addPageButton(i, i === currentPage);
        }
    } else {
        // دائما الصفحة 1
        addPageButton(1, currentPage === 1);

        let start, end;
        
        // منطق أسهل لتحديد نطاق الصفحات
        if (currentPage <= 4) {
            // بالقرب من الأولى: الصفحات من 1 إلى 2
            start = 2;
            end = Math.min(5, totalPages - 1);
            
            for (let i = start; i <= end; i++) {
                addPageButton(i, i === currentPage);
            }
            
            if (totalPages > 6) {
                addEllipsis();
            }
            
        } else if (currentPage >= totalPages - 3) {
            // النهاية القريبة: الصفحات totalPages-4 ل totalPages-1
            addEllipsis();
            
            start = Math.max(2, totalPages - 4);
            end = totalPages - 1;
            
            for (let i = start; i <= end; i++) {
                addPageButton(i, i === currentPage);
            }
            
        } else {
            // وفي وسط القائمة: الصفحات currentPage-2 ل currentPage+2
            addEllipsis();
            
            start = currentPage - 2;
            end = currentPage + 2;
            
            for (let i = start; i <= end; i++) {
                addPageButton(i, i === currentPage);
            }
            
            addEllipsis();
        }

        // دائمًا الصفحة الأخيرة (إذا كان لدينا أكثر من صفحتين)
        if (totalPages > 1) {
            addPageButton(totalPages, currentPage === totalPages);
        }
    }

    // يتحكم prev/next
    prevPageBtn.style.display = (currentPage === 1) ? 'none' : 'inline-block';
    nextPageBtn.style.display = (currentPage === totalPages) ? 'none' : 'inline-block';
    
    // الأزرار السابقة والتالية
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
                    <p>لم يتم العثور على العنصر </p>
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
                <button class="text-purple-600 hover:text-purple-900 edit-assignment" data-id="${lead.id}" title="يحرر">
                    <i class="material-icons text-base">edit</i>
                </button>
                <button class="text-red-600 hover:text-red-900 delete-assignment" data-id="${lead.id}" title="يزيل">
                    <i class="material-icons text-base">delete</i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

export async function fetchLeads() {
    const tableBody = document.getElementById('leads-table-body');
    showLoading(tableBody); // عرض لودينغ

    try {
        const totalPages = Math.max(1, parseInt(currentState.totalPages) || 1);
        if (currentState.currentPage < 1 || currentState.currentPage > totalPages) {
            currentState.currentPage = Math.min(Math.max(1, currentState.currentPage), totalPages);
        }

        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        if (!token) {
            showNotification('الرجاء تسجيل الدخول أولا');
            return;
        }

        const urlObj = new URL('/api/v1/phoneassignment', apiBaseUrl);
        const params = new URLSearchParams();
        params.set('page', currentState.currentPage);
        params.set('page_size', currentState.pageSize);

        let branchIdForQuery;
        if (currentState.user && currentState.user.userrolename === 'admin') {
            branchIdForQuery = currentState.selectedBranch;
            if (branchIdForQuery === '') { // "" يقصد "جميع الفروع"
                branchIdForQuery = '0';
            }
        } else {
            // إذا لم يكن المسؤول => فرعه فقط
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

        if (!response.ok) throw new Error(`خطأ في تلقي البيانات: ${response.status}`);
        
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
            showNotification('خطأ في تلقي البيانات من الخادم', 'error');
            renderLeadsTable(); // يظهر الجدول فارغا
        }
    } catch (error) {
        console.error('Error fetching leads:', error);
        showNotification('خطأ مرتبط بالخادم: ' + (error.message || error), 'error');
    } finally {
        // وفي كل الأحوال نخفي (النجاح أو الخطأ)
        // مع تأخير بسيط حتى لا يلاحظ المستخدم التغيير
        setTimeout(() => {
            hideLoading(tableBody);
            if (currentState.leads.length === 0) {
                renderLeadsTable(); // لعرض الرسالة "لم يتم العثور على أي حالة"
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
        if (!response.ok) throw new Error(`خطأ في استلام الفروع: ${response.status}`);
        
        const data = await response.json();
        if (!data.data || !Array.isArray(data.data)) throw new Error('بنية البيانات المستلمة غير صالحة');
        
        currentState.branches = data.data;
        const branchSelect = document.getElementById('branch-filter');
        
        if (branchSelect) {
            branchSelect.innerHTML = '<option value="">جميع الفروع </option>';
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
            branchSelect.innerHTML = '<option value="">خطأ في تحميل الفروع </option>';
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
        showNotification('الرجاء تحديد رقم الاتصال والفرع.');
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
        if (!response.ok) throw new Error(responseData.meta.description || 'خطأ في التخزين');

        showNotification(responseData.meta.description, 'success');
        closeAssignmentModal();
        fetchLeads(); // Refresh table
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

export async function deleteAssignment(assignmentId) {
    if (!confirm('هل أنت متأكد من حذف هذا التخصيص؟')) return;

    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${apiBaseUrl}/api/v1/phoneassignment/${assignmentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.meta.description || 'خطأ في الحذف');
        
        showNotification(responseData.meta.description, 'success');
        fetchLeads(); // Refresh table
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

export function handleSort(field) {
    showNotification('الفرز غير مدعوم في هذا الإصدار.');
}

export function handleBranchChange(e) {
    currentState.selectedBranch = e.target.value;

    // تأكد من ذلك gallery مُعرف
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
            showNotification('الرجاء تسجيل الدخول أولا');
            return;
        }

        // خلق modal المعالجة في حالة الغياب
        createProcessingModalIfNotExists();

        // منظر modal يعالج
        const processingModal = document.getElementById('export-processing-modal');
        processingModal.classList.remove('hidden');

        // عزيمة branchid (الأولوية للمرشح المحدد، وإلا branch مستخدم)
        let branchId;
        if (currentState.user && currentState.user.userrolename === 'admin') {
            branchId = currentState.selectedBranch;
            if (branchId === '') { // "" يقصد "جميع الفروع"
                branchId = '0';
            }
        } else {
            // إذا لم يكن المسؤول => فرعه فقط
            branchId = currentState.user?.branchid;
        }

        // نقطة بداية الطلب (رقم page => وفقًا لك، يرسل الخادم المستودع بأكمله)
        let requestUrl = `${apiBaseUrl}/api/v1/phoneassignment?branchid=${encodeURIComponent(branchId)}`;

        // إذا كنت تريد تطبيق مرشح البحث:
        if (currentState.searchQuery) {
            requestUrl += `&context=${encodeURIComponent(currentState.searchQuery)}`;
        }

        const allItems = [];

        // وظيفة مساعدة للبناء headers
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // تحديث رسالة المعالجة
        updateProcessingMessage('الحصول على البيانات من الخادم ...');

        // المكالمة الأولى وإمكانية المتابعة pagination إذا قام الخادم بإرجاع الصفحات
        let nextUrl = requestUrl;
        let pageCount = 0;
        
        while (nextUrl) {
            pageCount++;
            updateProcessingMessage(`في استقبال البيانات من الخادم ... (صفحة ${pageCount})`);
            
            const resp = await fetch(nextUrl, { headers });
            if (!resp.ok) throw new Error(`خطأ في تلقي البيانات: ${resp.status}`);

            const json = await resp.json();

            // هيكل البيانات المتوقع: json.data => array
            if (!json.data || !Array.isArray(json.data)) {
                throw new Error('البيانات المستلمة لا تحتوي على البنية المتوقعة.');
            }

            allItems.push(...json.data);

            // إذا كان التعريف يشمل next_page_uri كن فاتبعه (قد تكون قيمة نسبية)
            const pageMeta = json.meta && json.meta.page;
            if (pageMeta && pageMeta.next_page_uri) {
                // next_page_uri قد يكون عنوان نسبي؛ إذا كان الأمر نسبيًا لأخذه إليه apiBaseUrl نحن نتواصل
                if (pageMeta.next_page_uri.startsWith('http')) {
                    nextUrl = pageMeta.next_page_uri;
                } else {
                    // إزالة شرطة مائلة إضافية
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
        updateProcessingMessage(`في إنتاج ملف Excel ... (${allItems.length} سِجِلّ)`);

        // تجميع جميع الحقول في أعمدة Excel بأسماء فارسية
        const normalized = allItems.map(item => {
            return {
                'معرف المهمة': item.assignmentid || '',
                'رقم الاتصال': item.phone || '',
                'معرف الفرع': item.branchid || '',
                'اسم الفرع': item.branchname || '',
                'معرف المصدر': item.sourcecollectingdataid || '',
                'اسم المصدر': item.sourcename || '',
                'اسم المستخدم': item.username || '',
                'التاريخ المضاف': item.addedat || '',
                
                // معلومة Gravity
                'بطاقة تعريف Gravity': item.gravityentryid || '',
                'الاسم الكامل Gravity': item.gravityfullname || '',
                'الرمز الوطني Gravity': item.gravitynationalcode || '',
                'طلبت السيارة Gravity': item.gravitycarrequested || '',
                'شروط البيع Gravity': item.gravitysaleterms || '',
                'عنوان Gravity': item.gravityaddress || '',
                'مدينة Gravity': item.gravitycity || '',
                'لون Gravity': item.gravitycolor || '',
                'عنوان المصدر Gravity': item.gravitysourceurl || '',
                'الملكية الفكرية Gravity': item.gravityip || '',
                'تاريخ الإنشاء Gravity': item.gravitydatecreated || '',
                
                // معلومة Goftino
                'بطاقة تعريف': item.goftinoid || '',
                'اسم تالينو': item.goftinoname || '',
                'طلب السيارة': item.goftinocarrequested || '',
                'قال البريد الإلكتروني': item.goftinoemail || '',
                'وصف الحديث': item.goftinodescription || ''
            };
        });

        // التحويل إلى أوراق وإنشاء ملف Excel
        const worksheet = XLSX.utils.json_to_sheet(normalized);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Assignment_Ans');

        const nowStr = new Date().toLocaleDateString('fa-IR').replace(/\//g, '-');
        const filename = `export_leads_branch_${branchId}_${nowStr}.xlsx`;
        
        // إظهار الرسالة النهائية
        updateProcessingMessage('حمل الملف...');
        
        // قم بإنشاء تأخير بسيط لعرض الرسالة
        await new Promise(resolve => setTimeout(resolve, 500));
        
        XLSX.writeFile(workbook, filename);
        
        showNotification(`ملف اكسل مع ${allItems.length} تم إنتاج السجل وتنزيله بنجاح.`, 'success');

    } catch (error) {
        console.error('exportLeads error:', error);
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

// وظيفة لتحديث الرسالة في modal يعالج
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

    // قم أولاً بضبط موضع المؤشر
    updateIndicator();
    
    // قم بتحديث موضع النافذة عند تغيير حجم النافذة
    window.addEventListener('resize', updateIndicator);
}

// وظيفة لتغيير علامات التبويب
function switchTab(tabName) {
    const assignmentsPanel = document.getElementById('assignments-panel');
    const galleryPanel = document.getElementById('gallery-panel');
    const bulkAssignPanel = document.getElementById('bulk-assign-panel');
    const buttonBoxAssignment = document.getElementById('button-box-assignment');
    const assignmetHeader = document.getElementById('assignmet-header');
    
    const tabAssignments = document.getElementById('tab-assignments');
    const tabGallery = document.getElementById('tab-gallery');
    const tabBulkAssign = document.getElementById('tab-bulk-assign');
    
    // إخفاء كافة اللوحات
    assignmentsPanel.classList.add('hidden');
    galleryPanel.classList.add('hidden');
    if (bulkAssignPanel) bulkAssignPanel.classList.add('hidden');
    
    // تعطيل جميع علامات التبويب
    tabAssignments.classList.remove('active');
    tabGallery.classList.remove('active');
    if (tabBulkAssign) tabBulkAssign.classList.remove('active');
    
    // عرض اللوحة وتنشيط علامة التبويب المقابلة
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
                showNotification('خطأ في المعرض', 'error');
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

    // انقر فوق الحدث لعلامات التبويب
    tabAssignments.addEventListener('click', () => switchTab('assignments'));
    tabGallery.addEventListener('click', () => switchTab('gallery'));

    // التهيئة
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
    showLoading(galleryContainer); // عرض لودينغ

    ensureGalleryState();
    const g = currentState.gallery;
    const token = localStorage.getItem('authToken');
    const apiBaseUrl = window.location.origin;

    if (page !== null) g.currentPage = page;
    const pageNum = g.currentPage || 1;
    const pageSize = g.pageSize || 5;

    // --- البدء في إصلاح المنطق Branch ID ---
    let branchIdForQuery;
    if (currentState.user && currentState.user.userrolename === 'admin') {
        branchIdForQuery = currentState.selectedBranch;
        if (branchIdForQuery === '') { // "" يقصد "جميع الفروع"
            branchIdForQuery = '0';
        }
    } else {
        // إذا لم يكن المسؤول => فرعه فقط
        branchIdForQuery = currentState.user.branchid;
    }
    
    if (!branchIdForQuery) {
        showNotification('لا يمكن العثور على معرف الفرع.', 'error');
        hideLoading(galleryContainer);
        galleryContainer.innerHTML = '<div>الرجاء اختيار فرع. </div>';
        return;
    }
    // --- نهاية إصلاح المنطق Branch ID ---

    try {
        const url = new URL('/api/v1/images/by-branch', apiBaseUrl);
        url.searchParams.set('branchid', branchIdForQuery);
        url.searchParams.set('page', pageNum);
        url.searchParams.set('pageSize', pageSize);

        const resp = await fetch(url.toString(), {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!resp.ok) throw new Error(`خطأ في استقبال الصور: ${resp.status}`);
        const json = await resp.json();

        if (!json.items) throw new Error('استجابة الخادم للصور ليس لها بنية حسنة السمعة.');
        
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
        showNotification(err.message || 'خطأ في تلقي الصور', 'error');
    } finally {
        setTimeout(() => {
            hideLoading(galleryContainer);
            if (g.items.length === 0) {
                renderGallery(); // لعرض الرسالة "لم يتم العثور على الصورة."
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
            <div>لم يتم العثور على صورة </div>
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
        imgEl.src = img.url; // الآن URL مكتمل
        imgEl.alt = img.filename || 'صورة';
        imgEl.className = 'w-full h-44 object-cover';
        col.appendChild(imgEl);

        const meta = document.createElement('div');
        meta.className = 'p-2 text-right';
        
        // --- البدء بالإصلاحات ---
        // قم بإزالة تاريخ التحميل لأنه ردًا على ذلك API لا يوجد
        meta.innerHTML = `<div class="text-sm text-gray-700 font-medium">${img.filename || ''}</div>`;
        // --- نهاية الإصلاحات ---

        col.appendChild(meta);
        col.addEventListener('click', () => openImageLightbox(img));
        container.appendChild(col);
    });

    // يبقى قسم التخطيط دون تغيير ...
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
    lbImg.alt = imgObj.filename || 'صورة';
    if (lbMeta) {
        // --- البدء بالإصلاحات ---
        // حذف تاريخ التحميل Date
        lbMeta.innerHTML = `<div>${imgObj.filename || ''}</div>`;
        // --- نهاية الإصلاحات ---
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
    
    // انقر فوق الحدث لعلامة التبويب
    tabBulkAssign.addEventListener('click', () => {
        switchTab('bulk-assign');
        loadBulkAssignmentData();
    });
    
    // اضبط المستمع على مرشح المصدر
    setupSourceFilterListener();
    
    // ربط الوظائف الجديدة بالأزرار
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
            showNotification('الرجاء تسجيل الدخول أولا.', 'error');
            return;
        }

        // عرض حالة المعالجة
        const undoBtn = document.getElementById('undo-assignments-btn');
        const originalText = undoBtn.innerHTML;
        undoBtn.innerHTML = '<i class="material-icons mr-2 animate-spin">refresh</i>جارٍ الاسترداد...';
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

        // استعادة وضع الزر إلى الوضع الأول
        undoBtn.innerHTML = originalText;
        undoBtn.disabled = false;

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.meta?.description || `خطأ في استرجاع المهام: ${response.status}`);
        }

        const responseData = await response.json();
        
        if (responseData.meta && responseData.meta.is_success) {
            const data = responseData.data;

            if (data.has_changes) {
                // عرض تقرير التعيين
                showAssignmentReport(data.report);

                // تحديث البيانات
                const currentSourceId = sourceFilter ? sourceFilter.value : '0';
                await updateUnassignedCountsBoxes(currentSourceId);
                await updateAssignmentSummary(currentSourceId);

                showNotification('تمت عمليات التخصيص.', 'success');
            } else {
                // لا يوجد تغيير في الساعة الماضية
                showNotification(data.message || 'لا يوجد تغيير لاستعادة.', 'info');
            }
        } else {
            throw new Error(responseData.meta?.description || 'حدث خطأ أثناء استرداد المهام');
        }
        
    } catch (error) {
        console.error('Error undoing assignments:', error);
        showNotification(error.message, 'error');
        
        // استعادة وضع الزر في حالة حدوث خطأ
        const undoBtn = document.getElementById('undoAssignmentsBtn');
        if (undoBtn) {
            undoBtn.innerHTML = '<i class="material-icons mr-2">undo</i>استعادة الأرقام';
            undoBtn.disabled = false;
        }
    }
}

export async function saveAssignments() {
    try {
        // يجمع branch_ids و counts
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
            showNotification('لا توجد مهمة للحفظ.', 'warning');
            return;
        }

        // عزيمة source_id
        const sourceFilter = document.getElementById('source-filter');
        const sourceId = sourceFilter ? parseInt(sourceFilter.value) : 0;

        // عمل بيانات الطلب
        const requestData = {
            branch_ids: branchIds,
            counts: counts,
            source_id: sourceId
        };

        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('الرجاء تسجيل الدخول أولا.', 'error');
            return;
        }

        // عرض حالة المعالجة
        const saveBtn = document.getElementById('save-assignments-btn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="material-icons mr-2 animate-spin">refresh</i>يحفظ ...';
        saveBtn.disabled = true;

        const response = await fetch(`${apiBaseUrl}/api/v1/phoneassignment/assign_phones_to_branches`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        // استعادة وضع الزر إلى الوضع الأول
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.meta?.description || `خطأ في حفظ الواجبات: ${response.status}`);
        }

        const responseData = await response.json();
        
        if (responseData.meta && responseData.meta.is_success) {
            // عرض تقرير التعيين
            showAssignmentReport(responseData.data.report);
            
            // تحديث البيانات
            const currentSourceId = sourceFilter ? sourceFilter.value : '0';
            await updateUnassignedCountsBoxes(currentSourceId);
            await updateAssignmentSummary(currentSourceId);
            
            showNotification(responseData.meta.description, 'success');
        } else {
            throw new Error(responseData.meta?.description || 'خطأ في مهام التخزين');
        }
        
    } catch (error) {
        console.error('Error saving assignments:', error);
        showNotification(error.message, 'error');
        
        // استعادة وضع الزر في حالة حدوث خطأ
        const saveBtn = document.getElementById('save-assignments-btn');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="material-icons mr-2">save</i>تخزين التخصيص';
            saveBtn.disabled = false;
        }
    }
}

export async function updateAvailableNumbers() {
    try {
        // استخدام بيانات الاختبار
        const sourceFilter = document.getElementById('source-filter')?.value || '0';
        
        // احسب الرقم بناءً على عامل التصفية المصدر
        let totalCount = TEST_SOURCES.total;
        let novinhabCount = TEST_SOURCES.bySource.novinhab;
        let goftinoCount = TEST_SOURCES.bySource.goftino;
        let websiteCount = TEST_SOURCES.bySource.website;
        
        // تطبيق مرشح المصدر
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
        
        // تحديث الأرقام في الواجهة
        document.getElementById('total-unassigned-count').textContent = totalCount;
        document.getElementById('source-novinhab-count').textContent = novinhabCount;
        document.getElementById('source-goftino-count').textContent = goftinoCount;
        document.getElementById('source-website-count').textContent = websiteCount;
        
    } catch (error) {
        console.error('Error updating available numbers:', error);
        showNotification('حدث خطأ أثناء تحديث عدد الأرقام الموجودة', 'error');
    }
}

export function showAssignmentReport(report) {
    if (!report || report.length === 0) return;

    const modalHtml = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-xl shadow-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden">
                <div class="flex justify-between items-center p-6 border-b">
                    <h3 class="text-lg font-semibold">تقرير تخصيصات الأرقام </h3>
                    <button id="close-report-modal" class="text-gray-500 hover:text-gray-700">
                        <i class="material-icons">close</i>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto max-h-[65vh]">
                    <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div class="flex items-center">
                            <i class="material-icons text-green-600 ml-2">check_circle</i>
                            <span class="text-green-800 font-medium">تم التخصيص بنجاح </span>
                        </div>
                    </div>
                    
                    <div class="overflow-x-auto">
                        <table class="min-w-full border border-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="py-3 px-4 border-b text-right">فرع </th>
                                    <th class="py-3 px-4 border-b text-center">مطلوب </th>
                                    <th class="py-3 px-4 border-b text-center">المخصصة </th>
                                    <th class="py-3 px-4 border-b text-center">الحالة </th>
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
                                                ${item.Requested === item.Assigned ? 'مكتمل' : 'غير كامل'}
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
                            <div class="text-blue-800">الجمع المطلوب </div>
                        </div>
                        <div class="text-center p-3 bg-green-50 rounded-lg">
                            <div class="text-green-600 font-bold">${formatNumber(report.reduce((sum, item) => sum + item.Assigned, 0))}</div>
                            <div class="text-green-800">قطعة الأرض المخصصة </div>
                        </div>
                    </div>
                </div>
                <div class="flex justify-end p-6 border-t pb-4">
                    <button id="confirm-report-modal" class="bg-purple-600 text-white mb-4 px-6 py-2 rounded-md hover:bg-purple-700">
                        لقد فهمت
                    </button>
                </div>
            </div>
        </div>
    `;

    // إضافة مشروط إلى الصفحة
    const existingModal = document.getElementById('assignment-report-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modalContainer = document.createElement('div');
    modalContainer.id = 'assignment-report-modal';
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);

    // يضيف event listeners
    document.getElementById('close-report-modal').addEventListener('click', closeReportModal);
    document.getElementById('confirm-report-modal').addEventListener('click', closeReportModal);
    
    // أغلق النموذج بالنقر خارجًا منه
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
            showNotification('الرجاء تسجيل الدخول أولا', 'error');
            return;
        }

        // استلام بيانات الفرع من API
        const response = await fetch(`${apiBaseUrl}/api/v1/branch?page=1&status=active`, {
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            }
        });

        if (!response.ok) {
            throw new Error(`خطأ في استلام الفروع: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.meta.is_success || !data.data || !Array.isArray(data.data)) {
            throw new Error('بنية البيانات المستلمة غير صالحة');
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
                        <div class="font-medium">${branch.mainname || 'لا اسم'}</div>
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
                                title="مسح المهمة">
                            <i class="material-icons text-base">clear</i>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            // أضف الحدث إلى أزرار المسح
            document.querySelectorAll('.clear-branch-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const branchId = this.getAttribute('data-branch-id');
                    const branchName = this.closest('tr').querySelector('td:first-child .font-medium').textContent;
                    clearBranchAssignment(branchId, branchName);
                });
            });
            
            // أضف الحدث إلى حقول الأرقام
            document.querySelectorAll('.assignment-count-input').forEach(input => {
                input.addEventListener('input', updateTotalRequestedCount);
                input.addEventListener('change', updateAssignmentSummary);
            });
            
            updateTotalRequestedCount();
            updateAssignmentSummary();
            
            showNotification(`قائمة الفروع التي تم تحميلها بنجاح (${branches.length} فرع)`, 'success');
        }
    } catch (error) {
        console.error('Error loading branches:', error);
        showNotification('خطأ في تحميل قائمة الفروع: ' + error.message, 'error');
        
        // عرض وضع الخطأ في الجدول
        const tbody = document.getElementById('branches-table-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-8 text-center text-red-500">
                        <i class="material-icons text-4xl mb-2">error</i>
                        <div>خطأ في تحميل البيانات </div>
                        <button onclick="loadBranchesForBulkAssignment()" class="mt-2 text-blue-600 hover:text-blue-800 flex items-center justify-center mx-auto">
                            <i class="material-icons text-sm ml-1">refresh</i>
                            إعادة المحاولة
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

// وظيفة للتحقق من صحة المدخلات لعدد المهام
export function validateAssignmentInput(input) {
    const value = parseInt(input.value);
    if (value < 0) {
        input.value = 0;
    }
    
    // تحديث الملخص عند الكتابة
    updateTotalRequestedCount();
}

// وظيفة global لإصلاح المشكلة onclick
window.loadBranchesForBulkAssignment = loadBranchesForBulkAssignment;


function getTotalUnassignedCount(sourceId = '0') {
    if (!currentState.unassignedNumbers) return 0;
    
    if (sourceId === '0') {
        // مجموع جميع الموارد
        return currentState.unassignedNumbers.reduce((sum, item) => sum + (item.count || 0), 0);
    } else {
        // المصدر المحدد فقط
        const source = currentState.unassignedNumbers.find(item => item.sourceid == sourceId);
        return source ? source.count || 0 : 0;
    }
}

// وظيفة للتوزيع المتساوي بين الفروع
export function distributeEqually() {
    try {
        const sourceFilter = document.getElementById('source-filter');
        const sourceId = sourceFilter ? sourceFilter.value : '0';
        
        if (!currentState.unassignedNumbers || currentState.unassignedNumbers.length === 0) {
            showNotification('يرجى الانتظار حتى يتم تحميل البيانات.', 'warning');
            return;
        }

        const totalUnassigned = getTotalUnassignedCount(sourceId);
        
        if (totalUnassigned === 0) {
            showNotification('لا يوجد رقم للتخصيص.', 'warning');
            return;
        }

        const inputs = document.querySelectorAll('.assignment-count-input');
        if (inputs.length === 0) {
            showNotification('لا يوجد فرع للتخصيص.', 'warning');
            return;
        }

        // احسب العدد المتساوي لكل فرع
        const equalCount = Math.floor(totalUnassigned / inputs.length);
        const remainder = totalUnassigned % inputs.length;
        
        // تخصيص ما يعادل المتبقية
        inputs.forEach((input, index) => {
            const count = index < remainder ? equalCount + 1 : equalCount;
            input.value = count;
        });

        updateTotalRequestedCount();
        updateAssignmentSummary();
        
        showNotification(`رقم ${formatNumber(totalUnassigned)} العدد متساوي بين ${inputs.length} تم تخصيص الفرع .`, 'success');
        
    } catch (error) {
        console.error('Error in equal distribution:', error);
        showNotification('خطأ في التوزيع المتساوي: ' + error.message, 'error');
    }
}

// وظيفة لمسح جميع المهام
export function clearAllAssignments() {
    document.querySelectorAll('.assignment-count-input').forEach(input => {
        input.value = 0;
    });
    
    updateTotalRequestedCount();
    updateAssignmentSummary();
    showNotification('تم تنظيف جميع التخصيصات', 'info');
}

// وظيفة لتلقي اسم الفرع على أساس ID
function getBranchName(branchId) {
    if (!currentState.branches || !Array.isArray(currentState.branches)) {
        return `فرع ${branchId}`;
    }
    
    const branch = currentState.branches.find(b => b.branchid === branchId);
    return branch ? branch.mainname : `فرع ${branchId}`;
}




// أضف الوظيفة global لإصلاح المشكلة onclick
window.distributeEqually = distributeEqually;
window.saveAssignments = saveAssignments;

// وظيفة لمسح مهمة فرع معين
export function clearBranchAssignment(branchId) {
    const input = document.querySelector(`.assignment-count-input[data-branch-id="${branchId}"]`);
    if (input) {
        const branchName = input.closest('tr').querySelector('td:first-child').textContent;
        input.value = 0;
        updateTotalRequestedCount();
        updateAssignmentSummary();
        showNotification(`تخصيص الفروع ${branchName} تم مسحه`, 'info');
    }
}

// وظيفة لتحديث العدد الإجمالي للطلب
export function updateTotalRequestedCount() {
    let total = 0;
    document.querySelectorAll('.assignment-count-input').forEach(input => {
        total += parseInt(input.value) || 0;
    });
    
    //document.getElementById('total-requested-count').textContent = total;
}

// // وظيفة لتحديث ملخص المهام
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
//                     <span class="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">${count} الرقم </span>
//                 </div>
//             `;
//         }
//     });
    
//     if (!hasAssignments) {
//         summaryHTML = '<p class="text-gray-500 text-center py-4">لم يتم تسجيل التخصيص بعد </p>';
//     } else {
//         summaryHTML = `
//             <div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
//                 <div class="flex justify-between items-center">
//                     <span class="text-green-800 font-medium">إجمالي التخصيص: </span>
//                     <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold">${totalAssigned} الرقم </span>
//                 </div>
//             </div>
//             ${summaryHTML}
//         `;
//     }
    
//     summaryContainer.innerHTML = summaryHTML;
// }

// وظيفة لإعادة تعيين نموذج مهمة المجموعة
export function resetBulkAssignmentForm() {
    clearAllAssignments();
    document.getElementById('source-filter').value = '0';
    updateAvailableNumbers();
}








// مجموعة الألوان لمربعات مختلفة
const BOX_COLORS = [
    { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', count: 'text-purple-700', icon: 'text-purple-600' },
    { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', count: 'text-blue-700', icon: 'text-blue-600' },
    { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', count: 'text-green-700', icon: 'text-green-600' },
    { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', count: 'text-orange-700', icon: 'text-orange-600' },
    { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', count: 'text-red-700', icon: 'text-red-600' },
    { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', count: 'text-indigo-700', icon: 'text-indigo-600' },
    { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', count: 'text-yellow-700', icon: 'text-yellow-600' }
];

// وظيفة لتلقي البيانات غير الضرورية من API
export async function fetchUnassignedNumbers(sourceId = '0') {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            throw new Error('الرجاء تسجيل الدخول أولا');
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
            throw new Error(`خطأ في تلقي البيانات: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.meta && data.meta.is_success) {
            return data.data || [];
        } else {
            throw new Error(data.meta?.description || 'خطأ في تلقي البيانات من الخادم');
        }
    } catch (error) {
        console.error('Error fetching unassigned numbers:', error);
        throw error;
    }
}

// وظيفة لإنشاء مربعات ديناميكية بناءً على البيانات API
export function createDynamicCountBoxes(data, selectedSourceId = '0') {
    const container = document.getElementById('dynamic-counts-container');
    if (!container) return;

    // مسح المحتوى السابق
    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center text-gray-500 py-4">
                <i class="material-icons text-4xl mb-2">info</i>
                <p>لم يتم العثور على بيانات </p>
            </div>
        `;
        return;
    }

    // إذا كانت كافة الموارد المحددة تظهر كافة المربعات
    const sourcesToShow = selectedSourceId === '0' 
        ? data 
        : data.filter(item => item.sourceid == selectedSourceId);

    if (sourcesToShow.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center text-gray-500 py-4">
                <i class="material-icons text-4xl mb-2">search_off</i>
                <p>لم يتم العثور على بيانات للمصدر المحدد </p>
            </div>
        `;
        return;
    }

    // إنشاء مربع لكل مصدر
    sourcesToShow.forEach((source, index) => {
        const colorIndex = index % BOX_COLORS.length;
        const color = BOX_COLORS[colorIndex];
        
        const box = document.createElement('div');
        box.className = `${color.bg} p-4 rounded-lg border ${color.border} transition-all duration-300 hover:shadow-md`;
        box.innerHTML = `
            <div class="flex items-center">
                <i class="material-icons ${color.icon} mr-2">source</i>
                <span class="text-sm ${color.text} font-medium">${source.sourcename || 'مصدر مجهول'}</span>
            </div>
            <div class="text-xl font-bold ${color.count} mt-2">${formatNumber(source.count || 0)}</div>
            <div class="text-xs ${color.text} opacity-75 mt-1">بطاقة تعريف: ${source.sourceid}</div>
        `;
        container.appendChild(box);
    });

    // إذا تم عرض كافة الموارد، أضف مربع الملخص الإجمالي
    if (selectedSourceId === '0') {
        const totalCount = data.reduce((sum, item) => sum + (item.count || 0), 0);
        const totalBox = document.createElement('div');
        totalBox.className = 'bg-gradient-to-r from-purple-500 to-indigo-500 p-4 rounded-lg text-white col-span-full md:col-span-2 lg:col-span-1';
        totalBox.innerHTML = `
            <div class="flex items-center">
                <i class="material-icons text-white mr-2">summarize</i>
                <span class="text-sm font-medium">مجموع الموارد كلها </span>
            </div>
            <div class="text-2xl font-bold mt-2">${formatNumber(totalCount)}</div>
            <div class="text-xs opacity-90 mt-1">إجمالي عدد الأرقام المخصصة </div>
        `;
        container.appendChild(totalBox);
    }
}

// الوظيفة الرئيسية لتحديث الصناديق
export async function updateUnassignedCountsBoxes(sourceId = '0') {
    try {
        const data = await fetchUnassignedNumbers(sourceId);
        currentState.unassignedNumbers = data; // حفظ البيانات في state
        createDynamicCountBoxes(data, sourceId);
    } catch (error) {
        console.error('Error updating counts boxes:', error);
        showErrorState();
    }
}

// وظيفة لعرض وضع الخطأ
function showErrorState() {
    const container = document.getElementById('dynamic-counts-container');
    if (container) {
        container.innerHTML = `
            <div class="col-span-full text-center text-red-500 py-4">
                <i class="material-icons text-4xl mb-2">error</i>
                <p>خطأ في تحميل البيانات </p>
                <button onclick="window.updateUnassignedCountsBoxesRetry()" class="text-blue-500 hover:text-blue-700 mt-2">
                    <i class="material-icons text-sm mr-1">refresh</i>
                    إعادة المحاولة
                </button>
            </div>
        `;
    }
}

// وظيفة لملء dropdown موارد
export async function populateSourceFilter() {
    try {
        await loadBranchesForBulkAssignment();
        const data = await fetchUnassignedNumbers('0');
        const sourceFilter = document.getElementById('source-filter');
        
        if (!sourceFilter || !data) return;
        
        // احفظ القيمة الحالية
        const currentValue = sourceFilter.value;
        
        // مسح وإعادة ملء
        sourceFilter.innerHTML = '<option value="0">جميع الموارد </option>';
        
        data.forEach(source => {
            if (source.sourceid && source.sourcename) {
                const option = document.createElement('option');
                option.value = source.sourceid;
                option.textContent = `${source.sourcename} (${formatNumber(source.count)})`;
                sourceFilter.appendChild(option);
            }
        });
        
        // استعادة القيمة السابقة إذا كان هناك
        if (currentValue && Array.from(sourceFilter.options).some(opt => opt.value === currentValue)) {
            sourceFilter.value = currentValue;
        }
        
    } catch (error) {
        console.error('Error populating source filter:', error);
    }
}

// وظيفة لإدارة تغيير الموارد
export function setupSourceFilterListener() {
    const sourceFilter = document.getElementById('source-filter');
    
    if (sourceFilter) {
        sourceFilter.addEventListener('change', async function(e) {
            const selectedSourceId = e.target.value;
            await updateUnassignedCountsBoxes(selectedSourceId);
            await updateAssignmentSummary(selectedSourceId); // أضف هذا السطر
        });
    }
}


export async function loadBulkAssignmentData() {
    try {
        // وضع التحميل
        showLoadingState();
        
        // تحميل البيانات الموازية
        await Promise.all([
            populateSourceFilter(),
            updateUnassignedCountsBoxes('0'),
            updateAssignmentSummary('0') // أضف هذا السطر
        ]);        
    } catch (error) {
        console.error('Error loading bulk assignment data:', error);
        showNotification('حدث خطأ أثناء تحميل بيانات تخصيص البيانات', 'error');
    }
}

// وظيفة لعرض وضع Ludding
function showLoadingState() {
    const container = document.getElementById('dynamic-counts-container');
    if (container) {
        container.innerHTML = `
            <div class="col-span-full text-center text-gray-500 py-8">
                <div class="spinner"></div>
                <p class="mt-2">جارٍ تحميل البيانات...</p>
            </div>
        `;
    }
}

// وظيفة global لإصلاح المشكلة onclick
window.updateUnassignedCountsBoxesRetry = function() {
    updateUnassignedCountsBoxes('0');
};







export async function fetchBranchAssignmentSummary(sourceId = '0') {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            throw new Error('الرجاء تسجيل الدخول أولا');
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
            throw new Error(`خطأ في تلقي البيانات: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.meta && data.meta.is_success) {
            return data.data || [];
        } else {
            throw new Error(data.meta?.description || 'خطأ في تلقي البيانات من الخادم');
        }
    } catch (error) {
        console.error('Error fetching branch assignment summary:', error);
        throw error;
    }
}

// وظيفة لإنشاء بطاقات ملخصة للمهام
export function createAssignmentSummaryCards(data) {
    const summaryContainer = document.getElementById('assignment-summary');
    if (!summaryContainer) return;

    // مسح المحتوى السابق
    summaryContainer.innerHTML = '';

    if (!data || data.length === 0) {
        summaryContainer.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="material-icons text-4xl mb-2">assignment</i>
                <p>لا توجد بيانات لعرضها </p>
            </div>
        `;
        return;
    }

    // احسب المجموعات العامة
    const totals = {
        totalAssigned: data.reduce((sum, item) => sum + (item.totalassigned || 0), 0),
        assignedLastHour: data.reduce((sum, item) => sum + (item.assignedlasthour || 0), 0),
        calledCount: data.reduce((sum, item) => sum + (item.calledcount || 0), 0),
        notCalledCount: data.reduce((sum, item) => sum + (item.notcalledcount || 0), 0)
    };

    // إنشاء بطاقة تلخيصية
    const overallCard = document.createElement('div');
    overallCard.className = 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl p-6 mb-6 shadow-lg';
    overallCard.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">ملخص توزيع المهام </h3>
            <i class="material-icons text-2xl">summarize</i>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center">
                <div class="text-2xl font-bold">${formatNumber(totals.totalAssigned)}</div>
                <div class="text-sm opacity-90">إجمالي التخصيص </div>
            </div>
            <div class="text-center">
                <div class="text-2xl font-bold">${formatNumber(totals.assignedLastHour)}</div>
                <div class="text-sm opacity-90">تخصيص الساعة الماضية </div>
            </div>
            <div class="text-center">
                <div class="text-2xl font-bold">${formatNumber(totals.calledCount)}</div>
                <div class="text-sm opacity-90">مُسَمًّىdiv>
            </div>
            <div class="text-center">
                <div class="text-2xl font-bold">${formatNumber(totals.notCalledCount)}</div>
                <div class="text-sm opacity-90">لم يتم الاتصال </div>
            </div>
        </div>
    `;
    summaryContainer.appendChild(overallCard);

    // إنشاء بطاقة لكل فرع
    data.forEach(branch => {
        const completionRate = branch.totalassigned > 0 
            ? Math.round((branch.calledcount / branch.totalassigned) * 100) 
            : 0;

        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl shadow-md p-5 mb-4 border-l-4 border-purple-500 hover:shadow-lg transition-shadow duration-300';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <h4 class="font-semibold text-gray-800 text-lg">${branch.branchname || 'لا اسم'}</h4>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div class="text-center p-3 bg-blue-50 rounded-lg">
                    <div class="text-blue-600 font-bold text-xl">${formatNumber(branch.totalassigned || 0)}</div>
                    <div class="text-blue-800 text-xs mt-1">إجمالي التخصيص </div>
                </div>
                <div class="text-center p-3 bg-green-50 rounded-lg">
                    <div class="text-green-600 font-bold text-xl">${formatNumber(branch.assignedlasthour || 0)}</div>
                    <div class="text-green-800 text-xs mt-1">تخصيص الساعة الماضية </div>
                </div>
                <div class="text-center p-3 bg-emerald-50 rounded-lg">
                    <div class="text-emerald-600 font-bold text-xl">${formatNumber(branch.calledcount || 0)}</div>
                    <div class="text-emerald-800 text-xs mt-1">مُسَمًّىdiv>
                </div>
                <div class="text-center p-3 bg-amber-50 rounded-lg">
                    <div class="text-amber-600 font-bold text-xl">${formatNumber(branch.notcalledcount || 0)}</div>
                    <div class="text-amber-800 text-xs mt-1">لم يتم الاتصال </div>
                </div>
            </div>
            
            <div class="flex items-center justify-between text-sm text-gray-600">
                <span>معدلات إتمام المكالمات: </span>
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

// الوظيفة الرئيسية لتحديث المهام
export async function updateAssignmentSummary(sourceId = '0') {
    try {
        const data = await fetchBranchAssignmentSummary(sourceId);
        createAssignmentSummaryCards(data);
    } catch (error) {
        console.error('Error updating assignment summary:', error);
        showErrorStateSummary();
    }
}

// وظيفة لعرض وضع الخطأ في الواجبات الموجزة
function showErrorStateSummary() {
    const summaryContainer = document.getElementById('assignment-summary');
    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div class="text-center text-red-500 py-8">
                <i class="material-icons text-4xl mb-2">error</i>
                <p>خطأ في تحميل بيانات ملخص المهام </p>
                <button onclick="window.updateAssignmentSummaryRetry()" class="text-blue-500 hover:text-blue-700 mt-2 flex items-center justify-center mx-auto">
                    <i class="material-icons text-sm ml-1">refresh</i>
                    إعادة المحاولة
                </button>
            </div>
        `;
    }
}

// وظيفة global لإصلاح المشكلة onclick
window.updateAssignmentSummaryRetry = function() {
    const sourceFilter = document.getElementById('source-filter');
    const sourceId = sourceFilter ? sourceFilter.value : '0';
    updateAssignmentSummary(sourceId);
};












// leads.js

// --- وظائف جديدة لإظهار السكن ---
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
    // بالنسبة للجدول، المحتوى الموجود tbody نضعها
    if (containerElement.tagName.toLowerCase() === 'tbody') {
        containerElement.innerHTML = `<tr><td colspan="5">${loadingHtml}</td></tr>`;
    } else { // بالنسبة للمعرض، نضع المحتوى مباشرة في الحاوية
        containerElement.innerHTML = loadingHtml;
    }
}

function hideLoading(containerElement) {
    if (!containerElement) return;
    const spinner = containerElement.querySelector('.loading-spinner');
    if (spinner) {
        // إذا كان في الجدول، امسح الصف بأكمله
        if (containerElement.tagName.toLowerCase() === 'tbody') {
            containerElement.innerHTML = '';
        } else {
            spinner.remove();
        }
    }
}
// --- نهاية وظائف Loding ---
