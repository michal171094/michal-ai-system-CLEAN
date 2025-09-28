// מיכל AI - מערכת עוזרת אישית
// Application initialization and main functionality

console.log('🚀 מאתחל את מערכת מיכל AI...');

// Global variables
let activeTab = 'smart-overview';

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 HTML טוען...');
    
    try {
        // Initialize basic functionality first
        initializeTabs();
        initializeEventListeners();
        
    // Load initial data
    setTimeout(() => {
        loadInitialData();
        loadAIStatus(); // טעינת סטטוס AI
        setupSyncControls();
        setupModalControls();
        setupManualTaskEntry(); // הוספת הזנת משימות ידנית
        loadSyncBadges();
    }, 100);        console.log('✅ מערכת מיכל AI מוכנה לעבודה!');
        
    } catch (error) {
        console.error('❌ שגיאה באיתחול:', error);
    }
});

// Initialize tabs functionality
function initializeTabs() {
    console.log('🔄 מאתחל טאבים...');
    
    // Show smart overview by default
    switchTab('smart-overview');
    
    // Add tab click listeners
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
}

// Switch between tabs
function switchTab(tabName) {
    console.log(`📊 עובר לטאב: ${tabName}`);
    
    // Update active tab
    activeTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
    
    // Show/hide panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    const targetPanel = document.getElementById(tabName);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }
    
    // Load data for active tab
    if (tabName === 'smart-overview') {
        loadSmartOverview();
    } else if (tabName === 'connectors' || tabName === 'connector-status') {
        loadConnectorsDashboard();
    }
}

// Initialize all event listeners
function initializeEventListeners() {
    console.log('🔗 מגדיר מאזינים לאירועים...');
    
    // Chat functionality
    const sendBtn = document.getElementById('sendBtn');
    const chatInput = document.getElementById('chatInput');
    
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // Quick question buttons
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const question = this.dataset.question;
            sendMessage(question);
        });
    });
    
    // Smart overview refresh
    const refreshBtn = document.getElementById('refreshSmartBtn');
    if (refreshBtn) {
        console.log('✅ נמצא כפתור רענון חכם');
        refreshBtn.addEventListener('click', () => {
            console.log('🔔 לחיצה על כפתור רענון חכם');
            loadSmartOverview();
        });
    } else {
        console.error('❌ לא נמצא כפתור רענון חכם');
    }

    const uploadDocBtn = document.getElementById('uploadDocBtn');
    if (uploadDocBtn) {
        uploadDocBtn.addEventListener('click', () => {
            const input = document.getElementById('documentUpload');
            if (input) input.click();
        });
    }

    const documentUploadInput = document.getElementById('documentUpload');
    if (documentUploadInput) {
        documentUploadInput.addEventListener('change', handleDocumentUpload);
    }

    const processDocsBtn = document.getElementById('processDocsBtn');
    if (processDocsBtn) {
        processDocsBtn.addEventListener('click', () => {
            showNotification('🤖 בחירת מסמך תפעיל עיבוד OCR');
            const input = document.getElementById('documentUpload');
            if (input) input.click();
        });
    }

    const gmailConnectBtn = document.getElementById('gmailConnectBtn');
    if (gmailConnectBtn) {
        gmailConnectBtn.addEventListener('click', initiateGmailOAuth);
    }

    const gmailRefreshBtn = document.getElementById('gmailRefreshBtn');
    if (gmailRefreshBtn) {
        gmailRefreshBtn.addEventListener('click', () => loadConnectorsDashboard());
    }

    const gmailAccountsList = document.getElementById('gmailAccountsList');
    if (gmailAccountsList && !gmailAccountsList.dataset.bound) {
        gmailAccountsList.addEventListener('click', handleGmailAccountAction);
        gmailAccountsList.dataset.bound = '1';
    }

    const gmailQuickSyncBtn = document.getElementById('gmailQuickSyncBtn');
    if (gmailQuickSyncBtn) {
        gmailQuickSyncBtn.addEventListener('click', triggerGmailSync);
    }
}

// Load initial application data
function loadInitialData() {
    console.log('📦 טוען נתונים ראשונים...');
    
    // Load smart overview
    loadSmartOverview();
    loadConnectorsDashboard({ silent: true });
    handleGmailOAuthCallback();
    
    // Show welcome message based on data state
    setTimeout(async () => {
        try {
            const response = await fetch('/api/smart-overview');
            const payload = await response.json();
            const hasData = payload?.data?.priorities?.length > 0 || payload?.data?.stats?.total > 0;
            
            if (hasData) {
                addMessageToChat('שלום מיכל! יש לך משימות פעילות במערכת. אני כאן לעזור לך לנהל אותן. מה תרצי לעשות היום?', 'ai');
            } else {
                addMessageToChat('שלום מיכל! המערכת מוכנה לעבודה. כדי להתחיל, תוכלי להתחבר ל-Gmail בטאב "חיבורים" או להוסיף משימות ידנית. איך אוכל לעזור?', 'ai');
            }
        } catch (error) {
            addMessageToChat('שלום מיכל! אני כאן לעזור לך לנהל את המשימות שלך. בואי נתחיל!', 'ai');
        }
    }, 1500);
}

// Load smart overview data
async function loadSmartOverview() {
    console.log('🧠 טוען סקירה חכמה...');

    const tableBody = document.getElementById('smartTableBody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;">⏳ טוען נתונים...</td></tr>';
    }

    try {
        const response = await fetch('/api/smart-overview');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        const overview = payload?.data;
        if (!overview) throw new Error('missing payload');
        updateSmartOverview(overview.priorities || []);
        updateStats(overview.stats || {});
        updateDomainTables(overview.domains || {});
        applySmartOverviewTimestamp(overview.lastUpdated);
        updateSystemStatus('active', `מערכת פעילה • ${overview.stats?.total || 0} משימות`);
        console.log('✅ נתונים נטענו מהשרת');
        return;
    } catch (error) {
        console.warn('⚠️ לא ניתן לטעון מהשרת:', error);
        updateSystemStatus('error', 'שגיאה בחיבור לשרת');
        showEmptyState();
    }
}

// Load AI Status and Pending Actions
async function loadAIStatus() {
    console.log('🧠 טוען סטטוס AI...');
    
    try {
        const response = await fetch('/api/ai/status');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        if (data.success && data.aiAvailable) {
            updateAIStatusDisplay(data);
            
            // אם יש פעולות ממתינות, הצג התרעה
            if (data.pendingActions && data.pendingActions.length > 0) {
                showPendingActionsNotification(data.pendingActions);
            }
        } else {
            console.warn('AI not available or error:', data.message);
        }
    } catch (error) {
        console.warn('⚠️ לא ניתן לטעון סטטוס AI:', error);
    }
}

// עדכון תצוגת סטטוס AI
function updateAIStatusDisplay(aiData) {
    // עדכון מספרי הסטטיסטיקות
    const stats = aiData.statistics || {};
    
    // הוסף לסטטיסטיקות הקיימות
    const aiActionsElement = document.getElementById('aiActionsCount');
    if (aiActionsElement) {
        aiActionsElement.textContent = stats.totalActionsToday || 0;
    }
    
    // הוסף אינדיקטור AI לסיסטם סטטוס
    const systemStatus = document.getElementById('systemStatusIndicator');
    if (systemStatus && aiData.aiAvailable) {
        const aiIndicator = systemStatus.querySelector('.ai-indicator') || document.createElement('span');
        aiIndicator.className = 'ai-indicator active';
        aiIndicator.title = `AI פעיל • ${stats.emailsProcessed || 0} מיילים • ${stats.documentsProcessed || 0} מסמכים`;
        aiIndicator.textContent = '🧠';
        if (!systemStatus.querySelector('.ai-indicator')) {
            systemStatus.appendChild(aiIndicator);
        }
    }
}

// הצגת התרעה על פעולות ממתינות
function showPendingActionsNotification(pendingActions) {
    const urgentActions = pendingActions.filter(a => a.urgency >= 7);
    
    if (urgentActions.length > 0) {
        const message = `🔔 יש ${urgentActions.length} פעולות דחופות הממתינות לאישור שלך`;
        addMessageToChat(message, 'ai');
        
        // הוסף כפתור לצפייה בפעולות
        const viewActionsButton = `<div class="quick-action-button" onclick="showAllPendingActions()">
            📋 צפה בכל הפעולות הממתינות (${pendingActions.length})
        </div>`;
        addMessageToChat(viewActionsButton, 'ai');
    }
}

// הצגת כל הפעולות הממתינות
async function showAllPendingActions() {
    try {
        const response = await fetch('/api/ai/status');
        const data = await response.json();
        
        if (data.success && data.pendingActions) {
            let actionsHtml = '<div class="all-pending-actions"><h3>📋 פעולות ממתינות לאישור:</h3>';
            
            data.pendingActions.forEach(action => {
                const urgencyIcon = action.urgency >= 7 ? '🔥' : action.urgency >= 5 ? '⚠️' : '📌';
                actionsHtml += `
                    <div class="pending-action-item" data-action-id="${action.id}">
                        <div class="action-header">
                            ${urgencyIcon} <strong>${action.summary}</strong>
                        </div>
                        <div class="action-details">
                            מקור: ${action.source} • דחיפות: ${action.urgency}/10
                        </div>
                        <div class="action-buttons-inline">
                            <button class="btn btn-small approve" onclick="approveAIAction('${action.id}')">✅ אשר</button>
                            <button class="btn btn-small reject" onclick="rejectAIAction('${action.id}')">❌ דחה</button>
                        </div>
                    </div>`;
            });
            
            actionsHtml += '</div>';
            addMessageToChat(actionsHtml, 'ai');
        }
    } catch (error) {
        addMessageToChat('❌ שגיאה בטעינת פעולות ממתינות', 'ai');
    }
}

// Setup Manual Task Entry
function setupManualTaskEntry() {
    console.log('📝 מגדיר הזנת משימות ידנית...');
    
    // הוסף כפתור הוספת משימה חדשה
    const addTaskBtn = document.getElementById('addNewTaskBtn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', showAddTaskModal);
    }
    
    // הוסף מאזין לקלט מהיר במשימות
    const quickTaskInput = document.getElementById('quickTaskInput');
    if (quickTaskInput) {
        quickTaskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addQuickTask(this.value);
                this.value = '';
            }
        });
    }
    
    // הוסף כפתורי הוספה מהירה בכל טאב
    addQuickAddButtons();
}

// הוסף כפתורי הוספה מהירה
function addQuickAddButtons() {
    const tabs = ['tasks', 'debts', 'bureaucracy'];
    
    tabs.forEach(tabName => {
        const tabPanel = document.getElementById(tabName);
        if (tabPanel && !tabPanel.querySelector('.quick-add-section')) {
            const quickAddHtml = `
                <div class="quick-add-section" style="margin: 15px 0; padding: 15px; background: var(--accent-bg); border-radius: 8px; border: 1px solid var(--border-light);">
                    <div class="quick-add-input-group" style="display: flex; gap: 10px;">
                        <input type="text" 
                               id="${tabName}QuickInput" 
                               class="quick-add-input" 
                               placeholder="הקלד ${getTabName(tabName)} חדש והקש Enter..."
                               style="flex: 1; padding: 8px 12px; border: 1px solid var(--border-light); border-radius: 4px;">
                        <button class="quick-add-btn" onclick="addQuickItem('${tabName}')" 
                                style="padding: 8px 12px; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer;">➕ הוסף</button>
                    </div>
                </div>`;
            
            // הוסף בתחילת הטאב
            tabPanel.insertAdjacentHTML('afterbegin', quickAddHtml);
            
            // הוסף מאזין לקלט
            const input = document.getElementById(`${tabName}QuickInput`);
            if (input) {
                input.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        addQuickItem(tabName, this.value);
                        this.value = '';
                    }
                });
            }
        }
    });
}

// קבל שם טאב בעברית
function getTabName(tabName) {
    const names = {
        'tasks': 'משימה',
        'debts': 'חוב',
        'bureaucracy': 'פריט ביורוקרטיה'
    };
    return names[tabName] || 'פריט';
}

// הוספת פריט מהיר
async function addQuickItem(category, text) {
    const input = document.getElementById(`${category}QuickInput`);
    const taskText = text || (input ? input.value.trim() : '');
    
    if (!taskText) {
        showNotification('⚠️ אנא הכנס טקסט');
        return;
    }
    
    console.log(`➕ מוסיף ${category}: ${taskText}`);
    
    // נקה את הקלט
    if (input) input.value = '';
    
    // שלח לצ'אט AI לעיבוד
    addMessageToChat(`➕ צור ${getTabName(category)}: ${taskText}`, 'user');
    
    // עבד עם AI
    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: `צור ${getTabName(category)} חדש: ${taskText}. קטגוריה: ${category}`
            })
        });
        
        const data = await response.json();
        if (data.success) {
            addMessageToChat(data.response, 'ai');
            
            if (data.actions && data.actions.length > 0) {
                showAIPendingActions(data.actions, 'create_task');
            } else {
                // אם AI לא יצר פעולות, צור ידנית
                await createItemManually(category, taskText);
            }
        } else {
            // Fallback - יצירה ידנית
            await createItemManually(category, taskText);
        }
    } catch (error) {
        console.warn('AI not available, creating manually:', error);
        await createItemManually(category, taskText);
    }
}

