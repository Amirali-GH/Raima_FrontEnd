import { handleLogin, handleLogout } from './auth.js';
import { loadUploadedFiles, uploadFile, downloadSampleExcel } from './fileHandling.js';
import { loadUploadedFilesContract, uploadFileContract, downloadSampleContractExcel, addSingleContract } from './contract.js';
import { loadPage, handleFileSelect_Contract, handleFileSelect_CustomerContact, handleDrop, preventDefaults, highlight, unhighlight } from './ui.js';
import { handleImages, uploadImages, loadPastImageUploads } from './image-upload.js';
import { 
    changePage,
    loadBranchesInLeads, 
    handleSearch, 
    handleBranchChange, 
    exportLeads, 
    closeAssignmentModal, 
    saveAssignment,
    deleteAssignment,
    initAssignmentTabs,
    fetchLeads } from './leads.js';
import { currentState } from './state.js';
import { initBulkAssignPage } from './bulkAssign.js';

export function setupEventListeners() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    const sidebarMenuBtn = document.getElementById('mobile-menu-btn');
    if (sidebarMenuBtn) {
        sidebarMenuBtn.addEventListener('click', toggleSidebar);
    }
    
    // يضيف setupProfileMenu
    setupProfileMenu();
}

export function setupProfileMenu() {
    const profileButton = document.getElementById('profile-button');
    const profileMenu = document.getElementById('profile-menu');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (profileButton && profileMenu) {
        profileButton.addEventListener('click', (e) => {
            e.stopPropagation();
            profileMenu.classList.toggle('hidden');
        });
        
        // إغلاق القائمة عند النقر للخروج منها
        document.addEventListener('click', (e) => {
            if (!profileMenu.contains(e.target) && !profileButton.contains(e.target)) {
                profileMenu.classList.add('hidden');
            }
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

export function setupSidebarEventListeners() {
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.addEventListener('click', function(e) {
            if (this.getAttribute('data-page')) {
                e.preventDefault();
                loadPage(this.getAttribute('data-page'));
                closeSidebar();
            }
        });
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

export function setupBulkAssignPageListeners() {
    console.log("Bulk assign numbers page initialized");
    initBulkAssignPage();
}

export function setupLoginEventListeners() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    document.addEventListener('DOMContentLoaded', function() {
        // القدرة على إظهار/إخفاء كلمة المرور
        const togglePassword = document.getElementById('toggle-password');
        const passwordInput = document.getElementById('password');
        
        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', function() {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                togglePassword.innerHTML = type === 'password' ? 'visibility' : 'visibility_off';
            });
        }
        
        // الرسوم المتحركة تسجيل الدخول للعناصر
        const formElements = document.querySelectorAll('#login-form > div');
        formElements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            setTimeout(() => {
                el.style.transition = 'all 0.5s ease';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, index * 100 + 200);
        });
        
        // الرسوم المتحركة للبطاقة
        const loginCard = document.querySelector('.relative.w-full.max-w-md > div');
        if (loginCard) {
            loginCard.style.opacity = '0';
            loginCard.style.transform = 'scale(0.9)';
            setTimeout(() => {
                loginCard.style.transition = 'all 0.5s ease';
                loginCard.style.opacity = '1';
                loginCard.style.transform = 'scale(1)';
            }, 100);
        }
    });    
}

export function setupUploadPageListeners() {
    // التحميل الأولي للملفات
    loadUploadedFiles();

    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const uploadBtn = document.getElementById('upload-btn');
    const samlpeBtn = document.getElementById('sample-btn');
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    const confirmModal = document.getElementById('confirm-upload-modal');
    const processingModal = document.getElementById('processing-modal');
    const closeModalBtns = document.querySelectorAll('#close-modal');
    const fileDetailsModal = document.getElementById('file-details-modal');
    
    if (dropArea && fileInput) {
        fileInput.addEventListener('change', handleFileSelect_CustomerContact);
        dropArea.addEventListener('click', () => fileInput.click());

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false);
        });

        dropArea.addEventListener('drop', handleDrop, false);
    }

    if (uploadBtn) {
        uploadBtn.addEventListener('click', uploadFile);
    }

    if (samlpeBtn) {
        samlpeBtn.addEventListener('click', downloadSampleExcel);
    }

    if (closeModalBtns && fileDetailsModal) {
        closeModalBtns.forEach(button => {
            button.addEventListener('click', function() {
                fileDetailsModal.classList.add('hidden');
            });
        });
    }

    // يضيف event listener ل modal تأكيد التحميل
    if (confirmModal) {
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) {
                confirmModal.classList.add('hidden');
            }
        });
    }

    // يضيف event listener ل modal يعالج
    if (processingModal) {
        processingModal.addEventListener('click', (e) => {
            if (e.target === processingModal) {
                // نحن لا نسمح للمستخدم بالمعالجة أثناء المعالجة modal يغلق
                e.preventDefault();
                e.stopPropagation();
            }
        });
    }
   
}

