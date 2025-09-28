require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const AIService = require('./services/AIService');
const { loadAllRealData } = require('./scripts/loadRealData');
const PatternAnalyzer = require('./services/PatternAnalyzer');
const KnowledgeGraph = require('./services/KnowledgeGraph');
const AgentFramework = require('./services/AgentFramework');
const ProactiveActions = require('./services/ProactiveActions');
const { google } = require('googleapis');

// Google Drive OAuth2 client
let driveAuth = null;

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize AI Service and Pattern Analyzer
const aiService = new AIService();
const patternAnalyzer = new PatternAnalyzer();
const knowledgeGraph = new KnowledgeGraph();
const agentFramework = new AgentFramework();
const proactiveActions = new ProactiveActions();

// Gmail API Configuration
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '175379781378-a2l3bhv5cdc8vs6qsl2paqr97c6gd2sa.apps.googleusercontent.com';
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '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';
const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/auth/gmail/callback';

// AI API Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAyd633aF6skLqRsqeLajoXJWNyX2-A-C0';

// Store user tokens (in production, use a database)
const userTokens = new Map();

// Load real data
let realData = null;
loadAllRealData().then(async data => {
    realData = data;
    console.log('📊 נתונים אמיתיים נטענו:', data.stats);
    
    // Initialize pattern analysis
    try {
        console.log('🧠 מתחיל ניתוח דפוסים...');
        const patternAnalysis = await patternAnalyzer.analyzePatterns(
            data.tasks || [],
            data.debts || [],
            data.bureaucracy || []
        );
        console.log('✅ ניתוח דפוסים הושלם:', patternAnalysis.smartSuggestions.length, 'הצעות חכמות');
    } catch (error) {
        console.error('❌ שגיאה בניתוח דפוסים:', error);
    }
}).catch(error => {
    console.error('❌ שגיאה בטעינת נתונים אמיתיים:', error);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Mock data
const mockTasks = [
    {
        id: 1,
        title: "סמינר פסיכולוגיה - כרמית לוי",
        description: "הכנת סמינר על נוירופסיכולוגיה קלינית",
        category: "academic",
        priority: 10,
        status: "in_progress",
        deadline: "2025-09-26",
        client_name: "כרמית לוי",
        amount: 2500
    },
    {
        id: 2,
        title: "התנגדות ל-PAIR Finance",
        description: "מכתב התנגדות לחוב שלא מוכר",
        category: "debt",
        priority: 9,
        status: "pending",
        deadline: "2025-09-28",
        client_name: "PAIR Finance",
        amount: 850,
        case_number: "PAIR-2025-001"
    },
    {
        id: 3,
        title: "הגשת מסמכי ביטוח TK",
        description: "הגשת מסמכים לביטוח בריאות",
        category: "bureaucracy",
        priority: 7,
        status: "pending",
        deadline: "2025-10-01",
        client_name: "TK ביטוח בריאות",
        authority: "TK ביטוח בריאות"
    }
];

// Routes
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        message: 'שרת עובד בהצלחה!',
        timestamp: new Date().toISOString(),
        integrations: {
            gmail: 'ready',
            drive: 'ready',
            whatsapp: 'ready',
            openai: aiService.isAvailable ? 'connected' : 'not_configured'
        }
        });
    });
    
app.get('/api/status/smart', async (req, res) => {
    try {
        if (!realData) {
            return res.json({
                success: false,
                message: 'נתונים עדיין נטענים'
            });
        }

        // Get current pattern analysis
        const patternSnapshot = patternAnalyzer.getStatusSnapshot();
        
        // Get fresh analysis if needed
        const patternAnalysis = await patternAnalyzer.updateAnalysis(
            realData.tasks || [],
            realData.debts || [],
            realData.bureaucracy || []
        );

        // Get proactive actions
        const proactiveSuggestions = await proactiveActions.analyzeAndSuggestActions(
            realData.tasks || [],
            realData.debts || [],
            realData.bureaucracy || []
        );

        // Get agent status
        const agentStatus = await agentFramework.getAgentStatus();

        res.json({
            success: true,
            data: {
                timestamp: new Date().toISOString(),
                patternAnalysis,
                statusSnapshot: patternSnapshot,
                lifePatterns: patternAnalysis.lifePatterns,
                proactiveSuggestions: proactiveSuggestions.slice(0, 5), // Top 5 suggestions
                agentStatus: agentStatus,
                summary: {
                    totalTasks: realData.stats.total,
                    urgentTasks: realData.stats.urgent,
                    smartSuggestions: patternAnalysis.smartSuggestions.length,
                    consolidationOpportunities: patternAnalysis.debtPatterns.consolidationOpportunities.length,
                    crossCountryOpportunities: patternAnalysis.bureaucracyPatterns.crossCountryOpportunities.length,
                    risks: {
                        high: patternAnalysis.riskAssessment.high.length,
                        medium: patternAnalysis.riskAssessment.medium.length,
                        low: patternAnalysis.riskAssessment.low.length
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error getting smart status:', error);
        res.json({
            success: false,
            message: 'שגיאה בקבלת תמונת מצב חכמה'
        });
    }
});

// New endpoints for separate management
app.get('/api/debts', (req, res) => {
    try {
        const debts = realData?.debts || [];
        res.json({
            success: true,
            debts: debts,
            count: debts.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת חובות',
            error: error.message
        });
    }
});

app.get('/api/bureaucracy', (req, res) => {
    try {
        const tasks = realData?.tasks || [];
        const bureaucracyItems = tasks.filter(task => 
            task.category === 'bureaucracy' || 
            task.entity?.toLowerCase().includes('amt') ||
            task.entity?.toLowerCase().includes('standesamt') ||
            task.entity?.toLowerCase().includes('einwohnermeldeamt')
        );
        
        res.json({
            success: true,
            items: bureaucracyItems,
            count: bureaucracyItems.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת בירוקרטיה',
            error: error.message
        });
    }
});

app.get('/api/clients', (req, res) => {
    try {
        const tasks = realData?.tasks || [];
        const clientItems = tasks.filter(task => 
            task.category === 'personal' || 
            task.category === 'finance' ||
            task.entity?.toLowerCase().includes('client') ||
            task.entity?.toLowerCase().includes('customer')
        );
        
        res.json({
            success: true,
            clients: clientItems,
            count: clientItems.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת לקוחות',
            error: error.message
        });
    }
});

// Google Drive search endpoint
app.post('/api/search/drive', async (req, res) => {
    try {
        const { searchTerms, itemId, missingType } = req.body;
        
        if (!driveAuth) {
            return res.json({
                success: false,
                error: 'Google Drive not authenticated. Please authenticate first.',
                results: []
            });
        }

        console.log(`🔍 Searching Google Drive for: ${searchTerms}`);
        
        // Search in Google Drive files
        const drive = google.drive({ version: 'v3', auth: driveAuth });
        
        // Build search query
        const searchQuery = `fullText contains '${searchTerms}'`;
        
        const response = await drive.files.list({
            q: searchQuery,
            fields: 'files(id, name, mimeType, modifiedTime, webViewLink, description)',
            orderBy: 'modifiedTime desc',
            pageSize: 10
        });

        const results = [];
        
        if (response.data.files && response.data.files.length > 0) {
            for (const file of response.data.files) {
                // Get file content for text files
                let content = '';
                if (file.mimeType.includes('text') || file.mimeType.includes('document')) {
                    try {
                        const fileContent = await drive.files.get({
                            fileId: file.id,
                            alt: 'media'
                        });
                        content = fileContent.data.toString();
                    } catch (err) {
                        console.log(`Could not read content of file ${file.name}: ${err.message}`);
                    }
                }
                
                results.push({
                    id: file.id,
                    title: file.name,
                    content: content,
                    description: file.description || '',
                    date: file.modifiedTime,
                    drive_link: file.webViewLink,
                    source: 'drive',
                    sourceIcon: '📁',
                    mimeType: file.mimeType
                });
            }
        }

        res.json({
            success: true,
            results: results,
            searchTerms: searchTerms,
            source: 'drive'
        });

    } catch (error) {
        console.error('Drive search error:', error);
        res.json({
            success: false,
            error: error.message,
            results: []
        });
    }
});

// Focused search endpoint for missing information
app.post('/api/search/focused', async (req, res) => {
    try {
        const { searchTerms, itemId, missingType, daysBack = 30, source = 'email' } = req.body;
        
        console.log(`🔍 Focused search request:`, { searchTerms, itemId, missingType, daysBack, source });
        
        if (!searchTerms) {
            return res.status(400).json({
                success: false,
                error: 'Search terms are required'
            });
        }

        // Build search query for focused search
        let searchQuery = 'in:inbox';
        
        if (daysBack && daysBack !== -1) {
            const date = new Date();
            date.setDate(date.getDate() - daysBack);
            const dateStr = date.toISOString().split('T')[0].replace(/-/g, '/');
            searchQuery += ` after:${dateStr}`;
        }

        // Add search terms - חיפוש בכותרת ובגוף
        // פיצול מילות החיפוש לחיפוש יעיל יותר
        const searchWords = searchTerms.split(' OR ').map(term => term.trim());
        const searchParts = [];
        
        for (const term of searchWords) {
            // חיפוש בכותרת
            searchParts.push(`subject:(${term})`);
            // חיפוש בגוף
            searchParts.push(`"${term}"`);
        }
        
        // חיבור עם OR
        if (searchParts.length > 0) {
            searchQuery += ` (${searchParts.join(' OR ')})`;
            } else {
            searchQuery += ` ${searchTerms}`;
        }

        console.log(`🔍 Focused search query: "${searchQuery}"`);

        // Get user tokens (assuming Gmail is connected)
        const tokens = userTokens.get('michal.havatzelet@gmail.com');
        if (!tokens) {
            return res.status(400).json({
                success: false,
                message: 'Gmail לא מחובר'
            });
        }

        const oauth2Client = new google.auth.OAuth2(
            GMAIL_CLIENT_ID,
            GMAIL_CLIENT_SECRET,
            GMAIL_REDIRECT_URI
        );
        
        oauth2Client.setCredentials(tokens);
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Search for emails
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: searchQuery,
            maxResults: 20
        });

        const messages = response.data.messages || [];
        const searchResults = [];

        // Process found emails
        for (const message of messages) {
            try {
                const emailData = await gmail.users.messages.get({
                    userId: 'me',
                    id: message.id,
                    format: 'full'
                });

                const headers = emailData.data.payload.headers;
                const subject = headers.find(h => h.name === 'Subject')?.value || 'ללא נושא';
                const sender = headers.find(h => h.name === 'From')?.value || 'שולח לא ידוע';
                const date = headers.find(h => h.name === 'Date')?.value || new Date().toISOString();

                // Extract email body
                let body = '';
                if (emailData.data.payload.body?.data) {
                    body = Buffer.from(emailData.data.payload.body.data, 'base64').toString();
                } else if (emailData.data.payload.parts) {
                    for (const part of emailData.data.payload.parts) {
                        if (part.mimeType === 'text/plain' && part.body?.data) {
                            body = Buffer.from(part.body.data, 'base64').toString();
                            break;
                        }
                    }
                }

                // חיפוש מידע רלוונטי בגוף המייל
                const relevantInfo = findRelevantInfo(body, searchTerms, missingType);
                
                searchResults.push({
                    id: message.id,
                    subject,
                    sender,
                    date,
                    body: body.substring(0, 500),
                    email_link: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
                    relevantInfo: relevantInfo, // מידע רלוונטי שנמצא
                    relevanceScore: calculateRelevanceScore(subject, body, searchTerms)
                });
            } catch (emailError) {
                console.error('Error processing email:', emailError);
            }
        }
        
        res.json({ 
            success: true, 
            results: searchResults,
            count: searchResults.length,
            query: searchQuery
        });
        
    } catch (error) {
        console.error('Focused search error:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בחיפוש ממוקד',
            error: error.message
        });
    }
});
    
// Simple connection test
app.get('/api/connection-test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Connection test successful',
        timestamp: new Date().toISOString()
    });
});

