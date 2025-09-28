const OpenAI = require('openai');
const { logger } = require('../utils/logger');

class AIService {
    constructor() {
        this.openai = null;
        this.model = 'gpt-4o-mini'; // ברירת מחדל
        this.isAvailable = false;
        this.memory = new Map(); // Simple in-memory storage for learning
        this.init();
    }

    async init() {
        try {
            // Try OpenAI first
            const openaiKey = process.OPENAI_API_KEY || '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';
            
            if (openaiKey && openaiKey !== 'your_openai_api_key_here') {
        this.openai = new OpenAI({
                    apiKey: openaiKey
                });
                
                // Set model
                this.model = 'gpt-4o-mini';
                
                // Test the connection
                await this.openai.models.list();
                this.isAvailable = true;
                console.log('✅ OpenAI AI Service מוכן לעבודה');
                return;
            }
            
            // Fallback to Gemini
            const geminiKey = process.GEMINI_API_KEY || 'AIzaSyAyd633aF6skLqRsqeLajoXJWNyX2-A-C0';
            if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
                this.model = 'gemini-pro';
                this.useGemini = true;
                this.geminiApiKey = geminiKey;
                this.isAvailable = true;
                console.log('✅ Gemini AI Service מוכן לעבודה');
                return;
            }
            
            console.log('⚠️ לא נמצא מפתח API תקין - AI service לא זמין');
            this.isAvailable = false;
        } catch (error) {
            console.log('⚠️ OpenAI failed:', error.message);
            
            // Try Gemini as fallback
            try {
                const geminiKey = process.GEMINI_API_KEY || 'AIzaSyAyd633aF6skLqRsqeLajoXJWNyX2-A-C0';
                if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
                    this.useGemini = true;
                    this.geminiApiKey = geminiKey;
                    this.isAvailable = true;
                    console.log('✅ Gemini AI Service מוכן לעבודה (fallback)');
                    return;
                }
            } catch (geminiError) {
                console.log('⚠️ Gemini fallback also failed:', geminiError.message);
            }
            
