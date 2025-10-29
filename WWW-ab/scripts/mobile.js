// إدارة القائمة المتنقلة
export function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar-container');
    const mainContent = document.getElementById('main-content');

    if (!mobileMenuBtn || !sidebar || !mainContent) return;

    // فتح/إغلاق القائمة
    function toggleMenu() {
        sidebar.classList.toggle('active');
        mainContent.classList.toggle('sidebar-active');
    }

    mobileMenuBtn.addEventListener('click', toggleMenu);

    // التحقق من حجم الشاشة عند التحميل وتغيير الحجم
    function updateMenuVisibility() {
        if (window.innerWidth >= 768) {
            sidebar.classList.remove('active');
            mainContent.classList.remove('sidebar-active');
        }
    }

    updateMenuVisibility();
    window.addEventListener('resize', updateMenuVisibility);
}