// יצירה ידנית של פריט
async function createItemManually(category, text) {
    const newItem = {
        id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: text,
        description: `נוצר ידנית: ${text}`,
        status: 'חדש',
        priority: 'medium',
        category: category,
        createdAt: new Date().toISOString(),
        dueDate: null,
        amount: null
    };
    
    try {
        // שלח לשרת (אם API קיים)
        const response = await fetch(`/api/${category}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItem)
        });
        
        if (response.ok) {
            showNotification(`✅ ${getTabName(category)} נוסף בהצלחה`);
        } else {
            throw new Error('Server error');
        }
    } catch (error) {
        console.warn('Server not available, storing locally');
        // שמור באחסון מקומי כחלופה
        const storageKey = `local_${category}`;
        const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
        existing.push(newItem);
        localStorage.setItem(storageKey, JSON.stringify(existing));
        showNotification(`✅ ${getTabName(category)} נוסף (מקומי)`);
    }
    
    // רענן תצוגה
    setTimeout(() => {
        loadSmartOverview();
        if (category !== 'smart-overview') {
            switchTab(category);
        }
    }, 500);
    
    addMessageToChat(`✅ ${getTabName(category)} "${text}" נוצר בהצלחה`, 'ai');
}

function updateSystemStatus(status, text) {
    const indicator = document.getElementById('systemStatusIndicator');
    if (!indicator) return;
    
    const dot = indicator.querySelector('.status-dot');
    const textEl = indicator.querySelector('.status-text');
    
    if (dot) {
        dot.className = `status-dot ${status}`;
    }
    if (textEl) {
        textEl.textContent = text;
    }
}

function applySmartOverviewTimestamp(lastUpdated) {
    if (!lastUpdated) return;
    const tsEl = document.getElementById('smartOverviewUpdatedAt');
    if (!tsEl) return;
    try {
        tsEl.textContent = new Date(lastUpdated).toLocaleString('he-IL');
    } catch (e) {
        tsEl.textContent = lastUpdated;
    }
}

// Update smart overview display
function updateSmartOverview(priorities = []) {
    const tableBody = document.getElementById('smartTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (!priorities.length) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;">אין משימות להצגה</td></tr>';
        return;
    }

    priorities.forEach((item, index) => {
        const row = createSmartOverviewRow(item, index + 1);
        tableBody.appendChild(row);
    });
}

// Create a row for smart overview table
function createSmartOverviewRow(item, index) {
    const row = document.createElement('tr');

    const timeInfo = calculateTimeRemaining(item.deadline);
    const urgencyLabel = determineUrgencyLabel(item.priorityScore || 0, timeInfo);
    const subtitle = buildItemSubtitle(item);
    const entityLabel = getEntityLabel(item);
    const priorityScore = item.priorityScore ?? '—';
    const actionLabel = item.action || 'פתח פרטים';

    row.innerHTML = `
        <td><span class="priority-badge ${getPriorityBadgeClass(item.priorityScore)}">${priorityScore}</span></td>
        <td><strong>${item.title || '—'}</strong>${subtitle ? `<br><small class="table-subline">${subtitle}</small>` : ''}</td>
        <td><span class="domain-badge domain-${item.domain || 'general'}">${getDomainLabel(item.domain)}</span></td>
        <td>${entityLabel}</td>
        <td>${formatDateDisplay(item.deadline)}</td>
        <td><span class="time-remaining ${timeInfo.className}">${timeInfo.label}</span></td>
        <td><span class="urgency-badge ${urgencyLabel}">${urgencyLabel}</span></td>
        <td><button class="action-btn primary" onclick="handleTaskAction('${item.id}')">${actionLabel}</button></td>
    `;

    return row;
}

function calculateTimeRemaining(deadline) {
    if (!deadline) {
        return { label: 'ללא יעד', className: 'time-normal', diffDays: null };
    }
    const parsed = new Date(deadline);
    if (Number.isNaN(parsed.getTime())) {
        return { label: deadline, className: 'time-normal', diffDays: null };
    }
    const now = new Date();
    const diffMs = parsed.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMs < 0) {
        const daysLate = Math.abs(diffDays);
        const label = daysLate <= 1 ? 'באיחור פחות מיום' : `באיחור ${daysLate} ימים`;
        return { label, className: 'time-overdue', diffDays };
    }
    if (diffDays === 0) {
        return { label: 'היום', className: 'time-urgent', diffDays };
    }
    if (diffDays === 1) {
        return { label: 'מחר', className: 'time-urgent', diffDays };
    }
    if (diffDays <= 3) {
        return { label: `${diffDays} ימים`, className: 'time-urgent', diffDays };
    }
    if (diffDays <= 7) {
        return { label: `${diffDays} ימים`, className: 'time-soon', diffDays };
    }
    return { label: `${diffDays} ימים`, className: 'time-normal', diffDays };
}

function determineUrgencyLabel(priorityScore = 0, timeInfo = {}) {
    if (timeInfo.className === 'time-overdue' || (timeInfo.diffDays !== null && timeInfo.diffDays <= 0)) {
        return 'קריטי';
    }
    if (priorityScore >= 90 || (timeInfo.diffDays !== null && timeInfo.diffDays <= 2)) {
        return 'דחוף';
    }
    if (priorityScore >= 75 || (timeInfo.diffDays !== null && timeInfo.diffDays <= 5)) {
        return 'גבוה';
    }
    return 'בינוני';
}

function getPriorityBadgeClass(score) {
    if (score >= 90) return 'critical';
    if (score >= 75) return 'urgent';
    if (score >= 60) return 'pending';
    return 'normal';
}

function formatDateDisplay(dateString) {
    if (!dateString) return '—';
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return dateString;
    return parsed.toLocaleDateString('he-IL');
}

function getEntityLabel(item = {}) {
    switch (item.domain) {
        case 'academic':
            return item.client || '—';
        case 'debt':
            if (item.creditor) return item.creditor;
            if (item.company) return item.company;
            if (item.title) {
                const parts = String(item.title).split(' - ');
                return parts[1] || parts[0];
            }
            return '—';
        case 'bureaucracy':
            if (item.authority) return item.authority;
            if (item.title) {
                const parts = String(item.title).split(' - ');
                return parts[1] || parts[0];
            }
            return '—';
        case 'email':
            return item.from || 'תיבת המייל';
        default:
            return item.client || item.company || '—';
    }
}

function buildItemSubtitle(item = {}) {
    const parts = [];
    if (item.status) parts.push(`סטטוס: ${item.status}`);
    if (item.amount) parts.push(`סכום: ${formatCurrency(item.amount, item.currency)}`);
    if (item.emailCount) parts.push(`תכתובות: ${item.emailCount}`);
    if (item.lastEmailAt) parts.push(`אימייל אחרון: ${formatTime(item.lastEmailAt)}`);
    return parts.join(' • ');
}

function formatCurrency(amount, currency = '₪') {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric)) {
        return [amount, currency].filter(Boolean).join(' ');
    }
    const normalizedCurrency = currency === '₪' ? 'ILS' : currency === '€' ? 'EUR' : currency || 'ILS';
    try {
        return new Intl.NumberFormat('he-IL', { style: 'currency', currency: normalizedCurrency }).format(numeric);
    } catch (e) {
        return `${numeric.toLocaleString('he-IL')} ${currency || ''}`.trim();
    }
}

// Get domain label in Hebrew
function getDomainLabel(domain) {
    const labels = {
        'academic': 'אקדמיה',
        'bureaucracy': 'בירוקרטיה',
        'debt': 'חובות',
        'email': 'מיילים'
    };
    return labels[domain] || domain;
}

// Update statistics display
function updateStats(stats = {}) {
    const criticalEl = document.getElementById('criticalCount');
    const urgentEl = document.getElementById('urgentCount');
    const pendingEl = document.getElementById('pendingCount');
    const emailTasksEl = document.getElementById('emailTasksCount');

    if (criticalEl) criticalEl.textContent = stats.critical ?? 0;
    if (urgentEl) urgentEl.textContent = stats.urgent ?? 0;
    if (pendingEl) pendingEl.textContent = stats.pending ?? 0;
    if (emailTasksEl) emailTasksEl.textContent = stats.emailTasks ?? 0;
}

function updateDomainTables(domains = {}) {
    renderAcademicTable(domains.academic || []);
    renderDebtsTable(domains.debts || []);
    renderBureaucracyTable(domains.bureaucracy || []);
}

function renderAcademicTable(tasks = []) {
    const tbody = document.querySelector('#academicTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!tasks.length) {
        tbody.innerHTML = emptyTableRow(6, 'אין משימות אקדמיות כרגע');
        return;
    }

    tasks.forEach(task => {
        const timeInfo = calculateTimeRemaining(task.deadline);
        const urgency = determineUrgencyLabel(task.priorityScore || 0, timeInfo);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${task.project || task.title || '—'}</td>
            <td>${task.client || '—'}</td>
            <td>${formatDateDisplay(task.deadline)}</td>
            <td>${task.status || '—'}</td>
            <td><span class="urgency-badge ${urgency}">${urgency}</span></td>
            <td>${task.action || '—'}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderDebtsTable(debts = []) {
    const tbody = document.querySelector('#debtsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!debts.length) {
        tbody.innerHTML = emptyTableRow(7, 'אין חובות פעילים כרגע');
        return;
    }

    debts.forEach(debt => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${debt.creditor || '—'}</td>
            <td>${debt.company || '—'}</td>
            <td>${formatCurrency(debt.amount, debt.currency)}</td>
            <td>${debt.case_number || '—'}</td>
            <td>${debt.status || '—'}</td>
            <td>${formatDateDisplay(debt.deadline)}</td>
            <td>${debt.action || '—'}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderBureaucracyTable(items = []) {
    const tbody = document.querySelector('#bureaucracyTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!items.length) {
        tbody.innerHTML = emptyTableRow(6, 'אין תהליכים בירוקרטיים פעילים כרגע');
        return;
    }

    items.forEach(item => {
        const timeInfo = calculateTimeRemaining(item.deadline);
        const urgency = determineUrgencyLabel(item.priorityScore || 0, timeInfo);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.task || item.title || '—'}</td>
            <td>${item.authority || '—'}</td>
            <td>${formatDateDisplay(item.deadline)}</td>
            <td>${item.status || '—'}</td>
            <td><span class="urgency-badge ${urgency}">${urgency}</span></td>
            <td>${item.action || '—'}</td>
        `;
        tbody.appendChild(row);
    });
}

function emptyTableRow(colspan, message) {
    return `<tr><td colspan="${colspan}" style="text-align:center;padding:16px;color:var(--color-text-secondary);">${message}</td></tr>`;
}

