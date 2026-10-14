/**
 * CPP & CoPP WHO Form Generator - Application Logic
 * CPC1 Hà Nội
 */

// Form Template Database
const FORM_TEMPLATES = {
    1: {
        id: 1,
        name: "Mẫu số 1 (CPC1 HN)",
        companyName: "Công ty Cổ phần Dược phẩm CPC1 Hà Nội",
        headerLine1: "CÔNG TY CỔ PHẦN DƯỢC PHẨM",
        headerLine2: "CPC1 HÀ NỘI",
        dispatchSuffix: "/2026/CV-CPC1HN",
        address: "Cụm Công nghiệp Hà Bình Phương, xã Thường Tín, Hà Nội",
        phone: "0243.3765503",
        fax: "0243.33765504",
        // English CoPP info
        engLicenseHolder: "Ha Noi CPC1 Pharmaceutical Joint Stock Company",
        engAddress: "Ha Binh Phuong Industrial Zone, Thuong Tin Commune, Ha Noi City, Vietnam",
        engPhone: "+84.24.33765503",
        engFax: "+84.24.33765504",
        engStatus: "Manufacturer",
        engApplicant: ""
    },
    2: {
        id: 2,
        name: "Mẫu số 2 (Tân Thịnh)",
        companyName: "Công ty TNHH Dược phẩm Tân Thịnh",
        headerLine1: "CÔNG TY TNHH DƯỢC PHẨM",
        headerLine2: "TÂN THỊNH",
        dispatchSuffix: "/2026/CV-TT",
        address: "Số 9, ngõ 63, đường Vũ Trọng Phụng, phường Thanh Xuân Trung, quận Thanh Xuân, Hà Nội",
        phone: "0243.5400788",
        fax: "0243.5400785",
        // English CoPP info
        engLicenseHolder: "TAN THINH PHARMACEUTICAL COMPANY LIMITED",
        engAddress: "No. 9, Alley 63, Vu Trong Phung Street, Thanh Xuan Trung Ward, Thanh Xuan District, Ha Noi City, Vietnam",
        engPhone: "+84.24.3540 0788",
        engFax: "",
        engStatus: "Is involved in none of manufacture and package and/or label the dosage form",
        engApplicant: "Ha Noi CPC1 Pharmaceutical Joint Stock Company<br>Address: Ha Binh Phuong Industrial Zone, Thuong Tin Commune, Ha Noi City, Vietnam"
    },
    3: {
        id: 3,
        name: "Mẫu số 3 (VNP)",
        companyName: "Công ty TNHH Dược phẩm VNP",
        headerLine1: "CÔNG TY TNHH DƯỢC PHẨM",
        headerLine2: "VNP",
        dispatchSuffix: "/2026/CV-VNP",
        address: "Số 54, F3, Khu đô thị Đại Kim, Phường Đại Kim, Quận Hoàng Mai, Hà Nội",
        phone: "0243.36284737",
        fax: "0243.36284735",
        // English CoPP info
        engLicenseHolder: "VNP Pharmaceutical Company Limited",
        engAddress: "No. 54, F3, Dai Kim Metropolitan area, Dai Kim Ward, Hoang Mai District, Ha Noi City, Vietnam",
        engPhone: "+84.24.36284737",
        engFax: "",
        engStatus: "Is involved in none of manufacture and package and/or label the dosage form",
        engApplicant: "Ha Noi CPC1 Pharmaceutical Joint Stock Company<br>Address: Ha Binh Phuong Industrial Zone, Thuong Tin Commune, Ha Noi City, Vietnam"
    }
};

// Application State
const state = {
    products: [],
    selectedIndexes: new Set(),
    syncStatus: 'loading',
    docDate: new Date(),
    activeTab: 'don', // 'don' (VN Application), 'cpp' (EN CoPP WHO)
    activeFormId: 1, // Current Form 1/2/3
    selectedCoppIndex: null, // Index of product currently selected in the CoPP tab
    coppCustomFields: {
        certificateNo: '………./GP-QLD',
        importingCountry: 'Myanmar',
        exportingName: '',
        dosageFormEng: '',
        ingredientsEng: '',
        issueDate: '',
        expiryDate: ''
    },
    // (EXP tracking state removed - feature disabled)
};

const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQGaloSmXjm89UYR1o-3tgC6z_CfbUpwd-lnfAXfu64_wYnMVjObXwc5bnuoT7gIpqjvO0cXvpowiAF/pubhtml/sheet?headers=false&gid=392765265';

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

/**
 * Initialize the application
 */
async function initApp() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Set default date input
    const dateInput = document.getElementById('input-doc-date');
    const today = new Date();
    dateInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    state.docDate = today;

    // Load custom fields to inputs
    document.getElementById('input-cpp-no').value = state.coppCustomFields.certificateNo;
    document.getElementById('input-cpp-country').value = state.coppCustomFields.importingCountry;

    setupEventListeners();
    updatePrintOrientationStylesheet();
    await loadProductData();
}

/**
 * Load product data
 */
async function loadProductData() {
    updateSyncStatus('loading', 'Đang kết nối tới Google Sheet...');

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(SPREADSHEET_URL, { 
            signal: controller.signal,
            headers: { 'Cache-Control': 'no-cache' }
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const htmlText = await response.text();
        const parsedRows = parseHtmlTextToProducts(htmlText);

        if (parsedRows && parsedRows.length > 0) {
            state.products = parsedRows;
            updateSyncStatus('online', `Trực tuyến: Đồng bộ ${parsedRows.length} sản phẩm`);
            renderProductList(parsedRows);
            return;
        } else {
            throw new Error("Parsed zero products from live URL");
        }

    } catch (error) {
        console.warn('Live fetch failed, loading fallback data...', error);
        
        if (typeof FALLBACK_DATA !== 'undefined' && Array.isArray(FALLBACK_DATA)) {
            state.products = FALLBACK_DATA;
            updateSyncStatus('offline', `Ngoại tuyến: Đã nạp ${FALLBACK_DATA.length} sản phẩm từ bộ nhớ đệm`);
            renderProductList(FALLBACK_DATA);
        } else {
            updateSyncStatus('offline', 'Lỗi: Không thể tải dữ liệu. Hãy nhập thủ công.');
        }
    }
}

/**
 * Parse the Google Sheets HTML table structure into product objects
 */
function parseHtmlTextToProducts(htmlText) {
    const products = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const rows = doc.querySelectorAll('table.waffle tbody tr, table tr');
    
    let count = 0;
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 17) return;

        const getCellText = (cellIndex) => {
            if (!cells[cellIndex]) return '';
            let text = cells[cellIndex].innerHTML || '';
            const match = text.match(/<div class="softmerge-inner"[^>]*>(.*?)<\/div>/);
            if (match) text = match[1];
            
            text = text.replace(/<br\s*\/?>/gi, '\n');
            text = text.replace(/<[^>]+>/g, '');
            text = text
                .replace(/&amp;/g, '&')
                .replace(/&nbsp;/g, ' ')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"');
            return text.trim();
        };

        const ma_rd = getCellText(0);
        const name = getCellText(1);
        
        if (ma_rd === 'Ma RD' || name === 'Ten San Pham' || !name) return;

        products.push({
            index: ++count,
            ma_rd,
            name,
            type: getCellText(2),
            form: getCellText(3),
            ingredients: getCellText(4),
            concentration: getCellText(5),
            packing: getCellText(6),
            quality_standard: getCellText(7),
            storage: getCellText(8),
            shelf_life: getCellText(9),
            registrant: getCellText(10),       // Dang Ky (Registrant)
            manufacturer: getCellText(11),     // San Xuat (Manufacturer)
            registration_no: getCellText(13),  // So dang ky
            reg_issue_date: getCellText(14),   // Ngay Cap So DK
            reg_expiry_date: getCellText(16)   // HH So DK Hien Tai
        });
    });
    return products;
}

/**
 * Update sync status
 */
function updateSyncStatus(type, message) {
    state.syncStatus = type;
    const statusBox = document.getElementById('sync-status');
    const statusText = document.getElementById('sync-status-text');
    
    statusBox.className = 'sync-status';
    if (type === 'loading') statusBox.classList.add('status-loading');
    else if (type === 'online') statusBox.classList.add('status-online');
    else if (type === 'offline') statusBox.classList.add('status-fallback');
    
    statusText.innerText = message;
}

/**
 * Inject/update print layout margins dynamically when switching tabs
 */
function updatePrintOrientationStylesheet() {
    const styleTag = document.getElementById('print-orientation-style');
    if (!styleTag) return;
    
    if (state.activeTab === 'don') {
        styleTag.innerHTML = `
            @media print {
                @page {
                    size: A4 portrait !important;
                    margin: 20mm 15mm 20mm 20mm !important;
                }
            }
        `;
    } else {
        styleTag.innerHTML = `
            @media print {
                @page {
                    size: A4 landscape !important;
                    margin: 8mm 12mm 8mm 12mm !important;
                }
            }
        `;
    }
}

/**
 * Setup UI Event Listeners
 */
