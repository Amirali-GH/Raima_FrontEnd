import { currentState } from './state.js';
import { showNotification } from './systemAdmin.js';

// متغیرهای صفحه‌بندی
let currentHistoryPage = 1;
const historyPageSize = 5;

// تابع برای بارگذاری تاریخچه آپلودها
export async function loadUploadHistory(page = 1, branchId = null) {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('لطفاً ابتدا وارد سیستم شوید', 'error');
            return;
        }

        // ساخت URL با پارامترها
        const url = new URL(`${apiBaseUrl}/api/v1/file-result`);
        url.searchParams.append('page', page);
        
        // اگر شعبه انتخاب شده (فقط برای admin)
        if (branchId && branchId !== 'all') {
            url.searchParams.append('branchid', branchId);
        }

        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('خطا در دریافت اطلاعات تاریخچه');
        }

        const data = await response.json();

        if (data.meta && data.meta.is_success) {
            renderUploadHistory(data.data || []);
            renderHistoryPagination(data.meta);
        } else {
            throw new Error(data.meta?.description || 'خطا در دریافت داده‌ها');
        }

    } catch (error) {
        console.error('Error loading upload history:', error);
        showNotification('خطا در بارگذاری تاریخچه آپلودها: ' + error.message, 'error');
        showEmptyHistoryState();
    }
}

