import { renderFilesList, renderPagination} from './fileHandling.js';
import { currentState } from './state.js';
import { showNotification } from './systemAdmin.js';


// Maple من الأعمدة الفارسية إلى الإنجليزية (اختصار لثلاثة صغيرة)
const columnMap = {
    // الأعمدة المشتركة بين لوكانو و MVM
    "رقم العقد": "con",
    "تاريخ العقد": "cdt", 
    "تاريخ العقد": "cdg",
    "رقم الطلب": "rqn",
    "تاريخ الطلب": "rqd",
    "تاريخ الطلب": "rdg",
    "رقم العميل الوطني": "cni",
    "رمز العميل الوطني": "cni", // مقابل MVM
    "اسم العميل": "cnf",
    "اسم العميل": "cnf", // مقابل MVM
    "نوع العميل": "cty",
    "مقاطعة مقاطعة": "ccy",
    "مدينة المقاطعة": "ccy", // مقابل MVM
    "رمز الوكيل": "dcd",
    "اسم الممثل": "dnm",
    "المدينة التمثيلية": "dcy",
    "المحافظة التمثيلية": "dpr",
    "نوع السيارة": "vty",
    "لون السيارة": "vcl",
    "رمز اللون": "ccd",
    "الباب": "gtw",
    "منطقة": "reg",
    "رقم رخصة البيع": "sln",
    "وصف رخصة المبيعات": "sld",
    "وصف طريقة الدفع": "pmd",
    "تاريخ التسليم": "dld",
    "الموعد النهائي للتسليم": "dld", // مقابل MVM
    "تسليم التسليم": "ddd",
    "الهيكل ذو الرقم العاشر قابل للتخصيص": "acd",
    "الرقم العاشر من الهيكل": "acd", // مقابل MVM
    "رقم الهيكل": "chn",
    "شهر التسليم": "dlm",
    "رمز وكيل التسليم": "ddc",
    "اسم ممثل التسليم": "ddn",
    "مكان التسليم": "dll",
    "طراز السيارة": "vmd",
    "تسليم وثائق التسجيل": "rds",
    "تسليم وثائق الإنجاز": "fds",
    "عدم إصدار الفاتورة": "ins",
    "حالة عدم إصدار الفاتورة": "ins", // مقابل MVM
    "وثائق التحقق": "vds",
    "موقف الهيكل": "chs",
    "تاريخ التخصيص": "ald",
    "تاريخ التخصيص": "alg",
    "تاريخ الترقيم": "pld",
    "تاريخ الأرقام": "plg",
    "تاريخ الترقيم 1": "pl1",
    "تاريخ الوثيقة": "dmd",
    "حالة الوثيقة": "dms",
    "تاريخ التسليم الفعلي": "pdd",
    "رقم اللوحة": "pln",
    "تاريخ الانسحاب": "cnd",
    "حالة العقد": "cns",
    "نوع المبيعات": "sly",
    "تاريخ سداد العميل": "cpd",
    "تاريخ الانتهاء من الصندوق": "fpd",
    "تاريخ المحاسبة": "aad",
    "تاريخ تأكيد التأجير": "aad", // مقابل MVM
    "رمز طريقة الدفع": "pmc",
    "رقم الدعوة": "inv",
    "وقت التسجيل": "rts",
    "السعر المعتمد": "apr",
    "سعر السيارة": "apr", // مقابل MVM
    "نوع السعر": "prt",
    "قانون الضمان الوطني": "gni",
    "مقدار الخصم": "dma",
    "مجموع المبلغ الإجمالي المستلم": "tar",
    "نوع صيغة العقد": "cft",
    "ميثاق السلام الوطني": "ani",
    "حالة السلام": "ass",
    "الوضع الراهن": "cst",
    "الجهاز": "org",
    "رقم كارداكس": "knm",
    "تاريخ كارداكس": "kdt",
    "إلغاء في الليل": "cib",
    "إجمالي مبلغ الشيكات": "tca",
    "عدد الشيكات": "noc",
    "الجهاز 1": "org1",
    "المستخدم الذي أنشأه المنشئ": "rcu",
    "نوع الوثيقة": "dty",
    "عقد القائمة السوداء": "icb",
    "القائمة السوداء للعملاء": "icl",
    "شفرة البريد": "pcd",
    "آخر دعوة تم إصدارها": "lii",
    "الدعوة الأخيرة للأموال المكتملة": "lcp",
    "تاريخ التوقيع الأول": "fsd",
    "الموقع الأول": "fsg",
    "تاريخ التوقيع الثاني": "ssd",
    "الموقع الثاني": "ssg",
    "طلب العميل": "cob",
    "عدد الشيكات بعد البطاقات": "cca",
    "تاريخ الشهادة": "scd",
    "عنوان الوكيل": "dda",
    
    // أعمدة خاصة MVM
    "صف": "row",
    "ماركة": "brd",
    "استكمال الصندوق / تأكيد التأجير": "cmp",
    "الموعد النهائي للدعوة": "isd",
    "شركة مبيعات المجموعة": "csg",
    "المبلغ المدفوع مقدما": "ppd",
    "نوع التأجير": "lty",
    "كوكب المشتري الجنس": "gnd",
    "عمر العميل": "age",
    "حالة التأجير": "lst",
    "مدة الأقساط": "lpr",
    "عدد أيام العقد": "cdd",
    "اسم الضامن": "gnm",
    "البريد الإلكتروني للعميل": "eml",
    "المستندات المالية": "fnd",
    "رمز التتبع": "trc",
    "علامة تبويب الكلام": "shd",
    "التسليم في بام": "bmd",
    "بطاقة تعريف": "idc",
    "البطاقة الوطنية": "nid",
    "تقديم الرسالة التنظيمية": "orgd", // التغيير من org ل orgd لمنع التدخل
    "رقم الشهادة": "lic"
};

