// ui.js (تم تنظيفه - لا توجد وظائف لوحة القيادة)
import { currentState } from './state.js';
import { fetchLeads } from './leads.js';
import { pages } from './main.js';
import notificationSystem from './notifications.js';
import { initSystemManagement } from './systemAdmin.js';
import { initCustomersTab } from './ControllerCustomer.js';
import {
    setupSidebarEventListeners,
    setupLoginEventListeners,
    setupUploadPageListeners,
    setupContractPageListeners,
    setupImageUploadPageListeners,
    closeSidebar,
    setupAssignedNumbersListner,
    setupBulkAssignPageListeners 
} from './events.js';
import { handleFileContract } from './contract.js';
import { getUserInfo } from './auth.js';
import { handleFile } from './fileHandling.js';
import { initDashboard } from './dashboard.js';

export function showLoginError(message) {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');

        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 3000);
    }
}

export function renderLeadsTable() {
    const tbody = document.getElementById('leads-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (currentState.leads.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="py-8 text-center text-gray-500">
                    <i class="material-icons text-4xl mb-2">info</i>
                    <p>لم يتم العثور على العنصر </p>
                </td>
            </tr>
        `;
        return;
    }

    // تقديم البيانات
    currentState.leads.forEach((lead, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                <input type="checkbox" class="lead-checkbox" data-id="${lead.id}">
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">${lead.phone || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">${lead.name || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">${lead.status || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">${lead.assignedAt || ''}</td>
        `;
        tbody.appendChild(row);
    });
}

export function renderPagination() {
    const paginationElement = document.getElementById('pagination-numbers');
    if (!paginationElement) return;

    const { currentPage, totalPages } = currentState;
    paginationElement.innerHTML = '';

    // إنشاء أزرار الترحيل
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('div');
        pageBtn.className = `pagination-btn ${i === currentPage ? 'bg-purple-500 text-white' : 'border border-gray-300'}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            if (i !== currentPage) {
                currentState.currentPage = i;
                fetchLeads();
            }
        });
        paginationElement.appendChild(pageBtn);
    }

    // تحديث حالة الأزرار السابقة/التالي
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const currentPageEl = document.getElementById('current-page');
    const totalPagesEl = document.getElementById('total-pages');

    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
    if (currentPageEl) currentPageEl.textContent = currentPage;
    if (totalPagesEl) totalPagesEl.textContent = totalPages;
}

export function openDetailModal(leadId) {
    const lead = currentState.leads.find(l => l.id === leadId);
    if (!lead) return;

    currentState.currentLead = lead;

    const nameEl = document.getElementById('lead-name');
    const phoneEl = document.getElementById('lead-phone');
    const nationalCodeEl = document.getElementById('lead-national-code');
    const assignedAtEl = document.getElementById('lead-assigned-at');
    const modal = document.getElementById('lead-modal');

    if (nameEl) nameEl.textContent = `${lead.firstName} ${lead.lastName}`;
    if (phoneEl) phoneEl.textContent = lead.phone;
    if (nationalCodeEl) nationalCodeEl.textContent = lead.nationalCode;
    if (assignedAtEl) assignedAtEl.textContent = lead.assignedAt;
    if (modal) modal.classList.remove('hidden');
}

export function openContactModal(leadId) {
    openDetailModal(leadId);
    // هنا يمكنك تمكين أقسام محددة من جهة الاتصال
}

let sidebarLoaded = false;
export async function loadPage(pageName) {
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });

    const activeItem = document.querySelector(`[data-page="${pageName}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }

    // تحديث عنوان الصفحة
    const pageTitle = document.getElementById('page-title');
    if (pageTitle && activeItem) {
        const spanElement = activeItem.querySelector('span');
        if (spanElement) {
            pageTitle.textContent = spanElement.textContent;
        }
    }

    if (window.innerWidth < 768) {
        closeSidebar();
    }

    // تحميل محتوى الصفحة
    try {
        const response = await fetch(pages[pageName]);
        const html = await response.text();

        if (pageName !== 'login') {
            document.getElementById('main-content').classList.remove('hidden');
            document.getElementById('app').classList.remove('hidden');
            document.getElementById('login-container').classList.add('hidden');

            if (!sidebarLoaded) {
                const sidebarContainer = document.getElementById('sidebar-container');
                if (sidebarContainer) {
                    const sidebarResponse = await fetch(pages['sidebar']);
                    const sidebarHtml = await sidebarResponse.text();
                    sidebarContainer.innerHTML = sidebarHtml;
                    setupSidebarEventListeners();
                    sidebarLoaded = true;
                    
                    // نتطلع إلى الانتهاء getUserInfo نحن نبقى
                    await getUserInfo();
                }
            } else {
                // لو sidebar تحميل، لا تزال تنتظر getUserInfo نحن نبقى
                await getUserInfo();
            }

            const container = document.getElementById('pages-container');
            if (container) {
                container.innerHTML = html;
                                            
                if (pageName === 'dashboard') {
                    initDashboard();
                } else if (pageName === 'assigned-numbers') {
                    setupAssignedNumbersListner();
                } else if (pageName === 'bulk-assign-number') { // تمت الإضافة
                    setupBulkAssignPageListeners();
                } else if (pageName === 'upload') {
                    setupUploadPageListeners();
                } else if (pageName === 'contract') {
                    setupContractPageListeners();
                } else if (pageName === 'system-management') {
                    initSystemManagement();
                } else if (pageName === 'customer-management') {
                    initCustomersTab();
                } else if (pageName === 'image-upload') {
                    requestAnimationFrame(() => {
                        setupImageUploadPageListeners();
                    });
                }
            }
        } else {
            document.getElementById('app').classList.add('hidden');
            document.getElementById('login-container').classList.remove('hidden');

            const loginContainer = document.getElementById('login-container');
            if (loginContainer) {
                loginContainer.innerHTML = html;
                setupLoginEventListeners();
            }
        }
    } catch (error) {
        console.error('Error loading page:', error);
        const container = document.getElementById('pages-container');
        if (container) {
            container.innerHTML = `
                <div class="bg-white rounded-xl shadow-md p-6">
                    <div class="text-center text-gray-500 py-8">
                        <i class="material-icons text-4xl mb-2">error</i>
                        <p>خطأ في تحميل الصفحة. يرجى المحاولة مرة أخرى. </p>
                    </div>
                </div>
            `;
        }
    }
}

// تذكر
export function initLoginPage() {
    console.log("initLoginPage page initialized");
}

export function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

export function highlight() {
    const dropArea = document.getElementById('drop-area');
    if (dropArea) {
        dropArea.classList.add('active');
    }
}

export function unhighlight() {
    const dropArea = document.getElementById('drop-area');
    if (dropArea) {
        dropArea.classList.remove('active');
    }
}

export function handleDrop(e) {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    handleFile(file);
}

export function handleFileSelect_Contract(e) {
    const file = e.target.files[0];
    handleFileContract(file);
}


export function handleFileSelect_CustomerContact(e) {
    const file = e.target.files[0];
    handleFile(file);
}

// وظائف عالمية لعمليات لوحة القيادة
window.viewCustomer = function(id) {
    alert(`عرض العميل مع الهوية ${id}`);
}

window.editCustomer = function(id) {
    alert(`تحرير العميل مع معرف ${id}`);
}

window.deleteCustomer = function(id) {
    if (confirm('هل أنت متأكد من حذف هذا العميل؟')) {
        alert(`إزالة العميل بالمعرف ${id}`);
    }
}