// تابع برای رندر کردن لیست تاریخچه
export function renderUploadHistory(files) {
    const container = document.getElementById('upload-history-container');
    
    if (!container) return;

    if (!files || files.length === 0) {
        showEmptyHistoryState();
        return;
    }

    let historyHTML = '';

    files.forEach(file => {
        const uploadDate = file.uploadedat ? formatDate(file.uploadedat) : 'نامشخص';
        const fileSize = file.filesize ? formatFileSize(file.filesize) : 'نامشخص';
        const statusClass = file.errormessage ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
        const statusText = file.errormessage ? 'ناموفق' : 'موفق';
        const statusIcon = file.errormessage ? 'error' : 'check_circle';
        
        historyHTML += `
            <div class="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-4 mb-3 border border-gray-200">
                <div class="flex items-center justify-between">
                    <!-- اطلاعات فایل -->
                    <div class="flex items-center flex-1">
                        <div class="bg-purple-50 p-3 rounded-lg ml-4">
                            <i class="material-icons text-purple-600">description</i>
                        </div>
                        <div class="flex-1">
                            <h4 class="font-semibold text-gray-800 mb-1">${file.filename || 'بدون نام'}</h4>
                            <div class="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                <span class="flex items-center">
                                    <i class="material-icons text-xs ml-1">storage</i>
                                    ${fileSize}
                                </span>
                                <span class="flex items-center">
                                    <i class="material-icons text-xs ml-1">schedule</i>
                                    ${uploadDate}
                                </span>
                                <span class="flex items-center">
                                    <i class="material-icons text-xs ml-1">person</i>
                                    ${file.uploadedby || 'نامشخص'}
                                </span>
                                ${file.branchname ? `
                                <span class="flex items-center">
                                    <i class="material-icons text-xs ml-1">business</i>
                                    ${file.branchname}
                                </span>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- وضعیت و دکمه‌ها -->
                    <div class="flex items-center gap-3">
                        <span class="px-3 py-1 ${statusClass} text-xs rounded-full flex items-center">
                            <i class="material-icons text-xs ml-1">${statusIcon}</i>
                            ${statusText}
                        </span>
                        
                        ${!file.errormessage ? `
                        <button 
                            onclick="exportUploadToExcel(${file.fileuploadid})" 
                            class="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg transition-colors duration-200 text-sm"
                            title="دانلود خروجی اکسل">
                            <i class="material-icons text-sm">download</i>
                            <span>نمایش</span>
                        </button>
                        ` : ''}
                    </div>
                </div>

                ${file.errormessage ? `
                <div class="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    <i class="material-icons text-xs ml-1">info</i>
                    ${file.errormessage}
                </div>
                ` : ''}
            </div>
        `;
    });

    container.innerHTML = historyHTML;
}

// تابع برای نمایش حالت خالی
function showEmptyHistoryState() {
    const container = document.getElementById('upload-history-container');
    if (container) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-gray-500">
                <i class="material-icons text-6xl mb-4 text-gray-300">folder_open</i>
                <p class="text-lg font-medium">هیچ آپلودی یافت نشد</p>
                <p class="text-sm mt-2">لیست تاریخچه آپلودهای شما خالی است</p>
            </div>
        `;
    }
}

// تابع برای رندر صفحه‌بندی
export function renderHistoryPagination(meta) {
    const paginationContainer = document.getElementById('history-pagination-container');
    
    if (!paginationContainer) return;

    if (!meta || !meta.page) {
        paginationContainer.innerHTML = '';
        return;
    }

    const pageNum = parseInt(meta.page.page_num) || 1;
    const pageSize = parseInt(meta.page.page_size) || historyPageSize;
    const totalCount = parseInt(meta.count) || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = `
        <div class="flex items-center justify-center gap-2 mt-6">
            <button 
                class="pagination-btn flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${pageNum === 1 ? 'opacity-50 cursor-not-allowed' : ''}" 
                ${pageNum === 1 ? 'disabled' : ''} 
                onclick="changeHistoryPage(${pageNum - 1})">
                <i class="material-icons text-sm">chevron_right</i>
                <span class="text-sm">قبلی</span>
            </button>

            <div class="flex items-center gap-1">
    `;

    // نمایش شماره صفحات
    const startPage = Math.max(1, pageNum - 2);
    const endPage = Math.min(totalPages, startPage + 4);

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button 
                class="pagination-btn px-3 py-2 border rounded-lg transition-colors ${i === pageNum ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300 hover:bg-gray-50'}" 
                onclick="changeHistoryPage(${i})">
                ${i}
            </button>
        `;
    }

    paginationHTML += `
            </div>

            <button 
                class="pagination-btn flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${pageNum === totalPages ? 'opacity-50 cursor-not-allowed' : ''}" 
                ${pageNum === totalPages ? 'disabled' : ''} 
                onclick="changeHistoryPage(${pageNum + 1})">
                <span class="text-sm">بعدی</span>
                <i class="material-icons text-sm">chevron_left</i>
            </button>
        </div>

        <div class="text-center text-sm text-gray-600 mt-3">
            صفحه ${pageNum} از ${totalPages} (مجموع ${formatNumber(totalCount)} آیتم)
        </div>
    `;

    paginationContainer.innerHTML = paginationHTML;
}

// تابع برای تغییر صفحه
window.changeHistoryPage = function(page) {
    currentHistoryPage = page;
    const branchFilter = document.getElementById('history-branch-filter');
    const selectedBranch = branchFilter ? branchFilter.value : null;
    loadUploadHistory(page, selectedBranch);
};

// تابع برای خروجی اکسل
window.exportUploadToExcel = async function(fileUploadId) {
    try {
        showNotification('در حال آماده‌سازی فایل اکسل...', 'info');

        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');

        if (!token) {
            showNotification('لطفاً ابتدا وارد سیستم شوید', 'error');
            return;
        }

        // دریافت تمام داده‌ها (بدون صفحه‌بندی)
        let allData = [];
        let currentPage = 1;
        let totalPages = 1;

        // دریافت صفحه اول برای بدست آوردن تعداد کل
        const firstPageUrl = `${apiBaseUrl}/api/v1/upload/uploaded/${fileUploadId}?page-number=1&page-size=100`;
        const firstResponse = await fetch(firstPageUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!firstResponse.ok) {
            throw new Error('خطا در دریافت اطلاعات فایل');
        }

        const firstData = await firstResponse.json();
        
        if (!firstData.meta.is_success) {
            throw new Error(firstData.meta.description || 'خطا در دریافت داده‌ها');
        }

        allData = allData.concat(firstData.data);
        const totalRecords = firstData.meta.total_records;
        totalPages = Math.ceil(totalRecords / 100);

        // دریافت بقیه صفحات
        for (let page = 2; page <= totalPages; page++) {
            const pageUrl = `${apiBaseUrl}/api/v1/upload/uploaded/${fileUploadId}?page-number=${page}&page-size=100`;
            const response = await fetch(pageUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.meta.is_success && data.data) {
                    allData = allData.concat(data.data);
                }
            }
        }

        if (allData.length === 0) {
            showNotification('هیچ داده‌ای برای خروجی یافت نشد', 'warning');
            return;
        }

        // تبدیل داده‌ها به فرمت اکسل
        const excelData = allData.map(row => ({
            'شماره تماس': row.phonenumber || '',
            'نام و نام خانوادگی': row.fullname || '',
            'کدملی': row.nationalcode || '',
            'خودرو درخواستی': row.requestedcar || '',
            'شعبه': row.branch || '',
            'کارشناس تماس گیرنده': row.callingagent || '',
            'آخرین تماس': row.lastcontactdate || '',
            'مراحل تغییر حالت': row.statuschangesteps || '',
            'وضعیت مشتری': row.customerstatus || '',
            'توضیحات 1': row.description1 || '',
            'توضیحات 2': row.description2 || '',
            'توضیحات 3': row.description3 || '',
            'پتانسیل مشتری شدن': row.potential || '',
            'راه ارتباطی با مجموعه': row.communicationchannel || '',
            'نام کمپین': row.campaignname || ''
        }));

        // ساخت فایل اکسل
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'داده‌های تماس');

        // تنظیم عرض ستون‌ها
        const columnWidths = [
            { wch: 15 },  // شماره تماس
            { wch: 25 },  // نام
            { wch: 15 },  // کدملی
            { wch: 20 },  // خودرو
            { wch: 15 },  // شعبه
            { wch: 20 },  // کارشناس
            { wch: 15 },  // تاریخ
            { wch: 20 },  // مراحل
            { wch: 30 },  // وضعیت
            { wch: 40 },  // توضیحات 1
            { wch: 40 },  // توضیحات 2
            { wch: 40 },  // توضیحات 3
            { wch: 10 },  // پتانسیل
            { wch: 20 },  // راه ارتباطی
            { wch: 15 }   // کمپین
        ];
        worksheet['!cols'] = columnWidths;

        // دانلود فایل
        const fileName = `upload_${fileUploadId}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);

        showNotification(`فایل اکسل با موفقیت دانلود شد (${formatNumber(allData.length)} رکورد)`, 'success');

    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showNotification('خطا در ساخت فایل اکسل: ' + error.message, 'error');
    }
};