function normalizeKey(key) {
    return key ? key.replace(/_/g, ' ').trim() : '';
}

function detectContractType(headers, previewData, filename = '') {
    const lowerHeaders = headers.map(h => (h || '').toString().toLowerCase());
    
    // التحقيق في عينة البيانات في العمود 'نوع السيارة' أو 'ماركة'
    const carTypeColIndex = lowerHeaders.findIndex(h => 
        h.includes('نوع السيارة') || h.includes('طراز السيارة') || h.includes('نموذج') || h.includes('ماركة')
    );
    
    if (carTypeColIndex !== -1 && previewData && previewData.length > 0) {
        const sampleVal = (Object.values(previewData[0])[carTypeColIndex] || '').toString().toLowerCase();
        if (/لوكانو |locano|l7|لوكانو 7/.test(sampleVal)) return { type: 'locano', id: 1 };
        if (/mvm|إم في إم | امفم |arrizo|cbu/.test(sampleVal)) return { type: 'mvm', id: 2 };
    }

    // مراجعة رؤوس الكلمات الرئيسية المخصصة
    if (lowerHeaders.some(h => /لوكانو |locano|l7/.test(h))) return { type: 'locano', id: 1 };
    if (lowerHeaders.some(h => /mvm|إم في إم | إم في إم |arrizo|cbu/.test(h))) return { type: 'mvm', id: 2 };

    // تحقق من اسم الملف
    const lowerFilename = filename.toLowerCase();
    if (/locano|l7|لوكانو/.test(lowerFilename)) return { type: 'locano', id: 1 };
    if (/mvm|إم في إم | إم في إم/.test(lowerFilename)) return { type: 'mvm', id: 2 };

    // التحقق من بنية الرؤوس (MVM له رؤوس مختلفة)
    const mvmSpecificHeaders = ['ماركة', 'شركة مبيعات المجموعة', 'كوكب المشتري الجنس', 'عمر العميل', 'مدة الأقساط'];
    if (mvmSpecificHeaders.some(header => lowerHeaders.includes(header.toLowerCase()))) {
        return { type: 'mvm', id: 2 };
    }

    // مراجعة أعمدة Lucano المحددة
    const locanoSpecificHeaders = ['تاريخ العقد', 'تاريخ الطلب', 'شهر التسليم'];
    if (locanoSpecificHeaders.some(header => lowerHeaders.includes(header.toLowerCase()))) {
        return { type: 'locano', id: 1 };
    }

    return { type: 'unknown', id: 0 };
}