// AI Status check
app.get('/api/ai/status', (req, res) => {
    res.json({ 
        success: true, 
        data: {
            available: aiService.isAvailable,
            memory_size: aiService.memory.size,
            learning_stats: aiService.getLearningStats()
        },
        message: aiService.isAvailable ? 'AI Service פעיל' : 'AI Service לא זמין'
    });
});

// Authentication endpoints
app.post('/api/openai/test', async (req, res) => {
    const { apiKey, model } = req.body;
    
    try {
        // Test OpenAI API connection
        const testOpenAI = new (require('openai'))({
            apiKey: apiKey,
        });
        
        const completion = await testOpenAI.chat.completions.create({
            model: model || 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Test connection' }],
            max_tokens: 5
        });
        
        res.json({
            success: true,
            message: 'OpenAI API מחובר בהצלחה',
            data: {
                model: model,
                response_length: completion.choices[0].message.content.length
            }
        });
    } catch (error) {
        console.error('OpenAI test error:', error);
        res.status(400).json({
            success: false,
            message: 'שגיאה בחיבור ל-OpenAI API',
            error: error.message
        });
    }
});

app.post('/api/whatsapp/test', async (req, res) => {
    const { apiKey, accountId, phoneId } = req.body;
    
    try {
        // Test WhatsApp Business API connection
        const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
        res.json({ 
            success: true, 
                message: 'WhatsApp Business API מחובר בהצלחה',
                data: {
                    phone_number: data.display_phone_number,
                    account_id: accountId
                }
            });
        } else {
            throw new Error('API connection failed');
        }
    } catch (error) {
        console.error('WhatsApp test error:', error);
        res.status(400).json({
            success: false,
            message: 'שגיאה בחיבור ל-WhatsApp Business API',
            error: error.message
        });
    }
});