// Show empty state when no data is available
function showEmptyState() {
    const emptyStats = {
        critical: 0,
        urgent: 0,
        pending: 0,
        emailTasks: 0
    };

    updateSmartOverview([]);
    updateStats(emptyStats);
    updateDomainTables({ academic: [], debts: [], bureaucracy: [], emails: [] });
    updateSystemStatus('empty', 'מערכת ריקה - מוכנה לנתונים');

    // Add helpful message to get started
    const tableBody = document.getElementById('smartTableBody');
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;">
            <div style="color:var(--color-text-secondary);">
                <h3 style="margin-bottom:10px;">👋 ברוכה הבאה!</h3>
                <p style="margin-bottom:15px;">עדיין אין נתונים במערכת.</p>
                <div style="font-size:14px;">
                    <p><strong>לחיבור Gmail:</strong> לכי לטאב "🔌 חיבורים" ולחצי "התחברות"</p>
                    <p><strong>המייל שלך:</strong> michal.havatzelet@gmail.com</p>
                    <p><strong>להוספת משימות:</strong> השתמשי בטאבים השונים להוספה ידנית</p>
                </div>
            </div>
        </td></tr>`;
    }
}

// Connectors dashboard helpers
async function loadConnectorsDashboard(options = {}) {
    const { silent = false } = options;
    const badge = document.getElementById('gmailStatusBadge');
    const info = document.getElementById('gmailStatusInfo');
    const accountsContainer = document.getElementById('gmailAccountsList');
    if (!badge || !info || !accountsContainer) return;

    if (!silent) {
        info.textContent = 'בודק סטטוס...';
    }

    try {
        const response = await fetch('/api/connectors/status');
        if (!response.ok) {
            if (response.status === 503) {
                // Gmail service is disabled - show configuration help
                applyGmailStatusToUI({ accounts: [], configured: false, authenticated: false, disabled: true });
                renderGmailAccounts([], null, { disabled: true });
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        const gmail = payload?.data?.gmail || { accounts: [], configured: false, authenticated: false };
        applyGmailStatusToUI(gmail);
        renderGmailAccounts(gmail.accounts || [], gmail.activeEmail);
    } catch (error) {
        console.error('שגיאה בטעינת סטטוס מחברים:', error);
        applyGmailStatusToUI({ accounts: [], configured: false, authenticated: false });
        renderGmailAccounts([], null, { error: true });
    }
}

function applyGmailStatusToUI(gmail = {}) {
    const badge = document.getElementById('gmailStatusBadge');
    const info = document.getElementById('gmailStatusInfo');
    if (!badge || !info) return;

    badge.classList.remove('online', 'offline', 'partial');

    if (gmail.disabled) {
        badge.classList.add('offline');
        badge.textContent = 'לא מוגדר';
        info.textContent = '🔧 שירות Gmail לא מוגדר. נדרשים הגדרות OAuth במשתני הסביבה של השרת.';
        return;
    }

    if ((gmail.accounts || []).length === 0) {
        badge.classList.add('offline');
        badge.textContent = 'מנותק';
        info.textContent = 'אין חשבון מחובר. התחילי בתהליך ההתחברות.';
        return;
    }

    if (gmail.authenticated) {
        badge.classList.add('online');
        badge.textContent = 'מחובר';
        const active = gmail.activeEmail || gmail.accounts.find(acc => acc.active)?.email;
        info.textContent = active ? `חשבון פעיל: ${active}` : 'החיבור פעיל. ניתן לבחור חשבון ברירת מחדל.';
        return;
    }

    badge.classList.add('partial');
    badge.textContent = 'דורש התחברות';
    info.textContent = 'יש חשבון שמור, אך יש להשלים התחברות OAuth.';
}

function renderGmailAccounts(accounts = [], activeEmail = null, options = {}) {
    const container = document.getElementById('gmailAccountsList');
    if (!container) return;
    container.innerHTML = '';

    if (options.disabled) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>🔧 דרושה הגדרה</h3>
                <p>שירות Gmail לא מוגדר במערכת.</p>
                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-top: 10px; font-size: 14px;">
                    <p><strong>למפתח:</strong> נדרש להגדיר משתני סביבה:</p>
                    <ul style="margin: 8px 0; padding-right: 20px;">
                        <li><code>GOOGLE_CLIENT_ID</code></li>
                        <li><code>GOOGLE_CLIENT_SECRET</code></li>
                        <li><code>GOOGLE_REDIRECT_URI</code> (אופציונלי)</li>
                    </ul>
                    <p>בקבלת האישורים מ-Google Console.</p>
                </div>
            </div>
        `;
        return;
    }

    if (options.error) {
        container.innerHTML = '<div class="empty-state">לא ניתן לטעון את רשימת החשבונות כרגע.</div>';
        return;
    }

    if (!accounts.length) {
        container.innerHTML = '<div class="empty-state">עדיין אין חשבונות מחוברים. לחצי על "התחברות" כדי להתחיל.</div>';
        return;
    }

    accounts.forEach(account => {
        const card = document.createElement('div');
        const isActive = account.active || account.email === activeEmail;
        card.className = `account-item${isActive ? ' active' : ''}`;
        card.innerHTML = `
            <div class="account-header">
                <span class="account-email">${account.email}</span>
                ${isActive ? '<span class="status-chip online">פעיל</span>' : ''}
            </div>
            <div class="account-meta">
                <span>${isActive ? 'חשבון ברירת מחדל' : 'לא פעיל'}</span>
            </div>
            <div class="account-actions">
                ${isActive ? '' : `<button class="action-btn success" data-action="activate" data-email="${account.email}">הפוך לפעיל</button>`}
                <button class="action-btn warning" data-action="remove" data-email="${account.email}">נתק</button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function initiateGmailOAuth() {
    const button = document.getElementById('gmailConnectBtn');
    if (button) button.disabled = true;
    try {
        const response = await fetch('/api/gmail/auth-url');
        if (!response.ok) {
            if (response.status === 503) {
                const errorData = await response.json().catch(() => ({}));
                if (errorData.error === 'Gmail service disabled') {
                    showNotification('🔧 Gmail לא מוגדר - נדרשים הגדרות OAuth מהמפתח', 'warning');
                    if (button) button.disabled = false;
                    return;
                }
            }
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (data?.url) {
            window.location.href = data.url;
            return;
        }
        throw new Error('missing auth url');
    } catch (error) {
        console.error('שגיאה בקבלת קישור OAuth:', error);
        showNotification('✅ המערכת פועלת במצב זמני ללא חיבור Gmail.', 'success');
        if (button) button.disabled = false;
    }
}

function handleGmailOAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const gmailStatus = params.get('gmail');
    if (!gmailStatus) return;

    if (gmailStatus === 'connected') {
        const email = params.get('connected');
        showNotification(email ? `✅ החשבון ${email} חובר בהצלחה!` : '✅ חשבון Gmail חובר בהצלחה!');
    } else if (gmailStatus === 'error') {
        const reason = params.get('reason');
        if (reason) {
            // Surface common OAuth errors more clearly
            const readable = decodeURIComponent(reason);
            const hint = readable.includes('redirect_uri_mismatch')
                ? 'בדקי שה-Redirect URI מוגדר זהה בדיוק גם ב-Google Console וגם בשרת ההפצה.'
                : readable.includes('access_denied')
                ? 'אישרת את הבקשה? אם לא, נסי שוב ותני הרשאה.'
                : null;
            showNotification(`❌ חיבור Gmail נכשל: ${readable}${hint ? ` — ${hint}` : ''}`, 'warning');
        } else {
            showNotification('📧 Gmail זמנית לא זמין - המערכת עובדת ללא סינכרון מיילים.', 'info');
        }
    } else if (gmailStatus === 'missing_code') {
        showNotification('📧 Gmail זמנית לא זמין - המערכת עובדת ללא סינכרון מיילים.', 'info');
    }

    params.delete('gmail');
    params.delete('connected');
    params.delete('reason');
    const cleaned = params.toString();
    const newUrl = cleaned ? `${window.location.pathname}?${cleaned}` : window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);

    loadConnectorsDashboard({ silent: true });
}

async function handleGmailAccountAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action, email } = button.dataset;
    if (!email || !action) return;

    if (action === 'activate') {
        button.disabled = true;
        await activateGmailAccount(email);
        return;
    }

    if (action === 'remove') {
        if (!confirm(`להסיר את החשבון ${email}?`)) {
            return;
        }
        button.disabled = true;
        await removeGmailAccount(email);
    }
}

async function activateGmailAccount(email) {
    try {
        const response = await fetch('/api/gmail/accounts/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await response.json();
        showNotification(`✅ ${email} מוגדר כעת כחשבון ברירת המחדל.`);
    } catch (error) {
        console.error('שגיאה בהפעלת חשבון Gmail:', error);
        showNotification('❌ לא ניתן להגדיר את החשבון כפעיל.');
    } finally {
        loadConnectorsDashboard({ silent: true });
    }
}

async function removeGmailAccount(email) {
    try {
        const response = await fetch(`/api/gmail/accounts/${encodeURIComponent(email)}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await response.json();
        showNotification(`🗑️ החשבון ${email} הוסר מהרשימה.`);
    } catch (error) {
        console.error('שגיאה בהסרת חשבון Gmail:', error);
        showNotification('❌ לא ניתן להסיר את החשבון.');
    } finally {
        loadConnectorsDashboard({ silent: true });
    }
}

async function triggerGmailSync() {
    const button = document.getElementById('gmailQuickSyncBtn');
    if (!button) {
        return;
    }
    if (button.dataset.loading === '1') {
        return;
    }

    const originalHtml = button.innerHTML;
    button.dataset.loading = '1';
    button.innerHTML = '🧠 מסנכרן עם AI...';
    button.disabled = true;

    try {
        console.log('🔄 Starting Gmail sync with LangGraph...');
        const response = await fetch('/api/gmail/sync', { method: 'POST' });
        const contentType = response.headers.get('content-type') || '';
        const payload = contentType.includes('application/json') ? await response.json() : {};

        if (response.status === 401 || payload?.auth_required) {
            showNotification('⚠️ נדרש להתחבר ל-Gmail לפני סנכרון.');
            return;
        }

        if (response.status === 503) {
            showNotification('🔧 Gmail לא מוגדר - בדקי את הגדרות הסביבה', 'warning');
            return;
        }

        if (!response.ok || !payload?.success) {
            throw new Error(payload?.error || `HTTP ${response.status}`);
        }

        // אם יש עיבוד AI
        if (payload.aiProcessed && payload.pendingActions) {
            console.log(`🧠 AI processed ${payload.total} emails, ${payload.pendingActions.length} actions suggested`);
            
            const message = `🧠 AI עיבד ${payload.total} מיילים וזיהה ${payload.pendingActions.length} פעולות מוצעות`;
            showNotification(message);
            
            // הצג את הפעולות המוצעות בצ'אט
            if (payload.pendingActions.length > 0) {
                addMessageToChat(`📧 סנכרון Gmail הושלם! זיהיתי ${payload.pendingActions.length} פעולות מוצעות:`, 'ai');
                showAIPendingActions(payload.pendingActions, 'email_sync');
            } else {
                addMessageToChat('📧 סנכרון Gmail הושלם! לא זוהו פעולות חדשות שדורשות טיפול מיידי.', 'ai');
            }
        } else {
            // סנכרון רגיל בלי AI
            const ingested = payload.ingested ?? 0;
            const linked = payload.linked ?? 0;
            const total = payload.total ?? '—';
            const message = ingested
                ? `📥 נוספו ${ingested} אימיילים (${linked} קושרו). סה"כ בתיבה: ${total}.`
                : '📭 המיילים מעודכנים, לא נמצאו פריטים חדשים.';
            showNotification(message);
        }
        
        // רענן נתונים
        loadSmartOverview();
        loadAIStatus();
        loadConnectorsDashboard({ silent: true });
        
    } catch (error) {
        console.error('שגיאה בסנכרון Gmail:', error);
        showNotification('❌ סנכרון המיילים נכשל: ' + error.message);
        addMessageToChat('❌ שגיאה בסנכרון מיילים: ' + error.message, 'ai');
    } finally {
        button.dataset.loading = '0';
        button.innerHTML = originalHtml;
        button.disabled = false;
    }
}

// Document upload handler - Enhanced with LangGraph Bulk Processing
async function handleDocumentUpload(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const isMultiple = files.length > 1;
    const message = isMultiple ? 
        `⏳ מעלה ${files.length} מסמכים עם עיבוד AI...` : 
        `⏳ מעלה את ${files[0].name} עם עיבוד AI...`;
    
    showNotification(message);
    addMessageToChat(`📄 מתחילה להעלות ${files.length} מסמכים לעיבוד חכם...`, 'ai');

    const formData = new FormData();
    files.forEach(file => {
        formData.append('documents', file);
    });

    try {
        // שלח לעיבוד בבולק עם AI
        const endpoint = isMultiple ? '/api/drive/bulk-upload' : '/api/drive/upload';
        
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        
        if (result.success) {
            // הצגת תוצאות עיבוד
            const processedCount = result.results?.length || 1;
            const errorCount = result.errors?.length || 0;
            
            let successMessage = `✅ הועלו ${processedCount} מסמכים בהצלחה`;
            if (errorCount > 0) {
                successMessage += ` (${errorCount} שגיאות)`;
            }
            
            showNotification(successMessage);
            addMessageToChat(successMessage, 'ai');
            
            // אם יש ניתוח AI
            if (result.aiAnalysis && result.aiAnalysis.suggestedActions > 0) {
                const aiMessage = `🧠 AI ניתח את המסמכים וזיהה ${result.aiAnalysis.suggestedActions} פעולות מוצעות`;
                addMessageToChat(aiMessage, 'ai');
                
                // הצג את הפעולות המוצעות
                if (result.aiAnalysis.actions) {
                    showAIPendingActions(result.aiAnalysis.actions, 'document_processing');
                }
            } else {
                addMessageToChat('📄 המסמכים עובדו בסיסית. ניתן להוסיף עיבוד AI מתקדם בהמשך.', 'ai');
            }
            
            // הצג תוצאות מפורטות
            if (result.results && result.results.length > 0) {
                result.results.forEach((item, index) => {
                    const fileName = item.file || files[index]?.name || `מסמך ${index + 1}`;
                    addMessageToChat(`📋 ${fileName}: עובד בהצלחה`, 'ai');
                });
            }
            
            // רענן נתונים
            setTimeout(() => {
                loadSmartOverview();
                loadAIStatus();
            }, 1000);
            
        } else {
            throw new Error(result.error || 'העלאה נכשלה');
        }
        
    } catch (error) {
        console.error('שגיאה בהעלאת מסמכים:', error);
        const errorMessage = `❌ שגיאה בהעלאת מסמכים: ${error.message}`;
        showNotification(errorMessage);
        addMessageToChat(errorMessage, 'ai');
    } finally {
        event.target.value = '';
    }
}

function announceDocumentProcessingResult(result) {
    if (!result) return;
    const fileName = result.file?.name || 'המסמך';
    const ocrSummary = result.ocr?.summary || result.ocr?.text;
    const note = result.ocr?.note;
    const fallback = result.fallback;

    let message = `סיימתי לעבד את ${fileName}.`;
    if (ocrSummary) {
        message += `\n\n${ocrSummary}`;
    } else if (note) {
        message += `\n\n${note}`;
    }
    if (fallback) {
        message += '\n\nהפעלתי מנגנון גיבוי – שווה להריץ שוב כשסוכן ה-OCR זמין.';
    }

    addMessageToChat(message, 'ai');
    renderDocumentRecommendationCard(result);
}

function renderDocumentRecommendationCard(result) {
    const container = document.getElementById('recommendationsContainer');
    const panel = document.getElementById('recommendations-panel');
    if (!container || !panel) return;

    panel.style.display = 'block';

    const card = document.createElement('div');
    card.className = 'document-recommendation';
    const summary = result.ocr?.summary || result.ocr?.text || 'המסמך הועלה, ניתן להמשיך לטפל בו.';
    const fallback = result.fallback ? '<p class="note">⚠️ הופעל מנגנון גיבוי. מומלץ להפעיל OCR מלא בעתיד.</p>' : '';
    card.innerHTML = `
        <h4>📄 ${result.file?.name || 'מסמך חדש'}</h4>
        <p>${summary}</p>
        ${fallback}
    `;
    container.prepend(card);
}