function setupEventListeners() {
    // Tabs click switching
    const tabBtnDon = document.getElementById('tab-btn-don');
    const tabBtnCpp = document.getElementById('tab-btn-cpp');
    const donContainer = document.getElementById('don-preview-container');
    const cppContainer = document.getElementById('cpp-preview-container');
    const coppCard = document.getElementById('copp-settings-card');
    const docPreview = document.getElementById('document-preview');

    tabBtnDon.addEventListener('click', () => {
        state.activeTab = 'don';
        tabBtnDon.classList.add('active');
        tabBtnCpp.classList.remove('active');
        donContainer.classList.remove('hidden');
        cppContainer.classList.add('hidden');
        coppCard.classList.add('hidden');
        
        // Remove landscape class
        docPreview.classList.remove('layout-landscape');
        document.body.classList.remove('print-landscape');
        
        updatePrintOrientationStylesheet();
        updateDocumentPreview();
    });

    tabBtnCpp.addEventListener('click', () => {
        state.activeTab = 'cpp';
        tabBtnDon.classList.remove('active');
        tabBtnCpp.classList.add('active');
        donContainer.classList.add('hidden');
        cppContainer.classList.remove('hidden');
        coppCard.classList.remove('hidden');
        
        // Add landscape class
        docPreview.classList.add('layout-landscape');
        document.body.classList.add('print-landscape');
        
        updatePrintOrientationStylesheet();
        updateCoppProductDropdown();
        updateDocumentPreview();
    });

    // Inputs binding
    const dispatchInput = document.getElementById('input-dispatch-no');
    const previewDispatchNo = document.getElementById('preview-dispatch-no');
    dispatchInput.addEventListener('input', (e) => {
        previewDispatchNo.innerText = e.target.value || '...';
    });

    const dateInput = document.getElementById('input-doc-date');
    dateInput.addEventListener('change', (e) => {
        if (e.target.value) {
            state.docDate = new Date(e.target.value);
            updatePreviewDate();
        }
    });

    // Company toggle fields
    const companyToggle = document.getElementById('company-toggle-btn');
    const companyFields = document.getElementById('company-fields');
    companyToggle.addEventListener('click', () => {
        companyToggle.classList.toggle('active');
        companyFields.classList.toggle('hidden');
    });

    const bindCompanyInput = (inputId, previewId) => {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        input.addEventListener('input', (e) => {
            preview.innerText = e.target.value;
            const key = inputId === 'input-comp-name' ? 'preview-comp-info-name' :
                        inputId === 'input-comp-addr' ? 'preview-comp-info-addr' :
                        inputId === 'input-comp-phone' ? 'preview-comp-info-phone' : 'preview-comp-info-fax';
            document.getElementById(key).innerText = e.target.value;
        });
    };
    bindCompanyInput('input-comp-name', 'preview-comp-name');
    bindCompanyInput('input-comp-addr', 'preview-comp-info-addr');
    bindCompanyInput('input-comp-phone', 'preview-comp-info-phone');
    bindCompanyInput('input-comp-fax', 'preview-comp-info-fax');

    // CoPP inputs binding
    document.getElementById('input-cpp-no').addEventListener('input', (e) => {
        state.coppCustomFields.certificateNo = e.target.value;
        saveCurrentProductCoppFields();
        updateDocumentPreview();
    });
    document.getElementById('input-cpp-country').addEventListener('input', (e) => {
        state.coppCustomFields.importingCountry = e.target.value;
        saveCurrentProductCoppFields();
        updateDocumentPreview();
    });
    document.getElementById('input-cpp-export-name').addEventListener('input', (e) => {
        state.coppCustomFields.exportingName = e.target.value;
        saveCurrentProductCoppFields();
        updateDocumentPreview();
    });
    document.getElementById('input-cpp-dosage-eng').addEventListener('input', (e) => {
        state.coppCustomFields.dosageFormEng = e.target.value;
        saveCurrentProductCoppFields();
        updateDocumentPreview();
    });
    document.getElementById('input-cpp-ingredients-eng').addEventListener('input', (e) => {
        state.coppCustomFields.ingredientsEng = e.target.value;
        saveCurrentProductCoppFields();
        updateDocumentPreview();
    });
    document.getElementById('input-cpp-issue-date').addEventListener('input', (e) => {
        state.coppCustomFields.issueDate = e.target.value;
        saveCurrentProductCoppFields();
        updateDocumentPreview();
    });
    document.getElementById('input-cpp-expiry-date').addEventListener('input', (e) => {
        state.coppCustomFields.expiryDate = e.target.value;
        saveCurrentProductCoppFields();
        updateDocumentPreview();
    });

    // Dropdown product selector inside CoPP panel
    document.getElementById('input-cpp-product').addEventListener('change', (e) => {
        state.selectedCoppIndex = parseInt(e.target.value, 10);
        loadProductCoppFields();
        updateDocumentPreview();
    });

    // Search and Filter
    const searchInput = document.getElementById('search-input');
    const filterType = document.getElementById('filter-type');
    
    const triggerSearchFilter = () => {
        const query = searchInput.value.toLowerCase().trim();
        const typeFilter = filterType.value;
        
        const filtered = state.products.filter(p => {
            const matchesSearch = 
                p.name.toLowerCase().includes(query) ||
                p.ingredients.toLowerCase().includes(query) ||
                p.registration_no.toLowerCase().includes(query) ||
                p.form.toLowerCase().includes(query) ||
                p.ma_rd.toLowerCase().includes(query);
            const matchesType = !typeFilter || p.type.toLowerCase() === typeFilter.toLowerCase();
            return matchesSearch && matchesType;
        });
        renderProductList(filtered);
    };

    searchInput.addEventListener('input', triggerSearchFilter);
    filterType.addEventListener('change', triggerSearchFilter);

    // Clear Selection
    const clearBtn = document.getElementById('clear-selection-btn');
    clearBtn.addEventListener('click', () => {
        state.selectedIndexes.clear();
        state.selectedCoppIndex = null;
        document.querySelectorAll('.product-checkbox').forEach(cb => cb.checked = false);
        document.querySelectorAll('.row-selected').forEach(row => row.classList.remove('row-selected'));
        updateSelectionBadge();
        updateCoppProductDropdown();
        updateDocumentPreview();
    });

    // Export Buttons
    document.getElementById('export-docx-btn').addEventListener('click', exportToWord);
    document.getElementById('print-pdf-btn').addEventListener('click', () => window.print());

    // Import manual paste
    const pasteToggle = document.getElementById('paste-toggle-btn');
    const pasteContent = document.getElementById('paste-body-content');
    pasteToggle.addEventListener('click', () => {
        pasteToggle.classList.toggle('active');
        pasteContent.classList.toggle('hidden');
        document.getElementById('paste-section-card').classList.toggle('collapsed');
    });
    document.getElementById('import-manual-btn').addEventListener('click', importManualHtml);
}

/**
 * Detect the Form Type (1, 2, or 3) for a product
 */
function detectFormType(product) {
    if (!product) return 1;
    const reg = (product.registrant || "").toLowerCase().trim();
    const manu = (product.manufacturer || "").toLowerCase().trim();

    if (reg.includes("cpc1") && manu.includes("cpc1")) return 1;
    if ((reg.includes("tan thinh") || reg.includes("tân thịnh")) && manu.includes("cpc1")) return 2;
    if (reg.includes("vnp") && manu.includes("cpc1")) return 3;

    return null;
}

/**
 * Load automatically translated values for active CoPP product
 */
function loadProductCoppFields() {
    if (!state.selectedCoppIndex) return;
    const prod = state.products.find(p => p.index === state.selectedCoppIndex);
    if (!prod) return;

    // Load custom fields from localStorage if they exist
    const savedDataStr = localStorage.getItem(`copp_custom_${prod.name}`);
    if (savedDataStr) {
        try {
            const saved = JSON.parse(savedDataStr);
            state.coppCustomFields.exportingName = saved.exportingName || prod.name;
            state.coppCustomFields.dosageFormEng = saved.dosageFormEng || autoTranslateDosageForm(prod.form);
            state.coppCustomFields.ingredientsEng = saved.ingredientsEng || autoTranslateIngredients(prod.concentration || prod.ingredients);
            state.coppCustomFields.issueDate = saved.issueDate || prod.reg_issue_date || '';
            state.coppCustomFields.expiryDate = saved.expiryDate || prod.reg_expiry_date || '';
            
            if (saved.certificateNo) {
                state.coppCustomFields.certificateNo = saved.certificateNo;
                document.getElementById('input-cpp-no').value = saved.certificateNo;
            }
            if (saved.importingCountry) {
                state.coppCustomFields.importingCountry = saved.importingCountry;
                document.getElementById('input-cpp-country').value = saved.importingCountry;
            }
        } catch (e) {
            console.error('Failed to parse saved product fields', e);
        }
    } else {
        state.coppCustomFields.exportingName = prod.name;
        state.coppCustomFields.dosageFormEng = autoTranslateDosageForm(prod.form);
        state.coppCustomFields.ingredientsEng = autoTranslateIngredients(prod.concentration || prod.ingredients);
        state.coppCustomFields.issueDate = prod.reg_issue_date || '';
        state.coppCustomFields.expiryDate = prod.reg_expiry_date || '';
    }

    // Update inputs values
    document.getElementById('input-cpp-export-name').value = state.coppCustomFields.exportingName;
    document.getElementById('input-cpp-dosage-eng').value = state.coppCustomFields.dosageFormEng;
    document.getElementById('input-cpp-ingredients-eng').value = state.coppCustomFields.ingredientsEng;
    document.getElementById('input-cpp-issue-date').value = state.coppCustomFields.issueDate;
    document.getElementById('input-cpp-expiry-date').value = state.coppCustomFields.expiryDate;
}

