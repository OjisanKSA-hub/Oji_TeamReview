// Supabase configuration
const SUPABASE_URL = 'https://pxapeabojeqcwrcfaunx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4YXBlYWJvamVxY3dyY2ZhdW54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MDU1MjcsImV4cCI6MjA2NTQ4MTUyN30.lVYtO25bgg7U1Lxhx33bxXeODcSr2AgT_80WFWQ8ooU';

// Service role key for database access (bypasses RLS completely)
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4YXBlYWJvamVxY3dyY2ZhdW54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTkwNTUyNywiZXhwIjoyMDY1NDgxNTI3fQ.y4LrbiXtJw9pDTBgU0EJZLc0nw6yRx_sVQb0fcRNBe0';

// Initialize Supabase client
let supabase = null;

// Global variables
let currentTeam = null;
let currentMembers = [];
let currentMember = null;
let memberReviews = {}; // Store member review status

// Function to handle image loading errors
function handleImageError(img, fallbackSrc) {
    img.style.display = 'none';
    console.log('Image failed to load:', img.src);
}

// Function to handle successful image loading
function handleImageSuccess(img, src) {
    console.log('Image loaded successfully:', src);
}

// DOM elements
const teamCodeInput = document.getElementById('teamCodeInput');
const loadTeamBtn = document.getElementById('loadTeamBtn');
const teamInfo = document.getElementById('teamInfo');
const teamMembersList = document.getElementById('teamMembersList');
const submitReviewBtn = document.getElementById('submitReviewBtn');
const resubmitBtn = document.getElementById('resubmitBtn');

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
            supabase = window.supabase.createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
            
            console.log('Supabase initialized successfully with service role key');
            return true;
        }
        
        // Fallback: try to import dynamically
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
        
        console.log('Supabase initialized successfully with service role key');
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
    
    // Resubmit button
    resubmitBtn.addEventListener('click', resubmitOrder);
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
        let team, members;
        
        // Use direct REST API calls with service role key as primary method
        try {
            console.log('Fetching team data with service role key...');
            team = await fetchTeamWithServiceRole(teamCode);
            if (!team) {
                throw new Error('لم يتم العثور على بيانات الفريق');
            }
            
            console.log('Fetching members data with service role key...');
            members = await fetchMembersWithServiceRole(teamCode);
            
        } catch (restError) {
            console.warn('Direct REST API failed, trying Supabase client:', restError);
            
            // Fallback to Supabase client
            const supabaseWithAuth = await getSupabaseWithAuth();
            
            // Fetch team leader data regardless of status
            const { data: teamData, error: teamError } = await supabaseWithAuth
                .from('team_leader_form')
                .select('*')
                .eq('TeamCode', teamCode)
                .single();
            
            if (teamError) {
                if (teamError.code === 'PGRST116') {
                    throw new Error('لم يتم العثور على بيانات الفريق');
                }
                throw teamError;
            }
            
            team = teamData;

            // Fetch team members (only pending and accepted)
            const { data: membersData, error: membersError } = await supabaseWithAuth
                .from('team_member_submission')
                .select('*')
                .eq('TeamCode', parseInt(teamCode))
                .in('Status', ['pending', 'accepted']);
            
            if (membersError) throw membersError;
            members = membersData;
        }
        
        currentTeam = team;
        currentMembers = members || [];

        // Initialize member reviews
        currentMembers.forEach(member => {
            if (!memberReviews[member.id]) {
                // Check if member is already accepted or rejected from database
                if (member.Status === 'accepted') {
                    memberReviews[member.id] = {
                        status: 'accepted',
                        rejectionComment: null,
                        locked: true // Mark as locked to prevent changes
                    };
                } else if (member.Status === 'rejected') {
                    memberReviews[member.id] = {
                        status: 'rejected',
                        rejectionComment: member.rejection_comment || null,
                        locked: true // Mark as locked to prevent changes
                    };
                } else {
                    memberReviews[member.id] = {
                        status: 'pending',
                        rejectionComment: null,
                        locked: false
                    };
                }
            }
        });

        // Display team information
        displayTeamInfo();
        displayTeamMembers();

        // Show/hide review button and show status if not pending
        if (currentTeam.Status === 'accepted' || currentTeam.Status === 'rejected') {
            // Hide review button
            submitReviewBtn.style.display = 'none';
            // Show status in the index (teamInfo)
            const statusElem = document.getElementById('teamStatus');
            if (statusElem) {
                statusElem.textContent = currentTeam.Status === 'accepted' ? 'مقبول' : 'مرفوض';
                statusElem.className = 'team-status ' + currentTeam.Status;
            }
            showNotification('تمت مراجعة هذا الفريق مسبقاً. يمكنك فقط عرض وطباعة الطلبات.', 'info');
        } else {
            // Pending: keep current workflow
            updateSubmitButton();
        }

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
    document.getElementById('teamCode').textContent = currentTeam.TeamCode || 'غير متوفر';
    document.getElementById('teamLeaderName').textContent = currentTeam.Name || 'غير متوفر';
    document.getElementById('teamLeaderPhone').textContent = currentTeam.Phone || 'غير متوفر';
    document.getElementById('teamMembers').textContent = currentTeam['Team Members'] || 'غير متوفر';
    document.getElementById('teamCountry').textContent = currentTeam.Country || 'غير متوفر';
    document.getElementById('teamCity').textContent = currentTeam.City || 'غير متوفر';
    document.getElementById('teamSquare').textContent = currentTeam.Square || 'غير متوفر';
    document.getElementById('teamStreet').textContent = currentTeam.Street || 'غير متوفر';
    document.getElementById('teamAdditionalInfo').textContent = currentTeam['Additional Info'] || 'غير متوفر';
    document.getElementById('teamOrderOption').textContent = currentTeam['Order Option'] || 'غير متوفر';
    
    // Set form status label
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
    // Also update the old teamStatus span for compatibility
    document.getElementById('teamStatus').textContent = statusText;
    document.getElementById('teamStatus').className = `team-status ${statusClass}`;
    
    // Show/hide resubmit button based on status
    const resubmitSection = document.getElementById('resubmitSection');
    if ((currentTeam.Status || '').toLowerCase() === 'rejected') {
        resubmitSection.style.display = 'block';
    } else {
        resubmitSection.style.display = 'none';
    }
    
    // Handle Folder URL with button
    const folderURL = currentTeam['Folder URL'] || '';
    
    // Show/hide Folder URL button based on link availability
    const openFolderURLBtn = document.getElementById('openFolderURLBtn');
    if (folderURL && folderURL.trim() !== '') {
        openFolderURLBtn.style.display = 'inline-block';
        openFolderURLBtn.onclick = () => window.open(folderURL, '_blank');
    } else {
        openFolderURLBtn.style.display = 'none';
    }
    

    
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
    const isLocked = review && review.locked;
    
    return `
        <div class="member-card ${review && review.status !== 'pending' ? 'reviewed ' + review.status : ''} ${isLocked ? 'locked' : ''}" data-member-id="${member.id}">
            <div class="member-header">
                <div class="member-name">${member.Name || member.NameBehind || 'غير متوفر'}</div>
                <div class="member-status ${statusClass}">
                    ${statusText}
                    ${isLocked ? '<i class="fas fa-lock" title="مقبول مسبقاً - لا يمكن التعديل"></i>' : ''}
                </div>
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
                    <i class="fas fa-eye"></i> ${isLocked ? 'عرض فقط' : 'عرض'}
                </button>
            </div>
        </div>
    `;
}