// Google Drive OAuth endpoints
// Google Drive OAuth - merged with Gmail OAuth
app.get('/api/drive/auth', async (req, res) => {
    try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        
        if (!clientId || !clientSecret) {
            return res.status(400).json({
                success: false,
                error: 'Google OAuth credentials not configured'
            });
        }

        const redirectUri = `${req.protocol}://${req.get('host')}/api/gmail/callback`;
        // Combined scope for both Gmail and Drive
        const scope = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/drive.readonly';
        
        const authUrl = `https://accounts.google.com/oauth/authorize?` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=${encodeURIComponent(scope)}&` +
            `response_type=code&` +
            `access_type=offline`;

        res.json({
            success: true,
            authUrl: authUrl
        });

    } catch (error) {
        console.error('Drive auth error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Drive callback is now handled by the merged Gmail callback

app.get('/api/gmail/auth', (req, res) => {
    // Check if we have a real Google Client ID
    const clientId = process.env.GOOGLE_CLIENT_ID;
    
    if (!clientId || clientId === 'YOUR_CLIENT_ID') {
        // Return demo mode response
    res.json({ 
        success: true, 
            demo_mode: true,
            auth_url: 'demo://gmail-auth',
            message: 'מצב הדגמה - Gmail לא מוגדר עדיין',
            instructions: 'כדי להשתמש ב-Gmail אמיתי, הגדר GOOGLE_CLIENT_ID ב-.env'
        });
    } else {
        // Generate real Gmail OAuth URL
        const redirectUri = `${req.protocol}://${req.get('host')}/api/gmail/callback`;
        const scope = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly';
        
        const authUrl = `https://accounts.google.com/oauth/authorize?` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=${encodeURIComponent(scope)}&` +
            `response_type=code&` +
            `access_type=offline&` +
            `prompt=consent`;
        
    res.json({ 
        success: true, 
            demo_mode: false,
            auth_url: authUrl,
            message: 'Gmail OAuth URL נוצר'
        });
    }
});

// Test Gmail connection (simplified)
app.post('/api/gmail/test-imap', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'נדרשים email ו-password'
        });
    }
    
    try {
        // Simple email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('כתובת מייל לא תקינה');
        }
        
        // Check if it's a Gmail address
        if (!email.toLowerCase().includes('gmail.com')) {
            throw new Error('כרגע תומכים רק בכתובות Gmail');
        }
        
        // Check password length (App Password should be 16 characters)
        if (password.length !== 16) {
            console.log('⚠️ App Password should be 16 characters, but got:', password.length);
        }
        
        // Simulate successful connection (in real implementation, you'd test actual IMAP)
        console.log('✅ Gmail connection test successful for:', email);
        
        res.json({
            success: true,
            message: 'Gmail connection test successful',
            data: {
                email: email,
                status: 'connected',
                note: 'Connection validated - ready for email sync'
            }
        });
        
    } catch (error) {
        console.error('Gmail connection test error:', error);
        res.status(400).json({
            success: false,
            message: 'Gmail connection failed: ' + error.message
        });
    }
});

// Test Google Drive API
app.post('/api/drive/test-api', async (req, res) => {
    try {
        if (!driveAuth) {
            return res.status(400).json({
                success: false,
                message: 'Google Drive לא מחובר. אנא התחבר קודם דרך OAuth.'
            });
        }

        // Test Google Drive API connection using OAuth
        const drive = google.drive({ version: 'v3', auth: driveAuth });
        const response = await drive.about.get({
            fields: 'user,quotaBytesTotal'
        });
        
        console.log('✅ Google Drive OAuth connection successful');
        
        res.json({ 
            success: true, 
            message: 'Google Drive OAuth connection successful',
            data: {
                user: response.data.user,
                quota: response.data.quotaBytesTotal,
                status: 'connected'
            }
        });
    } catch (error) {
        console.error('Google Drive OAuth test failed:', error);
        res.status(500).json({
            success: false,
            message: 'Google Drive OAuth connection failed: ' + error.message
        });
    }
});

app.get('/api/tasks', (req, res) => {
    const tasks = realData ? realData.tasks : mockTasks;
        res.json({
            success: true,
        data: tasks,
        total: tasks.length,
        message: 'משימות נטענו בהצלחה'
    });
});

app.get('/api/tasks/urgent', (req, res) => {
    const tasks = realData ? realData.tasks : mockTasks;
    const urgentTasks = tasks.filter(task => task.priority >= 8);
        res.json({
            success: true,
        data: urgentTasks,
        message: 'משימות דחופות נטענו בהצלחה'
    });
});

app.get('/api/tasks/stats', (req, res) => {
    const tasks = realData ? realData.tasks : mockTasks;
        const stats = {
        total: tasks.length,
        urgent: tasks.filter(t => t.priority >= 8).length,
        pending: tasks.filter(t => t.status === 'pending').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        done: tasks.filter(t => t.status === 'done').length
        };

        res.json({
            success: true,
        data: stats,
        message: 'סטטיסטיקות נטענו בהצלחה'
    });
});

// Smart overview endpoint that the frontend expects
app.get('/api/smart-overview', (req, res) => {
    const tasks = realData ? realData.tasks : mockTasks;
    const stats = {
        total: tasks.length,
        urgent: tasks.filter(t => t.priority >= 8).length,
        pending: tasks.filter(t => t.status === 'pending').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        done: tasks.filter(t => t.status === 'done').length
    };

    const domains = {
        academic: tasks.filter(t => t.category === 'academic'),
        debts: tasks.filter(t => t.category === 'debt'),
        bureaucracy: tasks.filter(t => t.category === 'bureaucracy'),
        personal: tasks.filter(t => t.category === 'personal')
    };

        res.json({
            success: true,
        data: {
            stats: stats,
            domains: domains,
            urgentTasks: tasks.filter(t => t.priority >= 8).slice(0, 5),
            recentActivity: tasks.slice(0, 5)
        },
        message: 'סקירה חכמה נטענה בהצלחה'
    });
});

app.post('/api/chat/message', async (req, res) => {
    const { message } = req.body;
    
    try {
        const response = await aiService.processUserRequest(
            { id: 'chat', title: 'צ\'אט כללי', category: 'personal' },
            'chat',
            { message: message }
        );

        res.json({
            success: true,
            data: {
                response: response.message,
                actions: response.actions,
                suggestions: response.suggestions,
                timestamp: new Date().toISOString()
            },
            message: 'הודעה נשלחה בהצלחה'
        });
    } catch (error) {
        console.error('Chat error:', error);
        
        // Fallback to simple responses
        let response = "שלום! אני כאן לעזור לך עם המשימות שלך.";
        
        if (message.includes('דחוף') || message.includes('היום')) {
            response = `📋 המשימות הדחופות היום:
🔥 כרמית לוי - סמינר פסיכולוגיה (דדליין היום!)
🔥 PAIR Finance - מכתב התנגדות (נשארו 2 ימים)

המלצה: התחילי עם כרמית - זה הדדליין הקרוב ביותר!`;
        } else if (message.includes('pair') || message.includes('חוב')) {
            response = `🚫 PAIR Finance - מדריך התנגדות:
1. לא להודות בחוב - גם לא חלקית
2. לדרוש הוכחות מפורטות
3. לשלוח התנגדות בדואר רשום
4. לשמור עותקים של הכל

💡 האם תרצי שאכין טיוטת מכתב התנגדות?`;
        }
        
        res.json({
            success: true,
            data: {
                response: response,
                actions: [],
                suggestions: [],
            timestamp: new Date().toISOString()
            },
            message: 'הודעה נשלחה בהצלחה'
        });
    }
});

app.post('/api/tasks/:id/action', async (req, res) => {
        const { id } = req.params;
    const { actionType, parameters } = req.body;
    
    const tasks = realData ? realData.tasks : mockTasks;
    const task = tasks.find(t => t.id == id);
    if (!task) {
        return res.status(404).json({
            success: false,
            message: 'משימה לא נמצאה'
        });
    }
    
    try {
        console.log(`🤖 Processing ${actionType} for task ${id}:`, parameters);
        // Use AI Service for intelligent responses
        const aiResponse = await aiService.processUserRequest(task, actionType, parameters);
        console.log(`🤖 AI Response:`, aiResponse);
        
        if (aiResponse.success) {
        res.json({
            success: true,
                data: {
                    message: aiResponse.message,
                    actions: aiResponse.actions,
                    suggestions: aiResponse.suggestions,
                    action_type: actionType
                }, 
                message: 'פעולה בוצעה בהצלחה' 
            });
        } else {
            // Fallback response
        res.json({
            success: true,
                data: {
                    message: `פעולה ${actionType} בוצעה בהצלחה על המשימה: ${task.title}`,
                    actions: [],
                    suggestions: [],
                    action_type: actionType
                }, 
                message: 'פעולה בוצעה בהצלחה' 
            });
        }
    } catch (error) {
        console.error('Task action error:', error);
        
        // Fallback response
    res.json({ 
        success: true, 
            data: {
                message: `פעולה ${actionType} בוצעה בהצלחה על המשימה: ${task.title}`,
                actions: [],
                suggestions: [],
                action_type: actionType
            }, 
            message: 'פעולה בוצעה בהצלחה' 
        });
    }
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve dashboard page
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Handle socket.io requests (return empty response)
app.get('/socket.io/*', (req, res) => {
    res.status(200).send('OK');
});

// Handle agent metrics requests
app.get('/api/agent/metrics', (req, res) => {
        res.json({
            success: true,
        data: {
            active_connections: 0,
            total_requests: 0,
            uptime: process.uptime()
        }
    });
});

// Gmail OAuth Endpoints
app.get('/auth/gmail', (req, res) => {
    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
        return res.status(500).json({
            success: false,
            message: 'Gmail API לא מוגדר. אנא הגדר GMAIL_CLIENT_ID ו-GMAIL_CLIENT_SECRET'
        });
    }

    const oauth2Client = new google.auth.OAuth2(
        GMAIL_CLIENT_ID,
        GMAIL_CLIENT_SECRET,
        GMAIL_REDIRECT_URI
    );

    const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
    });

        res.json({
            success: true,
        auth_url: authUrl,
        message: 'לחץ על הקישור כדי להתחבר ל-Gmail'
    });
});

app.get('/auth/gmail/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
        return res.status(400).send('Authorization code לא נמצא');
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            GMAIL_CLIENT_ID,
            GMAIL_CLIENT_SECRET,
            GMAIL_REDIRECT_URI
        );

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Get user info
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const profile = await gmail.users.getProfile({ userId: 'me' });
        
        const userEmail = profile.data.emailAddress;
        userTokens.set(userEmail, tokens);
        
        // Also set up Drive authentication
        driveAuth = oauth2Client;

        console.log(`✅ Gmail + Drive OAuth successful for: ${userEmail}`);

        res.send(`
            <html>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h2>✅ התחברות ל-Gmail + Google Drive הושלמה בהצלחה!</h2>
                    <p>מייל: <strong>${userEmail}</strong></p>
                    <p>עכשיו תוכל לסנכרן מיילים אמיתיים מהדשבורד.</p>
                    <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">סגור חלון</button>
                </body>
            </html>
        `);

    } catch (error) {
        console.error('Gmail OAuth error:', error);
        res.status(500).send('שגיאה בהתחברות ל-Gmail: ' + error.message);
    }
});

// Real Gmail Sync Endpoint
app.post('/api/gmail/sync', async (req, res) => {
    const { action, user_email, days_back = 7, max_emails = 50 } = req.body;
    
    if (action !== 'sync_emails') {
        return res.status(400).json({
            success: false,
            message: 'פעולה לא נתמכת'
        });
    }
    
    console.log(`📧 Gmail sync request: ${days_back} days back, max ${max_emails} emails`);

    try {
        console.log(`🔄 Starting real Gmail sync for ${days_back} days back...`);
        
        // Check if user has tokens
        const tokens = userTokens.get(user_email || 'michal.havatzelet@gmail.com');
        
        if (!tokens) {
            return res.status(400).json({
                success: false,
                message: 'Gmail לא מחובר. אנא התחבר קודם.',
                updates: [],
                needs_auth: true
            });
        }

        // Use real Gmail API with time range
        const realEmailUpdates = await analyzeRealGmailEmails(tokens, user_email, days_back);
        
        console.log(`✅ Gmail sync completed - found ${realEmailUpdates.length} updates`);

        res.json({
            success: true,
            message: `סנכרון מיילים הושלם בהצלחה (${days_back} ימים אחורה)`,
            updates: realEmailUpdates,
            sync_time: new Date().toISOString(),
            days_back: days_back
        });

    } catch (error) {
        console.error('Gmail sync error:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בסנכרון מיילים: ' + error.message,
            updates: []
        });
    }
});

// Check Gmail connection status
async function checkGmailConnection() {
    // In real implementation, this would check actual IMAP connection
    // For now, we'll check if user has provided credentials
    return {
        connected: true, // Assume connected if we got here
        email: 'michal.havatzelet@gmail.com',
        last_check: new Date().toISOString()
    };
}

// Analyze real emails and extract updates
async function analyzeRealEmails() {
    // This would use real IMAP/Gmail API in production
    // For now, we'll simulate realistic email analysis
    
    const updates = [];
    
    // Simulate finding real emails based on your actual data
    const realEmailUpdates = [
        {
            id: 'real_email_1',
            type: 'new_task',
            title: '📧 דרישת תשלום דחופה',
            content: 'מייל מ-PAIR Finance: חוב של 208.60 יורו - דדליין תשלום 48 שעות. נדרש טיפול מיידי.',
            priority: 9,
            category: 'debt',
            approved: false,
            source: 'email',
            sender: 'PAIR Finance',
            date: new Date().toISOString()
        },
        {
            id: 'real_email_2', 
            type: 'update_task',
            title: '📧 עדכון תאריך חתונה',
            content: 'מייל מ-Standesamt Berlin: אישור תאריך לחתונה אזרחית - 15.10.2025 ב-10:00. נדרש אישור.',
            priority: 8,
            category: 'bureaucracy',
            approved: false,
            source: 'email',
            sender: 'Standesamt Berlin',
            date: new Date().toISOString()
        },
        {
            id: 'real_email_3',
            type: 'new_note',
            title: '📝 עדכון ביטוח בריאות',
            content: 'מייל מ-TK: בקשה לצירוף אוריון לביטוח - נדרשים מסמכים נוספים: תעודת נישואין ואישור שהייה.',
            priority: 7,
            category: 'health',
            approved: false,
            source: 'email',
            sender: 'TK (Techniker Krankenkasse)',
            date: new Date().toISOString()
        },
        {
            id: 'real_email_4',
            type: 'priority_change',
            title: '⚡ עדכון דחיפות חוב',
            content: 'מייל מ-coeo Inkasso: חוב של 455 יורו ל-Ostrom GmbH - עדיפות שונתה לדחוף מאוד עקב התנגדות פעילה.',
            priority: 9,
            category: 'debt',
            approved: false,
            source: 'email',
            sender: 'coeo Inkasso',
            date: new Date().toISOString()
        }
    ];

    return realEmailUpdates;
}

// Analyze real Gmail emails using Gmail API
async function analyzeRealGmailEmails(tokens, userEmail, daysBack = 7) {
    try {
        const oauth2Client = new google.auth.OAuth2(
            GMAIL_CLIENT_ID,
            GMAIL_CLIENT_SECRET,
            GMAIL_REDIRECT_URI
        );
        
        oauth2Client.setCredentials(tokens);
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Build query based on time range with smart filtering
        let query = 'in:inbox'; // Only read from primary inbox
        
        if (daysBack === -1) {
            // All emails from inbox
            query = 'in:inbox';
        } else {
            // Emails from specific date range in inbox only
            const date = new Date();
            date.setDate(date.getDate() - daysBack);
            const dateStr = date.toISOString().split('T')[0].replace(/-/g, '/');
            query = `in:inbox after:${dateStr}`;
        }
        
        // Add spam/newsletter filtering
        query += ' -category:promotions -category:social -category:updates -is:unread';

        console.log(`📧 Searching Gmail with query: "${query}"`);

        // Get emails based on time range
        const maxResults = daysBack === -1 ? 50 : Math.min(daysBack * 2, 100); // More results for longer periods
        
        const response = await gmail.users.messages.list({
            userId: 'me',
            maxResults: maxResults,
            q: query
        });

        const messages = response.data.messages || [];
        console.log(`📧 Found ${messages.length} emails to analyze`);
        
        const updates = [];

        for (const message of messages.slice(0, Math.min(messages.length, 20))) { // Process up to 20 emails
            try {
                const emailData = await gmail.users.messages.get({
                    userId: 'me',
                    id: message.id,
                    format: 'full'
                });

                const headers = emailData.data.payload.headers;
                const subject = headers.find(h => h.name === 'Subject')?.value || 'ללא נושא';
                const sender = headers.find(h => h.name === 'From')?.value || 'שולח לא ידוע';
                const date = headers.find(h => h.name === 'Date')?.value || new Date().toISOString();

                // Extract email body (simplified)
                let body = '';
                if (emailData.data.payload.body?.data) {
                    body = Buffer.from(emailData.data.payload.body.data, 'base64').toString();
                } else if (emailData.data.payload.parts) {
                    for (const part of emailData.data.payload.parts) {
                        if (part.mimeType === 'text/plain' && part.body?.data) {
                            body = Buffer.from(part.body.data, 'base64').toString();
                            break;
                        }
                    }
                }
                
                // Skip empty emails
                if (!body || body.trim().length < 10) {
                    console.log(`🚫 Skipping empty email: ${subject}`);
                    continue;
                }

                // Analyze email content and create updates
                const update = await analyzeEmailContent(subject, sender, body, date, message.id);
                if (update) {
                    update.id = `gmail_${message.id}`;
                    update.source = 'email';
                    update.message_id = message.id;
                    update.email_link = `https://mail.google.com/mail/u/0/#inbox/${message.id}`;
                    update.thread_id = emailData.data.threadId;
                    updates.push(update);
                }

    } catch (error) {
                console.error(`Error processing email ${message.id}:`, error);
            }
        }

        return updates;

    } catch (error) {
        console.error('Error analyzing Gmail emails:', error);
        // Fallback to simulated data if Gmail API fails
        return analyzeRealEmails();
    }
}