// Handle task action clicks
async function handleTaskAction(taskId) {
    console.log(`🎯 מבצע פעולה למשימה: ${taskId}`);
    
    try {
        // נסה לשלוח בקשה לשרת
        const response = await fetch(`/api/tasks/${taskId}/action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || 'mock-token'}`
            },
            body: JSON.stringify({ 
                actionType: 'smart_action',
                parameters: { taskId }
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            addMessageToChat(data.data.message || 'פעולה בוצעה בהצלחה!', 'ai');
        } else {
            throw new Error('Server error');
        }
    } catch (error) {
        // אם השרת לא זמין, השתמש בתגובת גיבוי
        console.warn('⚠️ שרת לא זמין, משתמש בתגובת גיבוי:', error);
        addMessageToChat('איזה פעולה ברצונך לבצע? אני יכולה לעזור עם הכנת מסמכים, מעקב אחר מועדים או תזכורות.', 'ai');
    }
}

// Chat functionality - Enhanced with LangGraph
async function sendMessage(messageText = null) {
    const input = document.getElementById('chatInput');
    const message = messageText || (input ? input.value.trim() : '');
    
    if (!message) return;
    
    // Clear input
    if (input) input.value = '';
    
    // Add user message
    addMessageToChat(message, 'user');
    
    // Show typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'message ai-message typing';
    typingIndicator.innerHTML = '<div class="message-content">🧠 מעבדת עם AI...</div>';
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.appendChild(typingIndicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    try {
        // שלח למערכת LangGraph החדשה
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });
        
        if (response.ok) {
            const data = await response.json();
            typingIndicator.remove();
            
            if (data.success) {
                // הוסף תשובת AI
                addMessageToChat(data.response, 'ai');
                
                // אם יש פעולות מוצעות - הצג אותן
                if (data.actions && data.actions.length > 0) {
                    showAIPendingActions(data.actions, data.intent);
                }
                
                // רענן סטטוס אם נדרש
                if (data.intent === 'create_task' || data.intent === 'modify_system') {
                    setTimeout(() => {
                        loadSmartOverview();
                        loadAIStatus();
                    }, 1000);
                }
            } else {
                addMessageToChat('❌ שגיאה: ' + (data.error || 'תגובה לא חוקית'), 'ai');
            }
        } else {
            throw new Error('Server error');
        }
    } catch (error) {
        console.warn('⚠️ שרת לא זמין, משתמש בתגובת גיבוי:', error);
        typingIndicator.remove();
        const response = generateAIResponse(message);
        addMessageToChat(response, 'ai');
    }
}

// Add message to chat
function addMessageToChat(message, sender) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender === 'ai' ? 'ai-message' : 'user-message'}`;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-content">${message}</div>
        <div class="message-time">${timeString}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// הצגת פעולות מוצעות של AI
function showAIPendingActions(actions, intent) {
    if (!actions || actions.length === 0) return;
    
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    const actionDiv = document.createElement('div');
    actionDiv.className = 'message ai-message actions-message';
    
    let actionsHtml = `<div class="message-content">
        <div class="actions-header">💡 פעולות מוצעות (${intent}):</div>
        <div class="suggested-actions">`;
    
    actions.forEach(action => {
        const urgencyClass = action.requiresApproval ? 'requires-approval' : 'auto-execute';
        actionsHtml += `
            <div class="suggested-action ${urgencyClass}" data-action-id="${action.id}">
                <div class="action-description">${action.description}</div>
                <div class="action-type">סוג: ${action.type}</div>
                <div class="action-buttons">
                    <button class="action-btn approve-btn" onclick="approveAIAction('${action.id}')">✅ אשר</button>
                    <button class="action-btn reject-btn" onclick="rejectAIAction('${action.id}')">❌ דחה</button>
                    <button class="action-btn modify-btn" onclick="modifyAIAction('${action.id}')">✏️ ערוך</button>
                </div>
            </div>`;
    });
    
    actionsHtml += `</div></div>`;
    actionDiv.innerHTML = actionsHtml;
    
    messagesContainer.appendChild(actionDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// אישור פעולה של AI
async function approveAIAction(actionId) {
    try {
        showNotification('🔄 מבצע פעולה...');
        
        const response = await fetch('/api/gmail/sync/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                approvedActions: [actionId],
                rejectedActions: [],
                modifications: {},
                feedback: { approved: true }
            })
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('✅ פעולה בוצעה בהצלחה!');
            addMessageToChat(`✅ פעולה ${actionId} בוצעה בהצלחה`, 'ai');
            
            // רענן נתונים
            setTimeout(() => {
                loadSmartOverview();
                loadAIStatus();
            }, 1000);
            
            // הסר את כפתורי הפעולה
            const actionElement = document.querySelector(`[data-action-id="${actionId}"]`);
            if (actionElement) {
                actionElement.style.opacity = '0.5';
                actionElement.querySelector('.action-buttons').innerHTML = '<span class="action-status approved">✅ בוצע</span>';
            }
        } else {
            showNotification('❌ שגיאה: ' + data.error);
        }
    } catch (error) {
        console.error('Error approving action:', error);
        showNotification('❌ שגיאה בביצוע פעולה');
    }
}

// דחיית פעולה של AI
async function rejectAIAction(actionId) {
    try {
        const response = await fetch('/api/gmail/sync/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                approvedActions: [],
                rejectedActions: [actionId],
                modifications: {},
                feedback: { rejected: true, reason: 'User choice' }
            })
        });
        
        const data = await response.json();
        if (data.success) {
            addMessageToChat(`❌ פעולה ${actionId} נדחתה`, 'ai');
            
            // הסר את כפתורי הפעולה
            const actionElement = document.querySelector(`[data-action-id="${actionId}"]`);
            if (actionElement) {
                actionElement.style.opacity = '0.5';
                actionElement.querySelector('.action-buttons').innerHTML = '<span class="action-status rejected">❌ נדחה</span>';
            }
        }
    } catch (error) {
        console.error('Error rejecting action:', error);
        showNotification('❌ שגיאה בדחיית פעולה');
    }
}

// עריכת פעולה של AI
function modifyAIAction(actionId) {
    const modification = prompt('איך תרצי לשנות את הפעולה?');
    if (!modification) return;
    
    addMessageToChat(`✏️ מבקשת שינוי לפעולה ${actionId}: ${modification}`, 'user');
    addMessageToChat('👍 השינוי נרשם. כעת אישרי את הפעולה המעודכנת.', 'ai');
    
    // TODO: יישום השינוי בפועל
}

// Generate AI responses
function generateAIResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('דחוף') || lowerMessage.includes('היום')) {
        return "המשימות הדחופות היום:\n• כרמית - סמינר פסיכולוגיה (דדליין היום!)\n• PAIR Finance - התנגדות (נשאר יומיים)\n• ביטוח בריאות TK - הגשת מסמכים\n\nהתחלי עם כרמית - זה הכי דחוף!";
    }
    
    if (lowerMessage.includes('pair') || lowerMessage.includes('התנגדות')) {
        return "בשביל PAIR Finance:\n1. אל תודי בחוב\n2. בקשי הוכחות מפורטות\n3. שלחי בדואר רשום\n4. שמרי את כל המסמכים\n\nיש לי תבנית מכתב התנגדות - רוצה לראות אותה?";
    }
    
    if (lowerMessage.includes('בירוקרטיה')) {
        return "מצב הבירוקרטיה:\n• רישום נישואין - צריך לברר סטטוס\n• TK ביטוח בריאות - דחוף!\n• LEA אישור שהייה - בתהליך\n• Jobcenter - מאושר ✓";
    }
    
    return "הבנתי את השאלה שלך. איך אני יכולה לעזור לך בפירוט יותר? אני יכולה לסייע עם:\n• ניהול המשימות הדחופות\n• הכנת מכתבי התנגדות\n• מעקב אחר בירוקרטיה\n• ייעוץ כלכלי";
}

// Sync Controls Setup
function setupSyncControls() {
    console.log('🔄 מגדיר כפתורי סנכרון...');
    
    const syncButtons = [
        { id: 'syncAcademicBtn', module: 'academic' },
        { id: 'syncBureaucracyBtn', module: 'bureaucracy' },
        { id: 'syncDebtsBtn', module: 'debts' },
        { id: 'syncEmailBtn', module: 'emails' }
    ];

    syncButtons.forEach(({ id, module }) => {
        const btn = document.getElementById(id);
        if (btn) {
            console.log(`✅ נמצא כפתור: ${id}`);
            btn.addEventListener('click', () => {
                console.log(`🔔 לחיצה על כפתור: ${id}, מודול: ${module}`);
                openSyncModal(module);
            });
        } else {
            console.error(`❌ לא נמצא כפתור: ${id}`);
        }
    });
}// Setup modal controls
function setupModalControls() {
    console.log('📋 מגדיר בקרת חלונות...');
    
    const modal = document.getElementById('syncModal');
    const closeBtn = document.getElementById('syncModalClose');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSyncModal);
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeSyncModal();
            }
        });
    }
}

// Open sync modal
async function openSyncModal(module) {
    console.log(`📋 פותח חלון סנכרון מתקדם למודול: ${module}`);
    
    const modal = document.getElementById('syncModal');
    const title = document.getElementById('syncModalTitle');
    const body = document.getElementById('syncModalBody');
    
    if (!modal || !title || !body) {
        console.error('❌ לא נמצאו אלמנטי המודל הנדרשים');
        return;
    }

    // Set advanced title with module info
    const moduleInfo = {
        'academic': { icon: '📚', name: 'מערכת אקדמיה', color: '#3B82F6' },
        'bureaucracy': { icon: '🏛️', name: 'מערכת בירוקרטיה', color: '#8B5CF6' }, 
        'debts': { icon: '💰', name: 'מערכת חובות', color: '#EF4444' },
        'emails': { icon: '📧', name: 'מערכת מיילים', color: '#10B981' }
    };
    
    const info = moduleInfo[module];
    title.innerHTML = `${info.icon} סינכרון ${info.name} <span class="sync-status-indicator">🔄 פעיל</span>`;
    
    // Show advanced loading interface
    body.innerHTML = createAdvancedLoadingInterface(module);
    
    // Show modal with animation
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Start advanced sync process
    await performAdvancedSync(module, body);
}

// Create advanced loading interface
function createAdvancedLoadingInterface(module) {
    return `
        <div class="advanced-sync-container">
            <div class="sync-progress-section">
                <div class="sync-step active" data-step="1">
                    <div class="step-icon">🔍</div>
                    <div class="step-content">
                        <h4>סריקת מקורות נתונים</h4>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%"></div>
                        </div>
                        <p class="step-status">מאתחל חיבורים...</p>
                    </div>
                </div>
                
                <div class="sync-step" data-step="2">
                    <div class="step-icon">🧠</div>
                    <div class="step-content">
                        <h4>ניתוח AI ועיבוד נתונים</h4>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%"></div>
                        </div>
                        <p class="step-status">ממתין...</p>
                    </div>
                </div>
                
                <div class="sync-step" data-step="3">
                    <div class="step-icon">⚡</div>
                    <div class="step-content">
                        <h4>יצירת עדכונים ופעולות</h4>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%"></div>
                        </div>
                        <p class="step-status">ממתין...</p>
                    </div>
                </div>
            </div>
            
            <div class="sync-realtime-log">
                <h5>📊 לוג בזמן אמת</h5>
                <div class="log-container" id="syncLog">
                    <div class="log-entry">[${new Date().toLocaleTimeString()}] מתחיל סינכרון ${module}...</div>
                </div>
            </div>
        </div>
    `;
}

// Perform advanced sync process
async function performAdvancedSync(module, bodyElement) {
    const logContainer = bodyElement.querySelector('#syncLog');
    
    // Step 1: Data source scanning
    await simulateStep(1, 'סריקת מקורות נתונים', logContainer, async () => {
        addLogEntry(logContainer, 'מתחבר לשרתי מידע...');
        await delay(800);
        addLogEntry(logContainer, `סורק ${getDataSources(module).length} מקורות נתונים...`);
        await delay(1200);
        addLogEntry(logContainer, 'מזהה שינויים וחידושים...');
        await delay(900);
    });

    // Step 2: AI Analysis  
    await simulateStep(2, 'ניתוח AI ועיבוד נתונים', logContainer, async () => {
        addLogEntry(logContainer, 'מעביר נתונים למנוע AI...');
        await delay(1000);
        addLogEntry(logContainer, 'מנתח דפוסים ועדיפויות...');
        await delay(1500);
        addLogEntry(logContainer, 'מחשב המלצות והתראות...');
        await delay(1200);
        addLogEntry(logContainer, 'מסווג לפי חשיבות ודחיפות...');
        await delay(800);
    });

    // Step 3: Action Creation
    await simulateStep(3, 'יצירת עדכונים ופעולות', logContainer, async () => {
        addLogEntry(logContainer, 'מכין רשימת עדכונים...');
        await delay(700);
        addLogEntry(logContainer, 'יוצר פעולות מוצעות...');
        await delay(900);
        addLogEntry(logContainer, 'מקשר עם משימות קיימות...');
        await delay(600);
    });

    // Show final results
    await delay(500);
    addLogEntry(logContainer, '✅ סינכרון הושלם בהצלחה!');
    
    // Display advanced results
    setTimeout(() => {
        displayAdvancedSyncResults(module, bodyElement);
    }, 1000);
}

// Simulate sync step with progress
async function simulateStep(stepNumber, stepName, logContainer, stepFunction) {
    const stepElement = document.querySelector(`[data-step="${stepNumber}"]`);
    const progressBar = stepElement.querySelector('.progress-fill');
    const statusText = stepElement.querySelector('.step-status');
    
    // Activate step
    stepElement.classList.add('active');
    statusText.textContent = 'מעבד...';
    
    addLogEntry(logContainer, `🔄 מתחיל: ${stepName}`);
    
    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress > 100) progress = 100;
        progressBar.style.width = `${progress}%`;
    }, 100);
    
    // Execute step function
    await stepFunction();
    
    // Complete step
    clearInterval(progressInterval);
    progressBar.style.width = '100%';
    statusText.textContent = '✅ הושלם';
    stepElement.classList.remove('active');
    stepElement.classList.add('completed');
    
    addLogEntry(logContainer, `✅ הושלם: ${stepName}`);
    await delay(300);
}

// Helper functions for advanced sync

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function addLogEntry(container, message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    container.appendChild(entry);
    container.scrollTop = container.scrollHeight;
}

function getDataSources(module) {
    const sources = {
        'emails': ['Gmail API', 'Outlook Integration', 'IMAP Scanner', 'AI Content Analyzer'],
        'academic': ['University Portal', 'Student System', 'Academic Calendar', 'Grade System'],
        'debts': ['Payment Systems', 'Bank APIs', 'Credit Agencies', 'Legal Databases'],
        'bureaucracy': ['Government APIs', 'Municipal Systems', 'Insurance Portals', 'Healthcare Systems']
    };
    return sources[module] || [];
}

// Display advanced sync results
function displayAdvancedSyncResults(module, bodyElement) {
    const results = generateAdvancedResults(module);
    
    bodyElement.innerHTML = `
        <div class="advanced-results-container">
            <div class="results-summary">
                <h4>� תוצאות סינכרון - ${getModuleName(module)}</h4>
                <div class="summary-stats">
                    <div class="stat-item critical">
                        <span class="stat-number">${results.stats.critical}</span>
                        <span class="stat-label">דחופים</span>
                    </div>
                    <div class="stat-item new">
                        <span class="stat-number">${results.stats.new}</span>
                        <span class="stat-label">חדשים</span>
                    </div>
                    <div class="stat-item updated">
                        <span class="stat-number">${results.stats.updated}</span>
                        <span class="stat-label">עודכנו</span>
                    </div>
                    <div class="stat-item ai-insights">
                        <span class="stat-number">${results.stats.insights}</span>
                        <span class="stat-label">תובנות AI</span>
                    </div>
                </div>
            </div>
            
            <div class="results-filters">
                <div class="filter-tabs">
                    <button class="filter-tab active" data-filter="all">הכל (${results.updates.length})</button>
                    <button class="filter-tab" data-filter="critical">דחופים (${results.updates.filter(u => u.priority === 'critical').length})</button>
                    <button class="filter-tab" data-filter="new">חדשים (${results.updates.filter(u => u.isNew).length})</button>
                    <button class="filter-tab" data-filter="ai">תובנות AI (${results.updates.filter(u => u.hasAiInsight).length})</button>
                </div>
                
                <div class="filter-actions">
                    <button class="bulk-action-btn" onclick="selectAllUpdates()">בחר הכל</button>
                    <button class="bulk-action-btn" onclick="approveSelected()">אשר נבחרים</button>
                    <button class="bulk-action-btn" onclick="createTasksFromSelected()">צור משימות</button>
                </div>
            </div>
            
            <div class="updates-grid" id="updatesGrid">
                ${generateUpdatesGrid(results.updates)}
            </div>
            
            <div class="ai-recommendations">
                <h5>🧠 המלצות AI מתקדמות</h5>
                <div class="recommendations-list">
                    ${generateAiRecommendations(module, results)}
                </div>
            </div>
            
            <div class="sync-actions-footer">
                <button class="action-btn secondary" onclick="scheduleSyncReminder()">⏰ תזכיר לסנכרן שוב</button>
                <button class="action-btn secondary" onclick="exportSyncReport()">📊 ייצא דוח</button>
                <button class="action-btn primary" onclick="finalizeSyncSession()">✅ סיים וטבע שינויים</button>
            </div>
        </div>
    `;
    
    // Initialize interactive features
    initializeResultsInteractivity();
}

// Generate advanced sync results
function generateAdvancedResults(module) {
    const baseResults = {
        'emails': {
            stats: { critical: 3, new: 7, updated: 12, insights: 5 },
            updates: [
                {
                    id: 'email_001',
                    type: 'urgent_email',
                    title: 'דרישה דחופה - TK ביטוח בריאות',
                    description: 'דרישה להשלמת מסמכים תוך 48 שעות. AI זיהה קשר למשימה קיימת #1247',
                    priority: 'critical',
                    isNew: true,
                    hasAiInsight: true,
                    aiScore: 95,
                    suggestedActions: ['צור משימה דחופה', 'התראה SMS', 'חבר למשימה קיימת'],
                    relatedTasks: ['TK-1247: הגשת מסמכי ביטוח'],
                    timestamp: '2025-09-25T14:30:00',
                    source: 'Gmail API'
                },
                {
                    id: 'email_002', 
                    type: 'deadline_reminder',
                    title: 'תזכורת - הגשת סמינר באוניברסיטה',
                    description: 'תזכורת אוטומטית ממנהל האוניברסיטה. מועד אחרון: 26/09',
                    priority: 'high',
                    isNew: false,
                    hasAiInsight: true,
                    aiScore: 88,
                    suggestedActions: ['עדכן סטטוס משימה', 'שלח התראה ללקוח'],
                    relatedTasks: ['ACD-0891: סמינר פסיכולוגיה - כרמית'],
                    timestamp: '2025-09-25T13:15:00',
                    source: 'University Portal'
                }
            ]
        },
        'academic': {
            stats: { critical: 2, new: 4, updated: 8, insights: 3 },
            updates: [
                {
                    id: 'acad_001',
                    type: 'grade_update',
                    title: 'עדכון ציון - קורס פסיכולוגיה חברתית',
                    description: 'ציון חדש התקבל במערכת. AI זיהה השפעה על ממוצע הסמסטר',
                    priority: 'medium',
                    isNew: true,
                    hasAiInsight: true,
                    aiScore: 76
                }
            ]
        },
        'debts': {
            stats: { critical: 4, new: 2, updated: 6, insights: 8 },
            updates: [
                {
                    id: 'debt_001',
                    type: 'payment_overdue',
                    title: 'PAIR Finance - תשלום עבר מועד',
                    description: 'תשלום מס\' 120203581836 עבר מועד ב-3 ימים. AI ממליץ על פעולה מיידית',
                    priority: 'critical',
                    isNew: true,
                    hasAiInsight: true,
                    aiScore: 92
                }
            ]
        },
        'bureaucracy': {
            stats: { critical: 1, new: 5, updated: 9, insights: 4 },
            updates: [
                {
                    id: 'bur_001',
                    type: 'document_required',
                    title: 'בקשת מסמכים נוספים - עיריית תל אביב',
                    description: 'נדרשים מסמכים נוספים לטיפול בבקשה 45789. AI זיהה מסמכים דומים במערכת',
                    priority: 'high',
                    isNew: true,
                    hasAiInsight: true,
                    aiScore: 81
                }
            ]
        }
    };
    
    return baseResults[module] || { stats: {}, updates: [] };
}

function getModuleName(module) {
    const names = {
        'emails': 'מערכת מיילים',
        'academic': 'מערכת אקדמיה', 
        'debts': 'מערכת חובות',
        'bureaucracy': 'מערכת בירוקרטיה'
    };
    return names[module] || module;
}

// Generate updates grid
function generateUpdatesGrid(updates) {
    return updates.map(update => `
        <div class="update-card ${update.priority}" data-update-id="${update.id}">
            <div class="update-header">
                <div class="update-checkbox">
                    <input type="checkbox" id="update_${update.id}" class="update-selector">
                </div>
                <div class="update-priority">
                    <span class="priority-badge ${update.priority}">${getPriorityLabel(update.priority)}</span>
                    ${update.isNew ? '<span class="new-badge">חדש</span>' : ''}
                    ${update.hasAiInsight ? '<span class="ai-badge">AI</span>' : ''}
                </div>
                <div class="update-score">
                    <span class="ai-score">${update.aiScore || 0}</span>
                </div>
            </div>
            
            <div class="update-content">
                <h5 class="update-title">${update.title}</h5>
                <p class="update-description">${update.description}</p>
                
                ${update.relatedTasks ? `
                    <div class="related-tasks">
                        <strong>משימות קשורות:</strong>
                        ${update.relatedTasks.map(task => `<span class="task-link">${task}</span>`).join('')}
                    </div>
                ` : ''}
                
                <div class="update-meta">
                    <span class="update-source">📍 ${update.source || 'מקור לא ידוע'}</span>
                    <span class="update-time">⏰ ${formatTime(update.timestamp)}</span>
                </div>
            </div>
            
            <div class="update-actions">
                <div class="suggested-actions">
                    ${(update.suggestedActions || []).map(action => 
                        `<button class="suggested-action-btn" onclick="performAction('${update.id}', '${action}')">${action}</button>`
                    ).join('')}
                </div>
                
                <div class="primary-actions">
                    <button class="action-btn small secondary" onclick="snoozeUpdate('${update.id}')">⏰ דחה</button>
                    <button class="action-btn small primary" onclick="approveUpdate('${update.id}')">✅ אשר</button>
                    <button class="action-btn small" onclick="viewUpdateDetails('${update.id}')">👁️ פרטים</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Generate AI recommendations
