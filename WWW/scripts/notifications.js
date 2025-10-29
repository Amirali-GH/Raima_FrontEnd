// notifications.js
import { currentState } from './state.js';

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.isPanelOpen = false;
        this.init();
    }

    init() {
        this.loadNotifications();
        this.setupEventListeners();
        this.updateNotificationBadge();
    }

    setupEventListeners() {
        // رویداد کلیک روی دکمه نوتیفیکیشن
        const notificationButton = document.getElementById('notification-button');
        const notificationPanel = document.getElementById('notification-panel');
        const markAllReadButton = document.getElementById('mark-all-read');
        const viewAllNotificationsButton = document.getElementById('view-all-notifications');

        if (notificationButton && notificationPanel) {
            notificationButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleNotificationPanel();
            });
        }

        // بستن پنل هنگام کلیک خارج از آن
        document.addEventListener('click', (e) => {
            if (this.isPanelOpen && 
                !notificationPanel.contains(e.target) && 
                !notificationButton.contains(e.target)) {
                this.closeNotificationPanel();
            }
        });

        // علامت‌گذاری همه به عنوان خوانده شده
        if (markAllReadButton) {
            markAllReadButton.addEventListener('click', () => {
                this.markAllAsRead();
            });
        }

        // مشاهده همه اعلان‌ها
        if (viewAllNotificationsButton) {
            viewAllNotificationsButton.addEventListener('click', () => {
                this.showAllNotifications();
            });
        }
    }

    toggleNotificationPanel() {
        const panel = document.getElementById('notification-panel');
        if (panel.classList.contains('hidden')) {
            this.openNotificationPanel();
        } else {
            this.closeNotificationPanel();
        }
    }

    openNotificationPanel() {
        const panel = document.getElementById('notification-panel');
        panel.classList.remove('hidden');
        this.isPanelOpen = true;
        this.renderNotifications();
    }

    closeNotificationPanel() {
        const panel = document.getElementById('notification-panel');
        panel.classList.add('hidden');
        this.isPanelOpen = false;
    }

    loadNotifications() {
        // بارگذاری نوتیفیکیشن‌ها از localStorage یا API
        const savedNotifications = localStorage.getItem('dashboard-notifications');
        if (savedNotifications) {
            this.notifications = JSON.parse(savedNotifications);
        } else {
            // نوتیفیکیشن‌های پیش‌فرض
            this.notifications = [];
        }
    }

    saveNotifications() {
        localStorage.setItem('dashboard-notifications', JSON.stringify(this.notifications));
    }

    addNotification(notification) {
        const newNotification = {
            id: Date.now(),
            type: notification.type || 'info',
            title: notification.title,
            message: notification.message,
            timestamp: new Date(),
            read: false,
            ...notification
        };

        this.notifications.unshift(newNotification);
        this.saveNotifications();
        this.updateNotificationBadge();
        
        // اگر پنل باز است، لیست را به‌روزرسانی کن
        if (this.isPanelOpen) {
            this.renderNotifications();
        }

        // نمایش نوتیفیکیشن toast (اختیاری)
        this.showToastNotification(newNotification);
    }

    showToastNotification(notification) {
        // ایجاد یک toast موقت در صفحه
        const toast = document.createElement('div');
        toast.className = `fixed top-4 left-4 z-50 max-w-sm bg-white rounded-lg shadow-lg border-l-4 ${
            notification.type === 'warning' ? 'border-yellow-500' :
            notification.type === 'error' ? 'border-red-500' :
            notification.type === 'success' ? 'border-green-500' :
            'border-blue-500'
        } p-4 mb-4 notification-slide-in`;
        
        toast.innerHTML = `
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <i class="material-icons text-${
                        notification.type === 'warning' ? 'yellow' :
                        notification.type === 'error' ? 'red' :
                        notification.type === 'success' ? 'green' :
                        'blue'
                    }-500">${this.getNotificationIcon(notification.type)}</i>
                </div>
                <div class="mr-3 flex-1">
                    <p class="text-sm font-medium text-gray-900">${notification.title}</p>
                    <p class="mt-1 text-sm text-gray-500">${notification.message}</p>
                </div>
                <button class="text-gray-400 hover:text-gray-500" onclick="this.parentElement.parentElement.remove()">
                    <i class="material-icons text-sm">close</i>
                </button>
            </div>
        `;

        document.body.appendChild(toast);

        // حذف خودکار پس از 5 ثانیه
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'warning': return 'warning';
            case 'error': return 'error';
            case 'success': return 'check_circle';
            case 'info': 
            default: return 'info';
        }
    }

    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            this.saveNotifications();
            this.updateNotificationBadge();
            this.renderNotifications();
        }
    }

    markAllAsRead() {
        this.notifications.forEach(notification => {
            notification.read = true;
        });
        this.saveNotifications();
        this.updateNotificationBadge();
        this.renderNotifications();
    }

    deleteNotification(notificationId) {
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        this.saveNotifications();
        this.updateNotificationBadge();
        this.renderNotifications();
    }

    updateNotificationBadge() {
        const badge = document.getElementById('notif-badge');
        const unreadCount = this.notifications.filter(n => !n.read).length;

        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    renderNotifications() {
        const notificationList = document.getElementById('notification-list');
        if (!notificationList) return;

        if (this.notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="p-8 text-center text-gray-500">
                    <i class="material-icons text-4xl mb-2 text-gray-300">notifications_off</i>
                    <p>هیچ اعلانی وجود ندارد</p>
                </div>
            `;
            return;
        }

        // نمایش حداکثر 10 نوتیفیکیشن آخر
        const recentNotifications = this.notifications.slice(0, 10);
        
        notificationList.innerHTML = recentNotifications.map(notification => `
            <div class="notification-item ${notification.read ? '' : 'unread'} ${notification.type} p-4 border-b border-gray-100">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-start flex-1">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
                            notification.type === 'warning' ? 'bg-yellow-100' :
                            notification.type === 'error' ? 'bg-red-100' :
                            notification.type === 'success' ? 'bg-green-100' :
                            'bg-blue-100'
                        }">
                            <i class="material-icons text-sm ${
                                notification.type === 'warning' ? 'text-yellow-600' :
                                notification.type === 'error' ? 'text-red-600' :
                                notification.type === 'success' ? 'text-green-600' :
                                'text-blue-600'
                            }">${this.getNotificationIcon(notification.type)}</i>
                        </div>
                        <div class="flex-1">
                            <p class="font-medium text-gray-900 text-sm">${notification.title}</p>
                            <p class="text-gray-600 text-sm mt-1">${notification.message}</p>
                            <p class="text-gray-400 text-xs mt-2">${this.formatTime(notification.timestamp)}</p>
                        </div>
                    </div>
                    <div class="flex space-x-1 space-x-reverse">
                        ${!notification.read ? `
                            <button class="text-gray-400 hover:text-gray-600 mark-as-read" data-id="${notification.id}">
                                <i class="material-icons text-sm">mark_email_read</i>
                            </button>
                        ` : ''}
                        <button class="text-gray-400 hover:text-gray-600 delete-notification" data-id="${notification.id}">
                            <i class="material-icons text-sm">delete</i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // اضافه کردن event listeners برای دکمه‌ها
        notificationList.querySelectorAll('.mark-as-read').forEach(button => {
            button.addEventListener('click', (e) => {
                const notificationId = parseInt(e.currentTarget.getAttribute('data-id'));
                this.markAsRead(notificationId);
            });
        });

        notificationList.querySelectorAll('.delete-notification').forEach(button => {
            button.addEventListener('click', (e) => {
                const notificationId = parseInt(e.currentTarget.getAttribute('data-id'));
                this.deleteNotification(notificationId);
            });
        });
    }

    formatTime(timestamp) {
        const now = new Date();
        const notificationTime = new Date(timestamp);
        const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'همین الان';
        if (diffInMinutes < 60) return `${diffInMinutes} دقیقه قبل`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} ساعت قبل`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays} روز قبل`;
        
        return notificationTime.toLocaleDateString('fa-IR');
    }

    showAllNotifications() {
        // این تابع می‌تواند به صفحه‌ای با لیست کامل نوتیفیکیشن‌ها هدایت کند
        // یا یک مودال با لیست کامل نمایش دهد
        this.closeNotificationPanel();
        alert('این قابلیت به زودی اضافه خواهد شد');
    }

    // تابع برای تولید هشدارهای داشبورد
    generateDashboardWarnings(dashboardData) {
        // پاک کردن هشدارهای قبلی مربوط به داشبورد
        this.notifications = this.notifications.filter(n => !n.source || n.source !== 'dashboard');
        
        // تولید هشدارهای جدید بر اساس داده‌های داشبورد
        if (dashboardData.code1 && dashboardData.code1.length > 0) {
            this.addNotification({
                source: 'dashboard',
                type: 'warning',
                title: 'هشدار کد ۱',
                message: `شعبه شما ${dashboardData.code1.length} عدد کد ۱ (عدم پاسخگویی) دارد. تا زمان تغییر وضعیت این موارد، شماره جدیدی تخصیص داده نخواهد شد.`
            });
        }

        if (dashboardData.code234 && dashboardData.code234.length > 0) {
            this.addNotification({
                source: 'dashboard',
                type: 'warning',
                title: 'هشدار کدهای ۲، ۳ و ۴',
                message: `شعبه شما ${dashboardData.code234.length} عدد کد ۲ و ۳ و ۴ از ماه گذشته دارد. این موارد باید حتماً تغییر وضعیت داده و به کدهای ۵ تا ۸ بروزرسانی شوند.`
            });
        }

        if (dashboardData.code7 && dashboardData.code7.length > 0) {
            this.addNotification({
                source: 'dashboard',
                type: 'info',
                title: 'هشدار کد ۷',
                message: 'تمامی کدهای ۷ باید همراه کد ملی ثبت شوند. وضعیت موفق برای ثبت‌نام تنها در صورت ثبت کد ۷ به همراه کد ملی در سیستم است.'
            });
        }
    }
}

// ایجاد نمونه از سیستم نوتیفیکیشن
const notificationSystem = new NotificationSystem();

// صادر کردن برای استفاده در سایر فایل‌ها
export default notificationSystem;
export { NotificationSystem };