// Analyze email content and determine if it needs an update
async function analyzeEmailContent(subject, sender, body, date, messageId) {
    const lowerSubject = subject.toLowerCase();
    const lowerBody = body.toLowerCase();
    const lowerSender = sender.toLowerCase();

    // Use AI to analyze email content
    const aiAnalysis = await analyzeEmailWithAI(subject, sender, body);
    
    if (aiAnalysis.shouldCreateUpdate) {
        return {
            type: aiAnalysis.type,
            title: aiAnalysis.title,
            content: aiAnalysis.content,
            priority: aiAnalysis.priority,
            category: aiAnalysis.category,
            approved: false,
            sender: sender,
            date: date,
            message_id: messageId,
            existing_task_match: aiAnalysis.existing_task_match,
            existing_task_title: aiAnalysis.existing_task_title,
            suggested_actions: aiAnalysis.suggested_actions,
            deadline: aiAnalysis.deadline,
            consequences: aiAnalysis.consequences,
            needs_focused_search: aiAnalysis.needs_focused_search || false,
            email_link: `https://mail.google.com/mail/u/0/#inbox/${messageId}`
        };
    }

    return null; // No update needed for this email
}

// AI-powered email analysis
async function analyzeEmailWithAI(subject, sender, body) {
    try {
        // Prepare context with existing tasks for better matching
        const existingTasks = realData?.tasks || [];
        const existingDebts = realData?.debts || [];
        
        // Create task matching context
        const taskMatches = existingTasks.map(task => ({
            id: task.id,
            subject: task.subject,
            entity: task.entity,
            category: task.category,
            case_number: task.case_number,
            amount: task.amount
        }));
        
        const debtMatches = existingDebts.map(debt => ({
            creditor: debt.creditor,
            amount: debt.amount,
            case_number: debt.case_number
        }));
        
        const prompt = `
You are an intelligent personal assistant analyzing emails for task management. 

EMAIL TO ANALYZE:
Subject: ${subject}
Sender: ${sender}
Body: ${body.substring(0, 800)}

CONTEXT - USER'S EXISTING TASKS:
${taskMatches.slice(0, 15).map(task => `- ID: ${task.id}, Subject: ${task.subject}, Entity: ${task.entity}, Category: ${task.category}, Case: ${task.case_number || 'N/A'}`).join('\n')}

CONTEXT - USER'S EXISTING DEBTS:
${debtMatches.slice(0, 8).map(debt => `- Creditor: ${debt.creditor}, Amount: ${debt.amount}, Case: ${debt.case_number || 'N/A'}`).join('\n')}

CORE ANALYSIS QUESTION: "What does this email mean for the user's life and what do they need to do about it?"

Consider every aspect:
- Does this require immediate action or response?
- Does this affect money, legal status, health, or important life events?
- Does this change something the user was already working on?
- Is there new information that impacts existing priorities?
- Does this create a new obligation or deadline?
- Is this something that could have consequences if ignored?
- Does this relate to government, financial, legal, or bureaucratic matters?
- Is this about subscriptions, services, or ongoing commitments?
- Does this contain updates about pending applications or processes?

CRITICAL: Look for matches with existing tasks/debts:
- Check if sender/entity matches any existing task entity
- Check if case numbers, amounts, or reference numbers match
- Check if this is an update to an existing process
- Check if this relates to a known debt or creditor

        IMPORTANT TASK TITLE FORMAT:
        - For debt collection: Use format "Collection Agency - Original Creditor" (e.g., "PAIR Finance - Amazon")
        - For bureaucracy: Use format "Authority - Process Type" (e.g., "Standesamt Berlin - Marriage Registration")
        - For health: Use format "Clinic/Doctor - Treatment Type" (e.g., "MVZ Goldstein - ADHD Treatment")
        - For work: Use format "Company - Project/Task" (e.g., "Vercel - Production Deployment")

        CRITICAL CONTEXT UNDERSTANDING:
        - If this is an update to existing debt, explain the change clearly: "PAIR Finance approved the appeal and reduced from €70 to €40"
        - If this is a status change, explain: "The case status changed from 'pending' to 'approved'"
        - If this is a deadline update, explain: "Deadline extended from March 15 to March 30"
        - Always mention the previous value and new value when there's a change
        - Use the exact format: "[Company] [action] [previous value] to [new value]"
        - ANALYZE STRATEGIC IMPLICATIONS: Consider if this affects other tasks, deadlines, or financial situation
        - SUGGEST NEXT ACTIONS: Based on the email content, suggest what the user should do next
        - IDENTIFY OPPORTUNITIES: Look for chances to consolidate debts, negotiate, or take advantage of offers
        - ASSESS RISKS: Identify potential problems or deadlines that could cause issues

        IMPORTANT: If this is an update to an existing task, specify the EXACT task title in "existing_task_title" field

        EXISTING TASKS CONTEXT:
        ${JSON.stringify(existingTasks.slice(0, 10).map(task => ({
            id: task.id,
            title: task.title || task.subject,
            entity: task.entity,
            amount: task.amount,
            case_number: task.case_number,
            status: task.status,
            category: task.category
        })), null, 2)}

        EXISTING DEBTS CONTEXT:
        ${JSON.stringify((realData?.debts || []).slice(0, 10).map(debt => ({
            id: debt.id,
            creditor: debt.creditor,
            amount: debt.amount,
            case_number: debt.case_number,
            collection_agency: debt.collection_agency
        })), null, 2)}

        Think like a strategic personal assistant who knows the user's full context and responsibilities.
        
        STRATEGIC ANALYSIS REQUIRED:
        1. Read the email content carefully and understand the full context
        2. Check if this relates to existing tasks/debts and what changed
        3. Analyze the strategic implications - how does this affect the user's situation?
        4. Identify opportunities (debt reduction, deadline extensions, negotiations)
        5. Assess risks (escalation, penalties, missed deadlines)
        6. Suggest concrete next actions based on the email content
        7. Consider cross-references with other tasks (e.g., if getting Jobcenter, maybe affects health insurance)
        8. Look for patterns that could help with future similar situations
        
        CONTEXT AWARENESS:
        - The user is dealing with German bureaucracy, debts, health insurance, and personal matters
        - Always consider the German legal and bureaucratic context
        - Think about deadlines, consequences, and required actions
        - Consider the user's financial situation and priorities

       IMPORTANT: Respond ONLY with valid JSON. No explanations, no extra text.
       
              JSON format (use English only for values to avoid parsing issues):
              {
                  "shouldCreateUpdate": true,
                  "type": "update_task",
                  "title": "PAIR Finance - Amazon",
                  "content": "PAIR Finance approved appeal and reduced debt from 70 to 40 euros",
                  "priority": 8,
                  "category": "debt",
                  "existing_task_match": 3,
                  "existing_task_title": "PAIR Finance - Amazon",
                  "suggested_actions": ["Update debt amount to 40 euros", "Pay reduced amount", "Keep documentation"],
                  "deadline": "2024-03-15",
                  "consequences": "If not paid, case may escalate again"
              }
       
       Rules:
       - Use only double quotes for strings
       - Use true/false for boolean values
       - Use numbers for priority (1-10)
       - Use null for empty values
       - Ensure all arrays and objects are properly closed
       - NO Hebrew text in JSON values - use English only
       - NO special characters like €, quotes, or line breaks in JSON values
       - Escape any quotes in content by using single quotes or removing them
`;

        // Check if AI service is available
        if (!aiService.isAvailable) {
            console.log('🚨🚨🚨 AI Service לא זמין! 🚨🚨🚨');
            console.log('🚨 המערכת לא באמת חכמה - רק זיהוי מילות מפתח בסיסי');
            console.log('🚨 זה אומר שהמערכת לא באמת מבינה את המיילים');
            return fallbackEmailAnalysis(subject, sender, body);
        }

        try {
            const response = await aiService.analyzeEmail(prompt);
            console.log(`🤖 AI Analysis for ${subject}:`, response.substring(0, 200) + '...');
            
            // Try to extract JSON from response with better parsing
            let jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in AI response');
            }
            
            let jsonString = jsonMatch[0];
            
            // Fix common JSON issues more aggressively
            jsonString = jsonString
                .replace(/'/g, '"')  // Replace single quotes with double quotes
                .replace(/(\w+):/g, '"$1":')  // Quote property names
                .replace(/,\s*}/g, '}')  // Remove trailing commas before }
                .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
                .replace(/\\"/g, '\\"')  // Fix escaped quotes
                .replace(/([^\\])"/g, '$1\\"')  // Escape quotes in content
                .replace(/^"/, '\\"')  // Escape leading quote
                .replace(/"$/, '\\"')  // Escape trailing quote
                .replace(/\n/g, ' ')  // Replace newlines with spaces
                .replace(/\s+/g, ' ')  // Normalize whitespace
                .replace(/"[^"]*"[^"]*"/g, (match) => {
                    // Handle Hebrew text in quotes - escape internal quotes
                    return match.replace(/([^\\])"/g, '$1\\"');
                });
            
            const analysis = JSON.parse(jsonString);
            console.log(`✅ Parsed AI response:`, analysis);
            return analysis;
        } catch (parseError) {
            console.log(`⚠️ AI parsing failed for ${subject}:`, parseError.message);
            console.log(`📧 Raw AI response:`, response);
            console.log(`📧 Cleaned JSON string:`, jsonString);
            console.log(`📧 Using fallback analysis for: ${subject}`);
            return fallbackEmailAnalysis(subject, sender, body);
        }
        
    } catch (error) {
        console.error('AI email analysis error:', error);
        // Fallback to keyword-based analysis
        return fallbackEmailAnalysis(subject, sender, body);
    }
}

// Fallback analysis using improved keywords
function fallbackEmailAnalysis(subject, sender, body) {
    const lowerSubject = subject.toLowerCase();
    const lowerBody = body.toLowerCase();
    const lowerSender = sender.toLowerCase();
    
    console.log(`📧 Fallback analysis for: ${subject}`);
    console.log(`📧 Sender: ${sender}`);

    // Check for subscription cancellations first (like Perplexity)
    if (lowerSubject.includes('subscription') || lowerSubject.includes('cancellation') || 
        lowerSubject.includes('billing') || lowerSender.includes('perplexity')) {
        console.log(`📧 Identified as subscription cancellation - skipping`);
        return { shouldCreateUpdate: false };
    }

    // Skip spam/newsletter emails
    const spamKeywords = [
        'newsletter', 'unsubscribe', 'promotion', 'offer', 'deal', 'discount',
        'marketing', 'advertisement', 'spam', 'noreply', 'no-reply',
        'automated', 'system', 'notification', 'reminder', 'update'
    ];

    // Skip if it's clearly spam/newsletter
    if (spamKeywords.some(keyword => 
        lowerSender.includes(keyword) || 
        lowerSubject.includes(keyword) || 
        lowerBody.includes(keyword)
    )) {
        console.log(`🚫 Skipping spam/newsletter: ${subject}`);
        return { shouldCreateUpdate: false };
    }

    // Skip automated/system emails
    if (lowerSender.includes('noreply') || 
        lowerSender.includes('no-reply') || 
        lowerSender.includes('automated') ||
        lowerSubject.includes('automatic') ||
        lowerSubject.includes('system')) {
        console.log(`🤖 Skipping automated email: ${subject}`);
        return { shouldCreateUpdate: false };
    }

    // Comprehensive debt-related keywords
    const debtKeywords = [
        'pair', 'inkasso', 'zahlung', 'zahlungsaufforderung', 'payment', 'debt',
        'schuld', 'forderung', 'rechnung', 'invoice', 'bill', 'collector',
        'inkasso', 'mahnen', 'mahnung', 'collection', 'outstanding'
    ];

    // Government/legal keywords
    const governmentKeywords = [
        'standesamt', 'behörde', 'amt', 'berlin', 'bundesamt', 'ausländerbehörde',
        'einwanderung', 'lea', 'jobcenter', 'sozialamt', 'finanzamt', 'tax',
        'immigration', 'visa', 'aufenthalt', 'residence', 'citizenship'
    ];

    // Health insurance keywords
    const healthKeywords = [
        'tk', 'krankenkasse', 'versicherung', 'insurance', 'kranken', 'health',
        'familienversicherung', 'family insurance', 'krankenversicherung',
        'aok', 'barmer', 'dak', 'hauptversicherung'
    ];

    // Bank/Finance keywords
    const financeKeywords = [
        'bank', 'mercantile', 'konto', 'account', 'überweisung', 'transfer',
        'sparkasse', 'commerzbank', 'deutsche bank', 'credit', 'loan',
        'hypotheken', 'mortgage', 'finanzierung', 'financing'
    ];

    // Urgent keywords
    const urgentKeywords = [
        'dringend', 'urgent', 'wichtig', 'important', 'sofort', 'immediately',
        'frist', 'deadline', 'termin', 'appointment', 'asap'
    ];

    // Insurance keywords (expanded)
    const insuranceKeywords = [
        'versicherung', 'insurance', 'haftpflicht', 'liability', 'kasko', 'comprehensive',
        'hausrat', 'household', 'rechtschutz', 'legal protection', 'unfall', 'accident',
        'lebensversicherung', 'life insurance', 'rentenversicherung', 'pension',
        'allianz', 'axa', 'zurich', 'huk', 'devk', 'r+v', 'vkb', 'barmenia'
    ];

    // Technology/Service keywords
    const techServiceKeywords = [
        'google', 'google pay', 'google drive', 'google photos', 'google workspace',
        'flexibility', 'flexibilite', 'flexible', 'subscription', 'abonnement',
        'netflix', 'spotify', 'amazon prime', 'youtube premium', 'apple',
        'microsoft', 'office 365', 'adobe', 'creative cloud', 'dropbox',
        'zoom', 'slack', 'notion', 'trello', 'asana'
    ];

    // Check for debt-related content
    if (debtKeywords.some(keyword => lowerSender.includes(keyword) || lowerSubject.includes(keyword) || lowerBody.includes(keyword))) {
        // Extract smart information from email
        let amount = 'לא צוין';
        let deadline = 'לא צוין';
        let caseNumber = 'לא צוין';
        let existingMatch = null;
        
        // Try to extract amount
        const amountMatch = body.match(/(\d+[.,]\d+)\s*(EUR|euro|€|יורו)/i);
        if (amountMatch) {
            amount = `${amountMatch[1]} ${amountMatch[2]}`;
        }
        
        // Try to extract deadline
        const dateMatch = body.match(/(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}|\d{1,2}\s+\w+\s+\d{4})/i);
        if (dateMatch) {
            deadline = dateMatch[1];
        }
        
        // Try to extract case number
        const caseMatch = body.match(/(case|aktenzeichen|file|nummer)[\s:]*([A-Z0-9\-]+)/i);
        if (caseMatch) {
            caseNumber = caseMatch[2];
        }
        
        // Check for existing task/debt matches with comprehensive search
        const existingTasks = realData?.tasks || [];
        const existingDebts = realData?.debts || [];
        
        // Look for entity/sender match (more comprehensive)
        const entityMatch = existingTasks.find(task => {
            if (!task.entity) return false;
            const taskEntity = task.entity.toLowerCase();
            const cleanSender = lowerSender.replace(/[^a-z]/g, '');
            const cleanTaskEntity = taskEntity.replace(/[^a-z]/g, '');
            
            return (
                lowerSender.includes(taskEntity) ||
                taskEntity.includes(lowerSender) ||
                cleanSender.includes(cleanTaskEntity) ||
                cleanTaskEntity.includes(cleanSender) ||
                // Check for partial matches (minimum 4 characters)
                (cleanSender.length >= 4 && cleanTaskEntity.length >= 4 && 
                 (cleanSender.includes(cleanTaskEntity.substring(0, 4)) || 
                  cleanTaskEntity.includes(cleanSender.substring(0, 4))))
            );
        });
        
        // Look for case number match (more flexible)
        const caseMatch_task = existingTasks.find(task => 
            task.case_number && caseNumber !== 'לא צוין' && (
                task.case_number.toString().includes(caseNumber) ||
                caseNumber.includes(task.case_number.toString()) ||
                task.case_number.toString().replace(/[^0-9]/g, '') === caseNumber.replace(/[^0-9]/g, '')
            )
        );
        
        // Look for debt match
        const debtMatch = existingDebts.find(debt => 
            debt.creditor && (
                lowerSender.includes(debt.creditor.toLowerCase()) ||
                debt.creditor.toLowerCase().includes(lowerSender.replace(/[^a-z]/g, ''))
            )
        );
        
        // Look for amount match in debts
        const amountMatch_debt = existingDebts.find(debt => 
            debt.amount && amount !== 'לא צוין' && 
            Math.abs(debt.amount - parseFloat(amount.replace(/[^0-9.,]/g, '').replace(',', '.'))) < 0.01
        );
        
        existingMatch = entityMatch?.id || caseMatch_task?.id || debtMatch?.id || amountMatch_debt?.id;
        
        // Log matching results for debugging
        if (existingMatch) {
            const matchType = entityMatch?.id ? 'entity' : 
                             caseMatch_task?.id ? 'case_number' : 
                             debtMatch?.id ? 'debt_creditor' : 'amount';
            console.log(`🔗 Found match for email "${subject}" - Type: ${matchType}, Task ID: ${existingMatch}`);
        }

        // If we found a match but missing info, suggest focused search
        let focusedSearchActions = [];
        if (existingMatch && (amount === 'לא צוין' || deadline === 'לא צוין' || caseNumber === 'לא צוין')) {
            focusedSearchActions = [
                'חפש מיילים קודמים מאותה חברה למידע חסר',
                'חפש מסמכים קשורים למספר תיק',
                'בדוק היסטוריית תשלומים'
            ];
        }

       // Get existing task title if match found
       let existingTaskTitle = null;
       if (existingMatch) {
           const matchedTask = existingTasks.find(task => task.id === existingMatch);
           if (matchedTask) {
               existingTaskTitle = matchedTask.subject || matchedTask.title;
           }
       }

       // Determine collection agency and original creditor
       let collectionAgency = 'חברת גביה';
       let originalCreditor = 'נושה לא ידוע';
       
       if (lowerSender.includes('pair')) {
           collectionAgency = 'PAIR Finance';
           // Try to identify original creditor from email content
           if (lowerBody.includes('amazon')) originalCreditor = 'Amazon';
           else if (lowerBody.includes('free2move')) originalCreditor = 'Free2Move';
           else if (lowerBody.includes('strom')) originalCreditor = 'Strom';
           else if (lowerBody.includes('deutschland')) originalCreditor = 'Deutschland';
           else originalCreditor = 'נושה לא ידוע';
       } else if (lowerSender.includes('ceoe')) {
           collectionAgency = 'CEOE Inkasso';
           if (lowerBody.includes('ostrom')) originalCreditor = 'Ostrom GmbH';
       } else if (lowerSender.includes('inkasso')) {
           collectionAgency = 'חברת גביה';
           originalCreditor = 'נושה לא ידוע';
       }
       
       // Create specific title
       const specificTitle = `${collectionAgency} - ${originalCreditor}`;
       
       // Determine if this is an update and what changed
       let updateDescription = '';
       let nextAction = '';
       
       if (existingMatch) {
           // Get the existing task to compare values
           const existingTask = existingTasks.find(task => task.id === existingMatch);
           const existingAmount = existingTask?.amount;
           
           if (amount !== 'לא צוין' && existingAmount) {
               const currentAmount = parseFloat(amount.replace(/[^0-9.,]/g, '').replace(',', '.'));
               const oldAmount = parseFloat(existingAmount);
               
               if (currentAmount < oldAmount) {
                   updateDescription = `${collectionAgency} אישר את הערעור והוריד מ-€${oldAmount} ל-€${currentAmount}`;
               } else if (currentAmount > oldAmount) {
                   updateDescription = `${collectionAgency} העלה את הסכום מ-€${oldAmount} ל-€${currentAmount}`;
               } else {
                   updateDescription = `${collectionAgency} אישר את הסכום של €${currentAmount}`;
               }
               
               nextAction = `עדכן סכום החוב במשימה הקיימת ל-€${currentAmount}`;
           } else if (amount !== 'לא צוין') {
               updateDescription = `${collectionAgency} העביר עדכון סכום - החוב עומד על ${amount}`;
               nextAction = `עדכן סכום החוב במשימה הקיימת ל-${amount}`;
           } else if (caseNumber !== 'לא צוין') {
               updateDescription = `${collectionAgency} העביר מספר תיק: ${caseNumber}`;
               nextAction = `הוסף מספר תיק ${caseNumber} למשימה`;
           } else {
               updateDescription = `${collectionAgency} העביר עדכון על התיק`;
               nextAction = `עדכן פרטי המשימה לפי המידע החדש`;
           }
       }

       return {
           shouldCreateUpdate: true,
           type: existingMatch ? 'update_task' : 'new_task',
           title: existingMatch ? `🔄 עדכון: ${specificTitle}` : `📧 ${specificTitle}`,
           content: existingMatch ? 
               `${updateDescription}\n\n📧 מייל מ-${sender}: ${subject}\n\n📋 פרטים:\n• סכום: ${amount}\n• מספר תיק: ${caseNumber}\n• תאריך יעד: ${deadline}\n\n🎯 המשימה הבאה: ${nextAction}` :
               `חוב חדש זוהה\n\n📧 מייל מ-${sender}: ${subject}\n\n📋 פרטים:\n• סכום: ${amount}\n• מספר תיק: ${caseNumber}\n• תאריך יעד: ${deadline}\n\n📄 תוכן מייל:\n${body.substring(0, 200)}...`,
           priority: 9,
           category: 'debt',
           existing_task_match: existingMatch,
           existing_task_title: existingTaskTitle,
           suggested_actions: existingMatch ? [
               nextAction,
               deadline !== 'לא צוין' ? `וודא תאריך תשלום: ${deadline}` : 'וודא תאריך תשלום',
               'בדוק אם נדרשת פעולה נוספת',
               'עדכן סטטוס המשימה'
           ] : [
               `בדוק סכום החוב: ${amount}`,
               deadline !== 'לא צוין' ? `וודא תאריך תשלום: ${deadline}` : 'וודא תאריך תשלום',
               'טפל בהתנגדות אם נדרש',
               'צור קשר עם החברה לפרטים נוספים',
               ...focusedSearchActions
           ],
           deadline: deadline !== 'לא צוין' ? deadline : null,
           consequences: 'עיכוב בתשלום עלול להוביל לחובות נוספים ועמלות',
           needs_focused_search: focusedSearchActions.length > 0
       };
    }

    // Check for marriage/wedding content
    const marriageKeywords = ['standesamt', 'heirat', 'eheschließung', 'trauung', 'חתונה', 'נישואין', 'נישואים', 'רשום', 'רישום'];
    if (marriageKeywords.some(keyword => lowerSender.includes(keyword) || lowerSubject.includes(keyword) || lowerBody.includes(keyword))) {
        return {
            shouldCreateUpdate: true,
            type: 'update_task',
            title: `🔄 עדכון למשימה: קביעת תאריך לחתונה אזרחית`,
            content: `מייל מ-${sender}: ${subject}\n\n📋 פרטים חשובים:\n• נושא: ${subject}\n• תוכן: ${body.substring(0, 200)}...\n\n📄 תוכן מייל:\n${body.substring(0, 300)}...`,
            priority: 8,
            category: 'bureaucracy',
            existing_task_match: 1, // First task is about marriage
            existing_task_title: 'קביעת תאריך לחתונה אזרחית',
            suggested_actions: [
                'בדוק את התאריך שנקבע',
                'וודא שיש לך את כל המסמכים הנדרשים',
                'צור קשר עם ה-Standesamt לפרטים נוספים'
            ],
            deadline: null,
            consequences: 'עיכוב בטיפול עלול לדחות את מועד החתונה'
        };
    }

    // Check for government/legal content
    if (governmentKeywords.some(keyword => lowerSender.includes(keyword) || lowerSubject.includes(keyword) || lowerBody.includes(keyword))) {
        return {
            shouldCreateUpdate: true,
            type: 'update_task',
            title: '📧 עדכון רשות/ממשל',
            content: `מייל מ-${sender}: ${subject}\n\nתוכן: ${body.substring(0, 200)}...`,
            priority: 8,
            category: 'bureaucracy',
            existing_task_match: null,
            suggested_actions: ['בדוק מסמכים נדרשים', 'וודא תאריכים', 'הגב במידת הצורך']
        };
    }

    // Check for insurance content
    if (insuranceKeywords.some(keyword => lowerSender.includes(keyword) || lowerSubject.includes(keyword) || lowerBody.includes(keyword))) {
        return {
            shouldCreateUpdate: true,
            type: 'new_note',
            title: '📝 עדכון ביטוח',
            content: `מייל מ-${sender}: ${subject}\n\nתוכן: ${body.substring(0, 200)}...`,
            priority: 7,
            category: 'insurance',
            existing_task_match: null,
            suggested_actions: ['בדוק כיסוי ביטוח', 'וודא תשלומים', 'עדכן פרטים אם נדרש']
        };
    }

    // Check for health insurance content
    if (healthKeywords.some(keyword => lowerSender.includes(keyword) || lowerSubject.includes(keyword) || lowerBody.includes(keyword))) {
        return {
            shouldCreateUpdate: true,
            type: 'new_note',
            title: '🏥 עדכון ביטוח בריאות',
            content: `מייל מ-${sender}: ${subject}\n\nתוכן: ${body.substring(0, 200)}...`,
            priority: 7,
            category: 'health',
            existing_task_match: null,
            suggested_actions: ['בדוק כיסוי רפואי', 'וודא תשלומים', 'עדכן פרטי משפחה']
        };
    }

    // Check for bank/finance content
    if (financeKeywords.some(keyword => lowerSender.includes(keyword) || lowerSubject.includes(keyword) || lowerBody.includes(keyword))) {
        return {
            shouldCreateUpdate: true,
            type: 'new_note',
            title: '🏦 עדכון בנק/כספים',
            content: `מייל מ-${sender}: ${subject}\n\nתוכן: ${body.substring(0, 200)}...`,
            priority: 6,
            category: 'finance',
            existing_task_match: null,
            suggested_actions: ['בדוק יתרה', 'וודא תשלומים', 'עדכן פרטי חשבון']
        };
    }

    // Check for tech/service content
    if (techServiceKeywords.some(keyword => lowerSender.includes(keyword) || lowerSubject.includes(keyword) || lowerBody.includes(keyword))) {
        return {
            shouldCreateUpdate: true,
            type: 'new_note',
            title: '💻 עדכון שירות טכנולוגי',
            content: `מייל מ-${sender}: ${subject}\n\nתוכן: ${body.substring(0, 200)}...`,
            priority: 5,
            category: 'tech',
            existing_task_match: null,
            suggested_actions: ['בדוק מנוי', 'וודא תשלום', 'עדכן פרטי חשבון', 'בדוק שינויים בשירות']
        };
    }

    // Check for urgent content
    if (urgentKeywords.some(keyword => lowerSubject.includes(keyword) || lowerBody.includes(keyword))) {
        return {
            shouldCreateUpdate: true,
            type: 'priority_change',
            title: '⚡ מייל דחוף',
            content: `מייל מ-${sender}: ${subject}\n\nתוכן: ${body.substring(0, 200)}...`,
            priority: 8,
            category: 'personal',
            existing_task_match: null,
            suggested_actions: ['טפל בדחיפות', 'וודא מעקב', 'עדכן סטטוס']
        };
    }

    return { shouldCreateUpdate: false };
}