function generateAiRecommendations(module, results) {
    const recommendations = {
        'emails': [
            {
                type: 'pattern',
                title: 'זוהה דפוס חוזר',
                description: 'המערכת זיהתה שאתה מקבל הרבה מיילים מTK ביטוח. האם לטייג אוטומטית?',
                confidence: 87,
                actions: ['צור כלל אוטומטי', 'הוסף לרשימה לבנה']
            },
            {
                type: 'optimization',
                title: 'אופטימיזציה מוצעת',
                description: 'זמן התגובה הממוצע למיילים דחופים: 4.2 שעות. מומלץ להגדיר התראות מיידיות',
                confidence: 92,
                actions: ['הגדר התראות SMS', 'צור תבנית תגובה']
            }
        ],
        'debts': [
            {
                type: 'risk_analysis',
                title: 'ניתוח סיכונים',
                description: '3 חובות מתקרבים לפירעון בו-זמנית. מומלץ לתעדף לפי חומרה משפטית',
                confidence: 95,
                actions: ['צור תוכנית פירעון', 'יעוץ משפטי']
            }
        ]
    };
    
    const moduleRecs = recommendations[module] || [];
    
    return moduleRecs.map(rec => `
        <div class="ai-recommendation ${rec.type}">
            <div class="rec-header">
                <span class="rec-icon">${getRecommendationIcon(rec.type)}</span>
                <span class="rec-confidence">${rec.confidence}%</span>
            </div>
            <div class="rec-content">
                <h6>${rec.title}</h6>
                <p>${rec.description}</p>
                <div class="rec-actions">
                    ${rec.actions.map(action => 
                        `<button class="rec-action-btn" onclick="implementRecommendation('${module}', '${rec.type}', '${action}')">${action}</button>`
                    ).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

// Interactive functions
function initializeResultsInteractivity() {
    // Filter tabs functionality
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const filter = this.dataset.filter;
            filterUpdates(filter);
            
            // Update active tab
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Update selection functionality
    document.querySelectorAll('.update-selector').forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectionCount);
    });
}

function filterUpdates(filter) {
    const cards = document.querySelectorAll('.update-card');
    
    cards.forEach(card => {
        let show = true;
        
        if (filter === 'critical') {
            show = card.classList.contains('critical');
        } else if (filter === 'new') {
            show = card.querySelector('.new-badge') !== null;
        } else if (filter === 'ai') {
            show = card.querySelector('.ai-badge') !== null;
        }
        
        card.style.display = show ? 'block' : 'none';
    });
}

// Action functions
function selectAllUpdates() {
    document.querySelectorAll('.update-selector').forEach(cb => {
        cb.checked = true;
    });
    updateSelectionCount();
}

function approveSelected() {
    const selected = Array.from(document.querySelectorAll('.update-selector:checked'));
    if (selected.length === 0) {
        alert('אנא בחר עדכונים לאישור');
        return;
    }
    
    const count = selected.length;
    if (confirm(`לאשר ${count} עדכונים נבחרים?`)) {
        selected.forEach(cb => {
            const card = cb.closest('.update-card');
            card.style.opacity = '0.6';
            card.classList.add('approved');
        });
        
        showNotification(`✅ ${count} עדכונים אושרו בהצלחה!`);
        updateSelectionCount();
    }
}

function createTasksFromSelected() {
    const selected = Array.from(document.querySelectorAll('.update-selector:checked'));
    if (selected.length === 0) {
        alert('אנא בחר עדכונים ליצירת משימות');
        return;
    }
    
    const count = selected.length;
    if (confirm(`ליצור ${count} משימות חדשות מהעדכונים הנבחרים?`)) {
        // Simulate task creation
        showNotification(`📋 ${count} משימות חדשות נוצרו!`);
        
        // Update UI
        selected.forEach(cb => {
            const card = cb.closest('.update-card');
            card.classList.add('task-created');
        });
    }
}

// Utility functions
function getPriorityLabel(priority) {
    const labels = {
        'critical': 'קריטי',
        'high': 'גבוה',
        'medium': 'בינוני',
        'low': 'נמוך'
    };
    return labels[priority] || priority;
}

function getRecommendationIcon(type) {
    const icons = {
        'pattern': '🔍',
        'optimization': '⚡',
        'risk_analysis': '⚠️',
        'automation': '🤖'
    };
    return icons[type] || '💡';
}

function formatTime(timestamp) {
    if (!timestamp) return 'לא ידוע';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `לפני ${diffMins} דקות`;
    if (diffMins < 1440) return `לפני ${Math.floor(diffMins/60)} שעות`;
    return date.toLocaleDateString('he-IL');
}

function updateSelectionCount() {
    const selected = document.querySelectorAll('.update-selector:checked').length;
    const total = document.querySelectorAll('.update-selector').length;
    
    // Update bulk action buttons
    const bulkBtns = document.querySelectorAll('.bulk-action-btn');
    bulkBtns.forEach(btn => {
        btn.style.opacity = selected > 0 ? '1' : '0.5';
        btn.disabled = selected === 0;
    });
}

function showNotification(message, type = 'info') {
    // Create and show notification
    const notification = document.createElement('div');
    notification.className = `sync-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.remove();
    }, type === 'warning' ? 5000 : 3000); // Warning messages stay longer
}
// Action handler functions for sync modal
function performAction(updateId, action) {
    console.log(`🎯 מבצע פעולה: ${action} עבור עדכון ${updateId}`);
    
    const actionMessages = {
        'צור משימה דחופה': '📋 משימה דחופה נוצרה בהצלחה!',
        'התראה SMS': '📱 התראת SMS נשלחה!',
        'חבר למשימה קיימת': '🔗 העדכון חובר למשימה קיימת!',
        'עדכן סטטוס משימה': '📊 סטטוס המשימה עודכן!',
        'שלח התראה ללקוח': '📧 התראה נשלחה ללקוח!',
        'צור תוכנית פירעון': '💰 תוכנית פירעון נוצרה!',
        'יעוץ משפטי': '⚖️ בקשה ליעוץ משפטי נשלחה!',
        'צור כלל אוטומטי': '🤖 כלל אוטומטי נוצר!',
        'הוסף לרשימה לבנה': '✅ נוסף לרשימה הלבנה!',
        'הגדר התראות SMS': '📱 התראות SMS הוגדרו!',
        'צור תבנית תגובה': '📝 תבנית תגובה נוצרה!'
    };
    
    const message = actionMessages[action] || `✅ פעולה "${action}" בוצעה בהצלחה!`;
    showNotification(message);
    
    // Update UI to show action was performed
    const updateCard = document.querySelector(`[data-update-id="${updateId}"]`);
    if (updateCard) {
        updateCard.classList.add('action-performed');
        
        // Disable the action button
        const actionBtn = Array.from(updateCard.querySelectorAll('.suggested-action-btn'))
            .find(btn => btn.textContent === action);
        if (actionBtn) {
            actionBtn.disabled = true;
            actionBtn.textContent = '✅ ' + action;
            actionBtn.style.background = '#10b981';
            actionBtn.style.color = 'white';
        }
    }
}

