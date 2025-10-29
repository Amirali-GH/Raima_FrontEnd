import { currentState } from './state.js';
import { showNotification } from './systemAdmin.js';

let dashboardData = {
    code1: {
        count: 0,
        data: [],
        currentPage: 1,
        pageSize: 10,
        totalPages: 0
    },
    code234: {
        count: 0,
        olderThan1Month: 0,
        data: [],
        currentPage: 1,
        pageSize: 10,
        totalPages: 0
    },
    code7: {
        count: 0,
        data: [],
        currentPage: 1,
        pageSize: 10,
        totalPages: 0
    }
};

/* ---------- compute pagination using server total_size + default_page_size ---------- */
function calculatePagination(listType) {
    const dataObj = dashboardData[listType];
    const pageSize = parseInt(dataObj.pageSize, 10) || 10;
    let currentPage = parseInt(dataObj.currentPage, 10) || 1;
    const dataLen = Array.isArray(dataObj.data) ? dataObj.data.length : 0;

    // totalItems from server (count) if present
    const totalItems = (typeof dataObj.count === 'number' && isFinite(dataObj.count) && dataObj.count >= 0)
        ? dataObj.count
        : ((currentPage - 1) * pageSize + dataLen);

    // Always compute totalPages using default_page_size from server
    let defaultPageSize = parseInt(dataObj.default_page_size, 10);
    if (!isFinite(defaultPageSize) || defaultPageSize <= 0) defaultPageSize = pageSize || 10;

    const totalPages = Math.max(1, Math.ceil((totalItems || 0) / defaultPageSize));

    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * pageSize;
    const start = dataLen === 0 ? 0 : (startIndex + 1);
    const end = dataLen === 0 ? 0 : (startIndex + dataLen);

    return {
        pageSize,
        defaultPageSize,
        currentPage,
        dataLen,
        totalItems,
        totalPages,
        start,
        end
    };
}


/* ---------- update pagination DOM ---------- */
function updatePaginationDisplay(listType) {
    const p = calculatePagination(listType);

    const pageInfoElement = document.getElementById(`${listType}-page-info`);
    if (pageInfoElement) pageInfoElement.textContent = `صفحه ${p.currentPage} از ${p.totalPages}`;

    const startElement = document.getElementById(`${listType}-start`);
    const endElement = document.getElementById(`${listType}-end`);
    const totalElement = document.getElementById(`${listType}-total`);

    if (startElement) startElement.textContent = p.start;
    if (endElement) endElement.textContent = p.end;
    if (totalElement) totalElement.textContent = p.totalItems;

    const prevButton = document.getElementById(`${listType}-prev-page`);
    const nextButton = document.getElementById(`${listType}-next-page`);

    if (prevButton) {
        const disabled = p.currentPage <= 1;
        prevButton.disabled = disabled;
        prevButton.classList.toggle('opacity-50', disabled);
        prevButton.classList.toggle('cursor-not-allowed', disabled);
    }

    if (nextButton) {
        // اگر count داریم از آن استفاده کن، وگرنه از داده فعلی و اندازه صفحه برای تصمیم استفاده کن
        let disabled;
        if (typeof dashboardData[listType].count === 'number' && dashboardData[listType].count >= 0) {
            disabled = (p.currentPage >= p.totalPages);
        } else {
            // وقتی count نداریم: اگر داده دریافتی کمتر از pageSize است یعنی آخرین صفحه است -> غیرفعال
            disabled = (p.dataLen < p.pageSize);
        }
        nextButton.disabled = disabled;
        nextButton.classList.toggle('opacity-50', disabled);
        nextButton.classList.toggle('cursor-not-allowed', disabled);
    }
}


