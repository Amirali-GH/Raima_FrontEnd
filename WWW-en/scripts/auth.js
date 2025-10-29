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
            throw new Error("Login failed");
        }

        const data = await response.json();

            if (data.token) {
                localStorage.setItem("authToken", data.token);
                const user = { username: username }; // Basic user info
                localStorage.setItem("userData", JSON.stringify(user));

                currentState.token = data.token;
                currentState.user = user;
                await loadPage('dashboard'); // Only call loadPage
            } else {
                showLoginError("Token was not received");
            }
        } catch (error) {
            console.error(error);
            showLoginError("User not found!");
        }
    } else {
        showLoginError('Please enter username and password');
    }
}

export async function checkLoginStatus() {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');

    if (token && userData) {
        currentState.token = token;
        currentState.user = JSON.parse(userData);
        await loadPage('dashboard'); // Without an additional request
        return true;
    } else {
        await loadPage('login');
        return false;
    }
}

export function handleLogout() {
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');

    // Clear sessionStorage
    sessionStorage.clear();

    // Clear all cookies
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

    // Reload the page to ensure state is fully cleared
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
            throw new Error("Failed to fetch user information");
        }

        const data = (await response.json()).data;
 
        // 1. Save all information into currentState
        currentState.user = { ...currentState.user, ...data };

        // 2. Update the DOM
        const userFullNameEl = document.getElementById('user-full-name');
        const branchFullNameEl = document.getElementById('branch-full-name');

        if (userFullNameEl) {
            userFullNameEl.innerText = `${data.firstname} ${data.lastname}`;
        }
        if (branchFullNameEl) {
            branchFullNameEl.innerText = data.branchname || '';
        }
        
           
        // Show the admin menu only for users with the admin role
        if (currentState.user && currentState.user.userid) {
            // Check the user role to show or hide the admin menu
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