// تابع برای بارگذاری شعبه‌ها در فیلتر
export async function loadBranchesForHistoryFilter() {
    try {
        const branchFilter = document.getElementById('history-branch-filter');
        
        if (!branchFilter) return;

        // بررسی نقش کاربر
        if (!currentState.user || currentState.user.userrolename !== 'admin') {
            branchFilter.classList.add('hidden');
            return;
        }

        branchFilter.classList.remove('hidden');

        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');

        const response = await fetch(`${apiBaseUrl}/api/v1/branch?page=1&status=active`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('خطا در دریافت لیست شعبه‌ها');
        }

        const data = await response.json();

        if (data.meta.is_success && data.data) {
            branchFilter.innerHTML = '<option value="all">همه شعبه‌ها</option>';
            
            data.data.forEach(branch => {
                const option = document.createElement('option');
                option.value = branch.branchid;
                option.textContent = branch.mainname;
                branchFilter.appendChild(option);
            });

            // افزودن event listener
            branchFilter.addEventListener('change', function() {
                currentHistoryPage = 1;
                loadUploadHistory(1, this.value === 'all' ? null : this.value);
            });
        }

    } catch (error) {
        console.error('Error loading branches:', error);
    }
}

// توابع کمکی
function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString) {
    if (!dateString) return 'نامشخص';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function formatNumber(num) {
    return new Intl.NumberFormat('fa-IR').format(num);
}

// تابع اصلی برای مقداردهی اولیه
export function initUploadHistory() {
    console.log('Upload history initialized');
    loadBranchesForHistoryFilter();
    loadUploadHistory(1);
}