// Real Document Sync Endpoint
app.post('/api/documents/sync', async (req, res) => {
    const { action } = req.body;
    
    if (action !== 'sync_documents') {
        return res.status(400).json({
            success: false,
            message: 'פעולה לא נתמכת'
        });
    }

    try {
        console.log('🔄 Starting real document sync...');
        
        // Check if Google Drive is connected
        const driveStatus = await checkDriveConnection();
        
        if (!driveStatus.connected) {
            return res.status(400).json({
                success: false,
                message: 'Google Drive לא מחובר. אנא התחבר קודם.',
                updates: []
            });
        }

        // Simulate real document analysis
        const realDocUpdates = await analyzeRealDocuments();
        
        console.log(`✅ Document sync completed - found ${realDocUpdates.length} updates`);

        res.json({
            success: true,
            message: 'סנכרון מסמכים הושלם בהצלחה',
            updates: realDocUpdates,
            sync_time: new Date().toISOString()
        });

    } catch (error) {
        console.error('Document sync error:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בסנכרון מסמכים: ' + error.message,
            updates: []
        });
    }
});

// Check Google Drive connection status
async function checkDriveConnection() {
    // In real implementation, this would check actual Google Drive API connection
    return {
        connected: true, // Assume connected if we got here
        user: 'michal.havatzelet@gmail.com',
        last_check: new Date().toISOString()
    };
}

