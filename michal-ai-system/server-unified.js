const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const DriveService = require('./services/DriveService');
const GmailService = require('./services/GmailService');
const LangGraphAgent = require('./services/LangGraphAgent');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const AI_AGENT_URL = process.env.AI_AGENT_URL || 'http://localhost:8000';

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// File upload configuration
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize Drive service
const driveService = new DriveService();

// Initialize Gmail service (if configured)
let gmailService = null;
try {
    gmailService = new GmailService();
    console.log('📧 GmailService initialized');
} catch (e) {
    console.warn('⚠️ GmailService not initialized:', e.message);
}

// Initialize LangGraph AI Agent
let langGraphAgent = null;
try {
    langGraphAgent = new LangGraphAgent({
        openaiApiKey: process.env.OPENAI_API_KEY,
        supabase: null // הוסף כאן את חיבור Supabase אם קיים
    });
    console.log('🧠 LangGraph Agent initialized');
} catch (e) {
    console.warn('⚠️ LangGraph Agent not initialized:', e.message);
}

// Serve static files (your HTML, CSS, JS)
app.use(express.static('.', {
    maxAge: '1h',
    etag: true,
    lastModified: true,
    setHeaders: function (res, path) {
        console.log('📁 Serving static file:', path);
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Mock data - Full Data Set
const appData = {
    tasks: [
        {id: 1, project: "כרמית - סמינר פסיכולוגיה", client: "כרמית", deadline: "2025-09-24", status: "בעבודה", priority: "דחוף", value: 3500, currency: "₪", action: "שליחת טיוטה", module: "academic"},
        {id: 2, project: "ישראל - סמינר היסטוריה", client: "ישראל", deadline: "2025-09-28", status: "המתנה לאישור", priority: "גבוה", value: 4200, currency: "₪", action: "מעקב אחר מענה", module: "academic"},
        {id: 3, project: "מרג'ורי - תרגום מסמכים", client: "מרג'ורי", deadline: "2025-10-01", status: "בבדיקה", priority: "בינוני", value: 450, currency: "€", action: "בירור סטטוס", module: "academic"}
    ],
    bureaucracy: [
        {id: 1, task: "רישום נישואין", authority: "Standesamt Berlin", status: "בהמתנה", deadline: "2025-10-15", action: "בירור סטטוס בקשה", priority: "גבוה"},
        {id: 2, task: "ביטוח בריאות - אוריון", authority: "TK", status: "טרם פתור", deadline: "2025-09-30", action: "הגשת מסמכים", priority: "דחוף"},
        {id: 3, task: "בקשת אישור שהייה", authority: "LEA Berlin", status: "בהליך", deadline: "2025-11-01", action: "מעקב אחר בקשה", priority: "בינוני"},
        {id: 4, task: "דיווח Bürgergeld", authority: "Jobcenter", status: "מאושר", deadline: "2025-10-31", action: "דיווח חודשי", priority: "נמוך"}
    ],
    debts: [
        {id: 1, creditor: "PAIR Finance", company: "Immobilien Scout", amount: 69.52, currency: "€", case_number: "120203581836", status: "פתוח", action: "שליחת התנגדות", priority: "דחוף", deadline: "2025-09-27"},
        {id: 2, creditor: "PAIR Finance", company: "Free2Move", amount: 57, currency: "€", case_number: "162857501033", status: "פתוח", action: "בירור חוב", priority: "גבוה", deadline: "2025-09-29"},
        {id: 3, creditor: "PAIR Finance", company: "Novum Cashper", amount: 208.60, currency: "€", case_number: "168775195683", status: "פתוח", action: "הצעת פשרה", priority: "בינוני", deadline: "2025-10-05"},
        {id: 4, creditor: "coeo Inkasso", company: "Ostrom GmbH", amount: 455, currency: "€", case_number: "1660002492", status: "בהתנגדות", action: "המשך התנגדות", priority: "גבוה", deadline: "2025-10-01"},
        {id: 5, creditor: "רשות אכיפה", company: "משרד הבטחון", amount: 7355.17, currency: "₪", case_number: "774243-03-25", status: "התראה", action: "תיאום תשלומים", priority: "דחוף", deadline: "2025-09-30"}
    ]
};

// Helper function for Smart Overview
function processUnifiedTasks(tasks, debts, bureaucracy) {
    const unified = [];
    
    // Process academic tasks
    tasks.forEach(task => {
        unified.push({
            id: `task-${task.id}`,
            title: task.project,
            description: `לקוח: ${task.client}`,
            deadline: task.deadline,
            status: task.status,
            priority: task.priority,
            action: task.action,
            domain: 'academic',
            value: task.value,
            currency: task.currency
        });
    });
    
    // Process debts
    debts.forEach(debt => {
        unified.push({
            id: `debt-${debt.id}`,
            title: `${debt.company} - ${debt.creditor}`,
            description: `מספר תיק: ${debt.case_number}`,
            deadline: debt.deadline,
            status: debt.status,
            priority: debt.priority,
            action: debt.action,
            domain: 'debt',
            value: debt.amount,
            currency: debt.currency
        });
    });
    
    // Process bureaucracy
    bureaucracy.forEach(item => {
        unified.push({
            id: `bureau-${item.id}`,
            title: item.task,
            description: `רשות: ${item.authority}`,
            deadline: item.deadline,
            status: item.status,
            priority: item.priority,
            action: item.action,
            domain: 'bureaucracy',
            value: null,
            currency: null
        });
    });
    
    return unified;
}

// API Routes
app.get('/api/tasks', async (req, res) => {
    try {
        res.json({ success: true, data: appData.tasks });
    } catch (error) {
        console.error('שגיאה בטעינת משימות:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/debts', async (req, res) => {
    try {
        res.json({ success: true, data: appData.debts });
    } catch (error) {
        console.error('שגיאה בטעינת חובות:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/bureaucracy', async (req, res) => {
    try {
        res.json({ success: true, data: appData.bureaucracy });
    } catch (error) {
        console.error('שגיאה בטעינת בירוקרטיה:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Smart Overview API
app.get('/api/smart-overview', async (req, res) => {
    try {
        console.log('🔍 מעבד סקירה חכמה...');
        
        const unifiedTasks = processUnifiedTasks(appData.tasks, appData.debts, appData.bureaucracy);
        
        // חישוב עדיפות AI חכמה
        const smartPrioritized = unifiedTasks.map(item => {
            let aiPriority = 0;
            let urgencyLevel = 'נמוך';
            
            // חישוב זמן שנותר
            if (item.deadline) {
                const today = new Date();
                const deadlineDate = new Date(item.deadline);
                const daysLeft = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
                
                if (daysLeft < 0) {
                    aiPriority += 100; // איחור
                    urgencyLevel = 'קריטי';
                } else if (daysLeft === 0) {
                    aiPriority += 90; // היום
                    urgencyLevel = 'קריטי';
                } else if (daysLeft === 1) {
                    aiPriority += 80; // מחר
                    urgencyLevel = 'קריטי';
                } else if (daysLeft <= 3) {
                    aiPriority += 70; // תוך 3 ימים
                    urgencyLevel = 'גבוה מאוד';
                } else if (daysLeft <= 7) {
                    aiPriority += 50; // השבוע
                    urgencyLevel = 'גבוה';
                } else if (daysLeft <= 14) {
                    aiPriority += 30; // שבועיים
                    urgencyLevel = 'בינוני';
                }
                
                item.daysLeft = daysLeft;
                item.timeRemaining = daysLeft < 0 ? 'איחור' :
                                   daysLeft === 0 ? 'היום' :
                                   daysLeft === 1 ? 'מחר' :
                                   `${daysLeft} ימים`;
            } else {
                item.daysLeft = 999;
                item.timeRemaining = 'ללא דדליין';
            }
            
            // חישוב על בסיס עדיפות קיימת
            const priorityMap = {
                'דחוף': 40,
                'גבוה': 30,
                'בינוני': 20,
                'נמוך': 10
            };
            aiPriority += priorityMap[item.priority] || 10;
            
            // חישוב על בסיס תחום
            const domainBonus = {
                'debt': 25, // חובות חשובים יותר
                'bureaucracy': 20, // בירוקרטיה יכולה להיות דחופה
                'academic': 15 // אקדמיה פחות דחופה
            };
            aiPriority += domainBonus[item.domain] || 0;
            
            // חישוב על בסיס סטטוס
            const statusBonus = {
                'פתוח': 15,
                'בהתנגדות': 12,
                'התראה': 20,
                'טרם פתור': 18,
                'בהמתנה': 10
            };
            aiPriority += statusBonus[item.status] || 5;
            
            item.aiPriority = Math.min(aiPriority, 200); // מקסימום 200
            item.urgencyLevel = urgencyLevel;
            
            return item;
        });
        
        // מיון לפי עדיפות AI
        smartPrioritized.sort((a, b) => b.aiPriority - a.aiPriority);
        
        // חישוב סטטיסטיקות
        const stats = {
            critical: smartPrioritized.filter(item => item.urgencyLevel === 'קריטי').length,
            urgent: smartPrioritized.filter(item => ['גבוה מאוד', 'גבוה'].includes(item.urgencyLevel)).length,
            pending: smartPrioritized.filter(item => item.status !== 'סגור' && item.status !== 'הושלם').length,
            emailTasks: 0 // נוסיף בהמשך
        };
        
        res.json({ 
            success: true, 
            data: smartPrioritized.slice(0, 20), // רק 20 הראשונים
            stats,
            totalItems: smartPrioritized.length
        });
        
    } catch (error) {
        console.error('שגיאה בסקירה חכמה:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Authentication routes (mock)
app.post('/api/auth/login', (req, res) => {
    res.json({ 
        success: true, 
        message: 'התחברת בהצלחה',
        user: { id: 1, name: 'מיכל' }
    });
});

app.get('/api/auth/me', (req, res) => {
    res.json({ 
        success: true, 
        data: { user: { id: 1, name: 'מיכל', email: 'michal@example.com' } }
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Smart Chat Endpoint - מחובר לסוכן החכם
app.post('/api/chat/smart', async (req, res) => {
    try {
        const { message, context } = req.body;
        
        console.log('📤 שולח לסוכן החכם:', message);
        
        // שליחה לסוכן החכם
        const aiResponse = await axios.post(`${AI_AGENT_URL}/chat`, {
            message: message,
            user_context: context || {}
        });
        
        console.log('📥 תגובה מהסוכן:', aiResponse.data.response);
        
        res.json({
            success: true,
            ...aiResponse.data,
            source: 'smart_agent'
        });
        
    } catch (error) {
        console.error('❌ שגיאה בחיבור לסוכן חכם:', error.message);
        
        // fallback לתגובה בסיסית
        res.json({
            success: true,
            response: "מצטערת, הסוכן החכם לא זמין כרגע. אבל אני כאן לעזור! מה השאלה שלך?",
            task_type: "general",
            source: "fallback",
            error: error.message
        });
    }
});

// Basic Chat Endpoint - תגובות מוכנות (גיבוי)
app.post('/api/chat', (req, res) => {
    const { message } = req.body;
    const lowerMessage = message.toLowerCase();
    
    let response = "הבנתי את השאלה שלך. איך אני יכולה לעזור לך בפירוט יותר?";
    
    if (lowerMessage.includes('דחוף') || lowerMessage.includes('היום')) {
        response = "המשימות הדחופות היום:\n• כרמית - סמינר פסיכולוגיה (דדליין היום!)\n• PAIR Finance - התנגדות (נשאר יומיים)\n• ביטוח בריאות TK - הגשת מסמכים\n\nהתחילי עם כרמית - זה הכי דחוף!";
    }
    
    res.json({ 
        success: true, 
        response: response,
        source: "basic_chat"
    });
});

// ===== TASK MANAGEMENT ENDPOINTS =====

// Create new task
app.post('/api/tasks', (req, res) => {
    try {
        const task = req.body;
        task.id = Date.now() + Math.random();
        task.created = new Date().toISOString();
        appData.tasks.push(task);
        
        console.log('✅ New task created:', task.title);
        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk task creation
app.post('/api/tasks/bulk', (req, res) => {
    try {
        const { tasks } = req.body;
        if (!Array.isArray(tasks)) {
            return res.status(400).json({ success: false, error: 'tasks must be an array' });
        }
        
        const createdTasks = [];
        tasks.forEach(taskData => {
            const t = { 
                ...taskData, 
                id: Date.now() + Math.random(),
                created: new Date().toISOString()
            };
            appData.tasks.push(t);
            createdTasks.push(t);
        });
        
        console.log(`✅ Bulk created ${createdTasks.length} tasks`);
        res.json({ 
            success: true, 
            created: createdTasks.length, 
            data: createdTasks 
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Delete all tasks
app.delete('/api/tasks', (req, res) => {
    const deletedCount = appData.tasks.length;
    appData.tasks = [];
    console.log(`🗑️ Deleted ${deletedCount} tasks`);
    res.json({ success: true, deleted: deletedCount });
});

// Create debt
app.post('/api/debts', (req, res) => {
    try {
        const debt = req.body;
        debt.id = Date.now() + Math.random();
        debt.created = new Date().toISOString();
        appData.debts.push(debt);
        
        console.log('✅ New debt created:', debt.title);
        res.json({ success: true, data: debt });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete all debts
app.delete('/api/debts', (req, res) => {
    const deletedCount = appData.debts.length;
    appData.debts = [];
    console.log(`🗑️ Deleted ${deletedCount} debts`);
    res.json({ success: true, deleted: deletedCount });
});

// Create bureaucracy item
app.post('/api/bureaucracy', (req, res) => {
    try {
        const item = req.body;
        item.id = Date.now() + Math.random();
        item.created = new Date().toISOString();
        appData.bureaucracy.push(item);
        
        console.log('✅ New bureaucracy item created:', item.title);
        res.json({ success: true, data: item });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete all bureaucracy items
app.delete('/api/bureaucracy', (req, res) => {
    const deletedCount = appData.bureaucracy.length;
    appData.bureaucracy = [];
    console.log(`🗑️ Deleted ${deletedCount} bureaucracy items`);
    res.json({ success: true, deleted: deletedCount });
});

// ===== GMAIL ENDPOINTS =====

// Gmail status
app.get('/api/gmail/status', (req, res) => {
    res.json({
        configured: !!process.env.GOOGLE_CLIENT_ID,
        authenticated: false, // Would need real OAuth flow
        accounts: [],
        activeEmail: null
    });
});

// Gmail sync endpoint - Enhanced with LangGraph
app.post('/api/gmail/sync', async (req, res) => {
    console.log('📧 Gmail sync requested with LangGraph processing...');
    
    try {
        if (!gmailService) {
            return res.status(503).json({ success: false, error: 'gmail_disabled' });
        }

        if (!gmailService.hasValidTokens()) {
            return res.status(401).json({ success: false, auth_required: true, error: 'auth_required' });
        }

        // שליפת מיילים
        const emails = await gmailService.listRecentEmails(20);
        console.log(`📧 Retrieved ${emails.length} emails from Gmail API`);

        // עיבוד חכם עם LangGraph
        if (langGraphAgent && emails.length > 0) {
            console.log('🧠 Processing emails with AI...');
            
            const analysisResult = await langGraphAgent.invoke({
                currentContext: {
                    ...langGraphAgent.currentState.currentContext,
                    emails: emails
                }
            });

            const pendingActions = analysisResult.pendingActions || [];
            console.log(`🎯 AI analyzed emails: ${pendingActions.length} actions suggested`);

            // החזרת התוצאות עם הצעות פעולה לאישור
            return res.json({
                success: true,
                emails: emails.slice(0, 5), // רק 5 הראשונים לתצוגה
                pendingActions: pendingActions.map(action => ({
                    id: action.id,
                    type: action.type,
                    summary: action.data?.classification?.summary_hebrew || 'פעולה מוצעת',
                    urgency: action.data?.classification?.urgency || 5,
                    suggestedAction: action.data?.suggestedAction || 'בדוק את המייל',
                    emailSubject: action.data?.email?.subject,
                    requiresApproval: action.requiresApproval
                })),
                total: emails.length,
                aiProcessed: true
            });
        }

        // Fallback - עיבוד בסיסי ללא AI
        if (!appData.emails) appData.emails = [];
        let newCount = 0;

        emails.forEach(email => {
            const exists = appData.emails.find(e => e.id === email.id);
            if (!exists) {
                appData.emails.push({
                    id: email.id,
                    subject: email.subject,
                    from: email.from,
                    date: email.date,
                    snippet: email.snippet,
                    priority: 'medium'
                });
                newCount++;
            }
        });

        console.log(`📧 Basic sync: ${newCount} new emails ingested (total: ${appData.emails.length})`);
        return res.json({ 
            success: true, 
            ingested: newCount, 
            total: appData.emails.length, 
            aiProcessed: false 
        });

    } catch (error) {
        if (String(error?.message || '').includes('AUTH_REQUIRED')) {
            return res.status(401).json({ success: false, auth_required: true, error: 'auth_required' });
        }
        console.error('Gmail sync error:', error);
        return res.status(500).json({ success: false, error: 'שגיאה בסנכרון מיילים: ' + error.message });
    }
});

// Gmail Sync Approval Endpoint - Enhanced with LangGraph
app.post('/api/gmail/sync/approve', async (req, res) => {
    try {
        const { approvedActions, rejectedActions, modifications, feedback } = req.body;
        
        console.log('🎯 AI action approval received:', {
            approved: approvedActions?.length || 0,
            rejected: rejectedActions?.length || 0,
            modifications: Object.keys(modifications || {}).length,
            feedback: feedback ? 'Yes' : 'No'
        });

        if (!langGraphAgent) {
            return res.status(503).json({ 
                success: false, 
                error: 'AI Agent not available' 
            });
        }

        const results = [];
        
        // ביצוע פעולות מאושרות
        if (approvedActions && approvedActions.length > 0) {
            for (const actionId of approvedActions) {
                const action = langGraphAgent.currentState.pendingActions?.find(a => a.id === actionId);
                if (action) {
                    try {
                        const result = await langGraphAgent.executeAction(langGraphAgent.currentState, {
                            action: action,
                            approved: true,
                            modifications: modifications[actionId] || {}
                        });
                        
                        results.push({
                            actionId,
                            success: true,
                            message: 'פעולה בוצעה בהצלחה'
                        });

                        // עדכון המצב
                        langGraphAgent.currentState = result;
                    } catch (error) {
                        console.error('שגיאה בביצוע פעולה:', error);
                        results.push({
                            actionId,
                            success: false,
                            message: 'שגיאה בביצוע הפעולה: ' + error.message
                        });
                    }
                }
            }
        }

        // למידה מפעולות שנדחו
        if (rejectedActions && rejectedActions.length > 0) {
            for (const actionId of rejectedActions) {
                const action = langGraphAgent.currentState.pendingActions?.find(a => a.id === actionId);
                if (action) {
                    await langGraphAgent.learn(langGraphAgent.currentState, {
                        feedback: {
                            type: 'action_result',
                            action: action,
                            successful: false,
                            reason: 'User rejected',
                            userRejection: true
                        }
                    });
                }
            }
        }

        // למידה מפידבק כללי
        if (feedback) {
            await langGraphAgent.learn(langGraphAgent.currentState, {
                feedback: {
                    type: 'user_feedback',
                    ...feedback,
                    timestamp: new Date().toISOString()
                }
            });
        }

        // ניקוי פעולות שטופלו
        const handledActionIds = [...(approvedActions || []), ...(rejectedActions || [])];
        langGraphAgent.currentState.pendingActions = langGraphAgent.currentState.pendingActions?.filter(
            action => !handledActionIds.includes(action.id)
        ) || [];

        // שמירת מצב
        await langGraphAgent.saveState();

        res.json({ 
            success: true, 
            message: 'פעולות טופלו בהצלחה',
            results: results,
            remainingActions: langGraphAgent.currentState.pendingActions.length
        });
        
    } catch (error) {
        console.error('Gmail sync approval error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'שגיאה בעיבוד אישור הפעולות: ' + error.message 
        });
    }
});

// AI Chat Endpoint - Enhanced with LangGraph
app.post('/api/ai/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        console.log('🧠 AI chat message received:', message);

        // עיבוד חכם עם LangGraph
        if (langGraphAgent) {
            try {
                // הוספת ההודעה להיסטוריית הצ'אט
                langGraphAgent.currentState.chatHistory.push({
                    user: message,
                    timestamp: new Date().toISOString()
                });

                // ניתוח ההודעה וקבלת הוראות
                const chatAnalysis = await langGraphAgent.openai.invoke(`
אתה העוזר החכם של מיכל. היא סטודנטית עם ADHD ומנהלת סמינרים.

הודעה מהמשתמש: "${message}"

מצב המערכת הנוכחי:
- משימות פעילות: ${langGraphAgent.currentState.currentContext.tasks?.length || 0}
- מיילים לא מעובדים: ${langGraphAgent.currentState.currentContext.emails?.length || 0}
- מסמכים במערכת: ${langGraphAgent.currentState.currentContext.documents?.length || 0}
- פעולות ממתינות: ${langGraphAgent.currentState.pendingActions?.length || 0}

ענה בעברית עם JSON:
{
  "intent": "create_task|modify_system|learn_feedback|general_help|code_modification",
  "response": "תשובה בעברית",
  "actions": [
    {
      "type": "create_task|update_settings|modify_code|send_message",
      "data": {},
      "description": "תיאור בעברית"
    }
  ],
  "learning": {
    "pattern": "דפוס שזוהה",
    "preference": "העדפה שנלמדה"
  },
  "priority": 1-10,
  "requires_approval": true
}

דוגמאות לעיבוד:
- "צור משימה לבדוק חוב PAIR" → create_task
- "שנה צבעים לוורוד" → modify_system  
- "אני מעדיפה לטפל בחובות בבוקר" → learn_feedback
- "הוסף כפתור למחיקה" → code_modification
                `);

                const analysis = JSON.parse(chatAnalysis.content);
                
                // יצירת פעולות בהתבסס על הניתוח
                const pendingActions = [];
                
                if (analysis.actions && analysis.actions.length > 0) {
                    analysis.actions.forEach((action, index) => {
                        pendingActions.push({
                            id: `chat_${Date.now()}_${index}`,
                            type: 'chat_request',
                            data: {
                                originalMessage: message,
                                action: action,
                                analysis: analysis
                            },
                            requiresApproval: analysis.requires_approval,
                            timestamp: new Date().toISOString(),
                            source: 'chat_interface'
                        });
                    });
                }

                // למידה אם זוהו דפוסים
                if (analysis.learning) {
                    await langGraphAgent.learn(langGraphAgent.currentState, {
                        feedback: {
                            type: 'user_pattern',
                            pattern: analysis.learning.pattern,
                            preference: analysis.learning.preference,
                            message: message
                        }
                    });
                }

                // עדכון מצב המערכת
                langGraphAgent.currentState.pendingActions = [
                    ...(langGraphAgent.currentState.pendingActions || []),
                    ...pendingActions
                ];

                langGraphAgent.currentState.chatHistory.push({
                    ai: analysis.response,
                    timestamp: new Date().toISOString(),
                    intent: analysis.intent,
                    actionsCreated: pendingActions.length
                });

                return res.json({
                    success: true,
                    response: analysis.response,
                    intent: analysis.intent,
                    actions: pendingActions.map(action => ({
                        id: action.id,
                        description: action.data.action.description,
                        type: action.data.action.type,
                        requiresApproval: action.requiresApproval
                    })),
                    learning: analysis.learning,
                    priority: analysis.priority,
                    aiProcessed: true
                });

            } catch (aiError) {
                console.error('LangGraph chat processing error:', aiError);
                // נפילה חזרה לעיבוד פשוט
            }
        }

        // Fallback - עיבוד פשוט ללא AI
        let response = '';
        let changes = [];
        let refreshNeeded = false;
        
        if (message.includes('צבע') || message.includes('עיצוב') || message.includes('ורוד') || message.includes('ירוק')) {
            response = '🎨 מעלה! אני יכולה לשנות את העיצוב לתמה ורוד-ירוק. זה יהיה יפה מאוד! האם את רוצה שאני אעדכן את הצבעים עכשיו?';
            changes = ['Updated color scheme to pink-green theme'];
        } else if (message.includes('כלל') || message.includes('סינון') || message.includes('PAIR')) {
            response = '⚙️ מצוין! אני יכולה להוסיף כלל סינון חכם למיילי PAIR Finance. הכלל יזהה אוטומטית מיילי חוב ויצור משימות בעדיפות גבוהה. האם להפעיל?';
            changes = ['Added smart filter rule for PAIR Finance emails'];
        } else if (message.includes('טיוטה') || message.includes('מייל') || message.includes('התנגדות')) {
            response = '✍️ בשמחה! אני יכולה לכתוב טיוטת התנגדות מקצועית לחוב. הטיוטה תכלול את הנקודות החוקיות הנדרשות ותהיה מתאמת לחוק הגנת הצרכן הישראלי.';
            changes = ['Generated debt dispute email draft'];
        } else if (message.includes('למד') || message.includes('פידבק') || message.includes('אישור')) {
            response = '🧠 מעולה! אני לומדת מהבחירות שלך היום. זיהיתי שאת מעדיפה לטפל במיילי PAIR Finance מיד, ומתעדות את הפידבק לשיפור הסינון החכם בעתיד.';
            changes = ['Updated learning model with user feedback'];
        } else {
            response = `💭 מעניין! קיבלתי את ההודעה: "${message}". אני יכולה לעזור לך עם:
            
            🔄 עדכון קוד והגדרות המערכת
            🎯 יצירת כללי סינון מתקדמים  
            📝 כתיבת טיוטות מיילים
            🧠 למידה מהפעולות שלך
            🎨 שינוי עיצוב והתאמות UI
            
            מה בדיוק את רוצה שאני אעשה?`;
        }
        
        res.json({
            success: true,
            response: response,
            changes: changes,
            refreshNeeded: refreshNeeded,
            aiProcessed: false
        });
        
    } catch (error) {
        console.error('AI chat error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during AI chat'
        });
    }
});

// Google Drive Integration Endpoints

// Upload and process document
app.post('/api/drive/upload', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        console.log('📄 Document upload received:', req.file.originalname);

        // Authenticate with Drive if needed
        if (!driveService.isAuthenticated) {
            const authResult = await driveService.authenticate();
            if (!authResult.success) {
                return res.status(500).json({ success: false, error: 'Drive authentication failed' });
            }
        }

        // Upload to Drive
        const driveResult = await driveService.uploadDocument(req.file);
        
        // Process with OCR
        const ocrResult = await driveService.processDocumentOCR(driveResult.fileId);
        
        // Create task from document
        const task = await driveService.createTaskFromDocument(ocrResult, driveResult);
        
        // Add to tasks array
        if (!global.tasks) global.tasks = [];
        global.tasks.push(task);

        res.json({
            success: true,
            message: 'מסמך הועלה ועובד בהצלחה',
            document: driveResult,
            ocr: ocrResult,
            task: task
        });

    } catch (error) {
        console.error('Document upload error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בהעלאת המסמך: ' + error.message
        });
    }
});

// Bulk document upload - Enhanced with LangGraph
app.post('/api/drive/bulk-upload', upload.array('documents', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, error: 'No files uploaded' });
        }

        console.log('📚 Bulk upload received:', req.files.length, 'files');

        const results = [];
        const errors = [];
        const documentsForAI = [];

        for (const file of req.files) {
            try {
                console.log(`📄 Processing: ${file.originalname}`);
                
                // יצירת אובייקט מסמך עם Buffer לעיבוד AI
                const documentData = {
                    filename: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size,
                    buffer: require('fs').readFileSync(file.path),
                    uploadedAt: new Date().toISOString()
                };

                documentsForAI.push(documentData);

                // Upload to Drive (existing logic)
                const driveResult = await driveService.uploadDocument(file);
                
                // Basic OCR processing
                const ocrResult = await driveService.processDocumentOCR(driveResult.fileId);
                
                results.push({
                    file: file.originalname,
                    document: driveResult,
                    size: file.size,
                    mimetype: file.mimetype,
                    basicProcessing: true
                });

            } catch (error) {
                console.error(`Error processing ${file.originalname}:`, error);
                errors.push({
                    file: file.originalname,
                    error: error.message
                });
            }
        }

        // עיבוד חכם עם LangGraph אם זמין
        let aiAnalysis = null;
        if (langGraphAgent && documentsForAI.length > 0) {
            try {
                console.log('🧠 Processing documents with AI...');
                
                const analysisResult = await langGraphAgent.invoke({
                    currentContext: {
                        ...langGraphAgent.currentState.currentContext,
                        documents: documentsForAI
                    }
                });

                const pendingActions = analysisResult.pendingActions?.filter(
                    action => action.source === 'document_processing'
                ) || [];

                aiAnalysis = {
                    processedDocuments: documentsForAI.length,
                    suggestedActions: pendingActions.length,
                    actions: pendingActions.map(action => ({
                        id: action.id,
                        type: action.type,
                        summary: action.data?.analysis?.summary || 'מסמך עובד',
                        documentType: action.data?.analysis?.document_type || 'unknown',
                        suggestedTasks: action.data?.analysis?.suggested_tasks || [],
                        requiresApproval: action.requiresApproval
                    }))
                };

                console.log(`🎯 AI analysis complete: ${pendingActions.length} actions suggested`);
                
            } catch (aiError) {
                console.error('AI processing error:', aiError);
                aiAnalysis = { error: 'שגיאה בעיבוד AI: ' + aiError.message };
            }
        }

        res.json({
            success: true,
            message: `עובדו ${results.length} מסמכים מתוך ${req.files.length}`,
            results: results,
            errors: errors,
            aiAnalysis: aiAnalysis,
            nextStep: aiAnalysis?.suggestedActions > 0 
                ? 'בדוק את הפעולות המוצעות וציין איזה לבצע'
                : 'העלאה הושלמה בהצלחה'
        });

    } catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בהעלאה מרובה: ' + error.message
        });
    }
});

// Get Drive status
app.get('/api/drive/status', (req, res) => {
    res.json({
        success: true,
        authenticated: driveService.isAuthenticated,
        available: true
    });
});

// AI System Status and Pending Actions
app.get('/api/ai/status', (req, res) => {
    try {
        if (!langGraphAgent) {
            return res.json({
                success: true,
                aiAvailable: false,
                message: 'AI system not initialized'
            });
        }

        const systemStatus = langGraphAgent.getSystemStatus();
        const pendingActions = langGraphAgent.currentState.pendingActions || [];
        const recentChat = langGraphAgent.currentState.chatHistory?.slice(-5) || [];

        res.json({
            success: true,
            aiAvailable: true,
            system: systemStatus,
            pendingActions: pendingActions.map(action => ({
                id: action.id,
                type: action.type,
                summary: action.data?.classification?.summary_hebrew || 
                        action.data?.analysis?.summary ||
                        action.data?.action?.description ||
                        'פעולה ממתינה',
                source: action.source,
                timestamp: action.timestamp,
                requiresApproval: action.requiresApproval,
                urgency: action.data?.classification?.urgency || 
                        action.data?.analysis?.urgency || 5
            })).sort((a, b) => b.urgency - a.urgency), // מיון לפי דחיפות
            recentActivity: recentChat,
            statistics: {
                totalActionsToday: pendingActions.filter(a => {
                    const today = new Date().toDateString();
                    return new Date(a.timestamp).toDateString() === today;
                }).length,
                highPriorityActions: pendingActions.filter(a => 
                    (a.data?.classification?.urgency || a.data?.analysis?.urgency || 5) >= 7
                ).length,
                emailsProcessed: systemStatus.emailsInMemory,
                documentsProcessed: systemStatus.documentsInMemory
            }
        });
        
    } catch (error) {
        console.error('AI status error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'שגיאה בקבלת סטטוס AI' 
        });
    }
});

// AI Learning Endpoint - Get and Update Learning Data
app.get('/api/ai/learning', (req, res) => {
    try {
        if (!langGraphAgent) {
            return res.status(503).json({ error: 'AI system not available' });
        }

        const memory = langGraphAgent.currentState.memory;
        
        res.json({
            success: true,
            learning: {
                clientPreferences: Object.keys(memory.clientPreferences || {}).length,
                workPatterns: Object.keys(memory.workPatterns || {}).length,
                successfulActions: memory.successfulActions?.length || 0,
                commonMistakes: memory.commonMistakes?.length || 0,
                totalFeedback: memory.feedback?.length || 0,
                recentFeedback: memory.feedback?.slice(-5) || []
            }
        });
        
    } catch (error) {
        console.error('Learning data error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'שגיאה בקבלת נתוני למידה' 
        });
    }
});

// Gmail auth URL
app.get('/api/gmail/auth-url', (req, res) => {
    if (!gmailService) {
        return res.status(503).json({ error: 'Gmail service disabled' });
    }
    try {
        const url = gmailService.getAuthUrl();
        // Ensure we use v2 endpoint; googleapis does this internally
        return res.json({ url });
    } catch (err) {
        console.error('Gmail auth-url error:', err);
        return res.status(500).json({ error: 'failed_to_create_auth_url' });
    }
});

// Gmail OAuth callback
app.get('/auth/google/callback', async (req, res) => {
    if (!gmailService) {
        return res.redirect('/?gmail=error');
    }
    try {
        // If Google returned an error (e.g., access_denied, redirect_uri_mismatch), surface it to the UI
        const oauthError = req.query.error;
        if (oauthError) {
            const reason = encodeURIComponent(String(oauthError));
            return res.redirect(`/?gmail=error&reason=${reason}`);
        }

        const code = req.query.code;
        if (!code) {
            return res.redirect('/?gmail=missing_code');
        }
        const { email } = await gmailService.exchangeCodeForTokens(code);
        return res.redirect(`/?gmail=connected&connected=${encodeURIComponent(email || '')}`);
    } catch (error) {
        console.error('Gmail OAuth error:', error);
        const reason = error?.message ? encodeURIComponent(error.message) : 'unknown';
        return res.redirect(`/?gmail=error&reason=${reason}`);
    }
});

// Gmail accounts API
app.get('/api/gmail/accounts', (req, res) => {
    if (!gmailService) {
        return res.json({ success: true, accounts: [], activeEmail: null, configured: false });
    }
    return res.json({ success: true, ...gmailService.listAccounts() });
});

app.post('/api/gmail/accounts/activate', (req, res) => {
    if (!gmailService) {
        return res.status(503).json({ success: false, error: 'gmail_disabled' });
    }
    try {
        const email = req.body?.email;
        if (!email) return res.status(400).json({ success: false, error: 'missing_email' });
        gmailService.setActiveAccount(email);
        return res.json({ success: true });
    } catch (e) {
        return res.status(400).json({ success: false, error: e.message });
    }
});

app.delete('/api/gmail/accounts/:email', (req, res) => {
    if (!gmailService) {
        return res.status(503).json({ success: false, error: 'gmail_disabled' });
    }
    const email = decodeURIComponent(req.params.email);
    const ok = gmailService.removeAccount(email);
    return res.json({ success: true, removed: ok });
});

// Connectors status
app.get('/api/connectors/status', (req, res) => {
    const gmail = gmailService
        ? {
            configured: true,
            ...gmailService.listAccounts(),
            authenticated: gmailService.hasValidTokens()
        }
        : { configured: false, accounts: [], activeEmail: null, authenticated: false };
    res.json({ success: true, data: { gmail } });
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Explicit CSS route for debugging
app.get('/style.css', (req, res) => {
    console.log('🎨 CSS request received');
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(path.join(__dirname, 'style.css'));
});

// Explicit JS route for debugging  
app.get('/app.js', (req, res) => {
    console.log('📜 JS request received');
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'app.js'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 מערכת עוזר AI אישית רצה על פורט ${PORT}`);
    console.log(`📊 Dashboard זמין בכתובת: http://localhost:${PORT}`);
    console.log('🔗 AI Agent URL:', AI_AGENT_URL);
});

console.log('שרת פשוט מוכן לעבודה!');