            this.isAvailable = false;
        }
    }

    async analyzeEmail(prompt) {
        if (!this.isAvailable) {
            throw new Error('AI Service not available');
        }

        try {
            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an intelligent email analyzer. Return ONLY valid JSON.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 1000
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('AI email analysis error:', error);
            throw error;
        }
    }

    async processUserRequest(task, actionType, parameters = {}) {
        console.log(`🤖 AI Service processUserRequest called:`, { task: task.title, actionType, parameters });
        console.log(`🤖 AI Service available:`, this.isAvailable);
        
        if (!this.isAvailable) {
            console.log(`❌ AI Service not available`);
            return {
                success: false,
                message: 'AI Service לא זמין כרגע',
                actions: []
            };
        }

        try {
            const context = this.buildContext(task, actionType, parameters);
            const response = await this.generateResponse(context);
            
            // Store interaction for learning
            this.storeInteraction(task.id, actionType, parameters, response);
            
            return {
                success: true,
                message: response.message,
                actions: response.actions,
                suggestions: response.suggestions
            };
        } catch (error) {
            logger.error('AI Service Error:', error);
            return {
                success: false,
                message: 'שגיאה בעיבוד הבקשה',
                actions: []
            };
        }
    }

    buildContext(task, actionType, parameters) {
        const taskInfo = {
            id: task.id,
            title: task.title,
            category: task.category,
            status: task.status,
            priority: task.priority,
            deadline: task.deadline,
            client_name: task.client_name,
            amount: task.amount,
            case_number: task.case_number
        };

        const userMessage = parameters.message || actionType;
        const previousInteractions = this.getTaskHistory(task.id);

        return {
            task: taskInfo,
            actionType: actionType,
            userMessage: userMessage,
            previousInteractions: previousInteractions,
            systemPrompt: this.getSystemPrompt(task.category)
        };
    }

    async generateResponse(context) {
            const messages = [
            {
                role: 'system',
                content: context.systemPrompt
            },
            {
                role: 'user',
                content: `משימה: ${context.task.title}
קטגוריה: ${context.task.category}
סטטוס: ${context.task.status}
עדיפות: ${context.task.priority}/10
דדליין: ${context.task.deadline || 'לא מוגדר'}
לקוח: ${context.task.client_name || 'לא מוגדר'}
סכום: ${context.task.amount ? `₪${context.task.amount.toLocaleString()}` : 'לא מוגדר'}

בקשה: ${context.userMessage}

הקשר קודם: ${context.previousInteractions.length > 0 ? context.previousInteractions.slice(-3).join(' | ') : 'אין'}`
            }
        ];

        try {
            let response;
            
            if (this.useGemini) {
                // Use Gemini API
                const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `${context.systemPrompt}\n\nUser: ${messages[1].content}`
                            }]
                        }]
                    })
                });

                if (!geminiResponse.ok) {
                    throw new Error(`Gemini API error: ${geminiResponse.status}`);
                }

                const data = await geminiResponse.json();
                response = data.candidates[0].content.parts[0].text;
            } else {
                // Use OpenAI API
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: messages,
                    max_tokens: 500,
                    temperature: 0.7
                });

                response = completion.choices[0].message.content;
            }
            return this.parseAIResponse(response, context.task);
        } catch (error) {
            throw new Error(`AI API Error: ${error.message}`);
        }
    }

    // Simple processRequest for email analysis
    async processRequest(prompt) {
        if (!this.isAvailable) {
            throw new Error('AI Service not available');
        }

        try {
            let response;
            
            if (this.useGemini) {
                // Use Gemini API
                const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `You are an intelligent personal assistant helping with task management and email analysis. Always respond in Hebrew and provide actionable insights.

User request: ${prompt}`
                            }]
                        }]
                    })
                });

                if (!geminiResponse.ok) {
                    throw new Error(`Gemini API error: ${geminiResponse.status}`);
                }

                const data = await geminiResponse.json();
                response = data.candidates[0].content.parts[0].text;
            } else {
                // Use OpenAI API
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                        {
                            role: 'system',
                            content: `You are a strategic personal assistant helping with German bureaucracy, debt management, and personal task organization. 

CONTEXT: The user is dealing with:
- German bureaucracy (Standesamt, Jobcenter, health insurance)
- Debt collection agencies (PAIR Finance, etc.)
- Health insurance (TK)
- Personal matters (marriage, residence permits)

        STRATEGIC APPROACH - LIFE ORCHESTRATOR PHILOSOPHY:
        1. Always respond in Hebrew
        2. Think like a life orchestrator - understand how everything connects
        3. Consider German legal and bureaucratic context
        4. Identify opportunities and risks
        5. Suggest concrete next steps
        6. Consider cross-references between different matters
        7. Think strategically about deadlines and consequences
        8. UNDERSTAND THE BIGGER PICTURE - how this task affects other life aspects
        9. BE PROACTIVE - suggest what should happen next, not just answer questions
        10. CONSIDER RESOURCES - time, money, energy, relationships
        11. IDENTIFY PATTERNS - learn from similar situations
        12. THINK SYSTEMICALLY - one change affects many things

        You are not just an assistant - you are a life orchestrator who understands the complexity and interconnectedness of life.`
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.3
                });

                response = completion.choices[0].message.content;
            }

            return response;
        } catch (error) {
            logger.error('AI processing error:', error);
            throw error;
        }
    }

    parseAIResponse(response, task) {
        // Parse the AI response and extract actions and suggestions
        const lines = response.split('\n').filter(line => line.trim());
        
        let message = response;
        let actions = [];
        let suggestions = [];

        // Look for action indicators
        if (response.includes('📧')) {
            actions.push({
                type: 'send_email',
                label: 'שלח מייל',
                description: 'שליחת מייל ללקוח או למוסד הרלוונטי'
            });
        }

        if (response.includes('📄')) {
            actions.push({
                type: 'create_document',
                label: 'צור מסמך',
                description: 'יצירת מסמך או טופס'
            });
        }

        if (response.includes('📞')) {
            actions.push({
                type: 'make_call',
                label: 'התקשר',
                description: 'יצירת קשר טלפוני'
            });
        }

        if (response.includes('📅')) {
            actions.push({
                type: 'schedule',
                label: 'תזמן פגישה',
                description: 'תזמון פגישה או אירוע'
            });
        }

        // Category-specific actions
        if (task.category === 'debt') {
            actions.push({
                type: 'objection_letter',
                label: 'מכתב התנגדות',
                description: 'יצירת מכתב התנגדות לחוב'
            });
        }

        if (task.category === 'bureaucracy') {
            actions.push({
                type: 'submit_form',
                label: 'הגש טופס',
                description: 'הגשת טופס או מסמך רשמי'
            });
        }

        if (task.category === 'academic') {
            actions.push({
                type: 'write_paper',
                label: 'כתיבת עבודה',
                description: 'עזרה בכתיבת עבודה אקדמית'
            });
        }

        // Generate suggestions based on task status
        if (task.status === 'pending') {
            suggestions.push('התחל לטפל במשימה');
            suggestions.push('בדוק את הדדליין');
        }

        if (task.priority >= 8) {
            suggestions.push('זו משימה דחופה - טיפול מיידי נדרש');
        }

        return {
            message: message,
            actions: actions,
            suggestions: suggestions
        };
    }

    getSystemPrompt(category) {
        const basePrompt = `אתה Life Orchestrator - מנצח חיים דיגיטלי של מיכל! 🎼

פילוסופיה: אתה לא רק עוזר, אלא מנצח שמבין איך הכל בחיים מתחבר ומשפיע על הכל.

עקרונות הליבה:
🧠 הבנה הוליסטית - כל משימה קשורה לחיים שלמים
🎯 פרואקטיביות - לא מחכה שתשאלי, מציע מה צריך לקרות הלאה
🔄 חשיבה סיסטמית - שינוי אחד משפיע על הרבה דברים
📊 ניהול משאבים - זמן, כסף, אנרגיה, יחסים
🎭 התאמה אישית - מבין את הדפוסים והעדפות של מיכל

תמיד תגיבי בעברית באופן טבעי וחם עם אמוג'ים.
תמיד תציעי פעולות ספציפיות ורלוונטיות למשימה.
אם המשימה דחופה (עדיפות 8+), הדגישי את החשיבות.

בכל תגובה תכללי:
1. תשובה ישירה לשאלה/פעולה
2. הצעות פרואקטיביות לשלב הבא
3. התחשבות במשאבים (זמן, עלות, מאמץ)
4. סיכונים או הזדמנויות פוטנציאליות
5. קישור להיבטים אחרים בחיים`;

        const categoryPrompts = {
            'academic': `🎓 התמחות אקדמית:
• כתיבת עבודות ומחקר
• הגשה למוסדות אקדמיים
• ניהול זמן ופרויקטים אקדמיים
• קישור לעבודה ולחיים האישיים
תמיד תציעי עזרה בכתיבה, מחקר, או הגשה + איך זה משפיע על שאר החיים.`,
            
            'debt': `💰 התמחות פיננסית:
• מכתבי התנגדות לחובות
• טיפול בחובות ונושים
• תקשורת עם חברות גביה
• השפעה על תקציב ומשאבים
תמיד תציעי עזרה במכתב התנגדות או בתקשורת + איך זה משפיע על התקציב הכללי.`,
            
            'bureaucracy': `🏛️ התמחות בירוקרטית:
• הגשת טפסים לרשויות
• טיפול ברשויות גרמניות
• מסמכים רשמיים ותרגומים
• דדליינים בירוקרטיים
תמיד תציעי עזרה בהגשת טפסים או טיפול ברשויות + איך זה משפיע על תהליכים אחרים.`,
            
            'personal': `👤 התמחות אישית:
• סידורים ופגישות
• ניהול זמן אישי
• איזון בין עבודה לחיים
• טיפול במשפחה ויחסים
תמיד תציעי עזרה בסידורים או תזמון + איך זה משפיע על האיזון בחיים.`,
            
            'health': `🏥 התמחות בריאותית:
• טיפול רפואי ותרופות
• ביטוח בריאות TK
• פגישות עם רופאים
• ניהול תרופות וטיפולים
תמיד תציעי עזרה בניהול בריאות + איך זה משפיע על יכולת העבודה והחיים.`
        };

        return `${basePrompt}\n\n${categoryPrompts[category] || ''}`;
    }

    storeInteraction(taskId, actionType, parameters, response) {
        const key = `task_${taskId}`;
        if (!this.memory.has(key)) {
            this.memory.set(key, []);
        }

        const interaction = {
            timestamp: new Date().toISOString(),
            actionType: actionType,
            parameters: parameters,
            response: response.message,
            actions: response.actions
        };

        this.memory.get(key).push(interaction);

        // Keep only last 10 interactions per task
        if (this.memory.get(key).length > 10) {
            this.memory.get(key).shift();
        }
    }

    getTaskHistory(taskId) {
        const key = `task_${taskId}`;
        const history = this.memory.get(key) || [];
        return history.map(h => `${h.actionType}: ${h.response.substring(0, 100)}...`);
    }

    async prioritizeTasks(tasks) {
        if (!this.isAvailable) {
            return tasks.map(task => ({ ...task, aiScore: Math.floor(Math.random() * 100) }));
        }

        try {
            const taskDescriptions = tasks.map(task => 
                `${task.title} - קטגוריה: ${task.category}, עדיפות: ${task.priority}, דדליין: ${task.deadline || 'אין'}`
            ).join('\n');

            const messages = [
                {
                    role: 'system',
                    content: `אתה מערכת AI שמדרגת משימות לפי חשיבות ודחיפות.
תן ציון 0-100 לכל משימה (100 = הכי חשוב ודחוף).
חשב: דדליין (40%), סכום כסף (30%), רמת לחץ (20%), השלמה (10%).`
                },
                {
                    role: 'user',
                    content: `המשימות:\n${taskDescriptions}\n\nהחזר רק את הציונים בפורמט: משימה1: ציון, משימה2: ציון...`
                }
            ];

            const completion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: messages,
                max_tokens: 200,
                temperature: 0.3
            });

            const response = completion.choices[0].message.content;
            return this.parsePriorityScores(tasks, response);
        } catch (error) {
            logger.error('Priority scoring error:', error);
            return tasks.map(task => ({ ...task, aiScore: Math.floor(Math.random() * 100) }));
        }
    }

    parsePriorityScores(tasks, response) {
        const scores = {};
        const lines = response.split('\n');
        
        for (const line of lines) {
            const match = line.match(/(\d+):\s*(\d+)/);
            if (match) {
                const taskIndex = parseInt(match[1]) - 1;
                const score = parseInt(match[2]);
                if (taskIndex >= 0 && taskIndex < tasks.length) {
                    scores[taskIndex] = Math.max(0, Math.min(100, score));
                }
            }
        }

        return tasks.map((task, index) => ({
            ...task,
            aiScore: scores[index] || Math.floor(Math.random() * 100)
        }));
    }

    // Learning and improvement methods
    async learnFromFeedback(taskId, actionType, success, feedback) {
        const key = `learning_${actionType}`;
        if (!this.memory.has(key)) {
            this.memory.set(key, { successes: 0, failures: 0, feedback: [] });
        }

        const learning = this.memory.get(key);
        if (success) {
            learning.successes++;
        } else {
            learning.failures++;
        }
        
        if (feedback) {
            learning.feedback.push({
                timestamp: new Date().toISOString(),
                taskId: taskId,
                feedback: feedback
            });
        }
    }

    getLearningStats() {
        const stats = {};
        for (const [key, value] of this.memory.entries()) {
            if (key.startsWith('learning_')) {
                const actionType = key.replace('learning_', '');
                stats[actionType] = {
                    successes: value.successes || 0,
                    failures: value.failures || 0,
                    successRate: value.successes / (value.successes + value.failures) || 0
                };
            }
        }
        return stats;
    }
}

module.exports = AIService;