/**
 * Save current customized CoPP fields to localStorage
 */
function saveCurrentProductCoppFields() {
    if (!state.selectedCoppIndex) return;
    const prod = state.products.find(p => p.index === state.selectedCoppIndex);
    if (!prod) return;

    const dataToSave = {
        exportingName: state.coppCustomFields.exportingName,
        dosageFormEng: state.coppCustomFields.dosageFormEng,
        ingredientsEng: state.coppCustomFields.ingredientsEng,
        issueDate: state.coppCustomFields.issueDate,
        expiryDate: state.coppCustomFields.expiryDate,
        certificateNo: state.coppCustomFields.certificateNo,
        importingCountry: state.coppCustomFields.importingCountry
    };

    localStorage.setItem(`copp_custom_${prod.name}`, JSON.stringify(dataToSave));
}

/**
 * Automatic dosage form translation to English
 */
function autoTranslateDosageForm(form) {
    if (!form) return "";
    const lower = form.toLowerCase().trim();
    if (lower.includes('hỗn dịch xịt mũi')) return 'Nasal spray suspension';
    if (lower.includes('hỗn dịch uống')) return 'Oral suspension';
    if (lower.includes('bột pha dịch uống') || lower.includes('bột pha hỗn dịch uống')) return 'Powder for oral suspension';
    if (lower.includes('bột pha dung dịch uống')) return 'Powder for oral solution';
    if (lower.includes('cốm pha hỗn dịch uống')) return 'Granules for oral suspension';
    if (lower.includes('bột pha dịch') || lower.includes('bột pha hỗn dịch')) return 'Powder for oral suspension';
    if (lower.includes('cốm pha dịch') || lower.includes('cốm pha hỗn dịch')) return 'Granules for oral suspension';
    if (lower.includes('gel tra mắt')) return 'Eye gel';
    if (lower.includes('dung dịch nhỏ mắt')) return 'Eye drops solution';
    if (lower.includes('dung dịch tiêm truyền')) return 'Solution for infusion';
    if (lower.includes('viên nén đặt dưới lưỡi')) return 'Sublingual tablets';
    if (lower.includes('viên nang cứng')) return 'Hard capsules';
    if (lower.includes('viêm đặt âm đạo') || lower.includes('viên đặt âm đạo')) return 'Vaginal tablets';
    if (lower.includes('dung dịch rửa mắt')) return 'Eyewash solution';
    if (lower.includes('kem dùng ngoài da')) return 'Topical cream';
    if (lower.includes('dạng xịt')) return 'Spray form';
    return form;
}

/**
 * Automatic ingredients translation to English
 */
function autoTranslateIngredients(ing) {
    if (!ing) return "";
    let txt = ing;
    const dict = [
        { vi: /Mỗi lọ (\d+(\.\d+)?)ml chứa/gi, en: 'Each bottle of $1ml contains' },
        { vi: /Mỗi lọ (\d+(\.\d+)?) ml chứa/gi, en: 'Each bottle of $1ml contains' },
        { vi: /Mỗi ống (\d+(\.\d+)?)ml chứa/gi, en: 'Each ampoule of $1ml contains' },
        { vi: /Mỗi ống (\d+(\.\d+)?) ml chứa/gi, en: 'Each ampoule of $1ml contains' },
        { vi: /nước tinh khiết vừa đủ/gi, en: 'purified water q.s.' },
        { vi: /tinh dầu bạc hà/gi, en: 'menthol oil' },
        { vi: /Mometason furoat/gi, en: 'Mometasone furoate' },
        { vi: /Natri clorid/gi, en: 'Sodium chloride' },
        { vi: /Albendazole/gi, en: 'Albendazole' },
        { vi: /Zoledronic acid/gi, en: 'Zoledronic acid' },
        { vi: /Atropin sulfat/gi, en: 'Atropine sulfate' },
        { vi: /Bào tử Bacillus clausii/gi, en: 'Bacillus clausii spores' },
        { vi: /Bào tử/gi, en: 'spores' },
        { vi: /Acid lactic/gi, en: 'Lactic acid' },
        { vi: /Natri lactat/gi, en: 'Sodium lactate' },
        { vi: /Moxifloxacin/gi, en: 'Moxifloxacin' },
        { vi: /Carbomer/gi, en: 'Carbomer' },
        { vi: /Mosaprid citrat dihydrat/gi, en: 'Mosapride citrate dihydrate' },
        { vi: /Mosaprid citrat/gi, en: 'Mosapride citrate' },
        { vi: /tương đương/gi, en: 'equivalent to' },
        { vi: /tá dược/gi, en: 'excipients' },
        { vi: /vừa đủ/gi, en: 'q.s.' },
        { vi: /(\d+),(\d+)/g, en: '$1.$2' }
    ];
    dict.forEach(item => {
        txt = txt.replace(item.vi, item.en);
    });
    return txt;
}

/**
 * Format Date to standard English: "June 03rd 2025" or "May 19th 2023"
 */
function formatEnglishDate(dateString) {
    if (!dateString) return "………";
    
    let parts;
    if (dateString.includes('/')) {
        parts = dateString.split('/');
    } else if (dateString.includes('-')) {
        parts = dateString.split('-');
        parts = [parts[2], parts[1], parts[0]];
    } else {
        return dateString;
    }
    
    if (parts.length !== 3) return dateString;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parts[2];
    
    if (isNaN(day) || isNaN(month)) return dateString;
    
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    
    let suffix = "th";
    if (day === 1 || day === 21 || day === 31) suffix = "st";
    else if (day === 2 || day === 22) suffix = "nd";
    else if (day === 3 || day === 23) suffix = "rd";
    
    return `${months[month - 1]} ${day}<sup>${suffix}</sup> ${year}`;
}

/**
 * Parse date string in format "DD/MM/YYYY" or "YYYY-MM-DD" into Date object
 */
function parseDate(dateStr) {
    if (!dateStr) return null;
    let parts;
    if (dateStr.includes('/')) {
        parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // 0-based month
            const year = parseInt(parts[2], 10);
            return new Date(year, month, day);
        }
    } else if (dateStr.includes('-')) {
        parts = dateStr.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            return new Date(year, month, day);
        }
    }
    return null;
}


/**
 * Update the list of products selected in the CoPP tab dropdown
 */
function updateCoppProductDropdown() {
    const dropdown = document.getElementById('input-cpp-product');
    dropdown.innerHTML = '';
    
    const selected = state.products.filter(p => state.selectedIndexes.has(p.index));
    
    if (selected.length === 0) {
        dropdown.innerHTML = '<option value="">(Chọn sản phẩm tại bảng)</option>';
        state.selectedCoppIndex = null;
        return;
    }
    
    selected.forEach(p => {
        const option = document.createElement('option');
        option.value = p.index;
        option.innerText = p.name;
        dropdown.appendChild(option);
    });
    
    if (!state.selectedCoppIndex || !state.selectedIndexes.has(state.selectedCoppIndex)) {
        state.selectedCoppIndex = selected[0].index;
        loadProductCoppFields();
    }
}

/**
 * Format date to Vietnamese string "ngày DD tháng MM năm YYYY"
 */
function updatePreviewDate() {
    const d = state.docDate;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    document.getElementById('preview-doc-date').innerText = `Hà Nội, ngày ${day} tháng ${month} năm ${year}`;
}

/**
 * Render the product list table
 */
function renderProductList(items) {
    const tbody = document.getElementById('product-list-body');
    tbody.innerHTML = '';
    document.getElementById('total-products-count').innerText = items.length;

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--ui-text-muted); padding: 2rem;">Không tìm thấy sản phẩm phù hợp.</td></tr>`;
        return;
    }

    items.forEach(product => {
        const row = document.createElement('tr');
        row.dataset.index = product.index;
        
        const isSelected = state.selectedIndexes.has(product.index);
        if (isSelected) row.classList.add('row-selected');

        let badgeClass = 'badge-drug';
        if (product.type.includes('Mỹ phẩm') || product.type.includes('MP')) badgeClass = 'badge-cosm';
        else if (product.type.includes('TTB')) badgeClass = 'badge-med';
        else if (product.type.includes('TPCN')) badgeClass = 'badge-food';

        row.innerHTML = `
            <td class="checkbox-cell">
                <input type="checkbox" class="product-checkbox" ${isSelected ? 'checked' : ''}>
            </td>
            <td>
                <div style="font-weight: 500; margin-bottom: 2px;">${product.name}</div>
                <div style="display: flex; gap: 4px; align-items: center;">
                    <span class="badge ${badgeClass}">${product.type}</span>
                    <span style="font-size: 0.65rem; color: var(--ui-text-muted)">DK: ${product.registrant} | SX: ${product.manufacturer}</span>
                </div>
            </td>
            <td style="color: var(--ui-text-secondary);">${product.form || '-'}</td>
            <td style="font-family: monospace; color: #3b82f6;">${product.registration_no || '-'}</td>
        `;

        row.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
                const cb = row.querySelector('.product-checkbox');
                cb.checked = !cb.checked;
            }
            toggleProductSelection(product.index, row.querySelector('.product-checkbox').checked, row);
        });

        tbody.appendChild(row);
    });
}