function showDetectedContractTypeUI(typeObj) {
    const container = document.getElementById('detected-contract-type');
    const textEl = document.getElementById('detected-contract-type-text');
    const badgeEl = document.getElementById('detected-contract-type-badge');
    if (!container || !textEl || !badgeEl) return;

    let displayText = 'مجهول';
    let badgeClass = 'bg-gray-100 text-gray-800';
    
    if (typeObj.type === 'locano') {
        displayText = 'لوكانو';
        badgeClass = 'bg-blue-100 text-blue-800';
    } else if (typeObj.type === 'mvm') {
        displayText = 'MVM';
        badgeClass = 'bg-green-100 text-green-800';
    } else {
        displayText = 'مجهول';
        badgeClass = 'bg-gray-100 text-gray-800';
    }

    textEl.textContent = displayText;
    badgeEl.className = `px-3 py-1 rounded-lg border ${badgeClass}`;
    container.classList.remove('hidden');
}

export function handleFileContract(file) {
    if (!file) return;

    const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!validTypes.includes(file.type)) {
        alert('الرجاء تحديد ملف Excel صالح (التنسيقات المعتمدة :.xlsx, .xls)');
        return;
    } else {
        currentState.currentExcel_FileName = file.name;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert('يجب ألا يتجاوز حجم الملف 10 ميغابايت');
        return;
    } else {
        currentState.currentExcel_FileSize = file.size;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        let rawData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: "",
            raw: false 
        });

        if (rawData.length <= 1) {
            alert("ملف Excel فارغ أو فقط header لقد.");
            return;
        }

        const headers = rawData[0].map(h => normalizeKey(h));
        const dataRows = rawData.slice(1);

        // يبني previewData لعرض والكشف عن النوع
        let previewData = dataRows.map((row, index) => {
            let previewRow = {};
            for (let i = 0; i < headers.length; i++) {
                previewRow[headers[i]] = String(row[i] || "");
            }
            return previewRow;
        }).filter(row => Object.values(row).some(val => val.trim() !== ""));

        // كشف نوع العقد
        const detected = detectContractType(headers, previewData.slice(0, 5), file.name);
        currentState.currentExcel_contractType = detected.type;
        currentState.currentExcel_contractTypeId = detected.id;

        // رسم خريطة headerباللغة الإنجليزية باستخدام map وحدة
        const englishHeaders = headers.map(persianHeader => {
            return columnMap[persianHeader] || persianHeader;
        });

        // يبني mappedData مع مفاتيح اللغة الإنجليزية
        let mappedData = dataRows.map(row => {
            let newRow = {};
            for (let i = 0; i < englishHeaders.length; i++) {
                newRow[englishHeaders[i]] = String(row[i] || "");
            }
            return newRow;
        }).filter(row => Object.values(row).some(val => val.trim() !== ""));

        if (mappedData.length === 0) {
            alert("لم يتم العثور على بيانات موثوقة في الملف.");
            return;
        }

        currentState.currentExcel_JSON = mappedData;

        showDetectedContractTypeUI(detected);
        displayPreview(previewData.slice(0, 10));
        document.getElementById('row-count').textContent = `إجمالي عدد الصفوف: ${mappedData.length}`;

        document.getElementById('file-preview').classList.remove('hidden');
        document.getElementById('upload-btn').classList.remove('hidden');
    };

    reader.readAsArrayBuffer(file);
}

// باقي الوظائف تبقى دون تغيير ...
export function displayPreview(data) {
    const thead = document.getElementById('preview-table-head');
    const tbody = document.getElementById('preview-table-body');

    tbody.innerHTML = '';
    thead.innerHTML = '';

    if (data.length === 0) return;

    let columns = Object.keys(data[0]).filter(col => col);

    let headerRow = `<th class="py-2 px-4 border-b">الصف </th>`;
    columns.forEach(col => {
        headerRow += `<th class="py-2 px-4 border-b text-center">${col}</th>`;
    });
    thead.innerHTML = `<tr>${headerRow}</tr>`;

    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

        let rowHtml = `<td class="py-2 px-4 border-b">${index + 1}</td>`;
        columns.forEach(col => {
            rowHtml += `<td class="py-2 px-4 border-b">${row[col] || '-'}</td>`;
        });

        tr.innerHTML = rowHtml;
        tbody.appendChild(tr);
    });
}