function showCode1List() {
    const tableBody = document.getElementById('code1-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const currentPage = dashboardData.code1.currentPage || 1;
    const pageSize = dashboardData.code1.pageSize || 10;
    const data = Array.isArray(dashboardData.code1.data) ? dashboardData.code1.data : [];

    if (data.length > 0) {
        data.forEach((customer, index) => {
            const globalIndex = (currentPage - 1) * pageSize + index + 1;
            const id = customer.customerid ?? '';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-4 py-3 text-center text-sm text-gray-500">${globalIndex}</td>
                <td class="px-4 py-3 text-center text-sm text-gray-500">${customer.phone || '---'}</td>
                <td class="px-4 py-3 text-center text-sm text-gray-500">${customer.fullname || '---'}</td>
                <td class="px-4 py-3 text-center text-sm text-gray-500">${customer.nationalid || '---'}</td>
                <td class="px-4 py-3 text-center text-sm text-gray-500">${customer.requestedcarname || '---'}</td>
                <td class="px-4 py-3 text-center text-sm text-gray-500">${customer.lastcontactdate_shams || '---'}</td>
                <td class="px-4 py-3 text-center text-sm text-gray-500">
                    <button class="text-blue-600 hover:text-blue-800 ml-2" onclick="editCustomer(${id})">
                        <i class="material-icons text-sm">edit</i>
                    </button>
                    <button class="text-red-600 hover:text-red-800" onclick="deleteCustomer(${id})">
                        <i class="material-icons text-sm">delete</i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } else {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="7" class="px-4 py-3 text-center text-sm text-gray-500">
                موردی یافت نشد
            </td>
        `;
        tableBody.appendChild(row);
    }

    updatePaginationDisplay('code1');
    document.getElementById('code1-list').classList.remove('hidden');
}

function showCode234List() {
    const tableBody = document.getElementById('code234-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const currentPage = dashboardData.code234.currentPage || 1;
    const pageSize = dashboardData.code234.pageSize || 10;
    const data = Array.isArray(dashboardData.code234.data) ? dashboardData.code234.data : [];

    if (data.length > 0) {
        data.forEach((customer, index) => {
            const globalIndex = (currentPage - 1) * pageSize + index + 1;
            const id = customer.customerid ?? '';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">${globalIndex}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">${customer.phone || '---'}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">${customer.fullname || '---'}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">${customer.customerstatusid || '---'}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">${customer.customerstatus || '---'}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">${customer.lastcontactdate_shams || '---'}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                    <button class="text-blue-600 hover:text-blue-800 ml-2" onclick="viewCustomer(${id})">
                        <i class="material-icons text-sm">visibility</i>
                    </button>
                    <button class="text-green-600 hover:text-green-800 ml-2" onclick="editCustomer(${id})">
                        <i class="material-icons text-sm">edit</i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } else {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="7" class="px-4 py-3 text-center text-sm text-gray-500">
                موردی یافت نشد
            </td>
        `;
        tableBody.appendChild(row);
    }

    updatePaginationDisplay('code234');
    document.getElementById('code234-list').classList.remove('hidden');
}

function showCode7List() {
    const tableBody = document.getElementById('code7-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const currentPage = dashboardData.code7.currentPage || 1;
    const pageSize = dashboardData.code7.pageSize || 10;
    const data = Array.isArray(dashboardData.code7.data) ? dashboardData.code7.data : [];

    if (data.length > 0) {
        data.forEach((customer, index) => {
            const globalIndex = (currentPage - 1) * pageSize + index + 1;
            const id = customer.customerid ?? '';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">${globalIndex}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">${customer.phone || '---'}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">${customer.fullname || '---'}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">${customer.nationalid || '---'}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">${customer.requestedcarname || '---'}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">${customer.lastcontactdate_shams || '---'}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                    <button class="text-blue-600 hover:text-blue-800 ml-2" onclick="viewCustomer(${id})">
                        <i class="material-icons text-sm">visibility</i>
                    </button>
                    <button class="text-green-600 hover:text-green-800 ml-2" onclick="editCustomer(${id})">
                        <i class="material-icons text-sm">edit</i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } else {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="7" class="px-4 py-3 text-center text-sm text-gray-500">
                موردی یافت نشد
            </td>
        `;
        tableBody.appendChild(row);
    }

    updatePaginationDisplay('code7');
    document.getElementById('code7-list').classList.remove('hidden');
}

/* ---------- change page (next/prev) ---------- */
async function changePage(listType, direction) {
    const data = dashboardData[listType];
    const pageSize = parseInt(data.pageSize, 10) || 20;
    const currentPage = parseInt(data.currentPage, 10) || 1;
    const hasServerCount = (typeof data.count === 'number' && isFinite(data.count) && data.count >= 0);
    let newPage = currentPage;
    console.log(pageSize);
    if (direction === 'next') {
        if (hasServerCount) {
            const totalPages = Math.max(1, Math.ceil(data.count / pageSize));
            if (currentPage < totalPages) newPage = currentPage + 1;
        } else {
            // fallback: فقط اگر صفحه فعلی full است
            const dataLen = Array.isArray(data.data) ? data.data.length : 0;
            if (dataLen === pageSize) newPage = currentPage + 1;
        }
    } else if (direction === 'prev') {
        if (currentPage > 1) newPage = currentPage - 1;
    }

    if (newPage === currentPage) {
        setPaginationControlsDisabled(listType, false);
        return;
    } else{
        setPaginationControlsDisabled(listType, true);
    }
    
    data.currentPage = newPage;
    await fetchListPage(listType, newPage);
}

function setPaginationControlsDisabled(listType, disabled) {
    const prevBtn = document.getElementById(`${listType}-prev-page`);
    const nextBtn = document.getElementById(`${listType}-next-page`);
    if (prevBtn) {
        prevBtn.disabled = disabled;
        prevBtn.classList.toggle('opacity-50', disabled);
        prevBtn.classList.toggle('cursor-not-allowed', disabled);
    }
    if (nextBtn) {
        nextBtn.disabled = disabled;
        nextBtn.classList.toggle('opacity-50', disabled);
        nextBtn.classList.toggle('cursor-not-allowed', disabled);
    }

    // optional: نشانگر لودینگ برای آن لیست
    const loader = document.getElementById(`${listType}-loader`);
    if (loader) loader.style.display = disabled ? 'inline-block' : 'none';
}

async function fetchListPage(listType, pageNumber, attempt = 0, render = true) {
    const MAX_ATTEMPTS = 2;
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        if (!token) { showNotification('لطفاً ابتدا وارد سیستم شوید'); return; }

        let branchIdForQuery;
        if (currentState.user && currentState.user.userrolename === 'admin') {
            branchIdForQuery = currentState.selectedBranch || '0';
        } else branchIdForQuery = currentState.user?.branchid;
        if (!branchIdForQuery) { showNotification('شناسه شعبه مشخص نیست'); return; }

        let listUrl;
        if (listType === 'code234') {
            listUrl = new URL('/api/v1/phoneassignment/result/list_assignment/follow-up', apiBaseUrl);
            listUrl.searchParams.set('branchid', branchIdForQuery);
            listUrl.searchParams.set('page', pageNumber);
        } else if (listType === 'code1') {
            listUrl = new URL('/api/v1/phoneassignment/result/list_assignment', apiBaseUrl);
            listUrl.searchParams.set('branchid', branchIdForQuery);
            listUrl.searchParams.set('status_code', '1');
            listUrl.searchParams.set('page', pageNumber);
        } else if (listType === 'code7') {
            listUrl = new URL('/api/v1/phoneassignment/result/list_assignment', apiBaseUrl);
            listUrl.searchParams.set('branchid', branchIdForQuery);
            listUrl.searchParams.set('status_code', '7');
            listUrl.searchParams.set('page', pageNumber);
        } else { console.error('Unknown listType for fetchListPage:', listType); return; }

        const resp = await fetch(listUrl, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
        if (!resp.ok) throw new Error(`خطا در دریافت ${listType}: ${resp.status}`);

        const json = await resp.json();
        if (!json.meta?.is_success) throw new Error('API returned is_success = false');

        const returnedData = Array.isArray(json.data) ? json.data : [];

        const p = (json.meta && json.meta.page) ? json.meta.page : {};
        const rawPageSize = p.page_size;
        const rawDefaultPageSize = p.default_page_size;
        const rawPageNum = p.page_num;
        const rawTotal = p.total_size;
        const nextPageUri = (p.next_page_uri === undefined) ? undefined : p.next_page_uri; // undefined vs null considered

        let metaPageSize = parseInt(String(rawPageSize ?? '').replace(/\D/g, ''), 10);
        if (!isFinite(metaPageSize) || metaPageSize <= 0) {
            let defaultPS = parseInt(String(rawDefaultPageSize ?? '').replace(/\D/g, ''), 10);
            if (!isFinite(defaultPS) || defaultPS <= 0) {
                defaultPS = parseInt(dashboardData[listType].pageSize, 10) || 20;
            }
            metaPageSize = defaultPS;
        }

        let metaPageNum = parseInt(String(rawPageNum ?? '').replace(/\D/g, ''), 10);
        if (!isFinite(metaPageNum) || metaPageNum <= 0) metaPageNum = pageNumber;

        let totalSize = null;
        if (rawTotal !== undefined && rawTotal !== null && String(rawTotal).toString().trim() !== '') {
            const cleaned = String(rawTotal).replace(/[^\d-]/g, '');
            const totParsed = parseInt(cleaned, 10);
            if (isFinite(totParsed) && totParsed >= 0) totalSize = totParsed;
        }

        dashboardData[listType].pageSize = metaPageSize;
        dashboardData[listType].currentPage = metaPageNum;

        const totalPagesFromMeta = (totalSize !== null) ? Math.max(1, Math.ceil(totalSize / metaPageSize)) : null;

        if (returnedData.length === 0) {
            if (totalSize !== null && pageNumber > totalPagesFromMeta) {
                const last = totalPagesFromMeta;
                dashboardData[listType].currentPage = last;
                if (attempt < MAX_ATTEMPTS && last !== pageNumber) {
                    return await fetchListPage(listType, last, attempt + 1, render);
                }
            }

            if ((nextPageUri === null || nextPageUri === '') && totalSize !== null) {
                dashboardData[listType].count = totalSize;
                dashboardData[listType].data = returnedData; // خالی
                updatePaginationDisplay(listType);
                if (render) {
                    if (listType === 'code234') showCode234List();
                    else if (listType === 'code1') showCode1List();
                    else if (listType === 'code7') showCode7List();
                }
                showNotification('این صفحه خالی است، اما total_size از سرور موجود است');
                return;
            }

            const safePrev = Math.max(1, pageNumber - 1);
            dashboardData[listType].currentPage = safePrev;
            if (attempt < MAX_ATTEMPTS && safePrev !== pageNumber) {
                return await fetchListPage(listType, safePrev, attempt + 1, render);
            }

            dashboardData[listType].data = returnedData;
            dashboardData[listType].count = (totalSize !== null) ? totalSize : null;
            updatePaginationDisplay(listType);
            if (render) {
                if (listType === 'code234') showCode234List();
                else if (listType === 'code1') showCode1List();
                else if (listType === 'code7') showCode7List();
            }
            showNotification('صفحه خالی است');
            return;
        }

        if (totalSize !== null) {
            dashboardData[listType].count = totalSize;
        } else {
            if (nextPageUri === null || nextPageUri === '') {
                dashboardData[listType].count = (metaPageNum - 1) * metaPageSize + returnedData.length;
            } else {
                dashboardData[listType].count = null;
            }
        }

        dashboardData[listType].data = returnedData;
        dashboardData[listType].currentPage = metaPageNum;
        updatePaginationDisplay(listType);

        if (render) {
            if (listType === 'code234') showCode234List();
            else if (listType === 'code1') showCode1List();
            else if (listType === 'code7') showCode7List();
        }

    } catch (err) {
        console.error('خطا در fetchListPage:', err);
        showNotification('خطا در دریافت لیست: ' + (err.message || err), 'error');
    }
}


function setupPaginationEventListeners() {
    // صفحه‌بندی کد ۱
    const code1PrevBtn = document.getElementById('code1-prev-page');
    const code1NextBtn = document.getElementById('code1-next-page');

    if (code1PrevBtn) {
        code1PrevBtn.addEventListener('click', () => changePage('code1', 'prev'));
    }

    if (code1NextBtn) {
        code1NextBtn.addEventListener('click', () => changePage('code1', 'next'));
    }

    // صفحه‌بندی کدهای ۲، ۳ و ۴
    const code234PrevBtn = document.getElementById('code234-prev-page');
    const code234NextBtn = document.getElementById('code234-next-page');

    if (code234PrevBtn) {
        code234PrevBtn.addEventListener('click', () => changePage('code234', 'prev'));
    }

    if (code234NextBtn) {
        code234NextBtn.addEventListener('click', () => changePage('code234', 'next'));
    }

    // صفحه‌بندی کد ۷
    const code7PrevBtn = document.getElementById('code7-prev-page');
    const code7NextBtn = document.getElementById('code7-next-page');

    if (code7PrevBtn) {
        code7PrevBtn.addEventListener('click', () => changePage('code7', 'prev'));
    }

    if (code7NextBtn) {
        code7NextBtn.addEventListener('click', () => changePage('code7', 'next'));
    }
}

async function fetchDashboardData() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        if (!token) {
            showNotification('لطفاً ابتدا وارد سیستم شوید');
            return;
        }

        let branchIdForQuery;
        if (currentState.user && currentState.user.userrolename === 'admin') {
            branchIdForQuery = currentState.selectedBranch;
            if (branchIdForQuery === '') branchIdForQuery = '0';
        } else {
            branchIdForQuery = currentState.user?.branchid;
        }
        if (!branchIdForQuery) {
            showNotification('شناسه شعبه مشخص نیست');
            return;
        }

        const requests = [];

        const followUpHeaderUrl = new URL('/api/v1/phoneassignment/result/header_assignment/follow-up', apiBaseUrl);
        followUpHeaderUrl.searchParams.set('branchid', branchIdForQuery);
        requests.push(fetch(followUpHeaderUrl, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }).then(r => r.json()));

        const code1HeaderUrl = new URL('/api/v1/phoneassignment/result/header_assignment', apiBaseUrl);
        code1HeaderUrl.searchParams.set('branchid', branchIdForQuery);
        code1HeaderUrl.searchParams.set('status_code', '1');
        requests.push(fetch(code1HeaderUrl, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }).then(r => r.json()));

        const code7HeaderUrl = new URL('/api/v1/phoneassignment/result/header_assignment', apiBaseUrl);
        code7HeaderUrl.searchParams.set('branchid', branchIdForQuery);
        code7HeaderUrl.searchParams.set('status_code', '7');
        requests.push(fetch(code7HeaderUrl, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }).then(r => r.json()));

        const [followUpHeaderData, code1HeaderData, code7HeaderData] = await Promise.all(requests);

        if (followUpHeaderData?.meta?.is_success) {
            dashboardData.code234.count = followUpHeaderData.data.total_phones || dashboardData.code234.count;
            dashboardData.code234.olderThan1Month = followUpHeaderData.data.older_than_1_month || 0;
        }
        if (code1HeaderData?.meta?.is_success) {
            dashboardData.code1.count = code1HeaderData.data.total_phones || dashboardData.code1.count;
        }
        if (code7HeaderData?.meta?.is_success) {
            dashboardData.code7.count = code7HeaderData.data.total_phones || dashboardData.code7.count;
        }

        await Promise.all([
            fetchListPage('code234', 1, 0, false),
            fetchListPage('code1', 1, 0, false),
            fetchListPage('code7', 1, 0, false)
        ]);


        updateDashboardStats();

    } catch (error) {
        console.error('خطا در دریافت داده‌های داشبورد:', error);
        showNotification('خطا در دریافت داده‌های داشبورد: ' + (error.message || error), 'error');
    }
}

function updateDashboardStats() {
    // به‌روزرسانی تعداد کد 1
    const code1CountElement = document.getElementById('code1-count');
    if (code1CountElement) {
        code1CountElement.textContent = dashboardData.code1.count;
    }

    // به‌روزرسانی تعداد کدهای ۲، ۳ و ۴
    const code234CountElement = document.getElementById('code234-count');
    if (code234CountElement) {
        code234CountElement.textContent = dashboardData.code234.count;
    }

    // به‌روزرسانی تعداد کد ۷
    const code7CountElement = document.getElementById('code7-count');
    if (code7CountElement) {
        code7CountElement.textContent = dashboardData.code7.count;
    }

    // هشدار کد ۱ (عدم پاسخگویی)
    const code1Warning = document.getElementById('code1-warning');
    if (code1Warning) {
        if (dashboardData.code1.count > 0) {
            code1Warning.classList.remove('hidden');
            code1Warning.innerHTML = `
                <div class="flex items-start">
                    <i class="material-icons text-red-500 text-sm mt-0.5 ml-2">warning</i>
                    <div class="text-red-700 text-sm">
                        <p class="font-medium">هشدار کد ۱ (عدم پاسخگویی)</p>
                        <p class="mt-1">شعبه شما ${dashboardData.code1.count} عدد کد ۱ (عدم پاسخگویی) دارد. تا زمان تغییر وضعیت این موارد، شماره جدیدی تخصیص داده نخواهد شد.</p>
                    </div>
                </div>`;
        } else {
            code1Warning.classList.add('hidden');
            code1Warning.innerHTML = '';
        }
    }

    // هشدار کدهای ۲، ۳ و ۴ (ماه گذشته)
    const code234Warning = document.getElementById('code234-warning');
    const olderCount = dashboardData.code234.olderThan1Month || 0;
    if (code234Warning) {
        if (olderCount > 0) {
            code234Warning.classList.remove('hidden');
            code234Warning.innerHTML = `
                <div class="flex items-start">
                    <i class="material-icons text-yellow-500 text-sm mt-0.5 ml-2">warning</i>
                    <div class="text-yellow-700 text-sm">
                        <p class="font-medium">.هشدار کدهای ۲، ۳ و ۴ (ماه گذشته)</p>
                        <p class="mt-1">شعبه شما ${olderCount} عدد کد ۲ و ۳ و ۴ از یکماه گذشته به قبل دارد. این موارد باید حتماً تغییر وضعیت داده و به کدهای ۵ تا ۸ بروزرسانی شوند.</p>
                    </div>
                </div>`;
        } else {
            code234Warning.classList.add('hidden');
            code234Warning.innerHTML = '';
        }
    }

    // هشدار کد ۷ (لزوم کد ملی)
    const code7Warning = document.getElementById('code7-warning');
    if (code7Warning) {
        if (dashboardData.code7.count > 0) {
            code7Warning.classList.remove('hidden');
            code7Warning.innerHTML = `
                <div class="flex items-start">
                    <i class="material-icons text-blue-500 text-sm mt-0.5 ml-2">warning</i>
                    <div class="text-blue-700 text-sm">
                        <p class="font-medium">.هشدار کد ۷ (لزوم کد ملی)</p>
                        <p class="mt-1">تمامی ${dashboardData.code7.count} کد ۷ باید همراه کد ملی ثبت شوند. وضعیت موفق برای ثبت‌نام تنها در صورت ثبت کد ۷ به همراه کد ملی در سیستم است.</p>
                    </div>
                </div>`;
        } else {
            code7Warning.classList.add('hidden');
            code7Warning.innerHTML = '';
        }
    }

    // مجموع کل مشتری‌ها
    const totalCustomersElement = document.getElementById('total-customers');
    if (totalCustomersElement) {
        const total =
            (dashboardData.code1.count || 0) +
            (dashboardData.code234.count || 0) +
            (dashboardData.code7.count || 0);
        totalCustomersElement.textContent = total.toLocaleString('fa-IR');
    }
}


function setupDashboardEventListeners() {
    // رویدادهای دکمه‌های مشاهده لیست
    const viewCode1Btn = document.getElementById('view-code1-btn');
    const viewCode234Btn = document.getElementById('view-code234-btn');
    const viewCode7Btn = document.getElementById('view-code7-btn');

    if (viewCode1Btn) {
        viewCode1Btn.addEventListener('click', showCode1List);
    }

    if (viewCode234Btn) {
        viewCode234Btn.addEventListener('click', showCode234List);
    }

    if (viewCode7Btn) {
        viewCode7Btn.addEventListener('click', showCode7List);
    }

    // رویدادهای دکمه‌های دانلود
    const downloadCode1Btn = document.getElementById('download-code1-btn');
    const downloadCode234Btn = document.getElementById('download-code234-btn');
    const downloadCode7Btn = document.getElementById('download-code7-btn');

    if (downloadCode1Btn) {
        downloadCode1Btn.addEventListener('click', downloadCode1List);
    }

    if (downloadCode234Btn) {
        downloadCode234Btn.addEventListener('click', downloadCode234List);
    }

    if (downloadCode7Btn) {
        downloadCode7Btn.addEventListener('click', downloadCode7List);
    }

    // رویدادهای دکمه‌های بستن لیست
    const closeCode1Btn = document.getElementById('close-code1-list');
    const closeCode234Btn = document.getElementById('close-code234-list');
    const closeCode7Btn = document.getElementById('close-code7-list');

    if (closeCode1Btn) {
        closeCode1Btn.addEventListener('click', () => {
            document.getElementById('code1-list').classList.add('hidden');
        });
    }

    if (closeCode234Btn) {
        closeCode234Btn.addEventListener('click', () => {
            document.getElementById('code234-list').classList.add('hidden');
        });
    }

    if (closeCode7Btn) {
        closeCode7Btn.addEventListener('click', () => {
            document.getElementById('code7-list').classList.add('hidden');
        });
    }

    // اضافه کردن رویدادهای صفحه‌بندی
    setupPaginationEventListeners();
}

// توابع دانلود لیست کامل
async function downloadCode1List() {
    await exportListData('code1', 'عدم پاسخگویی', '1');
}

async function downloadCode234List() {
    await exportListData('code234', 'پیگیری', 'follow-up');
}

async function downloadCode7List() {
    await exportListData('code7', 'بدون کد ملی', '7');
}

// تابع اصلی برای دریافت و تبدیل داده‌ها به اکسل
async function exportListData(listType, listName, statusCode) {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        if (!token) {
            showNotification('لطفاً ابتدا وارد سیستم شوید');
            return;
        }

        // ایجاد modal پردازش در صورت عدم وجود
        createProcessingModalIfNotExists();

        // نمایش modal پردازش
        const processingModal = document.getElementById('export-processing-modal');
        processingModal.classList.remove('hidden');

        // تعیین branchid
        let branchIdForQuery;
        if (currentState.user && currentState.user.userrolename === 'admin') {
            branchIdForQuery = currentState.selectedBranch || '0';
        } else {
            branchIdForQuery = currentState.user?.branchid;
        }
        if (!branchIdForQuery) {
            showNotification('شناسه شعبه مشخص نیست');
            processingModal.classList.add('hidden');
            return;
        }

        const allItems = [];
        let nextUrl = null;
        let pageCount = 0;
        let totalItems = 0;

        function buildUrl(page = 1) {
            let url;
            if (listType === 'code234') {
                url = new URL('/api/v1/phoneassignment/result/list_assignment/follow-up', apiBaseUrl);
                url.searchParams.set('branchid', branchIdForQuery);
                url.searchParams.set('page', page);
            } else {
                url = new URL('/api/v1/phoneassignment/result/list_assignment', apiBaseUrl);
                url.searchParams.set('branchid', branchIdForQuery);
                url.searchParams.set('status_code', statusCode);
                url.searchParams.set('page', page);
            }
            return url.toString();
        }

        // اولین درخواست
        updateProcessingMessage(`در حال دریافت داده‌های ${listName}...`);

        do {
            pageCount++;
            updateProcessingMessage(`در حال دریافت داده‌های ${listName}... (صفحه ${pageCount})`);

            const currentUrl = nextUrl || buildUrl(pageCount);
            const resp = await fetch(currentUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!resp.ok) throw new Error(`خطا در دریافت داده‌ها: ${resp.status}`);

            const json = await resp.json();
            if (!json.meta?.is_success) throw new Error('API returned is_success = false');

            const returnedData = Array.isArray(json.data) ? json.data : [];
            allItems.push(...returnedData);

            // بررسی pagination برای دریافت صفحه بعدی
            const pageMeta = json.meta?.page;
            if (pageMeta && pageMeta.next_page_uri) {
                if (pageMeta.next_page_uri.startsWith('http')) {
                    nextUrl = pageMeta.next_page_uri;
                } else {
                    nextUrl = apiBaseUrl.replace(/\/$/, '') + pageMeta.next_page_uri;
                }
            } else {
                nextUrl = null;
            }

            // اگر total_size موجود باشد، آن را ذخیره کن
            if (pageMeta?.total_size !== undefined && pageMeta.total_size !== null) {
                totalItems = pageMeta.total_size;
            }

            // توقف اگر بیش از 1000 صفحه دریافت شده (برای جلوگیری از loop بی‌نهایت)
            if (pageCount > 1000) {
                console.warn('توقف دریافت داده‌ها به دلیل تعداد صفحات زیاد');
                break;
            }

        } while (nextUrl);

        if (allItems.length === 0) {
            showNotification(`هیچ داده‌ای برای ${listName} وجود ندارد.`, 'info');
            processingModal.classList.add('hidden');
            return;
        }

        // نمایش پیام در حال تولید فایل
        updateProcessingMessage(`در حال تولید فایل اکسل... (${allItems.length} رکورد)`);

        // نگاشت داده‌ها به ستون‌های اکسل
        const excelData = allItems.map((item, index) => {
            const baseData = {
                'ردیف': index + 1,
                'شماره تماس': item.phone || '---',
                'نام کامل': item.fullname || '---',
                'کد ملی': item.nationalid || '---',
                'خودرو درخواستی': item.requestedcarname || '---',
                'تاریخ آخرین تماس': item.lastcontactdate_shams || '---',
                'شناسه مشتری': item.customerid || '---'
            };

            // فیلدهای خاص برای هر لیست
            if (listType === 'code234') {
                baseData['کد وضعیت'] = item.customerstatusid || '---';
                baseData['وضعیت'] = item.customerstatus || '---';
            }

            return baseData;
        });

        // تبدیل به شیت و ساخت فایل اکسل
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `${listName}`);

        const nowStr = new Date().toLocaleDateString('fa-IR').replace(/\//g, '-');
        const filename = `لیست_${listName}_${nowStr}.xlsx`;
        
        // نمایش پیام نهایی
        updateProcessingMessage('در حال دانلود فایل...');
        
        // ایجاد تأخیر کوچک برای نمایش پیام
        await new Promise(resolve => setTimeout(resolve, 500));
        
        XLSX.writeFile(workbook, filename);
        
        showNotification(`فایل اکسل ${listName} با ${allItems.length} رکورد با موفقیت دانلود شد.`, 'success');

    } catch (error) {
        console.error(`export ${listType} error:`, error);
        showNotification(`خطا هنگام خروجی گرفتن ${listName}: ` + (error.message || error), 'error');
    } finally {
        // مخفی کردن modal پردازش
        const processingModal = document.getElementById('export-processing-modal');
        if (processingModal) {
            processingModal.classList.add('hidden');
        }
    }
}

// تابع برای ایجاد modal پردازش در صورت عدم وجود
function createProcessingModalIfNotExists() {
    if (document.getElementById('export-processing-modal')) {
        return;
    }

    const modalHtml = `
        <div id="export-processing-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
            <div class="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
                <div class="flex flex-col items-center">
                    <div class="spinner mb-4"></div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">در حال پردازش</h3>
                    <p id="export-processing-message" class="text-gray-600 text-center">در حال دریافت داده‌ها از سرور...</p>
                </div>
            </div>
        </div>
    `;

    // اضافه کردن استایل برای spinner اگر وجود ندارد
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

// تابع برای به‌روزرسانی پیام در modal پردازش
function updateProcessingMessage(message) {
    const messageEl = document.getElementById('export-processing-message');
    if (messageEl) {
        messageEl.textContent = message;
    }
}

// توابع برای عملیات
function viewCustomer(id) {
    alert(`مشاهده مشتری با شناسه ${id}`);
}

function editCustomer(id) {
    alert(`ویرایش مشتری با شناسه ${id}`);
}

// تابع اصلی برای راه‌اندازی داشبورد
export function initDashboard() {
    // دریافت داده‌ها از API
    fetchDashboardData();

    // تنظیم event listenerها
    setupDashboardEventListeners();
}

// راه‌اندازی اولیه داشبورد هنگام لود صفحه
document.addEventListener('DOMContentLoaded', function () {
    // اگر صفحه داشبورد است، آن را راه‌اندازی کن
    if (document.getElementById('code1-count')) {
        initDashboard();
    }
});