/**
 * Toggle product selection
 */
function toggleProductSelection(index, isChecked, rowElement) {
    if (isChecked) {
        const newProduct = state.products.find(p => p.index === index);
        const newFormType = detectFormType(newProduct);
        
        if (state.selectedIndexes.size > 0) {
            const firstSelectedIndex = [...state.selectedIndexes][0];
            const firstProduct = state.products.find(p => p.index === firstSelectedIndex);
            const currentFormType = detectFormType(firstProduct);
            
            if (currentFormType !== newFormType) {
                const curName = FORM_TEMPLATES[currentFormType] ? FORM_TEMPLATES[currentFormType].companyName : "Chưa xác định";
                const newName = FORM_TEMPLATES[newFormType] ? FORM_TEMPLATES[newFormType].companyName : "Chưa xác định";
                
                alert(`Không thể chọn sản phẩm này! \n\nSản phẩm này yêu cầu mẫu đơn của: \n"${newName}" \n\nTrong khi các sản phẩm đang chọn thuộc đơn vị đăng ký: \n"${curName}". \n\nVui lòng bỏ chọn các sản phẩm cũ trước khi chọn sản phẩm mới khác đơn vị đăng ký.`);
                
                rowElement.querySelector('.product-checkbox').checked = false;
                return;
            }
        }

        state.selectedIndexes.add(index);
        rowElement.classList.add('row-selected');
    } else {
        state.selectedIndexes.delete(index);
        rowElement.classList.remove('row-selected');
    }

    updateSelectionBadge();
    updateCoppProductDropdown();
    updateDocumentPreview();
}

/**
 * Update badge count
 */
function updateSelectionBadge() {
    document.getElementById('selected-count-badge').innerText = state.selectedIndexes.size;
}

/**
 * Update document preview
 */
function updateDocumentPreview() {
    if (state.selectedIndexes.size === 0) {
        document.getElementById('preview-table-body').innerHTML = `
            <tr class="empty-placeholder-row">
                <td colspan="7" class="placeholder-text">Chưa chọn sản phẩm nào. Vui lòng chọn sản phẩm ở bảng bên trái để hiển thị tại đây.</td>
            </tr>
        `;
        document.getElementById('cpp-preview-container').innerHTML = `
            <div class="cpp-placeholder-text">Vui lòng chọn sản phẩm để hiển thị Giấy chứng nhận CoPP.</div>
        `;
        return;
    }

    const selectedList = state.products.filter(p => state.selectedIndexes.has(p.index));
    const firstProduct = selectedList[0];
    const formId = detectFormType(firstProduct) || 1;
    state.activeFormId = formId;

    const template = FORM_TEMPLATES[formId];
    
    document.querySelector('.dispatch-suffix').innerText = template.dispatchSuffix;

    // 1. Render Tab 1 (Vietnamese Application Form)
    renderVietnameseApplication(selectedList, template);

    // 2. Render Tab 2 (English WHO CPP Certificate)
    renderEnglishCoppCertificate();
}

/**
 * Render Vietnamese application form preview
 */
function renderVietnameseApplication(selectedList, template) {
    document.getElementById('preview-comp-name').innerText = template.headerLine1;
    document.querySelector('.comp-subname').innerText = template.headerLine2;
    document.getElementById('preview-comp-info-name').innerText = template.companyName;
    document.getElementById('preview-comp-info-addr').innerText = template.address;
    document.getElementById('preview-comp-info-phone').innerText = template.phone;
    document.getElementById('preview-comp-info-fax').innerText = template.fax;

    const tbody = document.getElementById('preview-table-body');
    tbody.innerHTML = '';

    selectedList.forEach((product, idx) => {
        const row = document.createElement('tr');
        const nameCell = `<strong>${product.name}</strong>${product.form ? '<br>' + product.form : ''}`;
        
        const ingredients = product.concentration ? product.concentration : product.ingredients;
        const ingredientsFormatted = ingredients.replace(/\n/g, '<br>');
        const packingFormatted = product.packing.replace(/\n/g, '<br>');

        let standard = product.quality_standard || 'TCCS';
        if (standard.toUpperCase() === 'TCCS') standard = 'Tiêu chuẩn cơ sở';

        row.innerHTML = `
            <td style="text-align: center;">${idx + 1}</td>
            <td style="color: #dc2626; font-weight: bold;">${nameCell}</td>
            <td style="color: #dc2626;">${ingredientsFormatted || '-'}</td>
            <td style="color: #dc2626;">${packingFormatted || '-'}</td>
            <td style="text-align: center; color: #dc2626;">${standard}</td>
            <td style="text-align: center; color: #dc2626;">${product.shelf_life || '-'}</td>
            <td style="text-align: center; color: #dc2626; font-family: 'Times New Roman';">${product.registration_no || '-'}</td>
        `;
        tbody.appendChild(row);
    });

    updatePreviewDate();
}

/**
 * Render English CoPP Certificate (Landscape layout matching the user's uploaded template image)
 */