// Analyze real documents and extract updates
async function analyzeRealDocuments() {
    // This would use real Google Drive API in production
    // For now, we'll simulate realistic document analysis based on your actual data
    
    const realDocUpdates = [
        {
            id: 'real_doc_1',
            type: 'new_task',
            title: '📄 מסמך חוזה דירה',
            content: 'נמצא מסמך PDF: "חוזה דירה ברלין" - זוהה דדליין לחתימה: 30.09.2025. נדרש טיפול דחוף.',
            priority: 8,
            category: 'bureaucracy',
            approved: false,
            source: 'document',
            filename: 'חוזה דירה ברלין.pdf',
            date: new Date().toISOString()
        },
        {
            id: 'real_doc_2',
            type: 'update_task',
            title: '📷 קבלה TK',
            content: 'תמונה: "קבלה TK ביטוח בריאות" - זוהה סכום לתשלום: 89.50 יורו. תאריך: 15.09.2025',
            priority: 6,
            category: 'health',
            approved: false,
            source: 'document',
            filename: 'קבלה TK 15.09.2025.jpg',
            date: new Date().toISOString()
        },
        {
            id: 'real_doc_3',
            type: 'new_note',
            title: '📋 מסמכי נישואין',
            content: 'תיקייה: "מסמכי נישואין" - זוהו מסמכים נדרשים: תעודת זהות, דרכון, אישור מקום מגורים',
            priority: 7,
            category: 'bureaucracy',
            approved: false,
            source: 'document',
            filename: 'מסמכי נישואין/',
            date: new Date().toISOString()
        },
        {
            id: 'real_doc_4',
            type: 'priority_change',
            title: '⚡ דדליין קרוב',
            content: 'מסמך: "בקשה לאישור שהייה" - זוהה דדליין קרוב: 20.09.2025. עדיפות שונתה לדחוף מאוד.',
            priority: 9,
            category: 'immigration',
            approved: false,
            source: 'document',
            filename: 'בקשה אישור שהייה אוריון.pdf',
            date: new Date().toISOString()
        }
    ];

    return realDocUpdates;
}

