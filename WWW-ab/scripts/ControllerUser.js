import { showNotification } from "./systemAdmin.js";
import { debounce } from "./systemAdmin.js";

let branches = []; // Global variable to store branches for name lookup

export function initUsersTab() {
    console.log("Initializing Users Tab...");
    
    // افتح النموذج لإضافة مستخدم
    const addUserBtn = document.getElementById('add-user-btn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', function() {
            document.getElementById('user-modal-title').textContent = 'إضافة مستخدم جديد';
            document.getElementById('user-form').reset();
            document.getElementById('user-id').value = '';
            const passwordField = document.getElementById('user-password');
            if (passwordField) {
                passwordField.required = true;
                passwordField.value = '';
            }
            
            // إعادة تحميل الفروع للتأكد من أن القائمة محدثة
            loadBranches();
            loadUserRoles();
            
            document.getElementById('user-modal').classList.remove('hidden');
        });
    } else {
        console.error('add-user-btn not found in DOM');
    }
    
    // تسجيل نموذج المستخدم
    const userForm = document.getElementById('user-form');
    if (userForm) {
        userForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveUser();
        });
    }
    
    // تصفية المستخدمين
    const userSearch = document.getElementById('user-search');
    if (userSearch) {
        userSearch.addEventListener('input', debounce(function() {
            const search = this.value;
            const status = document.getElementById('user-status-filter').value;
            const role = document.getElementById('user-role-filter').value;
            loadUsers(1, search, status, role);
        }, 300));
    }
    
    const userStatusFilter = document.getElementById('user-status-filter');
    if (userStatusFilter) {
        userStatusFilter.addEventListener('change', function() {
            const search = document.getElementById('user-search').value;
            const status = this.value;
            const role = document.getElementById('user-role-filter').value;
            loadUsers(1, search, status, role);
        });
    }
    
    const userRoleFilter = document.getElementById('user-role-filter');
    if (userRoleFilter) {
        userRoleFilter.addEventListener('change', function() {
            const search = document.getElementById('user-search').value;
            const status = document.getElementById('user-status-filter').value;
            const role = this.value;
            loadUsers(1, search, status, role);
        });
    }
    
    // إغلاق الطرائق
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.classList.add('hidden');
            });
        });
    });
    
    // تحميل البيانات الأولية
    loadUsers();
    loadBranches(); // Load branches for name lookup in table
}

export async function loadUsers(page = 1, search = '', status = 'both', role = 'all') {
    console.log('loadUsers');
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        let url = `${apiBaseUrl}/api/v1/user?page=${page}`;
        if (search) url += `&context=${encodeURIComponent(search)}`;
        if (status !== 'both') url += `&status=${status}`;
        if (role !== 'all') url += `&userroleid=${role}`;
        
        console.log(url);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('خطأ في تلقي البيانات');
        
        const data = await response.json();
        renderUsersTable(data.data);
        renderUsersPagination(data.meta);
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('خطأ في تلقي البيانات', 'error');
    }
}