function renderEnglishCoppCertificate() {
    const container = document.getElementById('cpp-preview-container');
    container.innerHTML = '';

    if (!state.selectedCoppIndex) {
        container.innerHTML = `<div class="cpp-placeholder-text">Vui lòng chọn sản phẩm để hiển thị Giấy chứng nhận CoPP.</div>`;
        return;
    }

    const product = state.products.find(p => p.index === state.selectedCoppIndex);
    if (!product) return;

    const formId = detectFormType(product);

    if (formId === null) {
        container.innerHTML = `
            <div class="cpp-warning-box">
                <i data-lucide="alert-triangle" class="cpp-warning-icon"></i>
                <h3>Chưa có form CoPP</h3>
                <p>Sản phẩm này có đơn vị đăng ký là <strong>"${product.registrant}"</strong> và nhà sản xuất là <strong>"${product.manufacturer}"</strong>, hiện chưa được cấu hình mẫu CoPP tiếng Anh.</p>
                <p style="margin-top:0.5rem !important; font-size:0.75rem !important; color:#f87171 !important;">Mẫu CoPP chỉ áp dụng cho sản phẩm đăng ký bởi CPC1 HN, Tân Thịnh hoặc VNP và được sản xuất bởi CPC1 HN.</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    const template = FORM_TEMPLATES[formId];
    
    // Map data values
    const certNo = state.coppCustomFields.certificateNo || '………./GP-QLD';
    const importingCountry = state.coppCustomFields.importingCountry || 'Myanmar';
    const propNameAndDosage = `<strong>${product.name}</strong> (${state.coppCustomFields.dosageFormEng || autoTranslateDosageForm(product.form)})`;
    const exportNameAndDosage = `<strong>${state.coppCustomFields.exportingName || product.name}</strong> (${state.coppCustomFields.dosageFormEng || autoTranslateDosageForm(product.form)})`;
    const activeIngredients = (state.coppCustomFields.ingredientsEng || autoTranslateIngredients(product.concentration || product.ingredients)).replace(/\n/g, '<br>');
    const licenseNo = product.registration_no || '-';
    
    // Dates formatted in English
    const issueDateEng = formatEnglishDate(state.coppCustomFields.issueDate || product.reg_issue_date);
    const expiryDateEng = formatEnglishDate(state.coppCustomFields.expiryDate || product.reg_expiry_date);

    let templateHtml = '';

    // Common English header text based on Form Type
    const headerTitle1 = formId === 1 ? "MINISTRY OF HEALTH" : "MINISTRY OF HEALTH OF VIETNAM";
    const headerTitle2 = formId === 1 ? "DRUG ADMINISTRATION OF VIETNAM" : "DRUG ADMINISTRATION";

    // Build the WHO CPP Template HTML dynamically (Landscape 3-Column layout)
    templateHtml = `
        <table class="cpp-header-layout-table">
            <tr>
                <td class="cell-left">Certificate No: ${certNo}</td>
                <td class="cell-center">
                    <p class="cpp-ministry-title"><strong>${headerTitle1}</strong></p>
                    <p class="cpp-ministry-title" style="margin-top:-6pt;"><strong>${headerTitle2}</strong></p>
                </td>
                <td class="cell-right">
                    <div class="cpp-country-box">
                        <p>Exporting (certifying) country: Vietnam</p>
                        <p>Importing (requesting) country: <span style="color: #dc2626;">${importingCountry}</span></p>
                    </div>
                </td>
            </tr>
        </table>
        
        <p class="cpp-main-title">Certificate of a Pharmaceutical Product</p>
        <p class="cpp-format-note">(This certificate conforms to the format recommended by the World Health Organization)</p>
        
        <table style="width: 100%; border-collapse: collapse; border: none !important; margin-bottom: 3pt;">
            <tr>
                <td style="border: none !important; padding: 0 0 2pt 0; vertical-align: top; width: 310px; font-family: var(--doc-font); font-size: 10pt;">
                    Proprietary name (if applicable) and dosage form:
                </td>
                <td style="border: none !important; padding: 0 0 2pt 0; vertical-align: top; color: #dc2626; font-family: var(--doc-font); font-size: 10pt;">
                    ${propNameAndDosage}
                </td>
            </tr>
            <tr>
                <td style="border: none !important; padding: 0 0 2pt 0; vertical-align: top; width: 310px; font-family: var(--doc-font); font-size: 10pt;">
                    Exporting name and dosage form:
                </td>
                <td style="border: none !important; padding: 0 0 2pt 0; vertical-align: top; color: #dc2626; font-family: var(--doc-font); font-size: 10pt;">
                    ${exportNameAndDosage}
                </td>
            </tr>
            <tr>
                <td style="border: none !important; padding: 0 0 2pt 0; vertical-align: top; width: 310px; font-family: var(--doc-font); font-size: 10pt;">
                    Active ingredient(s) and amount(s) per unit dose:
                </td>
                <td style="border: none !important; padding: 0 0 2pt 0; vertical-align: top; color: #dc2626; font-family: var(--doc-font); font-size: 10pt;">
                    ${activeIngredients}
                </td>
            </tr>
        </table>
        
        <table style="width: 100%; border-collapse: collapse; border: none !important; margin-top: 3pt; margin-bottom: 1pt;">
            <tr>
                <td style="border: none !important; padding: 0; vertical-align: top; width: 500px; font-family: var(--doc-font); font-size: 10pt;">
                    1. Is this product licensed to be placed on the market for use in the exporting country?
                </td>
                <td style="border: none !important; padding: 0; vertical-align: top; font-family: var(--doc-font); font-size: 10pt;">
                    Yes ☑ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; No ☐
                </td>
            </tr>
        </table>
        
        <p style="font-size: 9.0pt; font-style: italic; margin-top: 3pt; margin-bottom: 3pt;">If yes, complete box A; if no, complete box B.</p>
        
        <table class="cpp-grid-table">
            <tr>
                <td class="col-box-a">
                    <p class="cpp-box-title">A</p>
                    <p>Product license holder:</p>
                    <p>${template.engLicenseHolder}</p>
                    <p>Address: ${template.engAddress}</p>
                    ${template.engPhone ? `<p>Tel: ${template.engPhone} ${template.engFax ? `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Fax: ${template.engFax}` : ''}</p>` : ''}
                    <p>Status of license holder: ${template.engStatus}</p>
                    <p>Number of product license and date of issue: <span style="color: #dc2626;">${licenseNo}</span></p>
                    <p>Date: <span style="color: #dc2626;">${issueDateEng}</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date review: <span style="color: #dc2626;">${expiryDateEng}</span></p>
                    
                    <div class="cpp-manufacturer-section">
                        <p>The name and address of the manufacturer producing the dosage form:</p>
                        <p>Ha Noi CPC1 Pharmaceutical Joint Stock Company</p>
                        <p>Address: Ha Binh Phuong Industrial Zone, Thuong Tin Commune, Ha Noi City, Vietnam</p>
                        <p>Tel: +84.24.33765503 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Fax: +84.24.33765504</p>
                    </div>
                    
                    <p style="margin-top: 3pt;">Is an approved technical summary appended? &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; yes ☐ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; no ☑</p>
                    <p>Is the attached product information complete and consonant with the license?</p>
                    <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; yes ☐ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; no ☐ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; not provided ☑</p>
                    <p>Applicant for certificate if different from the license holder:</p>
                    <p>${template.engApplicant || ''}</p>
                </td>
                <td class="col-box-b">
                    <p class="cpp-box-title">B</p>
                    <p>Applicant for certificate:</p>
                    <div style="height: 10px;"></div>
                    <p>Status of applicant:</p>
                    <div style="height: 10px;"></div>
                    <p>Why is authorization lacking?</p>
                    <div style="height: 10px;"></div>
                    <p>not required ☐ &nbsp;&nbsp; no requested ☐ &nbsp;&nbsp; under consideration ☐ &nbsp;&nbsp; refused ☐</p>
                    <div style="height: 10px;"></div>
                    <p>Remarks</p>
                </td>
            </tr>
        </table>
        
        <div class="cpp-list-item">
            Does the certifying authority arrange for the periodic inspection of the manufacturing plant in which the dosage form is produced? &nbsp;&nbsp; yes ☑ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; no ☐
        </div>
        <p style="padding-left: 15pt; font-size: 9.0pt; font-style: italic; margin-top: 1pt; margin-bottom: 1pt;">if no, proceed to question 3</p>
        <p style="padding-left: 15pt;">Periodicity of routine inspections (years): At least one every three years</p>
        <p style="padding-left: 15pt;">Has the manufacture of this type of dosage form been inspected? &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; yes ☑ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; no ☐</p>
        <p style="padding-left: 15pt;">Do the facilities and operations conform to GMP as recommended by the World Health Organization? &nbsp;&nbsp; yes ☑ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; no ☐</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 3pt; margin-bottom: 3pt;">
            <tr>
                <td style="border: none !important; padding: 3pt; vertical-align: top; font-family: var(--doc-font); font-size: 10pt;">
                    <p style="margin: 0 0 2px 0; text-align: justify;">3. Does the information submitted by the applicant satisfy the certifying authority on all aspects of the manufacture of the product undertaken by another party?</p>
                    <p style="margin: 0; font-style: italic; padding-left: 15pt; color: #888;">yes ☐ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; no ☐ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; if no, explain:</p>
                </td>
            </tr>
        </table>
        
        <table class="cpp-authority-table">
            <tr>
                <td class="cell-authority-address">
                    <p>Address of certifying authority:</p>
                    <p>Drug Administration of Vietnam - Ministry of Health</p>
                    <p>138A Giang Vo, Giang Vo Ward, Ha Noi City, Vietnam</p>
                    <p>Tel No.: +84.4.8464413 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Fax No.: +84.4.8234758</p>
                    <p>Email: cqldvn@moh.gov.vn</p>
                </td>
                <td class="cell-authority-sig">
                    <p>Name of authorized person:</p>
                    <p style="margin-top: 15pt;">Signature:</p>
                    <p style="margin-top: 20pt;">Stamp and date:</p>
                </td>
            </tr>
        </table>
    `;

    container.innerHTML = templateHtml;
}

/**
 * Import Manual HTML Table Content
 */
function importManualHtml() {
    const pasteArea = document.getElementById('manual-html-paste');
    const htmlText = pasteArea.value.trim();
    
    if (!htmlText) {
        alert("Vui lòng dán dữ liệu tr hoặc table vào khung nhập.");
        return;
    }

    try {
        const parsedRows = parseHtmlTextToProducts(htmlText);
        if (parsedRows && parsedRows.length > 0) {
            let addedCount = 0;
            parsedRows.forEach(newProd => {
                const exists = state.products.some(p => p.name === newProd.name && p.ma_rd === newProd.ma_rd);
                if (!exists) {
                    newProd.index = state.products.length + 1;
                    state.products.push(newProd);
                    addedCount++;
                }
            });

            alert(`Nhập dữ liệu thành công! Đã thêm ${addedCount} sản phẩm mới.`);
            pasteArea.value = '';
            renderProductList(state.products);
            document.getElementById('paste-toggle-btn').click();
        } else {
            alert("Không thể tìm thấy dòng sản phẩm hợp lệ trong dữ liệu đã dán. Vui lòng kiểm tra lại định dạng.");
        }
    } catch (err) {
        alert("Lỗi khi phân tích dữ liệu: " + err.message);
    }
}

/**
 * Export Document Preview to a Microsoft Word-compatible HTML file
 */
function exportToWord() {
    if (state.selectedIndexes.size === 0) {
        alert("Vui lòng chọn ít nhất một sản phẩm để xuất.");
        return;
    }

    let exportHtml = '';
    let filename = '';

    if (state.activeTab === 'don') {
        const previewContainer = document.getElementById('don-preview-container');
        exportHtml = previewContainer.innerHTML;
        
        let filenameSuffix = '';
        if (state.selectedIndexes.size === 1) {
            const firstSelected = state.products.find(p => state.selectedIndexes.has(p.index));
            filenameSuffix = `_${firstSelected.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        } else {
            filenameSuffix = `_${state.selectedIndexes.size}_san_pham`;
        }
        filename = `Don_de_nghi_cap_CPP${filenameSuffix}.doc`;
    } else {
        const product = state.products.find(p => p.index === state.selectedCoppIndex);
        if (!product) return;

        const formId = detectFormType(product);
        if (formId === null) {
            alert("Sản phẩm này chưa được cấu hình biểu mẫu CoPP tiếng Anh để xuất file.");
            return;
        }

        const previewContainer = document.getElementById('cpp-preview-container');
        exportHtml = `<div class="SectionLandscape">${previewContainer.innerHTML}</div>`;
        filename = `CoPP_WHO_${product.name.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
    }

    const styleBlock = state.activeTab === 'don' ? `
        @page {
            size: 21cm 29.7cm;
            margin: 2cm 1.5cm 2cm 2cm;
            mso-header-margin: 35.4pt;
            mso-footer-margin: 35.4pt;
        }
        body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.35; color: black; }
        .doc-header-table { width: 100%; border-collapse: collapse; margin-bottom: 20pt; }
        .doc-header-table td { vertical-align: top; padding: 0; }
        .col-left { width: 45%; text-align: center; }
        .col-right { width: 55%; text-align: center; }
        .comp-name { font-size: 10pt; font-weight: bold; }
        .comp-subname { font-size: 11pt; font-weight: bold; }
        .dispatch-no { font-size: 11pt; margin-top: 10pt; }
        .national-title { font-size: 10.5pt; font-weight: bold; }
        .national-slogan { font-size: 11.5pt; font-weight: bold; }
        .slogan-underline { width: 135px; height: 1px; border-bottom: 1px solid black; margin: 4pt auto 0 auto; }
        .doc-date { text-align: right; font-style: italic; font-size: 11pt; margin-bottom: 20pt; }
        .doc-recipient { text-align: center; font-weight: bold; font-size: 12pt; margin-top: 10pt; margin-bottom: 20pt; }
        .doc-company-info { font-size: 11pt; margin-bottom: 12pt; }
        .doc-company-info p { margin: 0 0 4pt 0; }
        .inline-fields { display: block; }
        .fax-field { margin-left: 50pt; }
        .doc-statement { font-size: 11pt; text-align: justify; margin-bottom: 15pt; }
        .doc-products-table { width: 100%; border-collapse: collapse; margin-bottom: 24pt; }
        .doc-products-table th, .doc-products-table td { border: 1px solid black !important; padding: 6pt 5pt; font-size: 10.5pt; }
        .doc-products-table th { font-weight: bold; text-align: center; }
        .doc-products-table td { color: #dc2626; text-align: left; }
        .doc-products-table td:nth-child(1), .doc-products-table td:nth-child(5), .doc-products-table td:nth-child(6), .doc-products-table td:nth-child(7) { text-align: center; }
        .doc-signature-block { margin-left: auto; width: 50%; text-align: center; margin-top: 20pt; }
        .signature-title { font-size: 11pt; font-weight: bold; }
        .signature-subtitle { font-size: 10pt; font-style: italic; }
        ` : `
        @page SectionLandscape {
            size: 841.7pt 595.45pt;
            mso-page-orientation: landscape;
            margin: 0.8cm;
        }
        div.SectionLandscape {
            page: SectionLandscape;
        }
        body { font-family: 'Times New Roman', Times, serif; font-size: 10pt; line-height: 1.15; color: black; }
        p { margin-top: 0; margin-bottom: 2px; text-align: justify; }
        
        .cpp-header-layout-table { width: 100%; border-collapse: collapse; margin-bottom: 3pt; }
        .cpp-header-layout-table td { border: none; padding: 0; vertical-align: top; }
        .cpp-header-layout-table .cell-left { width: 25%; text-align: left; }
        .cpp-header-layout-table .cell-center { width: 50%; text-align: center; }
        .cpp-header-layout-table .cell-right { width: 25%; text-align: right; }
        .cpp-country-box { display: inline-block; border: none; padding: 3px 6px; text-align: left; font-size: 9.0pt; }
        .cpp-country-box p { margin: 0 !important; font-size: 9.0pt !important; }
        
        .cpp-main-title { font-size: 12pt; font-weight: bold; text-align: center; margin-bottom: 1px; text-decoration: underline; }
        .cpp-format-note { text-align: center; font-size: 9.0pt; margin-bottom: 2pt; }
        
        .cpp-grid-table { width: 100%; border-collapse: collapse; margin-top: 3pt; margin-bottom: 3pt; }
        .cpp-grid-table td { border: 1px solid black !important; padding: 3pt; vertical-align: top; font-size: 9.5pt; }
        .cpp-grid-table .col-box-a { width: 52%; }
        .cpp-grid-table .col-box-b { width: 48%; }
        .cpp-box-title { font-weight: normal; font-size: 10.5pt; margin-bottom: 3pt; }
        .cpp-manufacturer-section { margin-top: 3pt; padding-top: 3pt; border-top: none; }
        
        .cpp-list-item { margin-bottom: 2pt; padding-left: 15pt; }
        .cpp-authority-table { width: 100%; border-collapse: collapse; margin-top: 4pt; }
        .cpp-authority-table td.cell-authority-address { border: none !important; padding: 3pt; vertical-align: top; width: 50%; }
        .cpp-authority-table td.cell-authority-sig { border: none !important; padding: 3pt; vertical-align: top; width: 50%; }
        `;

    const docHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" 
      xmlns:w="urn:schemas-microsoft-com:office:word" 
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
    <meta charset="utf-8">
    <title>${filename.replace('.doc', '')}</title>
    <!--[if gte mso 9]>
    <xml>
        <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
    </xml>
    <![endif]-->
    <style>
        ${styleBlock}
    </style>
</head>
<body>
    <div>
        ${exportHtml}
    </div>
</body>
</html>
    `;

    const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/* ==========================================================================
   EXP STATUS TRACKING DASHBOARD LOGIC
   ========================================================================== */

/**
 * Initialize EXP Status Tracking Dashboard UI & events
 */
function initExpDashboard() {
    // 1. Navigation tab switching
    const navBtnCreator = document.getElementById('nav-btn-creator');
    const navBtnTracking = document.getElementById('nav-btn-tracking');
    const creatorView = document.getElementById('cpp-creator-view');
    const trackingView = document.getElementById('exp-tracking-view');

    navBtnCreator.addEventListener('click', () => {
        navBtnCreator.classList.add('active');
        navBtnTracking.classList.remove('active');
        creatorView.classList.remove('hidden');
        trackingView.classList.add('hidden');
    });

    navBtnTracking.addEventListener('click', () => {
        navBtnTracking.classList.add('active');
        navBtnCreator.classList.remove('active');
        creatorView.classList.add('hidden');
        trackingView.classList.remove('hidden');
        
        // Refresh icons and load data if not loaded
        if (!state.expData) {
            if (typeof EXP_FALLBACK_DATA !== 'undefined') {
                state.expData = EXP_FALLBACK_DATA;
            }
            renderExpDashboard();
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    // 2. Sub-tab click categories
    document.querySelectorAll('.dash-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.currentTarget;
            document.querySelectorAll('.dash-tab-btn').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            
            state.trackingActiveTab = button.dataset.tab;
            state.trackingActiveMetricFilter = 'all'; // reset warning levels filter when switching tabs
            state.columnFilters = {};
            
            // Sync dropdown filter
            document.getElementById('filter-exp-warning').value = 'all';
            state.trackingFilterWarning = 'all';
            
            renderExpDashboard();
        });
    });

    // 3. Filters binding
    document.getElementById('tracking-search-input').addEventListener('input', (e) => {
        state.trackingSearchQuery = e.target.value.toLowerCase().trim();
        renderExpDashboard();
    });

    document.getElementById('filter-exp-warning').addEventListener('change', (e) => {
        state.trackingFilterWarning = e.target.value;
        state.trackingActiveMetricFilter = 'all'; // clear metric active highlights if dropdown is changed
        renderExpDashboard();
    });

    document.getElementById('filter-exp-archive').addEventListener('change', (e) => {
        state.trackingFilterArchive = e.target.value;
        renderExpDashboard();
    });

    // 4. Live Sync action
    document.getElementById('sync-live-exp-btn').addEventListener('click', () => {
        syncLiveExpData();
    });

    // 5. Metric Cards Filter
    document.querySelectorAll('.metric-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const filter = e.currentTarget.dataset.filter;
            state.trackingActiveMetricFilter = filter;
            
            // Set select input dropdown to match for user clarity
            const selectFilter = document.getElementById('filter-exp-warning');
            if (filter === 'all') selectFilter.value = 'all';
            else if (filter === 'overdue') selectFilter.value = 'overdue';
            else if (filter === 'priority') selectFilter.value = 'priority';
            else if (filter === 'pending') selectFilter.value = 'pending';
            else if (filter === 'completed') selectFilter.value = 'completed';
            
            state.trackingFilterWarning = filter;
            renderExpDashboard();
        });
    });

    // 6. Automatic 15-second live sync interval
    if (typeof EXP_FALLBACK_DATA !== 'undefined') {
        state.expData = EXP_FALLBACK_DATA;
        renderExpDashboard();
    }
    // Start live sync immediately on initialization
    syncLiveExpData();
    // Then set interval to repeat every 15 seconds
    setInterval(() => {
        syncLiveExpData();
    }, 15000);
}

