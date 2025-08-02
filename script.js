// Supabase configuration
const SUPABASE_URL = 'https://pxapeabojeqcwrcfaunx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4YXBlYWJvamVxY3dyY2ZhdW54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MDU1MjcsImV4cCI6MjA2NTQ4MTUyN30.lVYtO25bgg7U1Lxhx33bxXeODcSr2AgT_80WFWQ8ooU';

// Initialize Supabase client
let supabase = null;

// Global variables
let currentTeam = null;
let currentMembers = [];
let currentMember = null;
let memberReviews = {}; // Store member review status

// DOM elements
const teamCodeInput = document.getElementById('teamCodeInput');
const loadTeamBtn = document.getElementById('loadTeamBtn');
const teamInfo = document.getElementById('teamInfo');
const teamMembersList = document.getElementById('teamMembersList');
const submitReviewBtn = document.getElementById('submitReviewBtn');

// Modal elements
const memberModal = document.getElementById('memberModal');
const memberModalClose = document.getElementById('memberModalClose');
const memberDetails = document.getElementById('memberDetails');
const rejectMemberBtn = document.getElementById('rejectMemberBtn');
const acceptMemberBtn = document.getElementById('acceptMemberBtn');

const rejectionModal = document.getElementById('rejectionModal');
const rejectionClose = document.getElementById('rejectionClose');
const rejectionComment = document.getElementById('rejectionComment');
const cancelRejectionBtn = document.getElementById('cancelRejectionBtn');
const confirmRejectionBtn = document.getElementById('confirmRejectionBtn');

const loadingOverlay = document.getElementById('loadingOverlay');
const notification = document.getElementById('notification');

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    await initializeApp();
    setupEventListeners();
    checkUrlParams();
});

// Initialize Supabase
async function initializeSupabase() {
    try {
        // Wait a bit for the script to load
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if Supabase is available globally
        if (typeof window.supabase !== 'undefined') {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase initialized successfully');
            return true;
        }
        
        // Fallback: try to import dynamically
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        return false;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Load team button
    loadTeamBtn.addEventListener('click', loadTeam);
    
    // Enter key on input
    teamCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadTeam();
        }
    });

    // Member modal controls
    memberModalClose.addEventListener('click', closeMemberModal);
    window.addEventListener('click', (e) => {
        if (e.target === memberModal) {
            closeMemberModal();
        }
    });

    // Member action buttons
    rejectMemberBtn.addEventListener('click', showRejectionModal);
    acceptMemberBtn.addEventListener('click', acceptMember);

    // Rejection modal controls
    rejectionClose.addEventListener('click', closeRejectionModal);
    cancelRejectionBtn.addEventListener('click', closeRejectionModal);
    window.addEventListener('click', (e) => {
        if (e.target === rejectionModal) {
            closeRejectionModal();
        }
    });

    confirmRejectionBtn.addEventListener('click', confirmRejection);

    // Submit review button
    submitReviewBtn.addEventListener('click', submitReview);
}

// Check URL parameters for team code
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const teamCode = urlParams.get('team');
    if (teamCode) {
        teamCodeInput.value = teamCode;
        loadTeam();
    }
}

