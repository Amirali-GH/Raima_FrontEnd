import { setupEventListeners } from './events.js';
import { checkLoginStatus } from './auth.js';
import notificationSystem from './notifications.js';

export const pages = {
    'dashboard': './pages/dashboard.html',
    'assigned-numbers': './pages/assigned-numbers.html',
    'bulk-assign-number': './pages/bulk-assign-numbers.html', // اضافه شده
    'upload': './pages/upload.html',
    'image-upload': './pages/image-upload.html',
    'reports': './pages/reports.html',
    'customer-management': './pages/customer-management.html',
    'contract': './pages/contract.html',
    'settings': './pages/settings.html',
    'login': './pages/login-section.html',
    'sidebar': './pages/sidebar-section.html',    
    'system-management': './pages/system-management.html'
};

// صادر کردن سیستم نوتیفیکیشن برای استفاده در سایر فایل‌ها
export { notificationSystem };

document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    setupEventListeners();
});