export async function uploadFileContract() {
    if (!currentState.currentExcel_JSON) {
        alert('لم يتم اختيار أي ملفات حسنة السمعة.');
        return;
    }

    const confirmModal = document.getElementById('confirm-upload-modal');
    confirmModal.classList.remove('hidden');

    return new Promise((resolve) => {
        document.getElementById('confirm-upload-btn').onclick = async () => {
            confirmModal.classList.add('hidden');
            
            const processingModal = document.getElementById('processing-modal');
            processingModal.classList.remove('hidden');
            
            const uploadBtn = document.getElementById('upload-btn');
            const uploadResultEl = document.getElementById('upload-result');

            uploadBtn.disabled = true;
            uploadBtn.classList.add('opacity-50', 'cursor-not-allowed');
            uploadResultEl.classList.add('hidden');

            try {
                const apiBaseUrl = window.location.origin;
                const url = `${apiBaseUrl}/api/v1/upload/contract/sheet`;
                const urlObject = new URL(url);
                urlObject.searchParams.append('filename', currentState.currentExcel_FileName);
                urlObject.searchParams.append('filesize', currentState.currentExcel_FileSize);

                // يرسل contract_type_id و contract_type
                const ctypeId = currentState.currentExcel_contractTypeId !== undefined ? currentState.currentExcel_contractTypeId : 0;
                const ctype = currentState.currentExcel_contractType || 'unknown';
                urlObject.searchParams.append('contract_type_id', String(ctypeId));
                urlObject.searchParams.append('contract_type', String(ctype));

                const response = await fetch(urlObject.toString(), {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${currentState.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(currentState.currentExcel_JSON)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || 'خطأ في تحميل الملف');
                }

                const result = await response.text();

                uploadResultEl.innerHTML = `
                    <div class="bg-green-50 text-green-700 p-3 rounded-lg">
                        <div class="flex items-center">
                            <i class="material-icons mr-2">check_circle</i>
                            <span>${result}</span>
                        </div>
                    </div>
                `;
                uploadResultEl.classList.remove('hidden');
                loadUploadedFilesContract();

            } catch (error) {
                console.error('Upload failed:', error);
                uploadResultEl.innerHTML = `
                    <div class="bg-red-50 text-red-700 p-3 rounded-lg">
                        <i class="material-icons mr-2">error</i>
                        <span>${error.message}</span>
                    </div>
                `;
                uploadResultEl.classList.remove('hidden');
            } finally {
                processingModal.classList.add('hidden');
                uploadBtn.disabled = false;
                uploadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                resolve();
            }
        };

        document.getElementById('confirm-upload-cancel').onclick = () => {
            confirmModal.classList.add('hidden');
            resolve();
        };
    });
}

export function addSingleContract() {
    // خلق مشروط في غياب الوجود
    createSingleContractModalIfNotExists();
    
    // عرض النموذج
    const modal = document.getElementById('single-contract-modal');
    modal.classList.remove('hidden');
    
    // قم بتعيين النموذج
    document.getElementById('single-contract-form').reset();
    document.getElementById('single-contract-result').classList.add('hidden');
}

function createSingleContractModalIfNotExists() {
    if (document.getElementById('single-contract-modal')) {
        return;
    }

    const modalHtml = `
        <div id="single-contract-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
            <div class="bg-white rounded-lg p-6 w-11/12 md:w-1/2 lg:w-1/3">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold">اضافة عقد بالكود الوطني </h3>
                    <button class="text-gray-500 hover:text-gray-700 close-single-contract-modal">
                        <i class="material-icons">close</i>
                    </button>
                </div>
                
                <form id="single-contract-form">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">رمز العميل الوطني *</label>
                        <input 
                            type="text" 
                            id="national-code-input" 
                            required 
                            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="مثال: 1234567890"
                            pattern="[0-9]{10}"
                            title="الرجاء إدخال رمز وطني صالح مكون من 10 أرقام"
                        >
                    </div>
                    
                    <div id="single-contract-result" class="mb-4 hidden"></div>
                    
                    <div class="flex justify-end space-x-2 rtl:space-x-reverse">
                        <button type="button" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 close-single-contract-modal">
                            الترشيح
                        </button>
                        <button type="submit" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center">
                            <i class="material-icons mr-1">add</i>
                            يضيف
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // يضيف event listeners
    const modal = document.getElementById('single-contract-modal');
    const closeBtn = modal.querySelector('.close-single-contract-modal');
    const form = document.getElementById('single-contract-form');

    // إغلاق النموذج
    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    // انقر خارج نطاق زميله
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    // أرسل النموذج
    form.addEventListener('submit', handleSingleContractSubmit);
}

async function handleSingleContractSubmit(e) {
    e.preventDefault();
    
    const nationalCode = document.getElementById('national-code-input').value.trim();
    const resultEl = document.getElementById('single-contract-result');
    
    // التحقق الأولي
    if (!nationalCode || !/^\d{10}$/.test(nationalCode)) {
        showNotification('الرجاء إدخال رمز وطني صالح مكون من 10 أرقام', 'error');
        return;
    }

    // عرض حالة المعالجة
    showNotification('البحث...', 'loading');

    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            throw new Error('الرجاء تسجيل الدخول أولا');
        }

        const response = await fetch(`${apiBaseUrl}/api/v1/contract/summary/${nationalCode}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.meta?.description || 'خطأ في تلقي معلومات العقد');
        }

        if (data.meta?.is_success) {
            showNotification(
                `تم إنشاء العقد بنجاح <br>
                 <strong>معرف العقد: </strong> ${data.data.id}<br>
                 <strong>الرسالة: </strong> ${data.meta.description}`,
                'success'
            );
            
            // مسح المجال بعد النجاح
            document.getElementById('national-code-input').value = '';
        } else {
            throw new Error(data.meta?.description || 'حدث خطأ أثناء إنشاء العقد');
        }

    } catch (error) {
        console.error('Error in single contract search:', error);
        showNotification(error.message || 'خطأ فيما يتعلق بالخادم', 'error');
    }
}

