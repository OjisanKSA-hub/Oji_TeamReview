const SUPABASE_URL = 'https://pxapeabojeqcwrcfaunx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4YXBlYWJvamVxY3dyY2ZhdW54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MDU1MjcsImV4cCI6MjA2NTQ4MTUyN30.lVYtO25bgg7U1Lxhx33bxXeODcSr2AgT_80WFWQ8ooU';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4YXBlYWJvamVxY3dyY2ZhdW54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTkwNTUyNywiZXhwIjoyMDY1NDgxNTI3fQ.y4LrbiXtJw9pDTBgU0EJZLc0nw6yRx_sVQb0fcRNBe0';

let currentTeam = null;
let currentMembers = [];
let currentMember = null;
let currentNationalOrder = null;
let searchSource = null; // 'team' or 'national'

// DOM elements
const phoneInput = document.getElementById('phoneInput');
const searchBtn = document.getElementById('searchBtn');
const teamCodeSearchInput = document.getElementById('teamCodeSearchInput');
const searchByCodeBtn = document.getElementById('searchByCodeBtn');
const shareableLinkSection = document.getElementById('shareableLinkSection');
const shareableLink = document.getElementById('shareableLink');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const resultsSection = document.getElementById('resultsSection');
const teamInfo = document.getElementById('teamInfo');
const teamMembersList = document.getElementById('teamMembersList');
const memberModal = document.getElementById('memberModal');
const memberModalClose = document.getElementById('memberModalClose');
const closeMemberModalBtn = document.getElementById('closeMemberModalBtn');
const memberDetails = document.getElementById('memberDetails');
const loadingOverlay = document.getElementById('loadingOverlay');
const notification = document.getElementById('notification');

document.addEventListener('DOMContentLoaded', function () {
    setupEventListeners();
    checkUrlParams();
});

function setupEventListeners() {
    searchBtn.addEventListener('click', searchByPhone);
    phoneInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchByPhone();
    });

    searchByCodeBtn.addEventListener('click', searchByTeamCode);
    teamCodeSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchByTeamCode();
    });

    copyLinkBtn.addEventListener('click', copyShareableLink);

    memberModalClose.addEventListener('click', closeMemberModal);
    closeMemberModalBtn.addEventListener('click', closeMemberModal);
    window.addEventListener('click', (e) => {
        if (e.target === memberModal) closeMemberModal();
    });
}

function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const phone = urlParams.get('phone');
    const code = urlParams.get('code');
    if (phone) {
        phoneInput.value = phone;
        searchByPhone();
    } else if (code) {
        teamCodeSearchInput.value = code;
        searchByTeamCode();
    }
}

// ── Search ──────────────────────────────────────────────────────────

async function searchByPhone() {
    const phone = phoneInput.value.trim();
    if (!phone) {
        showNotification('يرجى إدخال رقم الهاتف', 'error');
        return;
    }

    showLoading(true);
    resetResults();

    try {
        // 1) Search team_leader_form first
        const teamData = await fetchTeamByPhone(phone);

        if (teamData && teamData.length > 0) {
            searchSource = 'team';
            const team = teamData[0];
            currentTeam = team;

            const memberTeamCode = (team.TeamCode === 0 || team.TeamCode === '0')
                ? team.old_TeamCode
                : team.TeamCode;

            let members = [];
            if (memberTeamCode) {
                members = await fetchMembersByTeamCode(memberTeamCode);
            }
            currentMembers = members || [];

            displayTeamInfo();
            displayTeamMembers();
            updateShareableLink(phone);

            resultsSection.style.display = 'block';
            showNotification(`تم العثور على النتائج (${currentMembers.length} عضو)`, 'success');
            return;
        }

        // 2) Fallback: search national_jacket_orders
        const nationalData = await fetchNationalOrderByPhone(phone);

        if (nationalData && nationalData.length > 0) {
            searchSource = 'national';
            currentNationalOrder = nationalData[0];

            displayNationalOrderInfo();
            updateShareableLink(phone);

            resultsSection.style.display = 'block';
            showNotification('تم العثور على طلب جاكيت وطني', 'success');
            return;
        }

        throw new Error('لم يتم العثور على بيانات بهذا الرقم');

    } catch (error) {
        console.error('Search error:', error);
        showNotification('خطأ في البحث: ' + error.message, 'error');
        resultsSection.style.display = 'none';
    } finally {
        showLoading(false);
    }
}

