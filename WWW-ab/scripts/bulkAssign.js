import { currentState } from './state.js';
import { showNotification } from './systemAdmin.js';
import { loadBranchesInLeads } from './leads.js';

function formatNumber(num) {
    return new Intl.NumberFormat('fa-IR').format(num);
}

// مجموعة الألوان لمربعات مختلفة
const BOX_COLORS = [
    { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', count: 'text-purple-700', icon: 'text-purple-600' },
    { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', count: 'text-blue-700', icon: 'text-blue-600' },
    { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', count: 'text-green-700', icon: 'text-green-600' },
    { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', count: 'text-orange-700', icon: 'text-orange-600' },
    { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', count: 'text-red-700', icon: 'text-red-600' },
    { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', count: 'text-indigo-700', icon: 'text-indigo-600' },
    { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', count: 'text-yellow-700', icon: 'text-yellow-600' }
];

// وظيفة لتلقي البيانات غير الضرورية من API
export async function fetchUnassignedNumbers(sourceId = '0') {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            throw new Error('الرجاء تسجيل الدخول أولا');
        }

        const response = await fetch(
            `${apiBaseUrl}/api/v1/phoneassignment/info/notassignment?sourceid=${sourceId}`, 
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`خطأ في تلقي البيانات: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.meta && data.meta.is_success) {
            return data.data || [];
        } else {
            throw new Error(data.meta?.description || 'خطأ في تلقي البيانات من الخادم');
        }
    } catch (error) {
        console.error('Error fetching unassigned numbers:', error);
        throw error;
    }
}

// وظيفة لإنشاء مربعات ديناميكية بناءً على البيانات API
export function createDynamicCountBoxes(data, selectedSourceId = '0') {
    const container = document.getElementById('dynamic-counts-container');
    if (!container) return;

    // مسح المحتوى السابق
    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center text-gray-500 py-4">
                <i class="material-icons text-4xl mb-2">info</i>
                <p>لم يتم العثور على بيانات </p>
            </div>
        `;
        return;
    }

    // إذا كانت كافة الموارد المحددة تظهر كافة المربعات
    const sourcesToShow = selectedSourceId === '0' 
        ? data 
        : data.filter(item => item.sourceid == selectedSourceId);

    if (sourcesToShow.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center text-gray-500 py-4">
                <i class="material-icons text-4xl mb-2">search_off</i>
                <p>لم يتم العثور على بيانات للمصدر المحدد </p>
            </div>
        `;
        return;
    }

    // إنشاء مربع لكل مصدر
    sourcesToShow.forEach((source, index) => {
        const colorIndex = index % BOX_COLORS.length;
        const color = BOX_COLORS[colorIndex];
        
        const box = document.createElement('div');
        box.className = `${color.bg} p-4 rounded-lg border ${color.border} transition-all duration-300 hover:shadow-md`;
        box.innerHTML = `
            <div class="flex items-center">
                <i class="material-icons ${color.icon} mr-2">source</i>
                <span class="text-sm ${color.text} font-medium">${source.sourcename || 'مصدر مجهول'}</span>
            </div>
            <div class="text-xl font-bold ${color.count} mt-2">${formatNumber(source.count || 0)}</div>
            <div class="text-xs ${color.text} opacity-75 mt-1">بطاقة تعريف: ${source.sourceid}</div>
        `;
        container.appendChild(box);
    });

    // إذا تم عرض كافة الموارد، أضف مربع الملخص الإجمالي
    if (selectedSourceId === '0') {
        const totalCount = data.reduce((sum, item) => sum + (item.count || 0), 0);
        const totalBox = document.createElement('div');
        totalBox.className = 'bg-gradient-to-r from-purple-500 to-indigo-500 p-4 rounded-lg text-white col-span-full md:col-span-2 lg:col-span-1';
        totalBox.innerHTML = `
            <div class="flex items-center">
                <i class="material-icons text-white mr-2">summarize</i>
                <span class="text-sm font-medium">مجموع الموارد كلها </span>
            </div>
            <div class="text-2xl font-bold mt-2">${formatNumber(totalCount)}</div>
            <div class="text-xs opacity-90 mt-1">إجمالي عدد الأرقام المخصصة </div>
        `;
        container.appendChild(totalBox);
    }
}

// وظيفة فتح تخصيص النموذج - نسخة معدلة
export async function openAssignmentModal(assignmentId = null) {
    const modal = document.getElementById('assignment-modal');
    const title = document.getElementById('assignment-modal-title');
    const form = document.getElementById('assignment-form');
    const branchSelect = document.getElementById('assignment-branch');

    // نتطلع إلى تحميل الفروع
    try {
        await loadBranchesInLeads(); // الآن مع await نحن ننتظر
    } catch (error) {
        console.error('خطأ في تحميل الفروع:', error);
        showNotification('حدث خطأ أثناء تحميل قائمة الفروع', 'error');
        return;
    }

    // يملأ dropdown الفروع
    branchSelect.innerHTML = '<option value="">اختيار الفرع...</option>';
    if (currentState.branches && Array.isArray(currentState.branches)) {
        currentState.branches.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch.branchid;
            option.textContent = branch.mainname;
            branchSelect.appendChild(option);
        });
    }

    if (assignmentId) {
        // --- وضع التحرير ---
        title.textContent = 'تحرير التخصيص';
        try {
            const apiBaseUrl = window.location.origin;
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${apiBaseUrl}/api/v1/phoneassignment/${assignmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('لم يتم العثور على المهمة المطلوبة.');
            
            const result = await response.json();
            const assignment = result.data;
            
            document.getElementById('assignment-id').value = assignment.assignmentid;
            document.getElementById('assignment-phone').value = assignment.phone || '';
            document.getElementById('assignment-username').value = assignment.username || '';
            branchSelect.value = assignment.branchid || '';
        } catch (error) {
            showNotification('خطأ في تلقي المعلومات لتحريرها: ' + error.message, 'error');
            return;
        }
    } else {
        // --- إضافة الوضع ----
        title.textContent = 'إضافة رقم جديد';
        form.reset();
        document.getElementById('assignment-id').value = '';
    }

    // عرض النموذج
    modal.classList.remove('hidden');

    // يضيف event listener لإغلاق المشروط
    setupModalCloseListeners();
}

// وظيفة لتعيين event listenerإغلاق النموذج
function setupModalCloseListeners() {
    const modal = document.getElementById('assignment-modal');
    const closeButtons = modal.querySelectorAll('.close-modal-btn');
    const cancelButton = modal.querySelector('button[type="button"]');
    
    // وظيفة إغلاق النموذج
    const closeModal = () => {
        modal.classList.add('hidden');
    };

    // يضيف event listener لجميع أزرار الإغلاق
    closeButtons.forEach(button => {
        button.addEventListener('click', closeModal);
    });

    // أغلق النموذج بالنقر خارجًا منه
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    // إغلاق النموذج بالمفتاح Escape
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });

    // إذا كان هناك زر سحب منفصل
    if (cancelButton) {
        cancelButton.addEventListener('click', closeModal);
    }
}

// وظيفة لإدارة النموذج المشروط
function setupAssignmentFormListener() {
    const form = document.getElementById('assignment-form');
    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            await handleAssignmentFormSubmit();
        });
    }
}

// وظيفة إرسال النموذج
async function handleAssignmentFormSubmit() {
    try {
        const form = document.getElementById('assignment-form');
        const assignmentId = document.getElementById('assignment-id').value;
        const phone = document.getElementById('assignment-phone').value;
        const username = document.getElementById('assignment-username').value;
        const branchId = document.getElementById('assignment-branch').value;

        // تصديق
        if (!phone || !branchId) {
            showNotification('املأ حقول رقم التعبئة والفرع مطلوب', 'error');
            return;
        }

        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('الرجاء تسجيل الدخول أولا', 'error');
            return;
        }

        const requestData = {
            phone: phone,
            username: username || null,
            branchid: parseInt(branchId),
            sourcecollectingdataid: parseInt(3)
        };

        let url = `${apiBaseUrl}/api/v1/phoneassignment`;
        let method = 'POST';

        // إذا قمنا بالتحرير
        if (assignmentId) {
            url = `${apiBaseUrl}/api/v1/phoneassignment/${assignmentId}`;
            method = 'PUT';
            requestData.remove(sourcecollectingdataid)
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.meta?.description || `خطأ في ${assignmentId ? 'يحرر' : 'يضيف'} تكليف`);
        }

        const result = await response.json();
        
        if (result.meta && result.meta.is_success) {
            showNotification(result.meta.description || `التخصيص الناجح ${assignmentId ? 'يحرر' : 'يضيف'} أصبح`, 'success');
            
            // إغلاق النموذج
            document.getElementById('assignment-modal').classList.add('hidden');
            
            // تحديث البيانات
            await loadBulkAssignmentData();
        } else {
            throw new Error(result.meta?.description || `خطأ في ${assignmentId ? 'يحرر' : 'يضيف'} تكليف`);
        }

    } catch (error) {
        console.error('Error submitting assignment form:', error);
        showNotification(error.message, 'error');
    }
}


// الوظيفة الرئيسية لتحديث الصناديق
export async function updateUnassignedCountsBoxes(sourceId = '0') {
    try {
        const data = await fetchUnassignedNumbers(sourceId);
        currentState.unassignedNumbers = data; // حفظ البيانات في state
        createDynamicCountBoxes(data, sourceId);
    } catch (error) {
        console.error('Error updating counts boxes:', error);
        showErrorState();
    }
}

// وظيفة لعرض وضع الخطأ
function showErrorState() {
    const container = document.getElementById('dynamic-counts-container');
    if (container) {
        container.innerHTML = `
            <div class="col-span-full text-center text-red-500 py-4">
                <i class="material-icons text-4xl mb-2">error</i>
                <p>خطأ في تحميل البيانات </p>
                <button onclick="window.updateUnassignedCountsBoxesRetry()" class="text-blue-500 hover:text-blue-700 mt-2">
                    <i class="material-icons text-sm mr-1">refresh</i>
                    إعادة المحاولة
                </button>
            </div>
        `;
    }
}

// وظيفة لملء dropdown موارد
export async function populateSourceFilter() {
    try {
        await loadBranchesForBulkAssignment();
        const data = await fetchUnassignedNumbers('0');
        const sourceFilter = document.getElementById('source-filter');
        
        if (!sourceFilter || !data) return;
        
        // احفظ القيمة الحالية
        const currentValue = sourceFilter.value;
        
        // مسح وإعادة ملء
        sourceFilter.innerHTML = '<option value="0">جميع الموارد </option>';
        
        data.forEach(source => {
            if (source.sourceid && source.sourcename) {
                const option = document.createElement('option');
                option.value = source.sourceid;
                option.textContent = `${source.sourcename} (${formatNumber(source.count)})`;
                sourceFilter.appendChild(option);
            }
        });
        
        // استعادة القيمة السابقة إذا كان هناك
        if (currentValue && Array.from(sourceFilter.options).some(opt => opt.value === currentValue)) {
            sourceFilter.value = currentValue;
        }
        
    } catch (error) {
        console.error('Error populating source filter:', error);
    }
}

// وظيفة لإدارة تغيير الموارد
export function setupSourceFilterListener() {
    const sourceFilter = document.getElementById('source-filter');
    
    if (sourceFilter) {
        sourceFilter.addEventListener('change', async function(e) {
            const selectedSourceId = e.target.value;
            await updateUnassignedCountsBoxes(selectedSourceId);
            await updateAssignmentSummary(selectedSourceId);
        });
    }
}

export async function loadBulkAssignmentData() {
    try {
        // وضع التحميل
        showLoadingState();
        
        // تحميل البيانات الموازية
        await Promise.all([
            populateSourceFilter(),
            updateUnassignedCountsBoxes('0'),
            updateAssignmentSummary('0')
        ]);
        
    } catch (error) {
        console.error('Error loading bulk assignment data:', error);
        showNotification('حدث خطأ أثناء تحميل بيانات تخصيص البيانات', 'error');
    }
}

// وظيفة لعرض وضع Ludding
function showLoadingState() {
    const container = document.getElementById('dynamic-counts-container');
    if (container) {
        container.innerHTML = `
            <div class="col-span-full text-center text-gray-500 py-8">
                <div class="spinner"></div>
                <p class="mt-2">جارٍ تحميل البيانات...</p>
            </div>
        `;
    }
}

// وظيفة global لإصلاح المشكلة onclick
window.updateUnassignedCountsBoxesRetry = function() {
    updateUnassignedCountsBoxes('0');
};

// وظيفة لتلقي ملخص لتعيينات الفرع
export async function fetchBranchAssignmentSummary(sourceId = '0') {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            throw new Error('الرجاء تسجيل الدخول أولا');
        }

        const response = await fetch(
            `${apiBaseUrl}/api/v1/phoneassignment/info/branchassignment?sourceid=${sourceId}`, 
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`خطأ في تلقي البيانات: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.meta && data.meta.is_success) {
            return data.data || [];
        } else {
            throw new Error(data.meta?.description || 'خطأ في تلقي البيانات من الخادم');
        }
    } catch (error) {
        console.error('Error fetching branch assignment summary:', error);
        throw error;
    }
}

// وظيفة لإنشاء بطاقات ملخصة للمهام
export function createAssignmentSummaryCards(data) {
    const summaryContainer = document.getElementById('assignment-summary');
    if (!summaryContainer) return;

    // مسح المحتوى السابق
    summaryContainer.innerHTML = '';

    if (!data || data.length === 0) {
        summaryContainer.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="material-icons text-4xl mb-2">assignment</i>
                <p>لا توجد بيانات لعرضها </p>
            </div>
        `;
        return;
    }

    // احسب المجموعات العامة
    const totals = {
        totalAssigned: data.reduce((sum, item) => sum + (item.totalassigned || 0), 0),
        assignedLastHour: data.reduce((sum, item) => sum + (item.assignedlasthour || 0), 0),
        calledCount: data.reduce((sum, item) => sum + (item.calledcount || 0), 0),
        notCalledCount: data.reduce((sum, item) => sum + (item.notcalledcount || 0), 0)
    };

    // إنشاء بطاقة تلخيصية
    const overallCard = document.createElement('div');
    overallCard.className = 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl p-6 mb-6 shadow-lg';
    overallCard.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">ملخص توزيع المهام </h3>
            <i class="material-icons text-2xl">summarize</i>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center">
                <div class="text-2xl font-bold">${formatNumber(totals.totalAssigned)}</div>
                <div class="text-sm opacity-90">إجمالي التخصيص </div>
            </div>
            <div class="text-center">
                <div class="text-2xl font-bold">${formatNumber(totals.assignedLastHour)}</div>
                <div class="text-sm opacity-90">تخصيص الساعة الماضية </div>
            </div>
            <div class="text-center">
                <div class="text-2xl font-bold">${formatNumber(totals.calledCount)}</div>
                <div class="text-sm opacity-90">مُسَمًّى</div>
            </div>
            <div class="text-center">
                <div class="text-2xl font-bold">${formatNumber(totals.notCalledCount)}</div>
                <div class="text-sm opacity-90">لم يتم الاتصال </div>
            </div>
        </div>
    `;
    summaryContainer.appendChild(overallCard);

    // إنشاء بطاقة لكل فرع
    data.forEach(branch => {
        const completionRate = branch.totalassigned > 0 
            ? Math.round((branch.calledcount / branch.totalassigned) * 100) 
            : 0;

        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl shadow-md p-5 mb-4 border-l-4 border-purple-500 hover:shadow-lg transition-shadow duration-300';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <h4 class="font-semibold text-gray-800 text-lg">${branch.branchname || 'لا اسم'}</h4>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div class="text-center p-3 bg-blue-50 rounded-lg">
                    <div class="text-blue-600 font-bold text-xl">${formatNumber(branch.totalassigned || 0)}</div>
                    <div class="text-blue-800 text-xs mt-1">إجمالي التخصيص </div>
                </div>
                <div class="text-center p-3 bg-green-50 rounded-lg">
                    <div class="text-green-600 font-bold text-xl">${formatNumber(branch.assignedlasthour || 0)}</div>
                    <div class="text-green-800 text-xs mt-1">تخصيص الساعة الماضية </div>
                </div>
                <div class="text-center p-3 bg-emerald-50 rounded-lg">
                    <div class="text-emerald-600 font-bold text-xl">${formatNumber(branch.calledcount || 0)}</div>
                    <div class="text-emerald-800 text-xs mt-1">مُسَمًّى</div>
                </div>
                <div class="text-center p-3 bg-amber-50 rounded-lg">
                    <div class="text-amber-600 font-bold text-xl">${formatNumber(branch.notcalledcount || 0)}</div>
                    <div class="text-amber-800 text-xs mt-1">لم يتم الاتصال </div>
                </div>
            </div>
            
            <div class="flex items-center justify-between text-sm text-gray-600">
                <span>معدلات إتمام المكالمات: </span>
                <span class="font-semibold ${completionRate >= 80 ? 'text-green-600' : completionRate >= 50 ? 'text-yellow-600' : 'text-red-600'}">
                    ${completionRate}%
                </span>
            </div>
            
            ${branch.totalassigned > 0 ? `
            <div class="mt-2 bg-gray-200 rounded-full h-2">
                <div class="bg-purple-500 h-2 rounded-full transition-all duration-500" 
                     style="width: ${completionRate}%"></div>
            </div>
            ` : ''}
        `;
        summaryContainer.appendChild(card);
    });
}

// الوظيفة الرئيسية لتحديث المهام
export async function updateAssignmentSummary(sourceId = '0') {
    try {
        const data = await fetchBranchAssignmentSummary(sourceId);
        createAssignmentSummaryCards(data);
    } catch (error) {
        console.error('Error updating assignment summary:', error);
        showErrorStateSummary();
    }
}

// وظيفة لعرض وضع الخطأ في الواجبات الموجزة
function showErrorStateSummary() {
    const summaryContainer = document.getElementById('assignment-summary');
    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div class="text-center text-red-500 py-8">
                <i class="material-icons text-4xl mb-2">error</i>
                <p>خطأ في تحميل بيانات ملخص المهام </p>
                <button onclick="window.updateAssignmentSummaryRetry()" class="text-blue-500 hover:text-blue-700 mt-2 flex items-center justify-center mx-auto">
                    <i class="material-icons text-sm ml-1">refresh</i>
                    إعادة المحاولة
                </button>
            </div>
        `;
    }
}

// وظيفة global لإصلاح المشكلة onclick
window.updateAssignmentSummaryRetry = function() {
    const sourceFilter = document.getElementById('source-filter');
    const sourceId = sourceFilter ? sourceFilter.value : '0';
    updateAssignmentSummary(sourceId);
};

// تحميل الفروع لتخصيص المجموعة
export async function loadBranchesForBulkAssignment() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('الرجاء تسجيل الدخول أولا', 'error');
            return;
        }

        // استلام بيانات الفرع من API
        const response = await fetch(`${apiBaseUrl}/api/v1/branch?page=1&status=active`, {
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            }
        });

        if (!response.ok) {
            throw new Error(`خطأ في استلام الفروع: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.meta.is_success || !data.data || !Array.isArray(data.data)) {
            throw new Error('بنية البيانات المستلمة غير صالحة');
        }

        const branches = data.data;
        const tbody = document.getElementById('branches-table-body');
        
        if (tbody) {
            tbody.innerHTML = '';
            
            branches.forEach(branch => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50 transition-colors';
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        <div class="font-medium">${branch.mainname || 'لا اسم'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            ${branch.assignedCount || 0}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-center">
                        <input type="number" min="0" 
                               class="assignment-count-input w-24 px-3 py-2 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
                               data-branch-id="${branch.branchid}"
                               data-branch-name="${branch.mainname}"
                               value="0"
                               oninput="validateAssignmentInput(this)">
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                        <button class="text-red-600 hover:text-red-900 clear-branch-btn p-1 rounded-full hover:bg-red-50 transition-colors" 
                                data-branch-id="${branch.branchid}"
                                title="مسح المهمة">
                            <i class="material-icons text-base">clear</i>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            // أضف الحدث إلى أزرار المسح
            document.querySelectorAll('.clear-branch-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const branchId = this.getAttribute('data-branch-id');
                    const branchName = this.closest('tr').querySelector('td:first-child .font-medium').textContent;
                    clearBranchAssignment(branchId, branchName);
                });
            });
            
            // أضف الحدث إلى حقول الأرقام
            document.querySelectorAll('.assignment-count-input').forEach(input => {
                input.addEventListener('input', updateTotalRequestedCount);
                input.addEventListener('change', updateAssignmentSummary);
            });
            
            updateTotalRequestedCount();
            updateAssignmentSummary();
        }
    } catch (error) {
        console.error('Error loading branches:', error);
        showNotification('خطأ في تحميل قائمة الفروع: ' + error.message, 'error');
        
        // عرض وضع الخطأ في الجدول
        const tbody = document.getElementById('branches-table-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-8 text-center text-red-500">
                        <i class="material-icons text-4xl mb-2">error</i>
                        <div>خطأ في تحميل البيانات </div>
                        <button onclick="loadBranchesForBulkAssignment()" class="mt-2 text-blue-600 hover:text-blue-800 flex items-center justify-center mx-auto">
                            <i class="material-icons text-sm ml-1">refresh</i>
                            إعادة المحاولة
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

// وظيفة للتحقق من صحة المدخلات لعدد المهام
export function validateAssignmentInput(input) {
    const value = parseInt(input.value);
    if (value < 0) {
        input.value = 0;
    }
    
    // تحديث الملخص عند الكتابة
    updateTotalRequestedCount();
}

// وظيفة global لإصلاح المشكلة onclick
window.loadBranchesForBulkAssignment = loadBranchesForBulkAssignment;

// وظيفة لمسح مهمة فرع معين
export function clearBranchAssignment(branchId) {
    const input = document.querySelector(`.assignment-count-input[data-branch-id="${branchId}"]`);
    if (input) {
        const branchName = input.closest('tr').querySelector('td:first-child').textContent;
        input.value = 0;
        updateTotalRequestedCount();
        updateAssignmentSummary();
        showNotification(`تخصيص الفروع ${branchName} تم مسحه`, 'info');
    }
}

// وظيفة لتحديث العدد الإجمالي للطلب
export function updateTotalRequestedCount() {
    let total = 0;
    document.querySelectorAll('.assignment-count-input').forEach(input => {
        total += parseInt(input.value) || 0;
    });
}

// وظيفة للتوزيع المتساوي بين الفروع
export function distributeEqually() {
    try {
        const sourceFilter = document.getElementById('source-filter');
        const sourceId = sourceFilter ? sourceFilter.value : '0';
        
        if (!currentState.unassignedNumbers || currentState.unassignedNumbers.length === 0) {
            showNotification('يرجى الانتظار حتى يتم تحميل البيانات.', 'warning');
            return;
        }

        const totalUnassigned = getTotalUnassignedCount(sourceId);
        
        if (totalUnassigned === 0) {
            showNotification('لا يوجد رقم للتخصيص.', 'warning');
            return;
        }

        const inputs = document.querySelectorAll('.assignment-count-input');
        if (inputs.length === 0) {
            showNotification('لا يوجد فرع للتخصيص.', 'warning');
            return;
        }

        // احسب العدد المتساوي لكل فرع
        const equalCount = Math.floor(totalUnassigned / inputs.length);
        const remainder = totalUnassigned % inputs.length;
        
        // تخصيص ما يعادل المتبقية
        inputs.forEach((input, index) => {
            const count = index < remainder ? equalCount + 1 : equalCount;
            input.value = count;
        });

        updateTotalRequestedCount();
        updateAssignmentSummary();
        
        showNotification(`رقم ${formatNumber(totalUnassigned)} العدد متساوي بين ${inputs.length} تم تخصيص الفرع .`, 'success');
        
    } catch (error) {
        console.error('Error in equal distribution:', error);
        showNotification('خطأ في التوزيع المتساوي: ' + error.message, 'error');
    }
}

function getTotalUnassignedCount(sourceId = '0') {
    if (!currentState.unassignedNumbers) return 0;
    
    if (sourceId === '0') {
        // مجموع جميع الموارد
        return currentState.unassignedNumbers.reduce((sum, item) => sum + (item.count || 0), 0);
    } else {
        // المصدر المحدد فقط
        const source = currentState.unassignedNumbers.find(item => item.sourceid == sourceId);
        return source ? source.count || 0 : 0;
    }
}


// وظيفة لمسح جميع المهام
export function clearAllAssignments() {
    document.querySelectorAll('.assignment-count-input').forEach(input => {
        input.value = 0;
    });
    
    updateTotalRequestedCount();
    updateAssignmentSummary();
    showNotification('تم تنظيف جميع التخصيصات', 'info');
}

// وظيفة لتلقي اسم الفرع على أساس ID
function getBranchName(branchId) {
    if (!currentState.branches || !Array.isArray(currentState.branches)) {
        return `فرع ${branchId}`;
    }
    
    const branch = currentState.branches.find(b => b.branchid === branchId);
    return branch ? branch.mainname : `فرع ${branchId}`;
}

// إضافة وظائف global لإصلاح المشكلة onclick
window.distributeEqually = distributeEqually;
window.saveAssignments = saveAssignments;

// وظيفة لتخزين المهام
export async function saveAssignments() {
    try {
        // يجمع branch_ids و counts
        const branchIds = [];
        const counts = [];
        
        const inputs = document.querySelectorAll('.assignment-count-input');
        inputs.forEach(input => {
            const branchId = input.getAttribute('data-branch-id');
            const count = parseInt(input.value) || 0;
            
            if (count > 0) {
                branchIds.push(parseInt(branchId));
                counts.push(count);
            }
        });

        if (branchIds.length === 0) {
            showNotification('لا توجد مهمة للحفظ.', 'warning');
            return;
        }

        // عزيمة source_id
        const sourceFilter = document.getElementById('source-filter');
        const sourceId = sourceFilter ? parseInt(sourceFilter.value) : 0;

        // عمل بيانات الطلب
        const requestData = {
            branch_ids: branchIds,
            counts: counts,
            source_id: sourceId
        };

        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('الرجاء تسجيل الدخول أولا.', 'error');
            return;
        }

        // عرض حالة المعالجة
        const saveBtn = document.getElementById('save-assignments-btn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="material-icons mr-2 animate-spin">refresh</i>يحفظ ...';
        saveBtn.disabled = true;

        const response = await fetch(`${apiBaseUrl}/api/v1/phoneassignment/assign_phones_to_branches`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        // استعادة وضع الزر إلى الوضع الأول
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.meta?.description || `خطأ في حفظ الواجبات: ${response.status}`);
        }

        const responseData = await response.json();
        
        if (responseData.meta && responseData.meta.is_success) {
            // عرض تقرير التعيين
            showAssignmentReport(responseData.data.report);
            
            // تحديث البيانات
            const currentSourceId = sourceFilter ? sourceFilter.value : '0';
            await updateUnassignedCountsBoxes(currentSourceId);
            await updateAssignmentSummary(currentSourceId);
            
            showNotification(responseData.meta.description, 'success');
        } else {
            throw new Error(responseData.meta?.description || 'خطأ في مهام التخزين');
        }
        
    } catch (error) {
        console.error('Error saving assignments:', error);
        showNotification(error.message, 'error');
        
        // استعادة وضع الزر في حالة حدوث خطأ
        const saveBtn = document.getElementById('save-assignments-btn');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="material-icons mr-2">save</i>تخزين التخصيص';
            saveBtn.disabled = false;
        }
    }
}

// وظيفة لعرض تقرير المهمة
export function showAssignmentReport(report) {
    if (!report || report.length === 0) return;

    const modalHtml = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-xl shadow-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden">
                <div class="flex justify-between items-center p-6 border-b">
                    <h3 class="text-lg font-semibold">تقرير تخصيصات الأرقام </h3>
                    <button id="close-report-modal" class="text-gray-500 hover:text-gray-700">
                        <i class="material-icons">close</i>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto max-h-[65vh]">
                    <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div class="flex items-center">
                            <i class="material-icons text-green-600 ml-2">check_circle</i>
                            <span class="text-green-800 font-medium">تم التخصيص بنجاح </span>
                        </div>
                    </div>
                    
                    <div class="overflow-x-auto">
                        <table class="min-w-full border border-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="py-3 px-4 border-b text-right">فرع </th>
                                    <th class="py-3 px-4 border-b text-center">مطلوب </th>
                                    <th class="py-3 px-4 border-b text-center">المخصصة </th>
                                    <th class="py-3 px-4 border-b text-center">الحالة </th>
                                </tr>
                            </thead>
                            <tbody>
                                ${report.map(item => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="py-3 px-4 border-b text-right">${getBranchName(item.BranchID)}</td>
                                        <td class="py-3 px-4 border-b text-center">${formatNumber(item.Requested)}</td>
                                        <td class="py-3 px-4 border-b text-center">${formatNumber(item.Assigned)}</td>
                                        <td class="py-3 px-4 border-b text-center">
                                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                item.Requested === item.Assigned ? 
                                                'bg-green-100 text-green-800' : 
                                                'bg-yellow-100 text-yellow-800'
                                            }">
                                                ${item.Requested === item.Assigned ? 'مكتمل' : 'غير كامل'}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="mt-4 grid grid-cols-2 gap-4 text-sm">
                        <div class="text-center p-3 bg-blue-50 rounded-lg">
                            <div class="text-blue-600 font-bold">${formatNumber(report.reduce((sum, item) => sum + item.Requested, 0))}</div>
                            <div class="text-blue-800">الجمع المطلوب </div>
                        </div>
                        <div class="text-center p-3 bg-green-50 rounded-lg">
                            <div class="text-green-600 font-bold">${formatNumber(report.reduce((sum, item) => sum + item.Assigned, 0))}</div>
                            <div class="text-green-800">قطعة الأرض المخصصة </div>
                        </div>
                    </div>
                </div>
                <div class="flex justify-end p-6 border-t pb-4">
                    <button id="confirm-report-modal" class="bg-purple-600 text-white mb-4 px-6 py-2 rounded-md hover:bg-purple-700">
                        لقد فهمت
                    </button>
                </div>
            </div>
        </div>
    `;

    // إضافة مشروط إلى الصفحة
    const existingModal = document.getElementById('assignment-report-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modalContainer = document.createElement('div');
    modalContainer.id = 'assignment-report-modal';
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);

    // يضيف event listeners
    document.getElementById('close-report-modal').addEventListener('click', closeReportModal);
    document.getElementById('confirm-report-modal').addEventListener('click', closeReportModal);
    
    // أغلق النموذج بالنقر خارجًا منه
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            closeReportModal();
        }
    });
}

function closeReportModal() {
    const modal = document.getElementById('assignment-report-modal');
    if (modal) {
        modal.remove();
    }
}

// وظيفة لاستعادة المهام
export async function undoAssignments() {
    try {
        const sourceFilter = document.getElementById('source-filter');
        const sourceId = sourceFilter ? parseInt(sourceFilter.value) : 0;

        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('الرجاء تسجيل الدخول أولا.', 'error');
            return;
        }

        // عرض حالة المعالجة
        const undoBtn = document.getElementById('undo-assignments-btn');
        const originalText = undoBtn.innerHTML;
        undoBtn.innerHTML = '<i class="material-icons mr-2 animate-spin">refresh</i>جارٍ الاسترداد...';
        undoBtn.disabled = true;

        const response = await fetch(
            `${apiBaseUrl}/api/v1/phoneassignment/undo_assign_phones_from_branches?source_id=${sourceId}`, 
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // استعادة وضع الزر إلى الوضع الأول
        undoBtn.innerHTML = originalText;
        undoBtn.disabled = false;

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.meta?.description || `خطأ في استرجاع المهام: ${response.status}`);
        }

        const responseData = await response.json();
        
        if (responseData.meta && responseData.meta.is_success) {
            const data = responseData.data;

            if (data.has_changes) {
                // عرض تقرير التعيين
                showAssignmentReport(data.report);

                // تحديث البيانات
                const currentSourceId = sourceFilter ? sourceFilter.value : '0';
                await updateUnassignedCountsBoxes(currentSourceId);
                await updateAssignmentSummary(currentSourceId);

                showNotification('تمت عمليات التخصيص.', 'success');
            } else {
                // لا يوجد تغيير في الساعة الماضية
                showNotification(data.message || 'لا يوجد تغيير لاستعادة.', 'info');
            }
        } else {
            throw new Error(responseData.meta?.description || 'حدث خطأ أثناء استرداد المهام');
        }
        
    } catch (error) {
        console.error('Error undoing assignments:', error);
        showNotification(error.message, 'error');
        
        // استعادة وضع الزر في حالة حدوث خطأ
        const undoBtn = document.getElementById('undoAssignmentsBtn');
        if (undoBtn) {
            undoBtn.innerHTML = '<i class="material-icons mr-2">undo</i>استعادة الأرقام';
            undoBtn.disabled = false;
        }
    }
}

export function initBulkAssignPage() {
    console.log("Bulk assign numbers page initialized");
    
    // تعيين event listeners
    setupSourceFilterListener();
    setupAssignmentFormListener(); // أضف هذا السطر
    
    // توصيل الوظائف بالأزرار
    const equalDistBtn = document.getElementById('equal-distribution-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const saveAssignmentsBtn = document.getElementById('save-assignments-btn');
    const undoAssignmentsBtn = document.getElementById('undo-assignments-btn');
    const addAssignmentBtn = document.getElementById('add-assignment-btn');
    
    if (equalDistBtn) {
        equalDistBtn.addEventListener('click', distributeEqually);
    }
    
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllAssignments);
    }
    
    if (saveAssignmentsBtn) {
        saveAssignmentsBtn.addEventListener('click', saveAssignments);
    }

    if (undoAssignmentsBtn){
        undoAssignmentsBtn.addEventListener('click', undoAssignments);
    }

    if (addAssignmentBtn) {
        if (currentState.user && currentState.user.userrolename === 'admin') {
            addAssignmentBtn.classList.remove('hidden');
            addAssignmentBtn.addEventListener('click', () => openAssignmentModal());
        } else {
            addAssignmentBtn.classList.add('hidden');
        }  
    }

    // تحميل البيانات
    loadBulkAssignmentData();
}