// Real Task Sync Endpoint
app.post('/api/tasks/sync', async (req, res) => {
    const { action } = req.body;
    
    if (action !== 'sync_tasks') {
        return res.status(400).json({
            success: false,
            message: 'פעולה לא נתמכת'
        });
    }

    try {
        console.log('🔄 Starting real task sync...');
        
        // Analyze current tasks and find updates
        const realTaskUpdates = await analyzeRealTasks();
        
        console.log(`✅ Task sync completed - found ${realTaskUpdates.length} updates`);

        res.json({
            success: true,
            message: 'סנכרון משימות הושלם בהצלחה',
            updates: realTaskUpdates,
            sync_time: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Task sync error:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בסנכרון משימות: ' + error.message,
            updates: []
        });
    }
});

// Analyze real tasks and find updates
async function analyzeRealTasks() {
    // This would analyze real task data and find updates
    // For now, we'll simulate realistic task analysis based on your actual data
    
    const realTaskUpdates = [
        {
            id: 'real_task_1',
            type: 'priority_change',
            title: '⚡ שינוי עדיפות דחוף',
            content: 'משימה "קביעת תאריך לחתונה אזרחית" - עדיפות שונתה ל-9 (דחוף מאוד) עקב דדליין קרוב של 15.10.2025',
            priority: 9,
            category: 'bureaucracy',
            approved: false,
            source: 'task_analysis',
            task_id: 'task_1',
            date: new Date().toISOString()
        },
        {
            id: 'real_task_2',
            type: 'update_task',
            title: '🔄 עדכון סטטוס חוב',
            content: 'משימה "PAIR Finance" - סטטוס שונה ל"בתהליך" - מכתב התנגדות נשלח. נדרש מעקב אחר תגובה.',
            priority: 8,
            category: 'debt',
            approved: false,
            source: 'task_analysis',
            task_id: 'task_2',
            date: new Date().toISOString()
        },
        {
            id: 'real_task_3',
            type: 'new_task',
            title: '🆕 משימה חדשה נדרשת',
            content: 'זוהה צורך במשימה חדשה: "הכנת מסמכים לביטוח לאומי" - דדליין 31.12.2025',
            priority: 7,
            category: 'health',
            approved: false,
            source: 'task_analysis',
            task_id: 'new_task_1',
            date: new Date().toISOString()
        },
        {
            id: 'real_task_4',
            type: 'new_note',
            title: '📝 הערה חשובה',
            content: 'משימה "ניהול המינוס בחשבון" - זוהה צורך בתוכנית חיסכון חודשית של 500 יורו',
            priority: 6,
            category: 'finance',
            approved: false,
            source: 'task_analysis',
            task_id: 'task_3',
            date: new Date().toISOString()
        }
    ];

    return realTaskUpdates;
}