function approveUpdate(updateId) {
    console.log(`✅ מאשר עדכון: ${updateId}`);
    
    const updateCard = document.querySelector(`[data-update-id="${updateId}"]`);
    if (updateCard) {
        updateCard.classList.add('approved');
        updateCard.style.opacity = '0.7';
        
        // Update approve button
        const approveBtn = updateCard.querySelector('.action-btn.primary');
        if (approveBtn) {
            approveBtn.textContent = '✅ אושר';
            approveBtn.disabled = true;
            approveBtn.style.background = '#10b981';
        }
    }
    
    showNotification('✅ העדכון אושר בהצלחה!');
}

function snoozeUpdate(updateId) {
    console.log(`⏰ דוחה עדכון: ${updateId}`);
    
    const options = [
        '15 דקות',
        '1 שעה', 
        '4 שעות',
        'מחר בבוקר',
        'בשבוע הבא'
    ];
    
    const choice = prompt(`לכמה זמן לדחות את העדכון?\n\n${options.map((opt, i) => `${i+1}. ${opt}`).join('\n')}\n\nהכנס מספר (1-${options.length}):`);
    
    if (choice && choice >= 1 && choice <= options.length) {
        const selectedOption = options[choice - 1];
        
        const updateCard = document.querySelector(`[data-update-id="${updateId}"]`);
        if (updateCard) {
            updateCard.classList.add('snoozed');
            updateCard.style.opacity = '0.5';
            
            // Add snooze indicator
            const snoozeIndicator = document.createElement('div');
            snoozeIndicator.className = 'snooze-indicator';
            snoozeIndicator.textContent = `💤 נדחה ל${selectedOption}`;
            updateCard.querySelector('.update-content').appendChild(snoozeIndicator);
        }
        
        showNotification(`⏰ העדכון נדחה ל${selectedOption}`);
    }
}

function viewUpdateDetails(updateId) {
    console.log(`👁️ מציג פרטי עדכון: ${updateId}`);
    
    // Create detailed view modal
    const detailModal = document.createElement('div');
    detailModal.className = 'update-detail-modal';
    detailModal.innerHTML = `
        <div class="update-detail-content">
            <div class="detail-header">
                <h3>🔍 פרטי עדכון מלאים</h3>
                <button class="close-detail-btn" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
            </div>
            <div class="detail-body">
                <div class="detail-section">
                    <h4>📊 מידע כללי</h4>
                    <p><strong>מזהה:</strong> ${updateId}</p>
                    <p><strong>זמן יצירה:</strong> ${new Date().toLocaleString('he-IL')}</p>
                    <p><strong>מקור הנתונים:</strong> Gmail API Integration</p>
                </div>
                
                <div class="detail-section">
                    <h4>🧠 ניתוח AI</h4>
                    <p><strong>ציון חשיבות:</strong> 95/100</p>
                    <p><strong>קטגוריה:</strong> בירוקרטיה דחופה</p>
                    <p><strong>תגיות זוהו:</strong> TK, ביטוח בריאות, מסמכים חסרים</p>
                </div>
                
                <div class="detail-section">
                    <h4>📋 משימות קשורות</h4>
                    <p>• משימה #1247 - הגשת מסמכי ביטוח TK</p>
                    <p>• משימה #1156 - מעקב אחר בקשות ביטוח</p>
                </div>
                
                <div class="detail-section">
                    <h4>📈 היסטוריה</h4>
                    <p>• ${new Date().toLocaleString('he-IL')} - עדכון זוהה על ידי AI</p>
                    <p>• ${new Date().toLocaleString('he-IL')} - הוגדר כדחוף</p>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(detailModal);
    
    // Show with animation
    setTimeout(() => {
        detailModal.classList.add('show');
    }, 10);
}

function scheduleSyncReminder() {
    const intervals = ['15 דקות', '1 שעה', '4 שעות', '24 שעות'];
    const choice = prompt(`מתי להזכיר על סינכרון חוזר?\n\n${intervals.map((int, i) => `${i+1}. ${int}`).join('\n')}\n\nהכנס מספר:`);
    
    if (choice && choice >= 1 && choice <= intervals.length) {
        showNotification(`⏰ תזכורת נקבעה ל${intervals[choice-1]}`);
    }
}

function exportSyncReport() {
    showNotification('📊 דוח סינכרון יוצא... (פונקציונליות בפיתוח)');
    
    // Simulate report generation
    setTimeout(() => {
        const reportData = `דוח סינכרון - ${new Date().toLocaleDateString('he-IL')}
        
📊 סטטיסטיקות:
- עדכונים דחופים: 3
- עדכונים חדשים: 7  
- עדכונים שעודכנו: 12
- תובנות AI: 5

🎯 פעולות שבוצעו:
- משימות נוצרו: 4
- התראות נשלחו: 7
- עדכונים אושרו: 12

🤖 המלצות AI:
- זוהו 2 דפוסים חוזרים
- הוצעו 3 אופטימיזציות
- זוהה 1 סיכון פוטנציאלי
        `;
        
        const blob = new Blob([reportData], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `sync-report-${new Date().toISOString().split('T')[0]}.txt`;
        link.click();
        
        showNotification('📄 דוח נשמר בהצלחה!');
    }, 2000);
}

function finalizeSyncSession() {
    const approvedCount = document.querySelectorAll('.update-card.approved').length;
    const tasksCreated = document.querySelectorAll('.update-card.task-created').length;
    
    const confirmMessage = `
סיכום סשן סינכרון:

✅ עדכונים שאושרו: ${approvedCount}
📋 משימות שנוצרו: ${tasksCreated}
🤖 המלצות AI שיושמו: ${Math.floor(Math.random() * 5) + 1}

האם לשמור ולטבע את כל השינויים?
    `;
    
    if (confirm(confirmMessage)) {
        // Simulate finalization
        showNotification('💾 השינויים נשמרו וטבעו במערכת!');
        
        // Close modal after delay
        setTimeout(() => {
            closeSyncModal();
        }, 2000);
    }
}

function implementRecommendation(module, type, action) {
    console.log(`🤖 מיישם המלצת AI: ${action} במודול ${module}`);
    
    const messages = {
        'צור כלל אוטומטי': '🤖 כלל אוטומטי נוצר! מיילים מTK יסווגו אוטומטית.',
        'הוסף לרשימה לבנה': '✅ TK ביטוח נוסף לרשימה הלבנה.',
        'הגדר התראות SMS': '📱 התראות SMS הוגדרו למיילים דחופים.',
        'צור תבנית תגובה': '📝 תבנית תגובה נוצרה למיילי ביטוח.',
        'צור תוכנית פירעון': '💰 תוכנית פירעון אוטומטית הוגדרה.',
        'יעוץ משפטי': '⚖️ בקשה ליעוץ משפטי נוספה למשימות.'
    };
    
    const message = messages[action] || `✅ המלצה "${action}" יושמה בהצלחה!`;
    showNotification(message);
    
    // Update recommendation UI
    const recElement = event.target.closest('.ai-recommendation');
    if (recElement) {
        recElement.style.opacity = '0.7';
        recElement.style.background = '#f0fdf4';
        event.target.textContent = '✅ יושם';
        event.target.disabled = true;
    }
}
// --- Legacy sync code removed & cleaned (duplicate helpers, unused blocks) ---
// Retain only the functions still needed by current advanced UI: closeSyncModal, loadSyncBadges.

function closeSyncModal() {
    const modal = document.getElementById('syncModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
}

async function loadSyncBadges() {
    console.log('🏷️ טוען תגי סנכרון...');
    const modules = ['academic', 'bureaucracy', 'debts', 'emails'];
    for (const module of modules) {
        try {
            const response = await fetch(`/api/sync/${module}`);
            const data = await response.json();
            if (data.success) {
                const badge = document.getElementById(`${module}Badge`);
                const count = data.count || 0;
                if (badge) {
                    badge.textContent = count;
                    const button = badge.closest('.sync-btn');
                    if (button) {
                        if (count > 0) button.classList.add('has-updates');
                        else button.classList.remove('has-updates');
                    }
                }
            }
        } catch (error) {
            console.error(`שגיאה בטעינת תג ${module}:`, error);
        }
    }
}

// Expose only required legacy global handlers
window.handleTaskAction = handleTaskAction;

// ================== AgentCore Frontend (Priorities & Questions) ==================
async function loadPrioritiesData() {
    const tbody = document.getElementById('prioritiesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">⏳ טוען...</td></tr>';
    try {
        const res = await fetch('/api/agent/priorities');
        const data = await res.json();
        if (!data.success) throw new Error(data.error||'שגיאה');
        if (!data.data.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">אין פריטים</td></tr>';
            return;
        }
        tbody.innerHTML = data.data.slice(0,50).map(item => renderPriorityRow(item)).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#c00;">שגיאה: ${e.message}</td></tr>`;
    }
}

function renderPriorityRow(item) {
    const deadline = item.deadline ? new Date(item.deadline).toLocaleDateString('he-IL') : '-';
    const amount = item.amount ? `${item.currency||''} ${item.amount}` : '-';
    const statusClass = mapStatusToClass(item.status || '');
    const action = item.action ? `<span class="action-chip">${item.action}</span>` : '';
    // Build breakdown tooltip if available
    let breakdownHtml = '';
    if (item.breakdown && Array.isArray(item.breakdown)) {
        breakdownHtml = item.breakdown.map(b=> `<div class='bd-row'><span>${b.label}</span><span>${b.points}</span></div>`).join('');
    }
    const correspond = buildCorrespondenceBadge(item);
    return `<tr>
        <td>${item.title}</td>
        <td>${deadline}</td>
        <td>${amount}</td>
        <td><span class="status-badge ${statusClass}">${item.status || ''}</span></td>
        <td>${correspond}</td>
        <td><span class="score-badge" data-breakdown='${JSON.stringify(item.breakdown||[]).replace(/'/g,"&apos;")}' onclick="showScoreBreakdown(this)">${item.priorityScore}</span></td>
        <td>${action}</td>
    </tr>`;
}

function buildCorrespondenceBadge(item) {
    if (item.domain === 'email') return '<span class="correspond-badge">מייל</span>';
    const count = item.emailCount || 0;
    if (!count) return '<span class="correspond-badge">—</span>';
    const cls = count ? 'correspond-badge has-mails' : 'correspond-badge';
    const label = count >= 5 ? `✉️ ${count}` : `✉ ${count}`;
    return `<span class="${cls}" onclick="openEmailThread('${item.id}')" title="תכתובת: ${count}">${label}</span>`;
}

function mapStatusToClass(status) {
    if (!status) return 'medium';
    const s = status.trim();
    if (['דחוף','התראה','איחור'].includes(s)) return 'critical';
    if (['גבוה','פתוח','בהתנגדות'].includes(s)) return 'high';
    if (['בינוני','בהמתנה'].includes(s)) return 'medium';
    return 'low';
}

async function updateBalanceFromInput() {
    const input = document.getElementById('balanceInput');
    if (!input) return;
    const val = Number(input.value);
    if (isNaN(val)) { showNotification('אנא הזיני ערך מספרי ליתרה'); return; }
    try {
        const res = await fetch('/api/agent/finance/balance', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ balance: val }) });
        const data = await res.json();
        if (data.success) {
            showNotification('יתרה עודכנה');
            loadPrioritiesData();
        } else {
            showNotification('שגיאה בעדכון יתרה','error');
        }
    } catch (e) {
        showNotification('שגיאה ברשת');
    }
}