// Get status text
function getStatusText(status) {
    switch(status) {
        case 'pending': return 'قيد المراجعة';
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
    
    // Check if member is locked (already accepted from database)
    const review = memberReviews[member.id];
    const isLocked = review && review.locked;
    
    // Show/hide action buttons based on lock status
    if (isLocked) {
        // Hide accept/reject buttons for locked members
        acceptMemberBtn.style.display = 'none';
        rejectMemberBtn.style.display = 'none';
        // Show notification for locked member
        showNotification('هذا العضو مقبول مسبقاً - يمكنك فقط عرض البيانات وطباعة الطلب', 'info');
    } else {
        // Show accept/reject buttons for unlocked members
        acceptMemberBtn.style.display = 'inline-flex';
        rejectMemberBtn.style.display = 'inline-flex';
    }
    
    // Show modal
    memberModal.style.display = 'block';
}

// Create member details HTML with organized photos but keeping original field sections
function createMemberDetailsHTML(member) {
    // Create images array
    const images = [];
    for (let i = 1; i <= 11; i++) {
        const imageUrl = member[`Image${i}`];
        const imageBB = member[`Image${i}BB`];
        const imageComment = member[`Image${i}Comment`];
        
        if (imageUrl || imageBB || imageComment) {
            images.push({
                number: i,
                url: imageUrl,
                imageBB: imageBB,
                comment: imageComment,
                hasImage: !!imageUrl,
                hasImageBB: !!imageBB,
                hasComment: !!imageComment
            });
        }
    }

    // Filter images by sections
    const frontImages = images.filter(img => img.number <= 2);
    const rightSleeveImages = images.filter(img => img.number >= 3 && img.number <= 6);
    const leftSleeveImages = images.filter(img => img.number >= 7 && img.number <= 10);
    const backImages = images.filter(img => img.number === 11);

    return `
        <div class="member-details-container">
            ${member.SubFolder ? `
            <div class="member-folder-section">
                <h3>مجلد بيانات الطلب</h3>
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
            
            <div class="member-basic-info">
                <h3>المعلومات الأساسية</h3>
                <div class="member-basic-info-grid">
                    <div class="info-item">
                        <label>الاسم:</label>
                        <span>${member.Name || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <label>الاسم بالخلف:</label>
                        <span>${member.NameBehind || 'غير متوفر'}</span>
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
                </div>
            </div>
            
            <!-- الاضافات المجانية -->
            <div class="member-free-additions-section">
                <h3>الاضافات المجانية المشمولة بالسعر</h3>
                <div class="member-basic-info-grid">
                    <div class="info-item">
                        <label>جيب مخفي:</label>
                        <span>${member.HiddenPocket || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <label>بطانة داخلية سادة:</label>
                        <span>${member.InnerLining || 'غير متوفر'}</span>
                    </div>
                </div>
            </div>
            
            <!-- الاضافات المدفوعة -->
            <div class="member-paid-additions-section">
                <h3>الإضافات المدفوعة</h3>
                <div class="member-basic-info-grid">
                    <div class="info-item">
                        <label>قبعة ثابتة 35 ريال:</label>
                        <span>${member.FixedCap || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <label>جلد كامل للجاكيت 50 ريال:</label>
                        <span>${member.JacketFullLeather || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <label>تطريز بطانة 35 ريال:</label>
                        <span>${member.InnerLinningTatreez || 'غير متوفر'}</span>
                    </div>
                    <div class="info-item">
                        <label>السعر النهائي:</label>
                        <span>${member.FinalPrice || 'غير متوفر'}</span>
                    </div>
                </div>
            </div>

            <!-- Section 1: Front Photos (1 & 2) -->
            <div class="section">
                <div class="section-header">
                    <h3>الواجهة الأمامية (الصور 1-2)</h3>
                </div>
                <div class="photos-grid">
                    ${frontImages.map(img => `
                        <div class="photo-item">
                            <h4>الصورة ${img.number}</h4>
                            ${img.hasImageBB ? `
                                <div class="image-preview-container">
                                    <img src="${img.imageBB}" alt="صورة ${img.number}" onerror="handleImageError(this, '${img.imageBB}')" onload="handleImageSuccess(this, '${img.imageBB}')" crossorigin="anonymous">
                                </div>
                            ` : `
                                <div class="no-image">
                                    <i class="fas fa-image"></i>
                                    <span>لا توجد صورة</span>
                                </div>
                            `}
                            <div class="image-comment">
                                <strong>التعليق:</strong> 
                                ${img.hasComment ? img.comment : 'لا يوجد تعليق'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Section 2: Right Sleeves (Photos 3-6) -->
            <div class="section">
                <div class="section-header">
                    <h3>الأكمام اليمنى (الصور 3-6)</h3>
                </div>
                <div class="photos-grid">
                    ${rightSleeveImages.map(img => `
                        <div class="photo-item">
                            <h4>الصورة ${img.number}</h4>
                            ${img.hasImageBB ? `
                                <div class="image-preview-container">
                                    <img src="${img.imageBB}" alt="صورة ${img.number}" onerror="handleImageError(this, '${img.imageBB}')" onload="handleImageSuccess(this, '${img.imageBB}')" crossorigin="anonymous">
                                </div>
                            ` : `
                                <div class="no-image">
                                    <i class="fas fa-image"></i>
                                    <span>لا توجد صورة</span>
                                </div>
                            `}
                            <div class="image-comment">
                                <strong>التعليق:</strong> 
                                ${img.hasComment ? img.comment : 'لا يوجد تعليق'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Section 3: Left Sleeves (Photos 7-10) -->
            <div class="section">
                <div class="section-header">
                    <h3>الأكمام اليسرى (الصور 7-10)</h3>
                </div>
                <div class="photos-grid">
                    ${leftSleeveImages.map(img => `
                        <div class="photo-item">
                            <h4>الصورة ${img.number}</h4>
                            ${img.hasImageBB ? `
                                <div class="image-preview-container">
                                    <img src="${img.imageBB}" alt="صورة ${img.number}" onerror="handleImageError(this, '${img.imageBB}')" onload="handleImageSuccess(this, '${img.imageBB}')" crossorigin="anonymous">
                                </div>
                            ` : `
                                <div class="no-image">
                                    <i class="fas fa-image"></i>
                                    <span>لا توجد صورة</span>
                                </div>
                            `}
                            <div class="image-comment">
                                <strong>التعليق:</strong> 
                                ${img.hasComment ? img.comment : 'لا يوجد تعليق'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Section 4: Back (Photo 11) -->
            <div class="section">
                <div class="section-header">
                    <h3>الظهر (الصورة 11)</h3>
                </div>
                <div class="photos-grid">
                    ${backImages.map(img => `
                        <div class="photo-item">
                            <h4>الصورة ${img.number}</h4>
                            ${img.hasImageBB ? `
                                <div class="image-preview-container">
                                    <img src="${img.imageBB}" alt="صورة ${img.number}" onerror="handleImageError(this, '${img.imageBB}')" onload="handleImageSuccess(this, '${img.imageBB}')" crossorigin="anonymous">
                                </div>
                            ` : `
                                <div class="no-image">
                                    <i class="fas fa-image"></i>
                                    <span>لا توجد صورة</span>
                                </div>
                            `}
                            <div class="image-comment">
                                <strong>التعليق:</strong> 
                                ${img.hasComment ? img.comment : 'لا يوجد تعليق'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
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
                                <img src="${member.InnerLinningTatreezImageBB}" alt="معاينة صورة تطريز البطانة" onerror="handleImageError(this, '${member.InnerLinningTatreezImageBB}')" onload="handleImageSuccess(this, '${member.InnerLinningTatreezImageBB}')">
                            </div>
                        </div>
                    ` : ''}
                    ${member.InnerlinningComment ? `
                        <div class="image-comment">
                            <strong>تعليق البطانة:</strong> 
                            ${member.InnerlinningComment}
                        </div>
                    ` : ''}
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
    
    // Check if member is locked (already accepted from database)
    const review = memberReviews[currentMember.id];
    if (review && review.locked) {
        showNotification('لا يمكن تغيير حالة العضو المقبول مسبقاً', 'error');
        return;
    }
    
    memberReviews[currentMember.id] = {
        status: 'accepted',
        rejectionComment: null,
        locked: false
    };
    
    closeMemberModal();
    displayTeamMembers();
    showNotification('تم قبول العضو بنجاح', 'success');
}

// Confirm rejection
function confirmRejection() {
    if (!currentMember) return;
    
    // Check if member is locked (already accepted from database)
    const review = memberReviews[currentMember.id];
    if (review && review.locked) {
        showNotification('لا يمكن تغيير حالة العضو المقبول مسبقاً', 'error');
        closeRejectionModal();
        return;
    }
    
    const comment = rejectionComment.value.trim();
    if (!comment) {
        showNotification('يرجى إدخال سبب الرفض', 'error');
        return;
    }
    
    memberReviews[currentMember.id] = {
        status: 'rejected',
        rejectionComment: comment,
        locked: false
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

// Resubmit order (change status from rejected to pending)
async function resubmitOrder() {
    if (!currentTeam || !currentTeam.TeamCode) {
        showNotification('خطأ: لم يتم العثور على رمز المجموعة', 'error');
        return;
    }
    
    // Confirm action
    if (!confirm('هل أنت متأكد من إعادة تقديم هذا الطلب؟ سيتم تغيير الحالة إلى "قيد المراجعة".')) {
        return;
    }
    
    // Disable the button to prevent double requests
    const originalText = resubmitBtn.innerHTML;
    resubmitBtn.disabled = true;
    resubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
    
    showLoading(true);
    
    try {
        // Step 1: Call the webhook with teamcode
        console.log('Calling resubmit webhook with teamcode:', currentTeam.TeamCode);
        const webhookUrl = 'https://n8n.srv886746.hstgr.cloud/webhook/01616c13-c703-4eff-9bd0-7368f11e56bd';
        
        const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teamcode: currentTeam.TeamCode
            })
        });
        
        if (!webhookResponse.ok) {
            throw new Error(`فشل الاتصال بالخادم: ${webhookResponse.status}`);
        }
        
        console.log('Webhook called successfully');
        
        // Step 2: Update the team status to pending in the database
        console.log('Updating team status to pending...');
        
        try {
            await updateTeamStatusWithServiceRole(currentTeam.id, 'pending');
        } catch (restError) {
            console.warn('Direct REST API failed, trying Supabase client:', restError);
            
            // Fallback to Supabase client
            const supabaseWithAuth = await getSupabaseWithAuth();
            const { error: teamError } = await supabaseWithAuth
                .from('team_leader_form')
                .update({ Status: 'pending' })
                .eq('id', currentTeam.id);
            
            if (teamError) throw teamError;
        }
        
        showNotification('تم إعادة تقديم الطلب بنجاح! سيتم تحديث الصفحة...', 'success');
        
        // Update button to show success
        resubmitBtn.innerHTML = '<i class="fas fa-check"></i> تم بنجاح';
        
        // Reload the page after a short delay
        setTimeout(() => {
            location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('Error resubmitting order:', error);
        showNotification('خطأ في إعادة تقديم الطلب: ' + error.message, 'error');
        
        // Re-enable the button on error
        resubmitBtn.disabled = false;
        resubmitBtn.innerHTML = originalText;
    } finally {
        showLoading(false);
    }
}

// Submit review
async function submitReview() {
    // Disable the submit button to prevent double requests
    const originalText = submitReviewBtn.innerHTML;
    submitReviewBtn.disabled = true;
    submitReviewBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
    submitReviewBtn.classList.add('loading');
    
    showLoading(true);
    
    try {
        const reviews = Object.values(memberReviews);
        const hasRejected = reviews.some(review => review.status === 'rejected');
        
        // Use direct REST API calls with service role key as primary method
        try {
            console.log('Updating team status with service role key...');
            const teamStatus = hasRejected ? 'rejected' : 'accepted';
            await updateTeamStatusWithServiceRole(currentTeam.id, teamStatus);
            
            console.log('Updating member statuses with service role key...');
            // Update member statuses
            for (const [memberId, review] of Object.entries(memberReviews)) {
                const updateData = { Status: review.status };
                if (review.rejectionComment) {
                    updateData.rejection_comment = review.rejectionComment;
                }
                
                await updateMemberStatusWithServiceRole(memberId, updateData);
            }
            
        } catch (restError) {
            console.warn('Direct REST API failed, trying Supabase client:', restError);
            
            // Fallback to Supabase client
            const supabaseWithAuth = await getSupabaseWithAuth();
            
            // Update team leader status
            const teamStatus = hasRejected ? 'rejected' : 'accepted';
            const { error: teamError } = await supabaseWithAuth
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
                
                const { error: memberError } = await supabaseWithAuth
                    .from('team_member_submission')
                    .update(updateData)
                    .eq('id', memberId);
                
                if (memberError) throw memberError;
            }
        }
        // --- Webhook logic ---
        const payload = buildWebhookPayload(currentTeam, currentMembers, memberReviews);
        await sendReviewWebhook(payload);
        // --- End webhook logic ---
        showNotification('تم إرسال المراجعة بنجاح', 'success');
        
        // Update button text to show success state
        submitReviewBtn.innerHTML = '<i class="fas fa-check"></i> تم الإرسال بنجاح';
        
        // Reset and reload after delay
        setTimeout(() => {
            location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('Error submitting review:', error);
        showNotification('خطأ في إرسال المراجعة: ' + error.message, 'error');
        
        // Re-enable the button on error
        submitReviewBtn.disabled = false;
        submitReviewBtn.innerHTML = originalText;
        submitReviewBtn.classList.remove('loading');
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

// Helper function to ensure service role key is used for all database calls
async function getSupabaseWithAuth() {
    if (!supabase) {
        throw new Error('Supabase client not initialized');
    }
    
    // The service role key should already be set in the client initialization
    // No need to set auth session or headers manually
    return supabase;
}

// Alternative approach: Create a custom fetch function that always includes JWT
async function supabaseFetch(endpoint, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'apikey': SUPABASE_ANON_KEY
    };
    
    const response = await fetch(url, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
}

// Direct REST API functions with service role key
async function fetchTeamWithServiceRole(teamCode) {
    const url = `${SUPABASE_URL}/rest/v1/team_leader_form?TeamCode=eq.${teamCode}&select=*`;
    
    console.log('Fetching team from URL:', url);
    console.log('Using service role key:', SERVICE_ROLE_KEY.substring(0, 20) + '...');
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
        }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Team data received:', data);
    return data[0]; // Return first (and should be only) result
}

async function fetchMembersWithServiceRole(teamCode) {
    const url = `${SUPABASE_URL}/rest/v1/team_member_submission?TeamCode=eq.${teamCode}&Status=in.(pending,accepted)&select=*`;
    
    console.log('Fetching members from URL:', url);
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
        }
    });
    
    console.log('Members response status:', response.status);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Members error response body:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Members data received:', data);
    return data;
}

async function updateTeamStatusWithServiceRole(teamId, status) {
    const url = `${SUPABASE_URL}/rest/v1/team_leader_form?id=eq.${teamId}`;
    
    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ Status: status })
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
}

async function updateMemberStatusWithServiceRole(memberId, updateData) {
    const url = `${SUPABASE_URL}/rest/v1/team_member_submission?id=eq.${memberId}`;
    
    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
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

// Debug function to check member status
window.debugMemberStatus = function() {
    console.log('=== Member Status Debug ===');
    console.log('Current Members:', currentMembers);
    console.log('Member Reviews:', memberReviews);
    
    currentMembers.forEach(member => {
        const review = memberReviews[member.id];
        console.log(`Member ${member.id} (${member.Name || member.NameBehind}):`, {
            dbStatus: member.Status,
            reviewStatus: review ? review.status : 'none',
            locked: review ? review.locked : false
        });
    });
};

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

// Generate a unique ID for storing member data
function generateMemberDataId() {
    return 'member_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Store member data in localStorage and return the ID
function storeMemberData(member) {
    const dataId = generateMemberDataId();
    const memberData = {
        member: member,
        timestamp: Date.now()
    };
    
    try {
        localStorage.setItem(dataId, JSON.stringify(memberData));
        return dataId;
    } catch (error) {
        console.error('Error storing member data in localStorage:', error);
        // Fallback: if localStorage fails, use URL parameters but with a warning
        showNotification('تحذير: البيانات كبيرة جداً، قد لا تفتح الصفحة بشكل صحيح', 'warning');
        return null;
    }
}

// Clean up old member data from localStorage (older than 1 hour)
function cleanupOldMemberData() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('member_')) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data.timestamp && data.timestamp < oneHourAgo) {
                    localStorage.removeItem(key);
                }
            } catch (e) {
                // If parsing fails, remove the invalid entry
                localStorage.removeItem(key);
            }
        }
    });
}

// PDF download function
async function downloadMemberPDF(memberId) {
    const member = currentMembers.find(m => m.id === memberId);
    if (!member) {
        showNotification('لم يتم العثور على العضو', 'error');
        return;
    }
    
    try {
        console.log('Opening PDF page for member:', memberId);
        
        // Clean up old data first
        cleanupOldMemberData();
        
        // Store member data in localStorage and get the ID
        const dataId = storeMemberData(member);
        
        if (dataId) {
            // Open the PDF page with only the data ID in URL
            const pdfUrl = `member-pdf.html?dataId=${dataId}`;
            window.open(pdfUrl, '_blank');
        } else {
            // Fallback to URL parameters if localStorage failed
            const memberData = encodeURIComponent(JSON.stringify(member));
            const pdfUrl = `member-pdf.html?member=${memberData}`;
            window.open(pdfUrl, '_blank');
        }
        
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
        
        // Clean up old data first
        cleanupOldMemberData();
        
        // Store member data in localStorage and get the ID
        const dataId = storeMemberData(member);
        
        if (dataId) {
            // Open the PDF page with only the data ID in URL
            const pdfUrl = `member-pdf.html?dataId=${dataId}`;
            window.open(pdfUrl, '_blank');
        } else {
            // Fallback to URL parameters if localStorage failed
            const memberData = encodeURIComponent(JSON.stringify(member));
            const pdfUrl = `member-pdf.html?member=${memberData}`;
            window.open(pdfUrl, '_blank');
        }
        
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

// Test function to debug service role key and database access
window.testServiceRoleAccess = async function() {
    console.log('=== Service Role Key Debug Test ===');
    console.log('Service Role Key:', SERVICE_ROLE_KEY);
    console.log('Supabase URL:', SUPABASE_URL);
    
    try {
        // Test direct REST API call
        console.log('Testing direct REST API call...');
        const testUrl = `${SUPABASE_URL}/rest/v1/team_leader_form?select=count`;
        
        const response = await fetch(testUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                'apikey': SERVICE_ROLE_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Test response status:', response.status);
        console.log('Test response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            const data = await response.json();
            console.log('Test response data:', data);
        } else {
            const errorText = await response.text();
            console.error('Test error response:', errorText);
        }
        
    } catch (error) {
        console.error('Test failed:', error);
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
        
        console.log('=== Test accepted ===');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

 