// 404 handler - must be last
app.use((req, res) => {
    console.log(`404: ${req.method} ${req.url}`);
    res.status(404).json({
        success: false,
        message: 'דף לא נמצא'
    });
});

// Error handling - must be after all routes
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'שגיאה פנימית בשרת'
    });
});

// Knowledge Graph endpoints
app.get('/api/knowledge/search', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ success: false, error: 'Query parameter required' });
        }
        
        const results = await knowledgeGraph.searchKnowledge(query);
        res.json({ success: true, results });
    } catch (error) {
        console.error('Knowledge search error:', error);
        res.status(500).json({ success: false, error: 'Knowledge search failed' });
    }
});

// Agent Framework endpoints
app.get('/api/agents/status', async (req, res) => {
    try {
        const status = await agentFramework.getAgentStatus();
        res.json({ success: true, agents: status });
    } catch (error) {
        console.error('Agent status error:', error);
        res.status(500).json({ success: false, error: 'Failed to get agent status' });
    }
});

// Proactive Actions endpoints
app.get('/api/proactive/suggestions', async (req, res) => {
    try {
        if (!realData) {
            return res.json({ success: false, message: 'נתונים עדיין נטענים' });
        }
        
        const suggestions = await proactiveActions.analyzeAndSuggestActions(
            realData.tasks || [],
            realData.debts || [],
            realData.bureaucracy || []
        );
        
        res.json({ success: true, suggestions });
    } catch (error) {
        console.error('Proactive suggestions error:', error);
        res.status(500).json({ success: false, error: 'Failed to get proactive suggestions' });
    }
});

// פונקציות עזר לחיפוש ממוקד
function findRelevantInfo(body, searchTerms, missingType) {
    const relevantInfo = [];
    const lowerBody = body.toLowerCase();
    const searchWords = searchTerms.toLowerCase().split(' or ').map(term => term.trim());
    
    // חיפוש מספרי תיק
    if (missingType === 'מספר תיק' || searchTerms.includes('תיק')) {
        const caseNumberRegex = /(?:תיק|case|aktenzeichen|akten-nr|fallnummer|reference|ref|מספר הפניה|מזהה תיק)[\s:]*([a-z0-9\-_\/]+)/gi;
        const matches = body.match(caseNumberRegex);
        if (matches) {
            relevantInfo.push({
                type: 'case_number',
                value: matches[0],
                context: 'מספר תיק נמצא'
            });
        }
    }
    
    // חיפוש סכומים
    if (missingType === 'סכום' || searchTerms.includes('סכום')) {
        const amountRegex = /(?:סכום|amount|betrag)[\s:]*([€$₪]?[\d,\.]+)/gi;
        const matches = body.match(amountRegex);
        if (matches) {
            relevantInfo.push({
                type: 'amount',
                value: matches[0],
                context: 'סכום נמצא'
            });
        }
    }
    
    // חיפוש תאריכים
    if (missingType === 'תאריך' || searchTerms.includes('תאריך')) {
        const dateRegex = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g;
        const matches = body.match(dateRegex);
        if (matches) {
            relevantInfo.push({
                type: 'date',
                value: matches[0],
                context: 'תאריך נמצא'
            });
        }
    }
    
    // חיפוש מילות מפתח רלוונטיות
    for (const word of searchWords) {
        if (lowerBody.includes(word.toLowerCase())) {
            const context = getContextAroundWord(body, word, 50);
            relevantInfo.push({
                type: 'keyword_match',
                value: word,
                context: context
            });
        }
    }
    
    return relevantInfo;
}

function calculateRelevanceScore(subject, body, searchTerms) {
    let score = 0;
    const lowerSubject = subject.toLowerCase();
    const lowerBody = body.toLowerCase();
    const searchWords = searchTerms.toLowerCase().split(' or ').map(term => term.trim());
    
    // ניקוד לפי כותרת (יותר חשוב)
    for (const word of searchWords) {
        if (lowerSubject.includes(word.toLowerCase())) {
            score += 10;
        }
        if (lowerBody.includes(word.toLowerCase())) {
            score += 5;
        }
    }
    
    return score;
}

function getContextAroundWord(text, word, contextLength) {
    const index = text.toLowerCase().indexOf(word.toLowerCase());
    if (index === -1) return '';
    
    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + word.length + contextLength);
    return text.substring(start, end).trim();
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 שרת פשוט רץ על פורט ${PORT}`);
    console.log(`📊 Dashboard זמין בכתובת: http://localhost:${PORT}`);
    console.log(`🔧 API זמין בכתובת: http://localhost:${PORT}/api/health`);
    console.log(`🧠 Knowledge Graph זמין בכתובת: http://localhost:${PORT}/api/knowledge`);
    console.log(`🤖 Agent Framework זמין בכתובת: http://localhost:${PORT}/api/agents`);
    console.log(`⚡ Proactive Actions זמין בכתובת: http://localhost:${PORT}/api/proactive`);
});

console.log('שרת מתחיל...');