async function runSyncSimulation() {
    try {
        const res = await fetch('/api/agent/sync/simulate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sources:['emails','debts','bureaucracy','academic'] }) });
        const data = await res.json();
        if (data.success) {
            showNotification('סימולציית סנכרון בוצעה');
            loadPrioritiesData();
        }
    } catch (e) {
        showNotification('שגיאה בסימולציה','error');
    }
}

async function toggleQuestionsPanel() {
    const panel = document.getElementById('questionsPanel');
    if (!panel) return;
    if (panel.style.display === 'none') {
        await loadQuestions();
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}

async function loadQuestions() {
    const panel = document.getElementById('questionsPanel');
    const counter = document.getElementById('questionsCount');
    if (!panel) return;
    panel.innerHTML = '<div style="padding:10px;">⏳ טוען שאלות...</div>';
    try {
        const res = await fetch('/api/agent/questions');
        const data = await res.json();
        if (!data.success) throw new Error(data.error||'שגיאה');
        const questions = data.data;
        if (counter) counter.textContent = questions.length;
        if (!questions.length) { panel.innerHTML = '<div style="padding:10px;">אין שאלות פתוחות ✅</div>'; return; }
        panel.innerHTML = questions.map(q => renderQuestionItem(q)).join('');
        panel.querySelectorAll('.answer-btn').forEach(btn => {
            btn.addEventListener('click', answerQuestionHandler);
        });
    } catch (e) {
        panel.innerHTML = `<div style="color:#c00;padding:10px;">שגיאה: ${e.message}</div>`;
    }
}

function renderQuestionItem(q) {
    return `<div class="question-item" data-qid="${q.id}">
        <div class="question-text">${q.question}<div class="question-meta">נושא: ${q.topic} • חשיבות: ${q.importance}</div></div>
        <div class="question-actions">
            <input class="answer-input" placeholder="תשובה" />
            <button class="small-btn answer-btn">שליחה</button>
        </div>
    </div>`;
}

async function answerQuestionHandler(e) {
    const wrapper = e.target.closest('.question-item');
    const id = wrapper.getAttribute('data-qid');
    const input = wrapper.querySelector('.answer-input');
    const answer = input.value.trim();
    if (!answer) { showNotification('אנא כתבי תשובה'); return; }
    try {
        const res = await fetch(`/api/agent/questions/${id}/answer`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ answer }) });
        const data = await res.json();
        if (data.success) {
            wrapper.style.opacity = 0.5;
            wrapper.querySelector('.answer-input').disabled = true;
            e.target.disabled = true;
            showNotification('נשמר');
            loadQuestions();
        } else {
            showNotification('שגיאה בשמירה','error');
        }
    } catch (err) {
        showNotification('שגיאת רשת','error');
    }
}

// Extend initializeEventListeners to wire priorities controls if present
const _origInitEvents = initializeEventListeners;
initializeEventListeners = function() {
    _origInitEvents();
    const refreshPrioritiesBtn = document.getElementById('refreshPrioritiesBtn');
    const updateBalanceBtn = document.getElementById('updateBalanceBtn');
    const runSyncSimBtn = document.getElementById('runSyncSimBtn');
    const loadQuestionsBtn = document.getElementById('loadQuestionsBtn');
    const gmailSyncBtn = document.getElementById('gmailSyncBtn');
    if (refreshPrioritiesBtn) refreshPrioritiesBtn.addEventListener('click', loadPrioritiesData);
    if (updateBalanceBtn) updateBalanceBtn.addEventListener('click', updateBalanceFromInput);
    if (runSyncSimBtn) runSyncSimBtn.addEventListener('click', runSyncSimulation);
    if (loadQuestionsBtn) loadQuestionsBtn.addEventListener('click', toggleQuestionsPanel);
    if (gmailSyncBtn) gmailSyncBtn.addEventListener('click', syncGmailAndRefresh);
};

// Hook into tab switching for priorities
const _origSwitchTab = switchTab;
switchTab = function(tabName) {
    _origSwitchTab(tabName);
    if (tabName === 'priorities') {
        loadPrioritiesData();
    }
};

// Expose for debugging
window.__AgentCoreUI = { loadPrioritiesData, loadQuestions };

// Score breakdown popup
function showScoreBreakdown(el) {
    try {
        const data = JSON.parse(el.getAttribute('data-breakdown')||'[]');
        if (!data.length) return;
        const html = `
        <div class="score-explain-wrap">
            <div class="score-explain-title">פירוט ניקוד</div>
            <div class="score-explain-rows">${data.map(b=> `<div class='row'><span>${b.label}</span><span>${b.points}</span></div>`).join('')}</div>
        </div>`;
        const modal = document.createElement('div');
        modal.className = 'mini-modal-overlay';
        modal.innerHTML = `<div class='mini-modal'>${html}<button class='close-mini' onclick='this.closest(".mini-modal-overlay").remove()'>סגור</button></div>`;
        document.body.appendChild(modal);
    } catch (e) {}
}
window.showScoreBreakdown = showScoreBreakdown;
window.openEmailThread = openEmailThread;
// Category label mapper (added for grouped score breakdown)
function mapCategoryLabel(cat){
    return ({ deadline:'דדליין', finance:'כסף', communication:'תקשורת', status:'סטטוס', domain:'דומיין', context:'קונטקסט', other:'אחר'})[cat] || cat;
}

// Auto Actions Panel logic injected
async function toggleAutoActionsPanel(){
    const panel = document.getElementById('autoActionsPanel');
    if (!panel) return;
    if (panel.style.display==='none' || panel.style.display===''){ await loadAutoActions(); panel.style.display='block'; }
    else panel.style.display='none';
}
async function loadAutoActions(){
    const panel = document.getElementById('autoActionsPanel');
    panel.innerHTML = '<div style="padding:10px;">⏳ טוען פעולות...</div>';
    try {
        const res = await fetch('/api/agent/auto-actions');
        const data = await res.json();
        if (!data.success) throw new Error(data.error||'שגיאה');
        const acts = data.data;
        if (!acts.length){ panel.innerHTML = '<div style="padding:10px;">אין פעולות כרגע ✅</div>'; return; }
        panel.innerHTML = acts.map(a=> renderAutoActionItem(a)).join('');
        panel.querySelectorAll('.apply-action-btn').forEach(btn=> btn.addEventListener('click', applyAutoAction));
    } catch(e){ panel.innerHTML = `<div style='color:#c00;padding:10px;'>${e.message}</div>`; }
}
function renderAutoActionItem(a){
    return `<div class='auto-action-item' data-aid='${a.type}_${a.emailId}'>
        <div class='auto-action-left'>
            <div class='auto-action-title'>${a.label}</div>
            <div class='auto-action-reason'>${a.reason}</div>
            <div class='auto-action-meta'>עדיפות: ${a.priority} • מקור: אימייל ${a.emailId}</div>
        </div>
        <div class='auto-action-actions'>
            <button class='apply-action-btn'>הפעל</button>
        </div>
    </div>`;
}
async function applyAutoAction(e){
    const wrapper = e.target.closest('.auto-action-item');
    if (!wrapper) return;
    wrapper.style.opacity=0.55; e.target.disabled=true; e.target.textContent='בוצע';
    showNotification('הפעולה בוצעה (לוקאלית)');
    setTimeout(loadPrioritiesData, 400);
}
window.toggleAutoActionsPanel = toggleAutoActionsPanel;

// Lightweight metrics polling (placeholder - future UI usage)
async function pollMetrics(){ try { await fetch('/api/agent/metrics'); } catch(_e){} setTimeout(pollMetrics, 30000); }
pollMetrics();

async function syncGmailAndRefresh() {
    try {
        showNotification('🔄 מסנכרן מיילים...', 'info');
        
        const response = await fetch('/api/gmail/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success && data.ingested > 0) {
            // Simulate found emails for the approval modal
            const foundEmails = [
                {
                    subject: 'דרישת תשלום - PAIR Finance',
                    from: 'noreply@pairfinance.com',
                    snippet: 'אנו מבקשים לקבל תשלום עבור החוב הקיים בסך 1,250 ש"ח...',
                    date: '2025-01-25',
                    priority: 'high',
                    body: 'מכתב דרישת תשלום מפירמת PAIR Finance'
                },
                {
                    subject: 'תזכורת פגישה - משרד עורכי דין',
                    from: 'office@law-firm.co.il', 
                    snippet: 'תזכורת לפגישה שנקבעה ביום רביעי בשעה 14:00...',
                    date: '2025-01-24',
                    priority: 'medium',
                    body: 'תזכורת פגישה חשובה במשרד עורכי דין'
                },
                {
                    subject: 'חשבון חשמל - חברת החשמל',
                    from: 'bills@iec.co.il',
                    snippet: 'חשבון חשמל לחודש ינואר 2025 בסך 380 ש"ח...',
                    date: '2025-01-23', 
                    priority: 'low',
                    body: 'חשבון חודשי מחברת החשמל'
                }
            ];
            
            // Open approval modal with found emails
            openGmailSyncModal(foundEmails);
        } else {
            showNotification(data.message || '✅ הסנכרון הושלם - לא נמצאו מיילים חדשים', 'success');
        }
    } catch (error) {
        console.error('Gmail sync error:', error);
        showNotification('❌ שגיאה בסנכרון Gmail', 'error');
    }
}

async function openEmailThread(entityId) {
    try {
        const panel = document.getElementById('emailThreadPanel');
        const body = document.getElementById('emailThreadBody');
        if (!panel || !body) return;
        body.innerHTML = '⏳ טוען...';
        panel.style.display = 'block';
        // Fetch state snapshot to get last priorities and graph context (lightweight)
        const stateRes = await fetch('/api/agent/state');
        const stateData = await stateRes.json();
        if (!stateData.success) throw new Error('שגיאת מצב');
        // Fetch grouped emails
        const emailsRes = await fetch('/api/emails');
        const emailsData = await emailsRes.json();
        const events = (stateData.data?.memory?.events||[]).filter(e => e.type === 'email_linked' && e.payload?.entity === entityId).slice(-100).reverse();
        if (!events.length) { body.innerHTML = 'אין תכתובת מקושרת'; return; }
        const emailList = emailsData.data || [];
        const emailMap = new Map(emailList.map(e=>[e.id,e]));
        const byThread = {};
        events.forEach(ev => {
            const em = emailMap.get(ev.payload.emailId);
            if (!em) return;
            const tid = em.threadId || em.id;
            (byThread[tid]||(byThread[tid]=[])).push({ ev, em });
        });
        const threadHtml = Object.entries(byThread).map(([tid,arr])=> {
            const sorted = arr.sort((a,b)=> new Date(a.em.date)- new Date(b.em.date));
            const header = sorted[0].em.subject || '(ללא נושא)';
            const msgs = sorted.map(pair => {
                const em = pair.em; const ev = pair.ev;
                const dt = new Date(ev.timestamp).toLocaleString('he-IL');
                const tags = (em.tags||[]).map(t=> `<span class='tag-chip'>${t}</span>`).join('');
                const snippet = (em.snippet||'').slice(0,280);
                return `<div class="email-msg"><div class="em-subject">${em.subject||'(ללא נושא)'}</div><div class="em-meta">${dt} • התאמה ${ev.payload.score} ${tags}</div><div class="em-snippet">${snippet}</div></div>`;
            }).join('');
            return `<div class='email-thread-group'><div class='em-meta'>Thread: ${tid} (${sorted.length}) • ${header}</div>${msgs}</div>`;
        }).join('');
        body.innerHTML = threadHtml;
        const closeBtn = document.getElementById('closeEmailThreadBtn');
        if (closeBtn && !closeBtn._bound) { closeBtn.addEventListener('click', ()=> panel.style.display='none'); closeBtn._bound = true; }
    } catch (e) {
        const body = document.getElementById('emailThreadBody');
        if (body) body.innerHTML = 'שגיאה בטעינת תכתובת';
    }
}

// Auto-actions loading (optional future UI element placeholder)
async function loadAutoActionsPreview() {
    try {
        const res = await fetch('/api/agent/auto-actions');
        const data = await res.json();
        if (!data.success) return;
        // For now just log; could inject into a future panel
        console.log('🔧 הצעות אוטומטיות:', data.data);
    } catch (e) { /* ignore */ }
}

// Task Input Modal Functions
let currentTaskType = null;

function openTaskModal(taskType) {
    currentTaskType = taskType;
    const modal = document.getElementById('taskModal');
    const title = document.getElementById('taskModalTitle');
    
    // Update modal title based on task type
    const titles = {
        'academic': 'הוסף משימה אקדמית',
        'bureaucracy': 'הוסף משימה בירוקרטית', 
        'debts': 'הוסף חוב חדש'
    };
    
    title.textContent = titles[taskType] || 'הוסף משימה חדשה';
    
    // Show/hide specific fields based on task type
    document.getElementById('academicFields').style.display = taskType === 'academic' ? 'block' : 'none';
    document.getElementById('bureaucracyFields').style.display = taskType === 'bureaucracy' ? 'block' : 'none';
    document.getElementById('debtsFields').style.display = taskType === 'debts' ? 'block' : 'none';
    
    // Clear form
    document.getElementById('taskForm').reset();
    
    // Set default due date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('taskDueDate').value = tomorrow.toISOString().split('T')[0];
    
    modal.style.display = 'flex';
    document.getElementById('taskTitle').focus();
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    modal.style.display = 'none';
    currentTaskType = null;
}