/**
 * Get the warning level of a tracking row: priority > overdue > pending > completed
 */
function getExpWarningLevel(row, category) {
    if (row.isArchived) {
        return 'completed';
    }
    
    // Check if license is present
    if (category !== 'tpcn' && row.licenseNo && row.licenseNo.trim() !== '') {
        return 'completed';
    }
    if (category === 'tpcn' && row.status && (row.status.toLowerCase().includes('tiếp nhận') || row.status.toLowerCase().includes('hoàn thành'))) {
        return 'completed';
    }

    // Check Priority / Overdue for GPXK & CPP Registration Department
    if (category === 'gpxk' || (category === 'cpp' && row.department && row.department.includes('Đăng ký'))) {
        const priorityText = (row.priority || '').toLowerCase();
        if (priorityText.includes('gấp') || priorityText.includes('ưu tiên') || priorityText.includes('khẩn')) {
            return 'priority';
        }
        
        // 1 month overdue check
        if (row.submissionDate) {
            const subDate = parseDate(row.submissionDate);
            if (subDate) {
                const currentDate = new Date(2026, 5, 10); // June 10, 2026
                const oneMonthLater = new Date(subDate);
                oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
                if (currentDate > oneMonthLater) {
                    return 'overdue';
                }
            }
        }
        return 'pending';
    }

    // Default warning levels for other sheets
    const priorityText = (row.priority || '').toLowerCase();
    if (priorityText.includes('gấp') || priorityText.includes('ưu tiên') || priorityText.includes('khẩn')) {
        return 'priority';
    }
    return 'pending';
}

