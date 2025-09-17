// National Jacket Preview JavaScript
// Handles data fetching from webhook and display management

// Configuration
const WEBHOOK_BASE_URL = 'https://n8n.srv886746.hstgr.cloud/webhook/4763d0b4-cec6-4fa8-9e8b-9b8b5cdf7b74';
const DEFAULT_RECORD_ID = '14';

// DOM Elements
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const mainContent = document.getElementById('mainContent');
const notification = document.getElementById('notification');
const retryBtn = document.getElementById('retryBtn');

// Input elements
const orderNumberInput = document.getElementById('orderNumberInput');
const loadOrderBtn = document.getElementById('loadOrderBtn');

// Data elements
const orderId = document.getElementById('orderId');
const orderStatus = document.getElementById('orderStatus');
const statusText = document.getElementById('statusText');
const customerName = document.getElementById('customerName');
const phoneNumber = document.getElementById('phoneNumber');
const phoneCode = document.getElementById('phoneCode');
const frontLetters = document.getElementById('frontLetters');
const backName = document.getElementById('backName');
const rightSleeveDesign = document.getElementById('rightSleeveDesign');
const leftSleeveDesign = document.getElementById('leftSleeveDesign');
const jacketColor = document.getElementById('jacketColor');

// Action buttons
const refreshBtn = document.getElementById('refreshBtn');
const printBtn = document.getElementById('printBtn');
const shareBtn = document.getElementById('shareBtn');

// Global variables
let currentData = null;
let currentRecordId = DEFAULT_RECORD_ID;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    checkUrlParams();
});

// Initialize the application
function initializeApp() {
    console.log('Initializing National Jacket Preview...');
    showLoading(true);
    loadData();
}

// Setup event listeners
function setupEventListeners() {
    retryBtn.addEventListener('click', () => {
        showLoading(true);
        loadData();
    });

    refreshBtn.addEventListener('click', () => {
        showLoading(true);
        loadData();
    });

    printBtn.addEventListener('click', printReport);
    shareBtn.addEventListener('click', shareLink);

    // Order input event listeners
    loadOrderBtn.addEventListener('click', () => {
        const orderNumber = orderNumberInput.value.trim();
        if (orderNumber) {
            loadOrder(orderNumber);
        } else {
            showNotification('يرجى إدخال رقم الطلب', 'error');
        }
    });

    orderNumberInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const orderNumber = orderNumberInput.value.trim();
            if (orderNumber) {
                loadOrder(orderNumber);
            } else {
                showNotification('يرجى إدخال رقم الطلب', 'error');
            }
        }
    });

    // Input validation
    orderNumberInput.addEventListener('input', (e) => {
        // Allow only numbers
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
}

// Check URL parameters for record ID
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const recordId = urlParams.get('record_id');
    if (recordId) {
        currentRecordId = recordId;
        orderNumberInput.value = recordId;
        console.log('Record ID from URL:', currentRecordId);
    }
}

// Load order by number
function loadOrder(orderNumber) {
    if (!orderNumber || orderNumber.trim() === '') {
        showNotification('يرجى إدخال رقم الطلب', 'error');
        return;
    }

    // Validate order number (should be numeric)
    if (!/^\d+$/.test(orderNumber)) {
        showNotification('رقم الطلب يجب أن يكون رقماً صحيحاً', 'error');
        return;
    }

    currentRecordId = orderNumber.trim();
    orderNumberInput.value = currentRecordId;
    
    // Update URL without page reload
    const url = new URL(window.location);
    url.searchParams.set('record_id', currentRecordId);
    window.history.pushState({}, '', url);
    
    showLoading(true);
    loadData();
}

// Load data from webhook
async function loadData() {
    try {
        console.log('Loading data for record ID:', currentRecordId);
        
        const url = `${WEBHOOK_BASE_URL}?record_id=${currentRecordId}`;
        console.log('Fetching from URL:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Data received:', data);

        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format received');
        }

        currentData = data;
        displayData(data);
        showMainContent();
        showNotification(`تم تحميل بيانات الطلب ${currentRecordId} بنجاح`, 'success');

    } catch (error) {
        console.error('Error loading data:', error);
        showError(error.message);
        showNotification('خطأ في تحميل البيانات: ' + error.message, 'error');
    }
}