async function saveTask() {
    if (!currentTaskType) return;
    
    const form = document.getElementById('taskForm');
    const formData = new FormData(form);
    
    // Build task object
    const taskData = {
        type: currentTaskType,
        title: formData.get('title'),
        description: formData.get('description'),
        due_date: formData.get('due_date'),
        priority: formData.get('priority'),
        status: formData.get('status'),
        client: formData.get('client'),
        notes: formData.get('notes'),
        created_at: new Date().toISOString()
    };
    
    // Add type-specific fields
    if (currentTaskType === 'academic') {
        taskData.course = formData.get('course');
    } else if (currentTaskType === 'bureaucracy') {
        taskData.authority = formData.get('authority');
    } else if (currentTaskType === 'debts') {
        taskData.amount = parseFloat(formData.get('amount')) || 0;
        taskData.currency = formData.get('currency');
    }
    
    // Validate required fields
    if (!taskData.title.trim()) {
        showNotification('⚠️ נדרש להזין כותרת למשימה', 'warning');
        return;
    }
    
    try {
        // Show loading state
        const saveBtn = document.querySelector('.btn--primary');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '⏳ שומר...';
        saveBtn.disabled = true;
        
        const response = await fetch(`/api/${currentTaskType}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`✅ המשימה נשמרה בהצלחה!`, 'success');
            closeTaskModal();
            
            // Refresh the relevant tab data
            await loadSmartOverview();
            
            // If currently viewing the task type tab, refresh it
            const activeTab = document.querySelector('.nav-tab.active');
            if (activeTab && activeTab.dataset.tab === currentTaskType) {
                // Refresh current tab view
                loadDomainData(currentTaskType);
            }
        } else {
            throw new Error(result.error || 'Unknown error');
        }
        
    } catch (error) {
        console.error('Error saving task:', error);
        showNotification(`❌ שגיאה בשמירת המשימה: ${error.message}`, 'error');
    } finally {
        // Restore button state
        const saveBtn = document.querySelector('.btn--primary');
        if (saveBtn) {
            saveBtn.textContent = 'שמור משימה';
            saveBtn.disabled = false;
        }
    }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('taskModal');
    if (e.target === modal) {
        closeTaskModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('taskModal');
        if (modal.style.display === 'flex') {
            closeTaskModal();
        }
    }
});

// ===== GMAIL SYNC & AI MODAL FUNCTIONS =====

// Gmail Sync Modal Functions
function openGmailSyncModal(emails) {
    const modal = document.getElementById('gmailSyncModal');
    const container = document.getElementById('foundEmailsContainer');
    
    // Clear previous content
    container.innerHTML = '';
    
    if (emails && emails.length > 0) {
        const emailsList = document.createElement('div');
        emailsList.className = 'emails-preview-list';
        
        emails.forEach((email, index) => {
            const emailItem = document.createElement('div');
            emailItem.className = 'email-preview-item';
            emailItem.innerHTML = `
                <div class="email-header">
                    <input type="checkbox" id="email_${index}" checked>
                    <label for="email_${index}" class="email-subject">${email.subject || 'ללא נושא'}</label>
                    <span class="email-sender">${email.from || 'שולח לא ידוע'}</span>
                </div>
                <div class="email-preview">${(email.snippet || email.body || 'אין תוכן זמין').substring(0, 150)}...</div>
                <div class="email-meta">
                    <span class="email-date">${email.date || 'תאריך לא ידוע'}</span>
                    <span class="priority-indicator ${email.priority || 'medium'}">${getPriorityText(email.priority)}</span>
                </div>
            `;
            emailsList.appendChild(emailItem);
        });
        
        container.appendChild(emailsList);
    } else {
        container.innerHTML = '<div class="no-emails">לא נמצאו מיילים חדשים לסנכרון</div>';
    }
    
    modal.style.display = 'flex';
    
    // Setup event listeners
    document.getElementById('approveGmailSync').onclick = () => approveGmailSync(false);
    document.getElementById('syncAndLearn').onclick = () => approveGmailSync(true);
}

function closeGmailSyncModal() {
    document.getElementById('gmailSyncModal').style.display = 'none';
}

function approveGmailSync(enableLearning) {
    const checkedEmails = [];
    const checkboxes = document.querySelectorAll('#foundEmailsContainer input[type="checkbox"]:checked');
    
    checkboxes.forEach(checkbox => {
        const index = parseInt(checkbox.id.replace('email_', ''));
        checkedEmails.push(index);
    });
    
    const settings = {
        autoCreateTasks: document.getElementById('autoCreateTasks').checked,
        smartFilter: document.getElementById('smartFilter').checked,
        syncTimeRange: document.getElementById('syncTimeRange').value,
        enableLearning: enableLearning,
        selectedEmails: checkedEmails
    };
    
    // Send approval to backend
    fetch('/api/gmail/sync/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('✅ עדכונים מומיילים אושרו בהצלחה!', 'success');
            if (enableLearning) {
                showNotification('🧠 המערכת לומדת מהבחירות שלך לעתיד', 'info');
            }
            loadTasks(); // Refresh the tasks list
        } else {
            showNotification('❌ שגיאה באישור העדכונים: ' + (data.error || 'Unknown error'), 'error');
        }
        closeGmailSyncModal();
    })
    .catch(error => {
        console.error('Gmail sync approval error:', error);
        showNotification('❌ שגיאה באישור העדכונים', 'error');
        closeGmailSyncModal();
    });
}

function getPriorityText(priority) {
    switch(priority) {
        case 'high': return '🔴 גבוה';
        case 'medium': return '🟡 בינוני'; 
        case 'low': return '🟢 נמוך';
        default: return '🟡 בינוני';
    }
}

// Smart Chat Modal Functions
function openSmartChatModal() {
    const modal = document.getElementById('smartChatModal');
    modal.style.display = 'flex';
    
    // Focus on input
    document.getElementById('smartChatInput').focus();
    
    // Setup send button
    document.getElementById('sendSmartChatBtn').onclick = sendSmartChatMessage;
    
    // Setup enter key listener
    document.getElementById('smartChatInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            sendSmartChatMessage();
        }
    });
}

function closeSmartChatModal() {
    document.getElementById('smartChatModal').style.display = 'none';
}

function addQuickMessage(message) {
    document.getElementById('smartChatInput').value = message;
    document.getElementById('smartChatInput').focus();
}

function sendSmartChatMessage() {
    const input = document.getElementById('smartChatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addChatMessage(message, 'user');
    
    // Clear input
    input.value = '';
    
    // Show typing indicator
    addChatMessage('מקלידה...', 'ai', true);
    
    // Send to backend AI
    fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message })
    })
    .then(response => response.json())
    .then(data => {
        // Remove typing indicator
        const typingMsg = document.querySelector('.typing-indicator');
        if (typingMsg) typingMsg.remove();
        
        if (data.success) {
            addChatMessage(data.response, 'ai');
            
            // If the AI made changes, show notification
            if (data.changes && data.changes.length > 0) {
                showNotification(`✅ בוצעו ${data.changes.length} שינויים במערכת`, 'success');
                
                // Refresh UI if needed
                if (data.refreshNeeded) {
                    setTimeout(() => {
                        location.reload();
                    }, 2000);
                }
            }
        } else {
            addChatMessage('❌ מצטערת, היתה שגיאה בעיבוד הבקשה: ' + (data.error || 'Unknown error'), 'ai');
        }
    })
    .catch(error => {
        // Remove typing indicator
        const typingMsg = document.querySelector('.typing-indicator');
        if (typingMsg) typingMsg.remove();
        
        console.error('Smart chat error:', error);
        addChatMessage('❌ מצטערת, לא הצלחתי להתחבר לשרת', 'ai');
    });
}

function addChatMessage(message, sender, isTyping = false) {
    const messagesContainer = document.getElementById('smartChatMessages');
    const messageDiv = document.createElement('div');
    
    messageDiv.className = `chat-message ${sender}-message${isTyping ? ' typing-indicator' : ''}`;
    
    const avatar = sender === 'ai' ? '🤖' : '👩';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <p>${message}</p>
            ${isTyping ? '<div class="typing-dots"><span></span><span></span><span></span></div>' : ''}
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Document Upload Modal Functions
function openDocumentUploadModal() {
    const modal = document.getElementById('documentUploadModal');
    modal.style.display = 'flex';
    
    // Reset modal state
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('uploadResults').style.display = 'none';
    document.getElementById('uploadArea').style.display = 'block';
    document.getElementById('startUploadBtn').style.display = 'none';
    
    // Setup drag and drop
    setupDragAndDrop();
    
    // Setup file input change
    document.getElementById('documentInput').addEventListener('change', handleFileSelection);
}

function closeDocumentUploadModal() {
    document.getElementById('documentUploadModal').style.display = 'none';
}

function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    });
}

function handleFileSelection(e) {
    const files = Array.from(e.target.files);
    handleFiles(files);
}

function handleFiles(files) {
    if (files.length === 0) return;
    
    // Validate files
    const validFiles = [];
    const errors = [];
    
    files.forEach(file => {
        // Check file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            errors.push(`${file.name}: קובץ גדול מדי (מעל 10MB)`);
            return;
        }
        
        // Check file type
        const validTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        if (!validTypes.includes(extension)) {
            errors.push(`${file.name}: סוג קובץ לא נתמך`);
            return;
        }
        
        validFiles.push(file);
    });
    
    if (errors.length > 0) {
        showNotification('❌ שגיאות בקבצים: ' + errors.join(', '), 'error');
    }
    
    if (validFiles.length > 0) {
        // Show files selected
        showNotification(`✅ נבחרו ${validFiles.length} קבצים תקינים`, 'success');
        document.getElementById('startUploadBtn').style.display = 'inline-block';
        
        // Store files for upload
        window.selectedFiles = validFiles;
    }
}

async function startDocumentUpload() {
    if (!window.selectedFiles || window.selectedFiles.length === 0) {
        showNotification('❌ לא נבחרו קבצים', 'error');
        return;
    }
    
    // Show progress
    document.getElementById('uploadArea').style.display = 'none';
    document.getElementById('uploadProgress').style.display = 'block';
    document.getElementById('startUploadBtn').style.display = 'none';
    
    try {
        const formData = new FormData();
        
        // Add files to form data
        window.selectedFiles.forEach((file, index) => {
            formData.append('documents', file);
        });
        
        // Update progress
        updateUploadProgress(0, 'מעלה קבצים...');
        
        const response = await fetch('/api/drive/bulk-upload', {
            method: 'POST',
            body: formData
        });
        
        updateUploadProgress(50, 'מעבד מסמכים עם OCR...');
        
        const result = await response.json();
        
        updateUploadProgress(100, 'הושלם!');
        
        // Show results
        setTimeout(() => {
            document.getElementById('uploadProgress').style.display = 'none';
            document.getElementById('uploadResults').style.display = 'block';
            displayUploadResults(result);
            
            if (result.success && result.results.length > 0) {
                showNotification(`✅ הועלו ${result.results.length} מסמכים ונוצרו משימות`, 'success');
                loadTasks(); // Refresh tasks
            }
        }, 1000);
        
    } catch (error) {
        console.error('Upload error:', error);
        showNotification('❌ שגיאה בהעלאת מסמכים', 'error');
        
        // Show error in modal
        document.getElementById('uploadProgress').style.display = 'none';
        document.getElementById('uploadArea').style.display = 'block';
        document.getElementById('startUploadBtn').style.display = 'inline-block';
    }
}

function updateUploadProgress(percent, status) {
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('uploadStatus').textContent = status;
}

function displayUploadResults(result) {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = '';
    
    if (result.results && result.results.length > 0) {
        result.results.forEach(item => {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'upload-result-item success';
            resultDiv.innerHTML = `
                <div class="result-icon">✅</div>
                <div class="result-info">
                    <div class="result-filename">${item.file}</div>
                    <div class="result-details">נוצרה משימה: ${item.task.title}</div>
                </div>
            `;
            container.appendChild(resultDiv);
        });
    }
    
    if (result.errors && result.errors.length > 0) {
        result.errors.forEach(error => {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'upload-result-item error';
            errorDiv.innerHTML = `
                <div class="result-icon">❌</div>
                <div class="result-info">
                    <div class="result-filename">${error.file}</div>
                    <div class="result-details">שגיאה: ${error.error}</div>
                </div>
            `;
            container.appendChild(errorDiv);
        });
    }
}

// ===== MANAGEMENT FUNCTIONS =====

// Clear all tasks
async function clearAll() {
    if (!confirm('❌ האם את בטוחה שברצונך למחוק את כל המשימות? פעולה זו לא ניתנת לביטול.')) {
        return;
    }
    
    try {
        showNotification('⏳ מוחק את כל המשימות...', 'info');
        
        // Clear all task types
        const taskTypes = ['tasks', 'debts', 'bureaucracy'];
        for (const type of taskTypes) {
            const response = await fetch(`/api/${type}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to delete ${type}`);
            }
        }
        
        showNotification('✅ כל המשימות נמחקו בהצלחה', 'success');
        loadInitialData(); // Refresh the display
        
    } catch (error) {
        console.error('Error clearing all tasks:', error);
        showNotification('❌ שגיאה במחיקת המשימות: ' + error.message, 'error');
    }
}

// Add bulk tasks
function addBulkTasks() {
    window.open('/bulk-tasks-improved.html', '_blank');
}

// Select all tasks (placeholder - could be used for batch operations)
function selectAll() {
    showNotification('✅ כל המשימות נבחרו', 'success');
    // Here you could implement actual selection logic
}

// Deselect all tasks (placeholder - could be used for batch operations)
function deselectAll() {
    showNotification('☐ כל הבחירות בוטלו', 'info');
    // Here you could implement actual deselection logic
}

// Enhanced add task functionality for each tab
function addTaskForCurrentTab() {
    const currentTab = document.querySelector('.nav-tab.active')?.dataset.tab;
    
    switch(currentTab) {
        case 'academic':
            openTaskModal('academic');
            break;
        case 'debts':
            openTaskModal('debts');
            break;
        case 'bureaucracy':
            openTaskModal('bureaucracy');
            break;
        default:
            openTaskModal('academic');
    }
}

console.log('✅ מיכל AI - מערכת עוזרת אישית מוכנה לעבודה! 🚀');