const COLUMN_PROPERTY_MAP = {
    'Tên sản phẩm': 'name',
    'Tên xuất khẩu': 'exportName',
    'Khách hàng': 'customer',
    'Quốc gia': 'country',
    'Cảnh báo': 'warningLvl',
    'Follower': 'exp',
    'Ngày nộp': 'submissionDate',
    'Ngày nộp (DKT)': 'submissionDate',
    'Tình trạng': 'status',
    'Mã hồ sơ': 'dossierId',
    'Số GPXK': 'licenseNo',
    'Số CPP': 'licenseNo',
    'Số FSC': 'licenseNo',
    'Phòng nhận': 'department',
    'Phân loại': 'category',
    'Yêu cầu': 'requirement',
    'Chi tiết': 'details'
};

/**
 * Render the EXP Status Tracking Dashboard
 */
function renderExpDashboard() {
    if (!state.expData) return;

    const currentTab = state.trackingActiveTab; // 'gpxk', 'cpp', 'fsc', 'tpcn'
    const fullList = state.expData[currentTab] || [];
    
    // 1. Calculate Tab-specific Metrics
    let total = 0, overdue = 0, priority = 0, pending = 0, completed = 0;
    
    fullList.forEach(row => {
        const lvl = getExpWarningLevel(row, currentTab);
        total++;
        if (lvl === 'overdue') overdue++;
        else if (lvl === 'priority') priority++;
        else if (lvl === 'pending') pending++;
        else if (lvl === 'completed') completed++;
    });

    // Update metrics UI
    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-overdue').innerText = overdue;
    document.getElementById('stat-priority').innerText = priority;
    document.getElementById('stat-pending').innerText = pending;
    document.getElementById('stat-completed').innerText = completed;

    // Remove active highlight from cards and re-add
    document.querySelectorAll('.metric-card').forEach(card => card.style.background = '');
    const activeCard = document.querySelector(`.metric-${state.trackingActiveMetricFilter}`);
    if (activeCard) {
        activeCard.style.background = 'rgba(255, 255, 255, 0.08)';
    }

    // 2. Filter rows
    const filteredList = fullList.filter(row => {
        const warningLvl = getExpWarningLevel(row, currentTab);
        
        // Warning level filter
        if (state.trackingFilterWarning !== 'all') {
            if (state.trackingFilterWarning !== warningLvl) return false;
        }

        // Archive / active filter
        if (state.trackingFilterArchive === 'active' && row.isArchived) return false;
        if (state.trackingFilterArchive === 'archived' && !row.isArchived) return false;

        // Search text filter
        if (state.trackingSearchQuery) {
            const query = state.trackingSearchQuery;
            const matchesSearch = 
                (row.name || '').toLowerCase().includes(query) ||
                (row.exportName || '').toLowerCase().includes(query) ||
                (row.country || '').toLowerCase().includes(query) ||
                (row.customer || '').toLowerCase().includes(query) ||
                (row.licenseNo || '').toLowerCase().includes(query) ||
                (row.status || '').toLowerCase().includes(query);
            if (!matchesSearch) return false;
        }

        // Column filters check
        for (const [prop, filterVal] of Object.entries(state.columnFilters)) {
            if (!filterVal || filterVal === 'all') continue;
            
            let val;
            if (prop === 'warningLvl') {
                const lvl = getExpWarningLevel(row, currentTab);
                if (lvl === 'overdue') val = 'Quá hạn';
                else if (lvl === 'priority') val = 'Ưu tiên';
                else if (lvl === 'pending') val = 'Đang xử lý';
                else if (lvl === 'completed') val = 'Đã cấp / Lưu';
            } else {
                val = row[prop];
            }
            
            const rowValStr = (val || '').toString().toLowerCase().trim();
            const filterValStr = filterVal.toString().toLowerCase().trim();
            if (rowValStr !== filterValStr) return false;
        }

        return true;
    });

    // 2.5 Sort: Active (isArchived === false) first, then Archived (isArchived === true)
    // Within each group, sort chronologically by submission date (oldest first)
    filteredList.sort((a, b) => {
        const archA = a.isArchived ? 1 : 0;
        const archB = b.isArchived ? 1 : 0;
        if (archA !== archB) {
            return archA - archB;
        }
        
        const dateA = parseDate(a.submissionDate);
        const dateB = parseDate(b.submissionDate);
        
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        
        return dateA.getTime() - dateB.getTime();
    });

    // Helper to get unique column values
    const getUniqueValues = (list, prop) => {
        const vals = new Set();
        list.forEach(row => {
            let val;
            if (prop === 'warningLvl') {
                const lvl = getExpWarningLevel(row, currentTab);
                if (lvl === 'overdue') val = 'Quá hạn';
                else if (lvl === 'priority') val = 'Ưu tiên';
                else if (lvl === 'pending') val = 'Đang xử lý';
                else if (lvl === 'completed') val = 'Đã cấp / Lưu';
            } else {
                val = row[prop];
            }
            if (val && val.toString().trim() !== '') {
                vals.add(val.toString().trim());
            }
        });
        return Array.from(vals).sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }));
    };

    // 3. Render Table Headers
    const headerTr = document.getElementById('tracking-table-header');
    headerTr.innerHTML = '';

    const cols = {
        gpxk: ['STT', 'Tên sản phẩm', 'Tên xuất khẩu', 'Khách hàng', 'Quốc gia', 'Cảnh báo', 'Follower', 'Ngày nộp', 'Tình trạng', 'Mã hồ sơ', 'Số GPXK', 'Thời hạn', 'Lưu trữ'],
        cpp: ['STT', 'Tên sản phẩm', 'Tên xuất khẩu', 'Quốc gia', 'Cảnh báo', 'Phòng nhận', 'Follower', 'Ngày nộp', 'Tình trạng', 'Số CPP', 'Thời hạn', 'Lưu trữ'],
        fsc: ['STT', 'Tên sản phẩm', 'Tên xuất khẩu', 'Cảnh báo', 'Follower', 'Ngày nộp', 'Tình trạng', 'Phân loại', 'Số FSC', 'Thời hạn', 'Lưu trữ'],
        tpcn: ['STT', 'Tên sản phẩm', 'Tên xuất khẩu', 'Quốc gia', 'Yêu cầu', 'Chi tiết', 'Follower', 'Ngày nộp (DKT)', 'Tình trạng', 'Lưu trữ']
    };

    cols[currentTab].forEach(colName => {
        const th = document.createElement('th');
        const prop = COLUMN_PROPERTY_MAP[colName];
        if (prop) {
            const wrapper = document.createElement('div');
            wrapper.className = 'th-filter-wrapper';
            
            const titleSpan = document.createElement('span');
            titleSpan.innerText = colName;
            wrapper.appendChild(titleSpan);
            
            const select = document.createElement('select');
            select.className = 'header-filter-select';
            
            const defaultOpt = document.createElement('option');
            defaultOpt.value = 'all';
            defaultOpt.innerText = '▼';
            select.appendChild(defaultOpt);
            
            const uniqueVals = getUniqueValues(fullList, prop);
            uniqueVals.forEach(val => {
                const opt = document.createElement('option');
                opt.value = val;
                opt.innerText = val;
                if (state.columnFilters[prop] === val) {
                    opt.selected = true;
                }
                select.appendChild(opt);
            });
            
            if (state.columnFilters[prop] && state.columnFilters[prop] !== 'all') {
                select.style.color = '#f97316';
                select.style.fontWeight = 'bold';
            } else {
                select.style.color = 'rgba(255, 255, 255, 0.4)';
            }
            
            select.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val === 'all') {
                    delete state.columnFilters[prop];
                } else {
                    state.columnFilters[prop] = val;
                }
                renderExpDashboard();
            });
            
            wrapper.appendChild(select);
            th.appendChild(wrapper);
        } else {
            th.innerText = colName;
        }
        headerTr.appendChild(th);
    });

    // 4. Render Table Rows
    const tbody = document.getElementById('tracking-table-body');
    tbody.innerHTML = '';

    if (filteredList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${cols[currentTab].length}" style="text-align: center; color: var(--ui-text-muted); padding: 3rem;">Không tìm thấy hồ sơ nào phù hợp bộ lọc.</td></tr>`;
        return;
    }

    filteredList.forEach((row, index) => {
        const tr = document.createElement('tr');
        const warningLvl = getExpWarningLevel(row, currentTab);
        
        let warningBadge = '';
        if (warningLvl === 'overdue') warningBadge = '<span class="badge-warning-level status-overdue"><i data-lucide="alert-triangle"></i> Quá hạn</span>';
        else if (warningLvl === 'priority') warningBadge = '<span class="badge-warning-level status-priority"><i data-lucide="zap"></i> Ưu tiên</span>';
        else if (warningLvl === 'pending') warningBadge = '<span class="badge-warning-level status-pending"><i data-lucide="clock"></i> Đang xử lý</span>';
        else if (warningLvl === 'completed') warningBadge = '<span class="badge-warning-level status-completed"><i data-lucide="check"></i> Đã cấp / Lưu</span>';

        const archiveTag = row.isArchived 
            ? '<span class="source-tag tag-archived">Lưu trữ</span>' 
            : '<span class="source-tag tag-active">Đang xử lý</span>';

        // Format dates
        const dateRange = (row.issueDate || row.expiryDate) 
            ? `${row.issueDate || '...'} -> ${row.expiryDate || '...'}` 
            : 'Chưa có';

        let html = `<td>${index + 1}</td>`;

        if (currentTab === 'gpxk') {
            html += `
                <td style="font-weight: 500;">${row.name || '-'}</td>
                <td>${row.exportName || '-'}</td>
                <td>${row.customer || '-'}</td>
                <td>${row.country || '-'}</td>
                <td>${warningBadge}</td>
                <td style="color: var(--ui-text-secondary);">${row.exp || '-'}</td>
                <td>${row.submissionDate || '-'}</td>
                <td style="color: #60a5fa;">${row.status || '-'}</td>
                <td style="font-family: monospace;">${row.dossierId || '-'}</td>
                <td style="font-family: monospace; font-weight: 600; color: #3b82f6;">${row.licenseNo || '-'}</td>
                <td style="font-size: 0.75rem; white-space: nowrap;">${dateRange}</td>
                <td>${archiveTag}</td>
            `;
        } 
        else if (currentTab === 'cpp') {
            html += `
                <td style="font-weight: 500;">${row.name || '-'}</td>
                <td>${row.exportName || '-'}</td>
                <td>${row.country || '-'}</td>
                <td>${warningBadge}</td>
                <td>${row.department || '-'}</td>
                <td style="color: var(--ui-text-secondary);">${row.exp || '-'}</td>
                <td>${row.submissionDate || '-'}</td>
                <td style="color: #60a5fa;">${row.status || '-'}</td>
                <td style="font-family: monospace; font-weight: 600; color: #3b82f6;">${row.licenseNo || '-'}</td>
                <td style="font-size: 0.75rem; white-space: nowrap;">${dateRange}</td>
                <td>${archiveTag}</td>
            `;
        } 
        else if (currentTab === 'fsc') {
            html += `
                <td style="font-weight: 500;">${row.name || '-'}</td>
                <td>${row.exportName || '-'}</td>
                <td>${warningBadge}</td>
                <td style="color: var(--ui-text-secondary);">${row.exp || '-'}</td>
                <td>${row.submissionDate || '-'}</td>
                <td style="color: #60a5fa;">${row.status || '-'}</td>
                <td>${row.category || '-'}</td>
                <td style="font-family: monospace; font-weight: 600; color: #3b82f6;">${row.licenseNo || '-'}</td>
                <td style="font-size: 0.75rem; white-space: nowrap;">${dateRange}</td>
                <td>${archiveTag}</td>
            `;
        } 
        else if (currentTab === 'tpcn') {
            html += `
                <td style="font-weight: 500;">${row.name || '-'}</td>
                <td>${row.exportName || '-'}</td>
                <td>${row.country || '-'}</td>
                <td style="color: #eab308; font-weight: 500;">${row.requirement || '-'}</td>
                <td style="font-size: 0.75rem; max-width: 200px;" title="${row.details}">${row.details || '-'}</td>
                <td style="color: var(--ui-text-secondary);">${row.exp || '-'}</td>
                <td>${row.submissionDate || '-'}</td>
                <td style="color: #60a5fa;">${row.status || '-'}</td>
                <td>${archiveTag}</td>
            `;
        }

        tr.innerHTML = html;
        tbody.appendChild(tr);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Asynchronously fetch live Google Sheet tabs, parse waffle rows, and refresh tracking UI
 */
async function syncLiveExpData() {
    const syncStatus = document.getElementById('exp-sync-status');
    const syncText = document.getElementById('exp-sync-status-text');
    
    syncStatus.className = 'sync-status status-loading';
    syncText.innerText = 'Đang đồng bộ...';
    
    const tabs = {
        gpxk: '1680863359',
        gpxk_luu: '555482328',
        cpp: '0',
        cpp_luu: '859000185',
        fsc: '22130362',
        fsc_luu: '2111731030',
        tpcn: '925831271',
        tpcn_luu: '515472277'
    };
    
    const baseUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQjAv6FAtEb9yPfsZuP-55nNpo35mwrmFFGPnXNUnWCzTPTLGjKDXwWq6XG2OElpUpYsxBYB5VkyIea/pubhtml/sheet?headers=false&gid=';
    
    const newExpData = {
        gpxk: [],
        cpp: [],
        fsc: [],
        tpcn: []
    };
    
    try {
        for (const [key, gid] of Object.entries(tabs)) {
            const response = await fetch(`${baseUrl}${gid}`, { headers: { 'Cache-Control': 'no-cache' } });
            if (!response.ok) throw new Error(`Fetch failed for ${key}`);
            const htmlText = await response.text();
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            const rows = doc.querySelectorAll('table tr');
            
            const isLuu = key.endsWith('_luu');
            const targetList = key.replace('_luu', '');
            
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length < 5) return;
                
                const cleanText = (cell) => {
                    if (!cell) return '';
                    let text = cell.innerHTML || '';
                    const match = text.match(/<div class="softmerge-inner"[^>]*>(.*?)<\/div>/);
                    if (match) text = match[1];
                    text = text.replace(/<[^>]+>/g, '').trim();
                    return text.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                };
                
                const cell0 = cleanText(cells[0]);
                if (cell0 === 'STT' || cell0 === 'Tự động' || !cell0) return;
                
                const productName = cleanText(cells[1]);
                if (productName.toUpperCase() === 'EXP' || !productName) return;
                
                if (targetList === 'gpxk') {
                    if (cells.length < 11) return;
                    newExpData.gpxk.push({
                        stt: cell0,
                        name: cleanText(cells[1]),
                        exportName: cleanText(cells[2]),
                        customer: cleanText(cells[3]),
                        country: cleanText(cells[4]),
                        priority: cleanText(cells[5]),
                        exp: cleanText(cells[6]),
                        submissionDate: cleanText(cells[7]),
                        status: cleanText(cells[8]),
                        dossierId: cleanText(cells[9]),
                        licenseNo: cleanText(cells[10]),
                        issueDate: cells[11] ? cleanText(cells[11]) : '',
                        expiryDate: cells[12] ? cleanText(cells[12]) : '',
                        isArchived: isLuu
                    });
                } else if (targetList === 'cpp') {
                    if (cells.length < 9) return;
                    newExpData.cpp.push({
                        stt: cell0,
                        name: cleanText(cells[1]),
                        exportName: cleanText(cells[2]),
                        country: cleanText(cells[3]),
                        priority: cleanText(cells[4]),
                        department: cleanText(cells[5]),
                        exp: cleanText(cells[6]),
                        submissionDate: cleanText(cells[7]),
                        status: cleanText(cells[8]),
                        licenseNo: cells[9] ? cleanText(cells[9]) : '',
                        issueDate: cells[10] ? cleanText(cells[10]) : '',
                        expiryDate: cells[11] ? cleanText(cells[11]) : '',
                        isArchived: isLuu
                    });
                } else if (targetList === 'fsc') {
                    if (cells.length < 7) return;
                    newExpData.fsc.push({
                        stt: cell0,
                        name: cleanText(cells[1]),
                        exportName: cleanText(cells[2]),
                        priority: cleanText(cells[3]),
                        exp: cleanText(cells[4]),
                        submissionDate: cleanText(cells[5]),
                        status: cleanText(cells[6]),
                        category: cells[7] ? cleanText(cells[7]) : '',
                        licenseNo: cells[8] ? cleanText(cells[8]) : '',
                        issueDate: cells[9] ? cleanText(cells[9]) : '',
                        expiryDate: cells[10] ? cleanText(cells[10]) : '',
                        isArchived: isLuu
                    });
                } else if (targetList === 'tpcn') {
                    if (cells.length < 8) return;
                    newExpData.tpcn.push({
                        stt: cell0,
                        name: cleanText(cells[1]),
                        exportName: cleanText(cells[2]),
                        country: cleanText(cells[3]),
                        requirement: cleanText(cells[4]),
                        details: cleanText(cells[5]),
                        exp: cleanText(cells[6]),
                        submissionDate: cleanText(cells[7]),
                        status: cells[8] ? cleanText(cells[8]) : '',
                        isArchived: isLuu
                    });
                }
            });
        }
        
        state.expData = newExpData;
        syncStatus.className = 'sync-status status-online';
        syncText.innerText = 'Trực tuyến (Live)';
        renderExpDashboard();
        
    } catch (err) {
        console.warn('Live EXP Sync failed, falling back to cache:', err);
        syncStatus.className = 'sync-status status-fallback';
        syncText.innerText = 'Ngoại tuyến (Bộ nhớ đệm)';
        if (!state.expData && typeof EXP_FALLBACK_DATA !== 'undefined') {
            state.expData = EXP_FALLBACK_DATA;
            renderExpDashboard();
        }
    }
}