async function searchByTeamCode() {
    const code = teamCodeSearchInput.value.trim();
    if (!code) {
        showNotification('يرجى إدخال رمز المجموعة', 'error');
        return;
    }

    showLoading(true);
    resetResults();

    try {
        // Search team_leader_form where TeamCode OR old_TeamCode equals the value
        const teamData = await fetchTeamByCode(code);

        if (!teamData || teamData.length === 0) {
            throw new Error('لم يتم العثور على مجموعة بهذا الرمز');
        }

        searchSource = 'team';
        const team = teamData[0];
        currentTeam = team;

        // Fetch members checking both TeamCode and old_TeamCode
        const members = await fetchMembersByTeamCodeOrOld(code);
        currentMembers = members || [];

        displayTeamInfo();
        displayTeamMembers();
        updateShareableLinkForCode(code);

        resultsSection.style.display = 'block';
        showNotification(`تم العثور على النتائج (${currentMembers.length} عضو)`, 'success');

    } catch (error) {
        console.error('Search error:', error);
        showNotification('خطأ في البحث: ' + error.message, 'error');
        resultsSection.style.display = 'none';
    } finally {
        showLoading(false);
    }
}

function resetResults() {
    currentTeam = null;
    currentMembers = [];
    currentNationalOrder = null;
    searchSource = null;
    document.getElementById('teamInfo').style.display = 'none';
    document.getElementById('nationalOrderInfo').style.display = 'none';
}

// ── Supabase REST helpers ───────────────────────────────────────────

async function fetchTeamByPhone(phone) {
    const url = `${SUPABASE_URL}/rest/v1/team_leader_form?Phone=like.*${phone}*&select=*`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
}

async function fetchNationalOrderByPhone(phone) {
    const url = `${SUPABASE_URL}/rest/v1/national_jacket_orders?phone=like.*${phone}*&select=*`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
}

async function fetchMembersByTeamCode(teamCode) {
    const url = `${SUPABASE_URL}/rest/v1/team_member_submission?TeamCode=eq.${teamCode}&select=*`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
}

async function fetchTeamByCode(code) {
    // Match where TeamCode OR old_TeamCode equals the value
    const url = `${SUPABASE_URL}/rest/v1/team_leader_form?or=(TeamCode.eq.${code},old_TeamCode.eq.${code})&select=*`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
}

async function fetchMembersByTeamCodeOrOld(code) {
    // Match members where TeamCode OR old_TeamCode equals the value
    const url = `${SUPABASE_URL}/rest/v1/team_member_submission?or=(TeamCode.eq.${code},old_TeamCode.eq.${code})&select=*`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
}

// ── Display ─────────────────────────────────────────────────────────

function displayTeamInfo() {
    document.getElementById('teamCode').textContent = currentTeam.TeamCode ?? 'غير متوفر';
    document.getElementById('teamLeaderName').textContent = currentTeam.Name ?? 'غير متوفر';
    document.getElementById('teamLeaderPhone').textContent = currentTeam.Phone ?? 'غير متوفر';
    document.getElementById('teamMembers').textContent = currentTeam['Team Members'] ?? 'غير متوفر';
    document.getElementById('teamCountry').textContent = currentTeam.Country ?? 'غير متوفر';
    document.getElementById('teamCity').textContent = currentTeam.City ?? 'غير متوفر';
    document.getElementById('teamSquare').textContent = currentTeam.Square ?? 'غير متوفر';
    document.getElementById('teamStreet').textContent = currentTeam.Street ?? 'غير متوفر';
    document.getElementById('teamAdditionalInfo').textContent = currentTeam['Additional Info'] ?? 'غير متوفر';
    document.getElementById('teamOrderOption').textContent = currentTeam['Order Option'] ?? 'غير متوفر';
    document.getElementById('teamNotes').textContent = currentTeam.notes ?? 'غير متوفر';
    document.getElementById('teamShippingReady').textContent =
        currentTeam.is_ready_for_shipping === 'yes' ? 'نعم' : 'لا';

    // Status label
    const formStatusLabel = document.getElementById('formStatusLabel');
    let statusText = 'غير معروف';
    let statusClass = 'pending';
    switch ((currentTeam.Status || '').toLowerCase()) {
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
        default:
            statusText = currentTeam.Status || 'غير معروف';
            statusClass = 'pending';
    }
    if (formStatusLabel) {
        formStatusLabel.textContent = `حالة الطلب: ${statusText}`;
        formStatusLabel.className = `form-status-label ${statusClass}`;
    }
    document.getElementById('teamStatus').textContent = statusText;
    document.getElementById('teamStatus').className = `team-status ${statusClass}`;

    // Folder URL
    const folderURL = currentTeam['Folder URL'] || '';
    const openFolderURLBtn = document.getElementById('openFolderURLBtn');
    if (folderURL && folderURL.trim() !== '') {
        openFolderURLBtn.style.display = 'inline-block';
        openFolderURLBtn.onclick = () => window.open(folderURL, '_blank');
    } else {
        openFolderURLBtn.style.display = 'none';
    }

    // Total price
    document.getElementById('teamTotalPrice').textContent = calculateTotalPrice();

    teamInfo.style.display = 'block';
}

