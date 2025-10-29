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
        // حدث النقر على زر الإشعار
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

        // أغلق اللوحة عند النقر للخروج منها
        document.addEventListener('click', (e) => {
            if (this.isPanelOpen && 
                !notificationPanel.contains(e.target) && 
                !notificationButton.contains(e.target)) {
                this.closeNotificationPanel();
            }
        });

        // وضع علامة على الكل كمقروءة
        if (markAllReadButton) {
            markAllReadButton.addEventListener('click', () => {
                this.markAllAsRead();
            });
        }

        // عرض جميع الإخطارات
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
        // تحميل الإخطارات من localStorage أو API
        const savedNotifications = localStorage.getItem('dashboard-notifications');
        if (savedNotifications) {
            this.notifications = JSON.parse(savedNotifications);
        } else {
            // الإخطارات المعدة
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
        
        // قم بتحديث القائمة إذا كانت اللوحة مفتوحة
        if (this.isPanelOpen) {
            this.renderNotifications();
        }

        // إظهار الإخطارات toast (خياري)
        this.showToastNotification(newNotification);
    }

    showToastNotification(notification) {
        // خلق واحد toast مؤقت على الصفحة
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

        // الحذف التلقائي بعد 5 ثواني
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
                    <p>لا يوجد دليل </p>
                </div>
            `;
            return;
        }

        // عرض الحد الأقصى 10 الإخطارات
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

        // يضيف event listeners للأزرار
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
        
        if (diffInMinutes < 1) return 'الآن';
        if (diffInMinutes < 60) return `${diffInMinutes} منذ دقائق`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} الساعة التي سبقت`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays} في اليوم السابق`;
        
        return notificationTime.toLocaleDateString('fa-IR');
    }

    showAllNotifications() {
        // يمكن أن تؤدي هذه الوظيفة إلى صفحة تحتوي على قائمة كاملة من الإشعارات
        // أو نموذج بقائمة كاملة
        this.closeNotificationPanel();
        alert('سيتم إضافة هذه الميزة قريبا');
    }

    // وظيفة لإنتاج تحذيرات لوحة القيادة
    generateDashboardWarnings(dashboardData) {
        // مسح تحذيرات لوحة القيادة السابقة
        this.notifications = this.notifications.filter(n => !n.source || n.source !== 'dashboard');
        
        // إنتاج تنبيهات جديدة بناءً على بيانات لوحة القيادة
        if (dashboardData.code1 && dashboardData.code1.length > 0) {
            this.addNotification({
                source: 'dashboard',
                type: 'warning',
                title: 'تنبيه الكود 1',
                message: `فرعك ${dashboardData.code1.length} الرمز رقم 1 (انعدام المساءلة). ولن يتم تخصيص رقم جديد حتى يتغير وضع هذه الحالات.`
            });
        }

        if (dashboardData.code234 && dashboardData.code234.length > 0) {
            this.addNotification({
                source: 'dashboard',
                type: 'warning',
                title: 'رموز 1 و 2 و 2 تنبيه',
                message: `فرعك ${dashboardData.code234.length} الرقم 1 و 2 و 2 به شهر الشهر الماضي. ويجب تغييرها وتحديثها إلى الرموز من 1 إلى 2.`
            });
        }

        if (dashboardData.code7 && dashboardData.code7.length > 0) {
            this.addNotification({
                source: 'dashboard',
                type: 'info',
                title: 'تنبيه الكود 1',
                message: 'يجب أن تكون جميع الرموز 2 مسجلة بالرمز الوطني. تكون حالة التسجيل الناجحة فقط إذا قمت بتسجيل الرمز 2 مع الرمز الوطني في النظام.'
            });
        }
    }
}

// إنشاء مثال لنظام الإخطار
const notificationSystem = new NotificationSystem();

// مشكلة لاستخدامها في ملفات أخرى
export default notificationSystem;
export { NotificationSystem };