export function setupAssignedNumbersListner() {
    console.log("Assigned numbers page initialized");

    // --- Element Listeners ---
    const searchInput = document.getElementById('search-input');
    const branchFilter = document.getElementById('branch-filter');
    const exportBtn = document.getElementById('export-btn');
    const prevPage = document.getElementById('prev-page');
    const nextPage = document.getElementById('next-page');
    const assignmentModal = document.getElementById('assignment-modal');
    const assignmentForm = document.getElementById('assignment-form');
    const leadsTableBody = document.getElementById('leads-table-body');

    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    if (branchFilter) {
        branchFilter.addEventListener('change', handleBranchChange);
        if (currentState.user && currentState.user.userrolename === 'admin') {
            branchFilter.classList.remove('hidden');
        } else {
            branchFilter.classList.add('hidden');
        }
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', exportLeads);
    }

    if (prevPage) {
        prevPage.addEventListener('click', () => changePage(-1));
    }

    if (nextPage) {
        nextPage.addEventListener('click', () => changePage(1));
    }

    if (assignmentForm) {
        assignmentForm.addEventListener('submit', saveAssignment);
    }

    if (assignmentModal) {
        assignmentModal.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', closeAssignmentModal);
        });
    }
    // --- Initial Data Load ---
    loadBranchesInLeads().then(() => {
        fetchLeads();
        
        // تأكد من تحميل DOM بالكامل قبل التهيئة
        setTimeout(() => {
            initAssignmentTabs();
        }, 100);
    });
}

export function setupContractPageListeners() {
    loadUploadedFilesContract();

    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const selectFileBtn = document.getElementById('select-file-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const addSingleContractBtn = document.getElementById('add-single-contract-btn');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    dropArea.addEventListener('drop', handleDrop, false);
    dropArea.addEventListener('click', (e) => {
        if (e.target.id !== 'select-file-btn') {
            fileInput.click()
        }
    });
    addSingleContractBtn.addEventListener('click', addSingleContract, false);

    selectFileBtn.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', handleFileSelect_Contract, false);
    
    uploadBtn.addEventListener('click', uploadFileContract, false);
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('file-details-modal').classList.add('hidden');
        });
    });
}

export function setupImageUploadPageListeners() {
    // تم تحميل التحميلات الماضية
    loadPastImageUploads();

    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('image-input');
    const selectBtn = document.getElementById('select-images-btn');
    const uploadBtn = document.getElementById('upload-images-btn');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    // حدد الملف من input
    if (fileInput) {
        fileInput.addEventListener('change', (e) => handleImages(e.target.files));
    }

    // انقر drop-area للاختيار
    if (dropArea && fileInput) {
        dropArea.addEventListener('click', () => fileInput.click());

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
            dropArea.addEventListener(event, preventDefaults, false);
        });
        ['dragenter', 'dragover'].forEach(event => {
            dropArea.addEventListener(event, highlight, false);
        });
        ['dragleave', 'drop'].forEach(event => {
            dropArea.addEventListener(event, unhighlight, false);
        });
    }

    // انقر فوق الزر تحديد ملف
    if (selectBtn && fileInput) {
        selectBtn.addEventListener('click', () => fileInput.click());
    }

    // انقر فوق زر التحميل
    if (uploadBtn) {
        uploadBtn.addEventListener('click', uploadImages);
        uploadBtn.disabled = true; // حتى لم يتم تحديد الصورة
    }

    // قائمة الجوال
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleSidebar);
    }

    // أغلق الشريط الجانبي بالضغط على overlay
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }
}

export function toggleSidebar() {
    const sidebar = document.getElementById('sidebar-container');
    const overlay = document.getElementById('sidebar-overlay');
    const mainContent = document.getElementById('main-content');

    sidebar.classList.toggle('active');
    mainContent.classList.toggle('sidebar-active');
    
    if (sidebar && overlay) {       
        if (overlay.classList.contains('hidden')) {
            sidebar.classList.remove('-translate-x-full');
            overlay.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
        } else {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }
    }
}

export function closeSidebar() {
    const sidebar = document.getElementById('sidebar-container');
    const overlay = document.getElementById('sidebar-overlay');
    const mainContent = document.getElementById('main-content');

    sidebar.classList.remove('active');
    mainContent.classList.remove('sidebar-active');
    if (sidebar && overlay) {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }
}