export function downloadSampleContractExcel() {
    const sampleData = [
        {
            "رقم العقد": "123456",
            "تاريخ العقد": "1403/06/19",
            "تاريخ العقد": "2025/09/10",
            "رقم الطلب": "15000001",
            "تاريخ الطلب": "1403/06/15",
            "تاريخ الطلب": "2025/09/06",
            "رقم العميل الوطني": "1234567890",
            "اسم العميل": "علي رضائي",
            "نوع العميل": "حقيقي",
            "مقاطعة مقاطعة": "طهران",
            "رمز الوكيل": "101",
            "اسم الممثل": "وكيل العينة",
            "المدينة التمثيلية": "طهران",
            "المحافظة التمثيلية": "طهران",
            "نوع السيارة": "لوكانو 7",
            "لون السيارة": "أبيض معدني",
            "رمز اللون": "W12",
            "الباب": "DEALER",
            "منطقة": "North",
            "رقم رخصة البيع": "INS.SAMPLE.1403.01.01",
            "وصف رخصة المبيعات": "بيع فوري سيارة لوكانو بالتقسيط L7 بنزين – موديل 1403 – السعر 29.500.000.000 – بنك العينة",
            "وصف طريقة الدفع": "بيع فوري سيارة لوكانو بالتقسيط L7 بنزين - موديل 1403 - السعر 29.500.000.000 - بنك العينة -60% - 24 شهر (12 شيك +1)",
            "تاريخ التسليم": "1403/08/19",
            "تسليم التسليم": "60",
            "الهيكل ذو الرقم العاشر قابل للتخصيص": "S",
            "رقم الهيكل": "123456789012345678",
            "شهر التسليم": "نوفمبر 1403",
            "رمز وكيل التسليم": "101",
            "اسم ممثل التسليم": "وكيل العينة",
            "مكان التسليم": "وكيل العينة",
            "طراز السيارة": "1403",
            "تسليم وثائق التسجيل": "تم التوصيل",
            "تسليم وثائق الإنجاز": "لم يتم إرسالها",
            "عدم إصدار الفاتورة": "عاجز",
            "وثائق التحقق": "تم التوصيل",
            "موقف الهيكل": "لم يتم تخصيصها",
            "تاريخ التخصيص": "1403/06/20",
            "تاريخ التخصيص": "2025/09/11",
            "تاريخ الترقيم": "1403/06/25",
            "تاريخ الأرقام": "2025/09/16",
            "تاريخ الترقيم 1": "2025/09/16",
            "تاريخ الوثيقة": "1403/06/30",
            "حالة الوثيقة": "الفشل في إصدار الوثيقة",
            "تاريخ التسليم الفعلي": "1403/07/01",
            "رقم اللوحة": "12AB345",
            "تاريخ الانسحاب": "",
            "حالة العقد": "نشيط",
            "نوع المبيعات": "بيع فوري، الدفع الأولي",
            "تاريخ سداد العميل": "1403/06/19",
            "تاريخ الانتهاء من الصندوق": "1403/08/19",
            "تاريخ المحاسبة": "1403/06/20",
            "رمز طريقة الدفع": "L7.60%.24M.SAMPLE",
            "رقم الدعوة": "",
            "وقت التسجيل": "2025/09/06 10:00:00 AM",
            "السعر المعتمد": "29500000000",
            "نوع السعر": "مؤكد",
            "قانون الضمان الوطني": "0987654321",
            "مقدار الخصم": "1000000",
            "مجموع المبلغ الإجمالي المستلم": "18300000000",
            "نوع صيغة العقد": "الشكل العام",
            "ميثاق السلام الوطني": "",
            "حالة السلام": "",
            "الوضع الراهن": "",
            "الجهاز": "",
            "رقم كارداكس": "",
            "تاريخ كارداكس": "",
            "إلغاء في الليل": "",
            "إجمالي مبلغ الشيكات": "11200000000",
            "عدد الشيكات": "12",
            "الجهاز 1": "",
            "المستخدم الذي أنشأه المنشئ": "admin",
            "نوع الوثيقة": "وثيقة في الرهون العقارية",
            "عقد القائمة السوداء": "لا",
            "القائمة السوداء للعملاء": "لا",
            "شفرة البريد": "1234567890",
            "آخر دعوة تم إصدارها": "",
            "الدعوة الأخيرة للأموال المكتملة": "",
            "تاريخ التوقيع الأول": "1403/06/19",
            "الموقع الأول": "علي رضائي",
            "تاريخ التوقيع الثاني": "1403/06/20",
            "الموقع الثاني": "مدير الوكيل",
            "طلب العميل": "0",
            "عدد الشيكات بعد البطاقات": "0",
            "تاريخ الشهادة": "",
            "عنوان الوكيل": "رقم 123، طهران، طهران، طهران"
        }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sample");
    XLSX.writeFile(workbook, "contract_sample_template.xlsx");
}

let currentPage = 1;
let currentSearchTerm = '';
const pageSize = 5;

export async function loadUploadedFilesContract() {
    const filesContainer = document.getElementById('files-container');
    const paginationContainer = document.getElementById('pagination-container');
    
    filesContainer.innerHTML = `
        <div class="loading">
            <i class="material-icons">hourglass_empty</i>
            <p>جاري تحميل الملفات ... </p>
        </div>
    `;
    paginationContainer.innerHTML = '';
    
    const apiBaseUrl = window.location.origin;
    const token = localStorage.getItem('authToken');
    
    const apiUrl = new URL(`${apiBaseUrl}/api/v1/contract-file-result`);
    apiUrl.searchParams.append('page', currentPage);
    if (currentSearchTerm) {
        apiUrl.searchParams.append('context', currentSearchTerm);
    }
    
    try {
        const response = await fetch(apiUrl.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('خطأ في تلقي المعلومات من الخادم');
        
        const data = await response.json();
        
        if (data.meta && data.meta.is_success) {
            renderFilesList(data.data);
            renderPagination(data.meta);
        } else {
            throw new Error(data.meta?.description || 'خطأ في تلقي المعلومات');
        }

    } catch (error) {
        console.error('Error loading files:', error);
        showNotification('خطأ في تلقي البيانات', 'error');
    }
}