// Display data in the UI
function displayData(data) {
    try {
        // Order information
        if (data.id) {
            orderId.textContent = data.id;
        }

        // Process status
        const status = data.process_status || 'pending';
        updateOrderStatus(status);

        // Customer information
        if (data.customer_name) {
            customerName.textContent = data.customer_name;
        }

        if (data.phone) {
            phoneNumber.textContent = data.phone;
        }

        if (data.phone_code) {
            phoneCode.textContent = data.phone_code;
        }

        // Design information
        if (data.front_letters) {
            frontLetters.textContent = data.front_letters;
        }

        if (data.back_name) {
            backName.textContent = data.back_name;
        }

        if (data.right_sleeve_design) {
            rightSleeveDesign.textContent = data.right_sleeve_design;
        }

        if (data.left_sleeve_design) {
            leftSleeveDesign.textContent = data.left_sleeve_design;
        }

        if (data.jacket_color) {
            jacketColor.textContent = data.jacket_color;
        }

        console.log('Data displayed successfully');

    } catch (error) {
        console.error('Error displaying data:', error);
        showError('خطأ في عرض البيانات');
    }
}

// Update order status display
function updateOrderStatus(status) {
    const statusElement = document.getElementById('statusText');
    const statusBadge = document.getElementById('orderStatus');
    
    let statusText = '';
    let statusClass = '';

    switch (status.toLowerCase()) {
        case 'pending':
            statusText = 'قيد المراجعة';
            statusClass = 'pending';
            break;
        case 'accepted':
            statusText = 'مقبول';
            statusClass = 'accepted';
            break;
        case 'rejected':
            statusText = 'مرفوض';
            statusClass = 'rejected';
            break;
        case 'processing':
            statusText = 'قيد المعالجة';
            statusClass = 'processing';
            break;
        case 'completed':
            statusText = 'مكتمل';
            statusClass = 'completed';
            break;
        default:
            statusText = status || 'غير معروف';
            statusClass = 'unknown';
    }

    statusElement.textContent = statusText;
    statusBadge.className = `status-badge ${statusClass}`;
}

// Show loading state
function showLoading(show) {
    loadingState.style.display = show ? 'flex' : 'none';
    errorState.style.display = 'none';
    mainContent.style.display = 'none';
}

// Show error state
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    
    loadingState.style.display = 'none';
    errorState.style.display = 'flex';
    mainContent.style.display = 'none';
}

// Show main content
function showMainContent() {
    loadingState.style.display = 'none';
    errorState.style.display = 'none';
    mainContent.style.display = 'block';
}