export function renderUsersTable(users) {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="px-6 py-4 text-center text-gray-500">
                    لم يتم العثور على أي حالة
                </td>
            </tr>
        `;
        return;
    }
    
    users.forEach(user => {
        const branch = branches.find(b => b.branchid === user.branchid) || {};
        const branchName = branch.name || user.branchid || '-';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">${user.userid}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">${user.username}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">${user.firstname} ${user.lastname}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">${user.email || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">${user.phone || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">${getRoleLabel(user.userroleid)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">${branchName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-center">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isactive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${user.isactive ? 'نشيط' : 'عاجز'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-center">
                <button class="text-blue-600 hover:text-blue-900 view-user mr-3" data-id="${user.userid}">
                    <i class="material-icons text-base">visibility</i>
                </button>
                <button class="text-purple-600 hover:text-purple-900 edit-user mr-3" data-id="${user.userid}">
                    <i class="material-icons text-base">edit</i>
                </button>
                <button class="text-red-600 hover:text-red-900 delete-user" data-id="${user.userid}">
                    <i class="material-icons text-base">delete</i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // يضيف event listeners للأزرار
    document.querySelectorAll('.view-user').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-id');
            viewUserDetails(userId);
        });
    });
    
    document.querySelectorAll('.edit-user').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-id');
            editUser(userId);
        });
    });
    
    document.querySelectorAll('.delete-user').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-id');
            deleteUser(userId);
        });
    });
}

export function renderUsersPagination(meta) {
    const paginationContainer = document.getElementById('users-pagination');
    if (!paginationContainer || !meta || !meta.page) return;

    const current_page = parseInt(meta.page.page_num); // رقم الصفحة الحالية
    const page_size = parseInt(meta.page.page_size); // عدد العناصر في كل صفحة
    const total_count = meta.count; // العدد الإجمالي للنتائج
    const total_pages = Math.ceil(total_count / page_size); // احسب العدد الإجمالي للصفحات

    paginationContainer.innerHTML = `
        <div class="flex justify-between items-center">
            <div class="flex items-center space-x-2 space-x-reverse">
                <button class="pagination-btn ${current_page === 1 ? 'bg-gray-200 cursor-not-allowed' : 'hover:bg-gray-100'}" 
                    ${current_page === 1 ? 'disabled' : ''} id="users-prev-page">
                    سابق
                </button>
                
                ${Array.from({ length: total_pages }, (_, i) => i + 1).map(page => `
                    <button class="pagination-btn ${page === current_page ? 'bg-purple-500 text-white' : 'hover:bg-gray-100'}" 
                        data-page="${page}">
                        ${page}
                    </button>
                `).join('')}
                
                <button class="pagination-btn ${current_page === total_pages ? 'bg-gray-200 cursor-not-allowed' : 'hover:bg-gray-100'}" 
                    ${current_page === total_pages ? 'disabled' : ''} id="users-next-page">
                    التالي
                </button>
            </div>
        </div>
    `;

    // يضيف event listeners للتخطيط
    paginationContainer.querySelectorAll('button[data-page]').forEach(button => {
        button.addEventListener('click', function() {
            const page = parseInt(this.getAttribute('data-page'));
            const search = document.getElementById('user-search').value;
            const status = document.getElementById('user-status-filter').value;
            const role = document.getElementById('user-role-filter').value;
            loadUsers(page, search, status, role);
        });
    });

    const prevBtn = document.getElementById('users-prev-page');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (current_page > 1) {
                const search = document.getElementById('user-search').value;
                const status = document.getElementById('user-status-filter').value;
                const role = document.getElementById('user-role-filter').value;
                loadUsers(current_page - 1, search, status, role);
            }
        });
    }

    const nextBtn = document.getElementById('users-next-page');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (current_page < total_pages) {
                const search = document.getElementById('user-search').value;
                const status = document.getElementById('user-status-filter').value;
                const role = document.getElementById('user-role-filter').value;
                loadUsers(current_page + 1, search, status, role);
            }
        });
    }
}

export async function saveUser() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        const userId = document.getElementById('user-id').value;
        
        const userData = {
            username: document.getElementById('user-username').value,
            firstname: document.getElementById('user-firstname').value,
            lastname: document.getElementById('user-lastname').value,
            email: document.getElementById('user-email').value,
            phone: document.getElementById('user-phone').value,
            userroleid: parseInt(document.getElementById('user-role').value) || null,
            branchid: parseInt(document.getElementById('user-branch').value) || null,
            description: document.getElementById('user-description').value,
            isactive: document.getElementById('user-isactive').checked
        };
        
        // إذا تم إدخال كلمة المرور، قم بإضافتها أيضًا
        const passwordField = document.getElementById('user-password');
        if (passwordField && passwordField.value) {
            userData.passwordhash = passwordField.value;
        }
        
        const url = userId 
            ? `${apiBaseUrl}/api/v1/user/${userId}`
            : `${apiBaseUrl}/api/v1/user`;
            
        const method = userId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            if (response.status === 409) {
                throw new Error(responseData.meta.description || 'البريد الإلكتروني أو رقم الهاتف أو اسم المستخدم مكرر');
            } else if (response.status === 404) {
                throw new Error('معرف المستخدم غير صالح!');
            } else {
                throw new Error(responseData.meta.description || 'خطأ في حفظ البيانات');
            }
        }
        
        document.getElementById('user-modal').classList.add('hidden');
        showNotification(responseData.meta.description || 'تم تخزين المعلومات بنجاح', 'success');
        loadUsers();
    } catch (error) {
        console.error('Error saving user:', error);
        showNotification(error.message || 'خطأ في حفظ البيانات', 'error');
    }
}

export async function editUser(userId) {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/user/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('لم يتم العثور على المستخدم');
            } else {
                throw new Error('خطأ في تلقي البيانات');
            }
        }
        
        const data = await response.json();
        const user = data.data;
        
        document.getElementById('user-modal-title').textContent = 'تحرير المستخدم';
        document.getElementById('user-id').value = user.userid;
        document.getElementById('user-username').value = user.username || '';
        document.getElementById('user-firstname').value = user.firstname || '';
        document.getElementById('user-lastname').value = user.lastname || '';
        document.getElementById('user-email').value = user.email || '';
        document.getElementById('user-phone').value = user.phone || '';
        document.getElementById('user-description').value = user.description || '';
        document.getElementById('user-isactive').checked = user.isactive;
        
        const passwordField = document.getElementById('user-password');
        if (passwordField) {
            passwordField.value = '';
            passwordField.required = false;
        }
        
        // تحميل أدوار المستخدم والفروع ل dropdownأرى
        loadUserRoles();
        loadBranches().then(() => {
            // قم بتعيين قيمة الفرع الخاص بالمستخدم بعد تحميل الفروع
            setTimeout(() => {
                document.getElementById('user-branch').value = user.branchid || '';
                document.getElementById('user-role').value = user.userroleid || '';
            }, 100);
        });
        
        document.getElementById('user-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading user:', error);
        showNotification(error.message || 'خطأ في تلقي البيانات', 'error');
    }
}

export async function viewUserDetails(userId) {
    try {
        // تحميل الفروع ليظهر اسم الفرع
        if (branches.length === 0) {
            await loadBranches();
        }  

        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/user/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('لم يتم العثور على المستخدم');
            } else {
                throw new Error('خطأ في تلقي البيانات');
            }
        }
        
        const data = await response.json();
        const user = data.data;
        
        const branch = branches.find(b => b.branchid === user.branchid) || {};
        const branchName = branch.name || user.branchid || '-';
        
        // عرض معلومات المستخدم
        const userInfo = document.getElementById('user-detail-info');
        userInfo.innerHTML = `
            <div>
                <p class="text-sm text-gray-600">المعرف: <span class="font-medium">${user.userid}</span></p>
                <p class="text-sm text-gray-600">اسم المستخدم: <.span class="font-medium">${user.username}</span></p>
                <p class="text-sm text-gray-600">الاسم الكامل: <.span class="font-medium">${user.firstname} ${user.lastname}</span></p>
                <p class="text-sm text-gray-600">البريد الإلكتروني: <.span class="font-medium">${user.email || '-'}</span></p>
            </div>
            <div>
                <p class="text-sm text-gray-600">الهاتف: <.span class="font-medium">${user.phone || '-'}</span></p>
                <p class="text-sm text-gray-600">الدور: <.span class="font-medium">${getRoleLabel(user.userroleid)}</span></p>
                <p class="text-sm text-gray-600">الفرع: <.span class="font-medium">${branchName}</span></p>
                <p class="text-sm text-gray-600">الحالة: <.span class="font-medium">${user.isactive ? 'نشيط' : 'عاجز'}</span></p>
            </div>
            ${user.description ? `
            <div class="col-span-2">
                <p class="text-sm text-gray-600">الوصف: <.span class="font-medium">${user.description}</span></p>
            </div>
            ` : ''}
            ${user.lastlogin ? `
            <div class="col-span-2">
                <p class="text-sm text-gray-600">الإدخال الأخير: <.span class="font-medium">${new Date(user.lastlogin).toLocaleString('fa-IR')}</span></p>
            </div>
            ` : ''}
            ${user.createdat ? `
            <div class="col-span-2">
                <p class="text-sm text-gray-600">تاريخ الإنشاء: <.span class="font-medium">${new Date(user.createdat).toLocaleString('fa-IR')}</span></p>
            </div>
            ` : ''}
            ${user.updatedat ? `
            <div class="col-span-2">
                <p class="text-sm text-gray-600">تاريخ التحديث: <.span class="font-medium">${new Date(user.updatedat).toLocaleString('fa-IR')}</span></p>
            </div>
            ` : ''}
        `;
        
        document.getElementById('user-detail-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading user details:', error);
        showNotification(error.message || 'خطأ في تلقي البيانات', 'error');
    }
}

export async function deleteUser(userId) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن إرجاع هذا الإجراء.')) return;
    
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/user/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('لم يتم العثور على المستخدم المطلوب!');
            } else {
                throw new Error(responseData.meta.description || 'حدث خطأ أثناء حذف البيانات');
            }
        }
        
        showNotification(responseData.meta.description || 'تمت إزالة المستخدم بنجاح', 'success');
        loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification(error.message || 'حدث خطأ أثناء حذف البيانات', 'error');
    }
}

// وظائف مساعدة
export function getRoleLabel(roleId) {
    const roles = {
        1: 'مدير النظام',
        2: 'مستخدم عادي'
        // يمكنك أيضًا إضافة أدوار أخرى هنا
    };
    return roles[roleId] || `دور ${roleId}`;
}

export async function loadUserRoles() {
    // هنا يمكنك سرد قائمة الأدوار من API يحصل
    // نستخدم قائمة ثابتة من أجل البساطة
    const roleSelect = document.getElementById('user-role');
    if (roleSelect) {
        roleSelect.innerHTML = `
            <option value="">اختيار الدور </option>
            <option value="1">مدير النظام </option>
            <option value="2">مستخدم عادي </option>
        `;
    }
}

export async function loadBranches() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        // رمز التحقق
        if (!token) {
            console.error('No auth token found');
            showNotification('الرجاء تسجيل الدخول أولا', 'error');
            return;
        }
        
        const response = await fetch(`${apiBaseUrl}/api/v1/branch`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`خطأ في استلام الفروع: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // التحقق من بنية الاستجابة API
        if (!data.data || !Array.isArray(data.data)) {
            console.error('Invalid branches data structure:', data);
            throw new Error('بنية البيانات المستلمة من الخادم غير صالحة');
        }
        
        branches = data.data;
        const branchSelect = document.getElementById('user-branch');
        
        if (branchSelect) {
            branchSelect.innerHTML = '<option value="">اختيار الفرع </option>';
            
            branches.forEach(branch => {
                // التحقيق في وجود المجالات الأساسية
                if (branch.branchid && branch.mainname) {
                    const option = document.createElement('option');
                    option.value = branch.branchid;
                    option.textContent = branch.mainname;
                    branchSelect.appendChild(option);
                } else {
                    console.warn('Invalid branch data:', branch);
                }
            });
            
            // إذا لم تكن الفروع متوفرة، قم بإضافة خيار افتراضي
            if (branches.length === 0) {
                const option = document.createElement('option');
                option.value = "";
                option.textContent = "لم يتم العثور على فرع.";
                option.disabled = true;
                branchSelect.appendChild(option);
            }
        }
    } catch (error) {
        console.error('Error loading branches:', error);
        
        // عرض رسالة الخطأ للمستخدم
        const branchSelect = document.getElementById('user-branch');
        if (branchSelect) {
            branchSelect.innerHTML = '<option value="">خطأ في تحميل الفروع </option>';
        }
        
        showNotification('خطأ في تحميل قائمة الفروع', 'error');
    }
}