// Load team data
async function loadTeam() {
    const teamCode = teamCodeInput.value.trim();
    if (!teamCode) {
        showNotification('يرجى إدخال رمز الفريق', 'error');
        return;
    }

    showLoading(true);
    
    try {
        // Check if supabase is initialized
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }
        
        // Fetch team leader data with status 'ready'
        const { data: team, error: teamError } = await supabase
            .from('team_leader_form')
            .select('*')
            .eq('TeamCode', teamCode)
            .eq('Status', 'ready')
            .single();
        
        if (teamError) {
            if (teamError.code === 'PGRST116') {
                throw new Error('تم مراجعة بيانات الفريق مسبقاً');
            }
            throw teamError;
        }

        currentTeam = team;
        
        // Fetch team members
        const { data: members, error: membersError } = await supabase
            .from('team_member_submission')
            .select('*')
            .eq('TeamCode', parseInt(teamCode));
        
        if (membersError) throw membersError;
        
        currentMembers = members || [];
        
        // Initialize member reviews
        currentMembers.forEach(member => {
            if (!memberReviews[member.id]) {
                memberReviews[member.id] = {
                    status: 'pending',
                    rejectionComment: null
                };
            }
        });
        
        // Display team information
        displayTeamInfo();
        displayTeamMembers();
        
        showNotification(`تم تحميل الفريق بنجاح (${currentMembers.length} عضو)`, 'success');
        
    } catch (error) {
        console.error('Error loading team:', error);
        showNotification('خطأ في تحميل الفريق: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Display team information
function displayTeamInfo() {
    document.getElementById('teamCodeDisplay').textContent = currentTeam.Code || 'غير متوفر';
    document.getElementById('teamLeaderName').textContent = currentTeam.Name || 'غير متوفر';
    document.getElementById('teamLeaderPhone').textContent = currentTeam.Phone || 'غير متوفر';
    document.getElementById('teamMembers').textContent = currentTeam['Team Members'] || 'غير متوفر';
    document.getElementById('teamCountry').textContent = currentTeam.Country || 'غير متوفر';
    document.getElementById('teamCity').textContent = currentTeam.City || 'غير متوفر';
    document.getElementById('teamSquare').textContent = currentTeam.Square || 'غير متوفر';
    document.getElementById('teamStreet').textContent = currentTeam.Street || 'غير متوفر';
    document.getElementById('teamAdditionalInfo').textContent = currentTeam['Additional Info'] || 'غير متوفر';
    document.getElementById('teamOrderOption').textContent = currentTeam['Order Option'] || 'غير متوفر';
    document.getElementById('teamJacketColor').textContent = currentTeam['Jacket Color'] || 'غير متوفر';
    document.getElementById('teamSleeveColor').textContent = currentTeam['Sleeve Color'] || 'غير متوفر';
    document.getElementById('teamSleeveRubberColor').textContent = currentTeam['Sleeve Rubber Color'] || 'غير متوفر';
    document.getElementById('teamJacketBackImage').textContent = currentTeam['Jacket Back Image'] || 'غير متوفر';
    document.getElementById('teamStatus').textContent = currentTeam.Status || 'غير متوفر';
    document.getElementById('teamFolderURL').textContent = currentTeam['Folder URL'] || 'غير متوفر';
    document.getElementById('teamCommentsForUpload').textContent = currentTeam.CommentsForUpload || 'غير متوفر';
    document.getElementById('teamJacketBackImageBB').textContent = currentTeam.JacketBackImageBB || 'غير متوفر';
    
    // Calculate and display total price
    const totalPrice = calculateTotalPrice();
    document.getElementById('teamTotalPrice').textContent = totalPrice;
    
    teamInfo.style.display = 'block';
}

// Calculate total price of all team members
function calculateTotalPrice() {
    if (!currentMembers || currentMembers.length === 0) {
        return '0 ريال';
    }
    
    let total = 0;
    let validPrices = 0;
    
    currentMembers.forEach(member => {
        const price = member.FinalPrice;
        if (price && !isNaN(parseFloat(price))) {
            total += parseFloat(price);
            validPrices++;
        }
    });
    
    if (validPrices === 0) {
        return 'غير متوفر';
    }
    
    return `${total.toFixed(2)} ريال (${validPrices} عضو)`;
}

// Display team members
function displayTeamMembers() {
    if (currentMembers.length === 0) {
        teamMembersList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>لا يوجد أعضاء</h3>
                <p>لم يتم العثور على أعضاء لهذا الفريق.</p>
            </div>
        `;
        return;
    }

    teamMembersList.innerHTML = `
        <div class="team-members-grid">
            ${currentMembers.map(member => createMemberCard(member)).join('')}
        </div>
    `;
    
    updateSubmitButton();
}

// Create member card HTML
function createMemberCard(member) {
    const review = memberReviews[member.id];
    const statusClass = review ? review.status : 'pending';
    const statusText = getStatusText(statusClass);
    
    return `
        <div class="member-card ${review && review.status !== 'pending' ? 'reviewed ' + review.status : ''}" data-member-id="${member.id}">
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
        </div>
    `;
}

// Get status text
function getStatusText(status) {
    switch(status) {
        case 'pending': return 'في الانتظار';
        case 'accepted': return 'مقبول';
        case 'rejected': return 'مرفوض';
        default: return 'غير معروف';
    }
}

// Show member details modal
async function showMemberDetails(memberId) {
    const member = currentMembers.find(m => m.id === memberId);
    if (!member) return;
    
    currentMember = member;
    
    // Populate member details
    memberDetails.innerHTML = createMemberDetailsHTML(member);
    
    // Show modal
    memberModal.style.display = 'block';
}

// Create member details HTML
function createMemberDetailsHTML(member) {
    const images = [];
    
    // Collect all 11 images (including empty ones)
    for (let i = 1; i <= 11; i++) {
        const imageUrl = member[`Image${i}`];
        const imageComment = member[`Image${i}Comment`];
        const imageBB = member[`Image${i}BB`];
        
        images.push({
            url: imageUrl,
            comment: imageComment,
            imageBB: imageBB,
            number: i,
            hasImage: !!imageUrl,
            hasComment: !!imageComment,
            hasImageBB: !!imageBB
        });
    }
    
    return `
        <div class="member-details-container">
            <div class="member-basic-info">
                <h3>المعلومات الأساسية</h3>
                <div class="member-basic-info-grid">
                    <div class="info-item">
                        <label>الاسم:</label>
                        <span>${member.Name || member.NameBehind || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <label>الهاتف:</label>
                        <span>${member.Phone || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <label>المقاس:</label>
                        <span>${member.Size || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <label>لون السترة:</label>
                        <span>${member.JacketColor || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <label>لون الأكمام:</label>
                        <span>${member.SleeveColor || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <label>لون مطاط الأكمام:</label>
                        <span>${member.SleeveRubberColor || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <label>نوع الأكمام:</label>
                        <span>${member.SleeveType || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <label>الجيب المخفي:</label>
                        <span>${member.HiddenPocket || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <label>البطانة الداخلية:</label>
                        <span>${member.InnerLining || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <label>تعليق البطانة:</label>
                        <span>${member.InnerlinningComment || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <label>تطريز البطانة:</label>
                        <span>${member.InnerLinningTatreez || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <label>تعليق تطريز البطانة:</label>
                        <span>${member.InnerLinningTatreezComment || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <label>القبعة الثابتة:</label>
                        <span>${member.FixedCap || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <label>السترة كاملة الجلد:</label>
                        <span>${member.JacketFullLeather || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <label>السعر النهائي:</label>
                        <span>${member.FinalPrice || 'غير متوفر'}</span>
                    </div>
                </div>
            </div>
            
            <div class="member-images-section">
                <h3>الصور والتعليقات</h3>
                ${images.map(img => `
                    <div class="image-item">
                        <h4>الصورة ${img.number}</h4>
                        <div class="image-container">
                                                    ${img.hasImage ? `
                            <div class="image-actions">
                                <a href="${img.url}" target="_blank" class="btn btn-primary">
                                    <i class="fas fa-external-link-alt"></i> الذهاب إلى Google Drive
                                </a>
                            </div>
                        ` : `
                            <div class="no-image">
                                <i class="fas fa-image"></i>
                                <span>لا توجد صورة</span>
                            </div>
                        `}
                        </div>
                        ${img.hasImageBB ? `
                            <div class="image-preview-section">
                                <h5>معاينة الصورة:</h5>
                                <div class="image-preview-container">
                                    <img src="${img.imageBB}" alt="معاينة صورة ${img.number}" onerror="handleImageError(this, '${img.imageBB}')" onload="handleImageSuccess(this, '${img.imageBB}')">
                                </div>
                            </div>
                        ` : ''}
                        <div class="image-comment">
                            <strong>التعليق:</strong> 
                            ${img.hasComment ? img.comment : 'لا يوجد تعليق'}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            ${member.InnerLinningTatreezImage ? `
            <div class="member-tatreez-section">
                <h3>صورة تطريز البطانة</h3>
                <div class="tatreez-image-container">
                    <div class="image-actions">
                        <a href="${member.InnerLinningTatreezImage}" target="_blank" class="btn btn-primary">
                            <i class="fas fa-external-link-alt"></i> الذهاب إلى Google Drive
                        </a>
                    </div>
                </div>
                ${member.InnerLinningTatreezImageBB ? `
                    <div class="image-preview-section">
                        <h5>معاينة صورة تطريز البطانة:</h5>
                        <div class="image-preview-container">
                            <img src="${member.InnerLinningTatreezImageBB}" alt="معاينة صورة تطريز البطانة" onerror="handleImageError(this, '${member.InnerLinningTatreezImageBB}')" onload="handleImageSuccess(this, '${member.InnerLinningTatreezImageBB}')">
                        </div>
                    </div>
                ` : ''}
            </div>
            ` : ''}
            
            ${member.SubFolder ? `
            <div class="member-folder-section">
                <h3>مجلد العضو</h3>
                <div class="folder-item">
                    <div class="folder-info">
                        <i class="fas fa-folder"></i>
                        <span>مجلد Google Drive</span>
                    </div>
                    <a href="${member.SubFolder}" target="_blank" class="btn btn-primary">
                        <i class="fas fa-external-link-alt"></i> فتح المجلد
                    </a>
                </div>
            </div>
            ` : ''}
            
            <div class="member-actions-section">
                <button class="btn btn-success" onclick="downloadMemberPDF(${member.id})">
                    <i class="fas fa-print"></i> الذهاب إلى صفحة الطباعة
                </button>
            </div>
        </div>
    `;
}

// Close member modal
function closeMemberModal() {
    memberModal.style.display = 'none';
    currentMember = null;
}

// Show rejection modal
function showRejectionModal() {
    if (!currentMember) return;
    
    rejectionComment.value = '';
    rejectionModal.style.display = 'block';
}

// Close rejection modal
function closeRejectionModal() {
    rejectionModal.style.display = 'none';
}

// Accept member
function acceptMember() {
    if (!currentMember) return;
    
    memberReviews[currentMember.id] = {
        status: 'accepted',
        rejectionComment: null
    };
    
    closeMemberModal();
    displayTeamMembers();
    showNotification('تم قبول العضو بنجاح', 'success');
}

// Confirm rejection
function confirmRejection() {
    if (!currentMember) return;
    
    const comment = rejectionComment.value.trim();
    if (!comment) {
        showNotification('يرجى إدخال سبب الرفض', 'error');
        return;
    }
    
    memberReviews[currentMember.id] = {
        status: 'rejected',
        rejectionComment: comment
    };
    
    closeRejectionModal();
    closeMemberModal();
    displayTeamMembers();
    showNotification('تم رفض العضو بنجاح', 'success');
}

// Update submit button visibility
function updateSubmitButton() {
    const reviewedCount = Object.values(memberReviews).filter(review => review.status !== 'pending').length;
    const totalCount = currentMembers.length;
    
    if (reviewedCount === totalCount && totalCount > 0) {
        submitReviewBtn.style.display = 'inline-flex';
    } else {
        submitReviewBtn.style.display = 'none';
    }
}

// Helper to fill missing/null fields for team leader
function buildFullTeamLeader(team) {
    return {
        id: team.id ?? 0,
        Code: team.Code ?? '',
        Name: team.Name ?? '',
        Phone: team.Phone ?? '',
        TeamMembers: team['Team Members'] ?? 0,
        Country: team.Country ?? '',
        City: team.City ?? '',
        Square: team.Square ?? '',
        Street: team.Street ?? '',
        AdditionalInfo: team['Additional Info'] ?? '',
        OrderOption: team['Order Option'] ?? '',
        JacketColor: team['Jacket Color'] ?? '',
        SleeveColor: team['Sleeve Color'] ?? '',
        SleeveRubberColor: team['Sleeve Rubber Color'] ?? '',
        JacketBackImage: team['Jacket Back Image'] ?? '',
        Status: team.Status ?? '',
        FolderURL: team['Folder URL'] ?? '',
        CommentsForUpload: team.CommentsForUpload ?? '',
        JacketBackImageBB: team.JacketBackImageBB ?? ''
    };
}

// Helper to fill missing/null fields for team member
function buildFullMember(member) {
    const base = {
        id: member.id ?? 0,
        TeamCode: member.TeamCode ?? '',
        Name: member.Name ?? '',
        NameBehind: member.NameBehind ?? '',
        Phone: member.Phone ?? '',
        Size: member.Size ?? '',
        JacketColor: member.JacketColor ?? '',
        SleeveColor: member.SleeveColor ?? '',
        SleeveRubberColor: member.SleeveRubberColor ?? '',
        Status: member.Status ?? '',
        rejection_comment: member.rejection_comment ?? '',
        SubFolder: member.SubFolder ?? '',
        SleeveType: member.SleeveType ?? '',
        HiddenPocket: member.HiddenPocket ?? '',
        InnerLining: member.InnerLining ?? '',
        InnerlinningComment: member.InnerlinningComment ?? '',
        InnerLinningTatreez: member.InnerLinningTatreez ?? '',
        InnerLinningTatreezImage: member.InnerLinningTatreezImage ?? '',
        InnerLinningTatreezImageBB: member.InnerLinningTatreezImageBB ?? '',
        InnerLinningTatreezComment: member.InnerLinningTatreezComment ?? '',
        FixedCap: member.FixedCap ?? '',
        JacketFullLeather: member.JacketFullLeather ?? '',
        FinalPrice: member.FinalPrice ?? ''
    };
    // Add all 11 images and comments (Google Drive)
    for (let i = 1; i <= 11; i++) {
        base[`Image${i}`] = member[`Image${i}`] ?? '';
        base[`Image${i}Comment`] = member[`Image${i}Comment`] ?? '';
    }
    // Add all 11 ImgBB images
    for (let i = 1; i <= 11; i++) {
        base[`Image${i}BB`] = member[`Image${i}BB`] ?? '';
    }
    return base;
}

// Helper to build the webhook payload
function buildWebhookPayload(team, members, memberReviews) {
    const fullTeam = buildFullTeamLeader(team);
    const allMembers = [];
    let hasRejected = false;
    for (const member of members) {
        const review = memberReviews[member.id];
        const order_status = (review && review.status === 'rejected') ? 'rejected' : 'accepted';
        if (order_status === 'rejected') hasRejected = true;
        const fullMember = {
            ...buildFullMember({ ...member, ...review }),
            order_status
        };
        allMembers.push(fullMember);
    }
    // Determine order status
    const orderStatus = hasRejected ? 'rejected' : 'accepted';
    return {
        team_leader: {
            ...fullTeam,
            order_status: orderStatus,
            members: allMembers
        }
    };
}

// Helper to send webhook
async function sendReviewWebhook(payload) {
    try {
        await fetch('https://n8n.srv886746.hstgr.cloud/webhook/0b221e41-10c4-4fab-ae55-b0875cc42c8f', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error('Failed to send webhook:', err);
    }
}

// Submit review
async function submitReview() {
    showLoading(true);
    
    try {
        const reviews = Object.values(memberReviews);
        const hasRejected = reviews.some(review => review.status === 'rejected');
        
        // Update team leader status
        const teamStatus = hasRejected ? 'rejected' : 'completed';
        const { error: teamError } = await supabase
            .from('team_leader_form')
            .update({ Status: teamStatus })
            .eq('id', currentTeam.id);
        
        if (teamError) throw teamError;
        
        // Update member statuses
        for (const [memberId, review] of Object.entries(memberReviews)) {
            const updateData = { Status: review.status };
            if (review.rejectionComment) {
                updateData.rejection_comment = review.rejectionComment;
            }
            
            const { error: memberError } = await supabase
                .from('team_member_submission')
                .update(updateData)
                .eq('id', memberId);
            
            if (memberError) throw memberError;
        }
        // --- Webhook logic ---
        const payload = buildWebhookPayload(currentTeam, currentMembers, memberReviews);
        await sendReviewWebhook(payload);
        // --- End webhook logic ---
        showNotification('تم إرسال المراجعة بنجاح', 'success');
        
        // Reset and reload
        setTimeout(() => {
            location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('Error submitting review:', error);
        showNotification('خطأ في إرسال المراجعة: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Show/hide loading overlay
function showLoading(show) {
    loadingOverlay.style.display = show ? 'block' : 'none';
}

// Show notification
function showNotification(message, type = 'info') {
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Initialize app
async function initializeApp() {
    const supabaseInitialized = await initializeSupabase();
    if (!supabaseInitialized) {
        console.error('Failed to initialize Supabase. Please check your credentials.');
        showNotification('فشل الاتصال بقاعدة البيانات، يرجى التحقق من البيانات', 'error');
        return;
    }
}

// Make functions globally available
window.showMemberDetails = showMemberDetails;

// Handle image loading errors
function handleImageError(imgElement, originalUrl) {
    // Hide the image
    imgElement.style.display = 'none';
    
    // Create error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'image-error';
    errorDiv.innerHTML = `
        <div class="no-image">
            <i class="fas fa-exclamation-triangle"></i>
            <span>لا يمكن عرض الصورة</span>
        </div>
    `;
    
    // Insert error message after the image
    imgElement.parentNode.insertBefore(errorDiv, imgElement.nextSibling);
    
    // Log for debugging
    console.log('❌ Image failed to load:', originalUrl);
}

// Handle successful image loading
function handleImageSuccess(imgElement, originalUrl) {
    console.log('✅ Image loaded successfully:', originalUrl);
}



// Download member form as PDF
async function downloadMemberPDF(memberId) {
    const member = currentMembers.find(m => m.id === memberId);
    if (!member) {
        showNotification('لم يتم العثور على العضو', 'error');
        return;
    }
    
    try {
        console.log('Opening PDF page for member:', memberId);
        
        // Encode member data for URL
        const memberData = encodeURIComponent(JSON.stringify(member));
        
        // Open the PDF page in a new tab
        const pdfUrl = `member-pdf.html?member=${memberData}`;
        window.open(pdfUrl, '_blank');
        
        showNotification('تم فتح صفحة PDF في تبويب جديد', 'success');
        
    } catch (error) {
        console.error('Error opening PDF page:', error);
        showNotification('حدث خطأ أثناء فتح صفحة PDF: ' + error.message, 'error');
    }
}

// High quality PDF download function
async function downloadMemberPDFHighQuality(memberId) {
    const member = currentMembers.find(m => m.id === memberId);
    if (!member) {
        showNotification('لم يتم العثور على العضو', 'error');
        return;
    }
    
    try {
        console.log('Opening high-quality PDF page for member:', memberId);
        
        // Encode member data for URL
        const memberData = encodeURIComponent(JSON.stringify(member));
        
        // Open the PDF page in a new tab
        const pdfUrl = `member-pdf.html?member=${memberData}`;
        window.open(pdfUrl, '_blank');
        
        showNotification('تم فتح صفحة PDF في تبويب جديد', 'success');
        
    } catch (error) {
        console.error('Error opening PDF page:', error);
        showNotification('حدث خطأ أثناء فتح صفحة PDF: ' + error.message, 'error');
    }
}

// Debug function to check modal content
function debugModalContent() {
    const modalContent = document.querySelector('.modal-content');
    if (!modalContent) {
        console.error('Modal content not found');
        return;
    }
    
    console.log('Modal content dimensions:', {
        width: modalContent.scrollWidth,
        height: modalContent.scrollHeight,
        offsetWidth: modalContent.offsetWidth,
        offsetHeight: modalContent.offsetHeight
    });
    
    const images = modalContent.querySelectorAll('img');
    console.log(`Found ${images.length} images in modal`);
    
    images.forEach((img, index) => {
        console.log(`Image ${index + 1}:`, {
            src: img.src,
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            width: img.width,
            height: img.height
        });
    });
    
    const buttons = modalContent.querySelectorAll('button, a.btn');
    console.log(`Found ${buttons.length} buttons in modal`);
    
    return modalContent;
}

// Fallback PDF generation method with structured content
async function generateStructuredPDF(member) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Set RTL support
    doc.setR2L(true);
    
    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    // Title
    doc.setFontSize(18);
    doc.setFont('Arial', 'bold');
    doc.text('نموذج العضو', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;
    
    // Basic info
    doc.setFontSize(12);
    doc.setFont('Arial', 'bold');
    doc.text('المعلومات الأساسية:', margin, yPosition);
    yPosition += 10;
    
    doc.setFont('Arial', 'normal');
    const basicInfo = [
        `الاسم: ${member.Name || member.NameBehind || 'غير متوفر'}`,
        `الهاتف: ${member.Phone || 'غير متوفر'}`,
        `المقاس: ${member.Size || 'غير متوفر'}`,
        `لون السترة: ${member.JacketColor || 'غير متوفر'}`,
        `لون الأكمام: ${member.SleeveColor || 'غير متوفر'}`,
        `لون مطاط الأكمام: ${member.SleeveRubberColor || 'غير متوفر'}`,
        `نوع الأكمام: ${member.SleeveType || 'غير متوفر'}`,
        `الجيب المخفي: ${member.HiddenPocket || 'غير متوفر'}`,
        `البطانة الداخلية: ${member.InnerLining || 'غير متوفر'}`,
        `تعليق البطانة: ${member.InnerlinningComment || 'غير متوفر'}`,
        `تطريز البطانة: ${member.InnerLinningTatreez || 'غير متوفر'}`,
        `تعليق تطريز البطانة: ${member.InnerLinningTatreezComment || 'غير متوفر'}`,
        `القبعة الثابتة: ${member.FixedCap || 'غير متوفر'}`,
        `السترة كاملة الجلد: ${member.JacketFullLeather || 'غير متوفر'}`,
        `السعر النهائي: ${member.FinalPrice || 'غير متوفر'}`
    ];
    
    for (const info of basicInfo) {
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }
        doc.text(info, margin, yPosition);
        yPosition += 8;
    }
    
    // Images section
    yPosition += 10;
    doc.setFont('Arial', 'bold');
    doc.text('الصور والتعليقات:', margin, yPosition);
    yPosition += 10;
    
    doc.setFont('Arial', 'normal');
    for (let i = 1; i <= 11; i++) {
        const imageUrl = member[`Image${i}`];
        const imageComment = member[`Image${i}Comment`];
        const imageBB = member[`Image${i}BB`];
        
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.text(`الصورة ${i}:`, margin, yPosition);
        yPosition += 5;
        
        if (imageUrl) {
            doc.text(`رابط Google Drive: ${imageUrl}`, margin + 10, yPosition);
            yPosition += 5;
        }
        
        if (imageBB) {
            doc.text(`رابط الصورة: ${imageBB}`, margin + 10, yPosition);
            yPosition += 5;
        }
        
        if (imageComment) {
            doc.text(`التعليق: ${imageComment}`, margin + 10, yPosition);
            yPosition += 5;
        }
        
        yPosition += 5;
    }
    
    // Special images
    if (member.InnerLinningTatreezImage) {
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFont('Arial', 'bold');
        doc.text('صورة تطريز البطانة:', margin, yPosition);
        yPosition += 5;
        
        doc.setFont('Arial', 'normal');
        doc.text(`رابط Google Drive: ${member.InnerLinningTatreezImage}`, margin + 10, yPosition);
        yPosition += 5;
    }
    
    if (member.InnerLinningTatreezImageBB) {
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.text(`رابط الصورة: ${member.InnerLinningTatreezImageBB}`, margin + 10, yPosition);
        yPosition += 5;
    }
    
    // Save PDF
    const fileName = `member_${member.id}_${member.Name || member.NameBehind || 'unknown'}_structured.pdf`;
    doc.save(fileName);
}

// Test function for PDF generation (can be called from console)
window.testPDFGeneration = async function(memberId) {
    console.log('Testing PDF generation for member:', memberId);
    try {
        await downloadMemberPDF(memberId);
    } catch (error) {
        console.error('PDF generation test failed:', error);
    }
};

// Test function for debugging PDF generation
window.testPDFStepByStep = async function(memberId) {
    console.log('=== PDF Generation Step-by-Step Test ===');
    
    try {
        // Step 1: Find member
        const member = currentMembers.find(m => m.id === memberId);
        if (!member) {
            console.error('❌ Member not found');
            return;
        }
        console.log('✅ Member found:', member.Name || member.NameBehind);
        
        // Step 2: Open modal
        if (memberModal.style.display !== 'block') {
            showMemberDetails(memberId);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('✅ Modal opened');
        
        // Step 3: Check modal content
        const modalContent = document.querySelector('.modal-content');
        if (!modalContent) {
            console.error('❌ Modal content not found');
            return;
        }
        console.log('✅ Modal content found');
        
        // Step 4: Check html2canvas availability
        if (typeof html2canvas === 'undefined') {
            console.error('❌ html2canvas not loaded');
            return;
        }
        console.log('✅ html2canvas available');
        
        // Step 5: Test simple capture
        console.log('🔄 Testing simple html2canvas capture...');
        const testCanvas = await html2canvas(modalContent, {
            scale: 1.0,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: true
        });
        
        console.log('✅ Canvas created:', {
            width: testCanvas.width,
            height: testCanvas.height
        });
        
        // Step 6: Check canvas content
        const ctx = testCanvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, testCanvas.width, testCanvas.height);
        const hasContent = imageData.data.some(pixel => pixel !== 0);
        
        if (hasContent) {
            console.log('✅ Canvas has content');
        } else {
            console.error('❌ Canvas is empty');
        }
        
        // Step 7: Test data URL conversion
        const imgData = testCanvas.toDataURL('image/png');
        console.log('✅ Data URL created, length:', imgData.length);
        
        if (imgData.length > 100) {
            console.log('✅ Data URL looks valid');
        } else {
            console.error('❌ Data URL too small');
        }
        
        console.log('=== Test completed ===');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

 