function displayNationalOrderInfo() {
    const order = currentNationalOrder;
    const container = document.getElementById('nationalOrderInfo');

    const statusMap = {
        'pending': 'قيد المراجعة',
        'accepted': 'مقبول',
        'rejected': 'مرفوض',
        'processing': 'قيد المعالجة',
        'completed': 'مكتمل'
    };
    const status = (order.process_status || 'pending').toLowerCase();
    const statusText = statusMap[status] || order.process_status || 'غير معروف';
    const statusClass = status;

    document.getElementById('natOrderId').textContent = order.id ?? 'غير متوفر';
    document.getElementById('natCustomerName').textContent = order.customer_name ?? 'غير متوفر';
    document.getElementById('natPhone').textContent = (order.phone_code || '') + ' ' + (order.phone || 'غير متوفر');
    document.getElementById('natFrontLetters').textContent = order.front_letters ?? 'غير متوفر';
    document.getElementById('natBackName').textContent = order.back_name ?? 'غير متوفر';
    document.getElementById('natRightSleeve').textContent = order.right_sleeve_design ?? 'غير متوفر';
    document.getElementById('natLeftSleeve').textContent = order.left_sleeve_design ?? 'غير متوفر';
    document.getElementById('natJacketColor').textContent = order.jacket_color ?? 'غير متوفر';
    document.getElementById('natJacketSize').textContent = order.jacket_size ?? 'غير متوفر';

    const statusEl = document.getElementById('natStatus');
    statusEl.textContent = statusText;
    statusEl.className = `form-status-label ${statusClass}`;

    // Link to national jacket preview page
    const previewLink = document.getElementById('natPreviewLink');
    if (order.id) {
        previewLink.href = `national-jacket-preview.html?record_id=${order.id}`;
        previewLink.style.display = 'inline-flex';
    } else {
        previewLink.style.display = 'none';
    }

    container.style.display = 'block';
}

function calculateTotalPrice() {
    if (!currentMembers || currentMembers.length === 0) return '0 ريال';
    let total = 0;
    let count = 0;
    currentMembers.forEach(m => {
        const p = parseFloat(m.FinalPrice);
        if (!isNaN(p)) { total += p; count++; }
    });
    if (count === 0) return 'غير متوفر';
    return `${total.toFixed(2)} ريال (${count} عضو)`;
}