// Print report
function printReport() {
    try {
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        
        if (!printWindow) {
            showNotification('لا يمكن فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.', 'error');
            return;
        }

        // Get the current data for printing
        const printData = currentData || {};
        
        // Create print content
        const printContent = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>تقرير معاينة السترة الوطنية</title>
                <style>
                    body {
                        font-family: 'Cairo', Arial, sans-serif;
                        direction: rtl;
                        text-align: right;
                        margin: 20px;
                        color: #333;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 2px solid #667eea;
                        padding-bottom: 20px;
                    }
                    .header h1 {
                        color: #667eea;
                        margin: 0;
                    }
                    .section {
                        margin-bottom: 25px;
                        padding: 15px;
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        background: #f9f9f9;
                    }
                    .section h2 {
                        color: #667eea;
                        margin-top: 0;
                        border-bottom: 1px solid #ddd;
                        padding-bottom: 10px;
                    }
                    .info-item {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 10px;
                        padding: 5px 0;
                    }
                    .label {
                        font-weight: bold;
                        color: #555;
                    }
                    .value {
                        color: #333;
                    }
                    .status {
                        display: inline-block;
                        padding: 5px 15px;
                        border-radius: 20px;
                        font-weight: bold;
                        color: white;
                    }
                    .status.pending { background: #ffc107; }
                    .status.accepted { background: #28a745; }
                    .status.rejected { background: #dc3545; }
                    .status.processing { background: #17a2b8; }
                    .status.completed { background: #6f42c1; }
                    @media print {
                        body { margin: 0; }
                        .section { break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>تقرير معاينة السترة الوطنية</h1>
                    <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')}</p>
                </div>

                <div class="section">
                    <h2>معلومات الطلب</h2>
                    <div class="info-item">
                        <span class="label">رقم الطلب:</span>
                        <span class="value">${printData.id || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">حالة الطلب:</span>
                        <span class="status ${printData.process_status || 'pending'}">${getStatusText(printData.process_status)}</span>
                    </div>
                </div>

                <div class="section">
                    <h2>معلومات العميل</h2>
                    <div class="info-item">
                        <span class="label">اسم العميل:</span>
                        <span class="value">${printData.customer_name || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">رقم الهاتف:</span>
                        <span class="value">${printData.phone || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">رمز الدولة:</span>
                        <span class="value">${printData.phone_code || 'غير متوفر'}</span>
                    </div>
                </div>

                <div class="section">
                    <h2>تفاصيل تصميم السترة</h2>
                    <div class="info-item">
                        <span class="label">الحروف الأمامية:</span>
                        <span class="value">${printData.front_letters || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">الاسم بالخلف:</span>
                        <span class="value">${printData.back_name || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">تصميم الكم الأيمن:</span>
                        <span class="value">${printData.right_sleeve_design || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">تصميم الكم الأيسر:</span>
                        <span class="value">${printData.left_sleeve_design || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">لون السترة:</span>
                        <span class="value">${printData.jacket_color || 'غير متوفر'}</span>
                    </div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Wait for content to load then print
        printWindow.onload = function() {
            printWindow.print();
            printWindow.close();
        };

        showNotification('تم فتح نافذة الطباعة', 'success');

    } catch (error) {
        console.error('Error printing report:', error);
        showNotification('خطأ في الطباعة: ' + error.message, 'error');
    }
}

// Share link
function shareLink() {
    try {
        const currentUrl = window.location.href;
        
        if (navigator.share) {
            // Use native share API if available
            navigator.share({
                title: 'معاينة السترة الوطنية',
                text: 'عرض تفاصيل طلب السترة الوطنية',
                url: currentUrl
            }).then(() => {
                showNotification('تم مشاركة الرابط بنجاح', 'success');
            }).catch((error) => {
                console.log('Share cancelled or failed:', error);
                fallbackShare(currentUrl);
            });
        } else {
            // Fallback to clipboard
            fallbackShare(currentUrl);
        }

    } catch (error) {
        console.error('Error sharing link:', error);
        showNotification('خطأ في مشاركة الرابط: ' + error.message, 'error');
    }
}

// Fallback share method
function fallbackShare(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            showNotification('تم نسخ الرابط إلى الحافظة', 'success');
        }).catch(() => {
            showNotification('لا يمكن نسخ الرابط تلقائياً', 'error');
        });
    } else {
        // Show URL in a prompt
        prompt('انسخ هذا الرابط:', url);
        showNotification('تم عرض الرابط للمشاركة', 'info');
    }
}

// Get status text in Arabic
function getStatusText(status) {
    switch (status?.toLowerCase()) {
        case 'pending': return 'قيد المراجعة';
        case 'accepted': return 'مقبول';
        case 'rejected': return 'مرفوض';
        case 'processing': return 'قيد المعالجة';
        case 'completed': return 'مكتمل';
        default: return status || 'غير معروف';
    }
}

// Show notification
function showNotification(message, type = 'info') {
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Utility function to format phone number
function formatPhoneNumber(phone, code) {
    if (!phone) return '-';
    if (code) {
        return `${code} ${phone}`;
    }
    return phone;
}

// Utility function to validate data
function validateData(data) {
    const requiredFields = ['id'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    return true;
}

// Debug function to log current data
window.debugData = function() {
    console.log('Current Data:', currentData);
    console.log('Current Record ID:', currentRecordId);
    return currentData;
};

// Export functions for testing
window.nationalJacketPreview = {
    loadData,
    loadOrder,
    displayData,
    updateOrderStatus,
    showNotification,
    getStatusText
};

// Make loadOrder globally available for quick action buttons
window.loadOrder = loadOrder;
