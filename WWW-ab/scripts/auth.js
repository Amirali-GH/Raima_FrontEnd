import { currentState } from './state.js';
import { showLoginError } from './ui.js';
import { fetchLeads } from './leads.js';
import { loadPage } from './ui.js';

export async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const apiBaseUrl = window.location.origin;
    
    if (username && password)
    {
    try {
        const response = await fetch(`${apiBaseUrl}/api/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        if (!response.ok) {
            throw new Error("خطأ في تسجيل الدخول");
        }

        const data = await response.json();

            if (data.token) {
                localStorage.setItem("authToken", data.token);
                const user = { username: username }; // معلومات المستخدم
                localStorage.setItem("userData", JSON.stringify(user));

                currentState.token = data.token;
                currentState.user = user;
                await loadPage('dashboard'); // فقط loadPage يتصل
            } else {
                showLoginError("لم يتم استلام الرمز المميز");
            }
        } catch (error) {
            console.error(error);
            showLoginError("لم يتم العثور على المستخدم!");
        }
    } else {
        showLoginError('الرجاء إدخال اسم المستخدم وكلمة المرور.');
    }
}

export async function checkLoginStatus() {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');

    if (token && userData) {
        currentState.token = token;
        currentState.user = JSON.parse(userData);
        await loadPage('dashboard'); // بدون طلب إضافي
        return true;
    } else {
        await loadPage('login');
        return false;
    }
}

export function handleLogout() {
    // يمسح localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    // يمسح sessionStorage
    sessionStorage.clear();
    
    // مسح كافة ملفات تعريف الارتباط
    document.cookie.split(";").forEach(function(cookie) {
        document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    Object.assign(currentState, {
        token: null,
        user: null,
        leads: [],
        currentPage: 1,
        pageSize: 10,
        totalLeads: 0,
        totalPages: 1,
        searchQuery: '',
        sortField: 'assignedAt',
        sortOrder: 'desc',
        selectedLeads: [],
        currentExcel_JSON: {},
        currentLead: null
    });

    // تحديث الصفحة لضمان التطهير الكامل state
    window.location.reload();
}

export async function getUserInfo() {
    const apiBaseUrl = window.location.origin;
    try {
        const response = await fetch(`${apiBaseUrl}/api/v1/user/0/info`, {
            method: "GET",
            headers: {
                'Authorization': `Bearer ${currentState.token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("خطأ في تلقي معلومات المستخدم");
        }

        const data = (await response.json()).data;
 
        // 1. احفظ المعلومات الكاملة في currentState
        currentState.user = { ...currentState.user, ...data };

        // 2. التحديث DOM
        const userFullNameEl = document.getElementById('user-full-name');
        const branchFullNameEl = document.getElementById('branch-full-name');

        if (userFullNameEl) {
            userFullNameEl.innerText = `${data.firstname} ${data.lastname}`;
        }
        if (branchFullNameEl) {
            branchFullNameEl.innerText = data.branchname || '';
        }
        
           
        // عرض قائمة المسؤول فقط للمستخدمين الذين لديهم دور admin
        if (currentState.user && currentState.user.userid) {
            // التحقق من دور المستخدم وعرض/إخفاء قائمة المسؤول
            const adminMenuItem = document.getElementById('admin-menu-item');
            const uploadfileMenuItem = document.getElementById('upload-file-menu-item');
            const imageuploadMenuItem = document.getElementById('image-upload-menu-item');
            const contractMenuItem = document.getElementById('contract-menu-item');
            const bulkAssignNumberMenuItem = document.getElementById('bulk-assign-number-menu-item');
            
            if (adminMenuItem && uploadfileMenuItem && imageuploadMenuItem && contractMenuItem) {
                if (currentState.user.userrolename === 'admin') {
                    adminMenuItem.classList.remove('hidden');
                    uploadfileMenuItem.classList.remove('hidden');
                    imageuploadMenuItem.classList.remove('hidden');
                    contractMenuItem.classList.remove('hidden');
                    bulkAssignNumberMenuItem.classList.remove('hidden');
                } else {
                    adminMenuItem.classList.add('hidden');
                    uploadfileMenuItem.classList.remove('hidden');
                    imageuploadMenuItem.classList.add('hidden');
                    contractMenuItem.classList.add('hidden');   
                    bulkAssignNumberMenuItem.classList.add('hidden');             
                }
            }
            return;
        }

    } catch (error) {
        console.error(error);
    }
}