function displayTeamMembers() {
    if (currentMembers.length === 0) {
        teamMembersList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>لا يوجد أعضاء</h3>
                <p>لم يتم العثور على أعضاء لهذا الفريق.</p>
            </div>`;
        return;
    }

    teamMembersList.innerHTML = `
        <div class="team-members-grid">
            ${currentMembers.map(m => createMemberCard(m)).join('')}
        </div>`;
}

function createMemberCard(member) {
    const statusClass = (member.Status || 'pending').toLowerCase();
    const statusText = getStatusText(statusClass);

    return `
        <div class="member-card reviewed ${statusClass}" data-member-id="${member.id}">
            <div class="member-header">
                <div class="member-name">${member.Name || member.NameBehind || 'غير متوفر'}</div>
                <div class="member-status ${statusClass}">${statusText}</div>
            </div>
            <div class="member-info">
                <div class="member-info-item">
                    <label>الهاتف:</label>
                    <span>${member.Phone || 'غير متوفر'}</span>
                </div>
                <div class="member-info-item">
                    <label>المقاس:</label>
                    <span>${member.Size || 'غير متوفر'}</span>
                </div>
                <div class="member-info-item">
                    <label>لون السترة:</label>
                    <span>${member.JacketColor || 'غير متوفر'}</span>
                </div>
            </div>
            <div class="member-actions">
                <button class="btn btn-primary" onclick="showMemberDetails(${member.id})">
                    <i class="fas fa-eye"></i> عرض
                </button>
            </div>
        </div>`;
}

function getStatusText(status) {
    switch (status) {
        case 'pending': return 'قيد المراجعة';
        case 'accepted': return 'مقبول';
        case 'rejected': return 'مرفوض';
        default: return status || 'غير معروف';
    }
}

// ── Member detail modal ─────────────────────────────────────────────

function showMemberDetails(memberId) {
    const member = currentMembers.find(m => m.id === memberId);
    if (!member) return;
    currentMember = member;
    memberDetails.innerHTML = createMemberDetailsHTML(member);
    memberModal.style.display = 'block';
}
window.showMemberDetails = showMemberDetails;

function closeMemberModal() {
    memberModal.style.display = 'none';
    currentMember = null;
}

function createMemberDetailsHTML(member) {
    const images = [];
    for (let i = 1; i <= 11; i++) {
        const url = member[`Image${i}`];
        const bb = member[`Image${i}BB`];
        const comment = member[`Image${i}Comment`];
        if (url || bb || comment) {
            images.push({ number: i, url, imageBB: bb, comment, hasImage: !!url, hasImageBB: !!bb, hasComment: !!comment });
        }
    }

    const frontImages = images.filter(img => img.number <= 2);
    const rightSleeveImages = images.filter(img => img.number >= 3 && img.number <= 6);
    const leftSleeveImages = images.filter(img => img.number >= 7 && img.number <= 10);
    const backImages = images.filter(img => img.number === 11);

    const renderImageSection = (title, imgs) => {
        if (imgs.length === 0) return '';
        return `
            <div class="section">
                <div class="section-header"><h3>${title}</h3></div>
                <div class="photos-grid">
                    ${imgs.map(img => `
                        <div class="photo-item">
                            <h4>الصورة ${img.number}</h4>
                            ${img.hasImageBB
                ? `<div class="image-preview-container">
                                        <img src="${img.imageBB}" alt="صورة ${img.number}" onerror="this.style.display='none'" crossorigin="anonymous">
                                    </div>`
                : `<div class="no-image"><i class="fas fa-image"></i><span>لا توجد صورة</span></div>`}
                            <div class="image-comment"><strong>التعليق:</strong> ${img.hasComment ? img.comment : 'لا يوجد تعليق'}</div>
                        </div>`).join('')}
                </div>
            </div>`;
    };

    return `
        <div class="member-details-container">
            ${member.SubFolder ? `
            <div class="member-folder-section">
                <h3>مجلد بيانات الطلب</h3>
                <div class="folder-item">
                    <div class="folder-info"><i class="fas fa-folder"></i><span>مجلد Google Drive</span></div>
                    <a href="${member.SubFolder}" target="_blank" class="btn btn-primary"><i class="fas fa-external-link-alt"></i> فتح المجلد</a>
                </div>
            </div>` : ''}

            <div class="member-basic-info">
                <h3>المعلومات الأساسية</h3>
                <div class="member-basic-info-grid">
                    <div class="info-item"><label>الاسم:</label><span>${member.Name || 'غير متوفر'}</span></div>
                    <div class="info-item"><label>الاسم بالخلف:</label><span>${member.NameBehind || 'غير متوفر'}</span></div>
                    <div class="info-item"><label>الهاتف:</label><span>${member.Phone || 'غير متوفر'}</span></div>
                    <div class="info-item"><label>المقاس:</label><span>${member.Size || 'غير متوفر'}</span></div>
                    <div class="info-item"><label>لون السترة:</label><span>${member.JacketColor || 'غير متوفر'}</span></div>
                    <div class="info-item"><label>لون الأكمام:</label><span>${member.SleeveColor || 'غير متوفر'}</span></div>
                    <div class="info-item"><label>لون مطاط الأكمام:</label><span>${member.SleeveRubberColor || 'غير متوفر'}</span></div>
                    <div class="info-item"><label>نوع الأكمام:</label><span>${member.SleeveType || 'غير متوفر'}</span></div>
                </div>
            </div>

            <div class="member-free-additions-section">
                <h3>الاضافات المجانية المشمولة بالسعر</h3>
                <div class="member-basic-info-grid">
                    <div class="info-item"><label>جيب مخفي:</label><span>${member.HiddenPocket || 'غير متوفر'}</span></div>
                    <div class="info-item"><label>بطانة داخلية سادة:</label><span>${member.InnerLining || 'غير متوفر'}</span></div>
                </div>
            </div>

            <div class="member-paid-additions-section">
                <h3>الإضافات المدفوعة</h3>
                <div class="member-basic-info-grid">
                    <div class="info-item"><label>قبعة ثابتة 35 ريال:</label><span>${member.FixedCap || 'غير متوفر'}</span></div>
                    <div class="info-item"><label>جلد كامل للجاكيت 50 ريال:</label><span>${member.JacketFullLeather || 'غير متوفر'}</span></div>
                    <div class="info-item"><label>تطريز بطانة 35 ريال:</label><span>${member.InnerLinningTatreez || 'غير متوفر'}</span></div>
                    <div class="info-item"><label>السعر النهائي:</label><span>${member.FinalPrice || 'غير متوفر'}</span></div>
                </div>
            </div>

            ${renderImageSection('الواجهة الأمامية (الصور 1-2)', frontImages)}
            ${renderImageSection('الأكمام اليمنى (الصور 3-6)', rightSleeveImages)}
            ${renderImageSection('الأكمام اليسرى (الصور 7-10)', leftSleeveImages)}
            ${renderImageSection('الظهر (الصورة 11)', backImages)}

            ${member.InnerLinningTatreezImage ? `
            <div class="member-tatreez-section">
                <h3>تطريز البطانة</h3>
                <div class="tatreez-image-container">
                    <div class="image-actions">
                        <a href="${member.InnerLinningTatreezImage}" target="_blank" class="btn btn-primary">
                            <i class="fas fa-external-link-alt"></i> الذهاب إلى Google Drive
                        </a>
                    </div>
                    ${member.InnerLinningTatreezImageBB ? `
                    <div class="image-preview-section">
                        <h5>معاينة صورة تطريز البطانة:</h5>
                        <div class="image-preview-container">
                            <img src="${member.InnerLinningTatreezImageBB}" alt="تطريز البطانة" onerror="this.style.display='none'">
                        </div>
                    </div>` : ''}
                    ${member.InnerlinningComment ? `
                    <div class="image-comment"><strong>تعليق البطانة:</strong> ${member.InnerlinningComment}</div>` : ''}
                </div>
            </div>` : ''}
        </div>`;
}

// ── Shareable link ──────────────────────────────────────────────────

function updateShareableLink(phone) {
    const url = new URL(window.location.href.split('?')[0]);
    url.searchParams.set('phone', phone);
    shareableLink.value = url.toString();
    shareableLinkSection.style.display = 'block';
}

function updateShareableLinkForCode(code) {
    const url = new URL(window.location.href.split('?')[0]);
    url.searchParams.set('code', code);
    shareableLink.value = url.toString();
    shareableLinkSection.style.display = 'block';
}

function copyShareableLink() {
    shareableLink.select();
    navigator.clipboard.writeText(shareableLink.value).then(() => {
        showNotification('تم نسخ الرابط بنجاح', 'success');
    }).catch(() => {
        document.execCommand('copy');
        showNotification('تم نسخ الرابط', 'success');
    });
}

// ── UI helpers ──────────────────────────────────────────────────────

function showLoading(show) {
    loadingOverlay.style.display = show ? 'block' : 'none';
}

function showNotification(message, type) {
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    setTimeout(() => notification.classList.remove('show'), 3000);
}
