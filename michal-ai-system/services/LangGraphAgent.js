/**
 * 🧠 מיכל AI - מערכת LangGraph מתקדמת
 * מערכת חכמה עם זיכרון, למידה, ועיבוד מסמכים ומיילים
 */

const { ChatOpenAI } = require('@langchain/openai');
const { StateGraph, MemorySaver } = require('@langchain/langgraph');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');

// Define state annotation manually since Annotation might not be available
const StateAnnotation = {
    userProfile: 'object',
    currentContext: 'object', 
    memory: 'object',
    pendingActions: 'array',
    chatHistory: 'array'
};

class LangGraphAgent {
    constructor(config = {}) {
        this.config = {
            openaiApiKey: config.openaiApiKey || process.env.OPENAI_API_KEY,
            supabase: config.supabase,
            ...config
        };

        // Initialize OpenAI
        this.openai = new ChatOpenAI({
            apiKey: this.config.openaiApiKey,
            model: 'gpt-4o-mini',
            temperature: 0.3
        });

        // Memory saver for persistence
        this.memorySaver = new MemorySaver();
        
        // Current state
        this.currentState = {
            userProfile: {
                name: 'מיכל',
                hasADHD: true,
                location: 'Berlin',
                languages: ['Hebrew', 'German', 'English'],
                workType: 'Seminar Writing',
                financialGoal: 12000
            },
            currentContext: {
                tasks: [],
                projects: [],
                debts: [],
                emails: [],
                documents: [],
                financialStatus: {},
                lastSync: null
            },
            memory: {
                clientPreferences: {},
                workPatterns: {},
                commonMistakes: [],
                successfulActions: [],
                feedback: []
            },
            pendingActions: [],
            chatHistory: []
        };

        this.initializeWorkflow();
    }

    initializeWorkflow() {
        try {
            // Build the LangGraph workflow with simplified state
            this.workflow = new StateGraph({
                channels: StateAnnotation
            })
                // Start Node
                .addNode("start", async (state) => {
                    console.log('🚀 מתחיל עיבוד...');
                    return state;
                })
                
                // Email Processing Node
                .addNode("processEmail", async (state) => {
                    console.log('🔍 מעבד מיילים...');
                    return await this.processEmails(state);
                })
                
                // Document Processing Node
                .addNode("processDocument", async (state) => {
                    console.log('📄 מעבד מסמכים...');
                    return await this.processDocuments(state);
                })
                
                // Task Prioritization Node
                .addNode("prioritizeTasks", async (state) => {
                    console.log('⚡ מתעדף משימות...');
                    return await this.prioritizeTasks(state);
                })
                
                // Learning Node
                .addNode("learn", async (state) => {
                    console.log('🧠 לומד מפידבק...');
                    return state; // החזרת המצב כפי שהוא
                })
                
                // End Node
                .addNode("end", async (state) => {
                    console.log('✅ סיום עיבוד');
                    return state;
                });

            // Define the workflow flow
            this.workflow
                .addEdge("start", "processEmail")
                .addEdge("processEmail", "processDocument")
                .addEdge("processDocument", "prioritizeTasks")
                .addEdge("prioritizeTasks", "learn")
                .addEdge("learn", "end");

            // Set entry and finish points
            this.workflow.setEntryPoint("start");
            this.workflow.setFinishPoint("end");

            // Compile the graph
            this.agent = this.workflow.compile({
                checkpointer: this.memorySaver
            });

            console.log('🎯 LangGraph Agent initialized successfully!');
            return true;
        } catch (error) {
            console.error('❌ Error initializing LangGraph workflow:', error);
            // Fallback - work without LangGraph
            this.agent = null;
            console.log('⚠️ Working in simplified mode without LangGraph');
            return false;
        }
    }

    /**
     * 📧 עיבוד מיילים חכם עם קלסיפיקציה
     */
    async processEmails(state) {
        const { emails } = state.currentContext;
        const processedEmails = [];

        for (const email of emails) {
            try {
                console.log(`📨 מעבד מייל מ-${email.from}: ${email.subject}`);

                const classification = await this.openai.invoke(`
אתה העוזר האישי של מיכל. היא סטודנטית עם ADHD שכותבת סמינרים לסטודנטים אחרים.

הקשר על מיכל:
- לקוחות מוכרים: ${Object.keys(state.memory.clientPreferences || {}).join(', ') || 'אין עדיין'}
- גובי חובות נפוצים: PAIR Finance, coeo Inkasso, Riverty
- גרה בברלין, מטפלת בביורוקרטיה ישראלית וגרמנית
- יעד כלכלי חודשי: 12,000 שקלים

נתח את המייל הזה:
מאת: ${email.from}
נושא: ${email.subject}
תוכן: ${email.body || email.snippet || 'לא זמין'}

אינטראקציות קודמות עם השולח: ${JSON.stringify(state.memory.clientPreferences?.[email.from] || 'אין')}

החזר JSON עם:
{
  "category": "client_work|debt|bureaucracy|personal|spam",
  "urgency": 1-10,
  "required_actions": ["פעולה ראשונה", "פעולה שנייה"],
  "key_dates": ["2025-01-01"],
  "money_amounts": [{"amount": 100, "currency": "EUR"}],
  "related_project": "שם פרויקט אם רלוונטי",
  "summary_hebrew": "סיכום קצר בעברית",
  "confidence": 85,
  "suggested_task": {
    "title": "כותרת המשימה",
    "description": "תיאור המשימה",
    "deadline": "2025-01-01",
    "priority": "high|medium|low"
  }
}
                `);

                const parsed = JSON.parse(classification.content);
                
                // יצירת משימה אם דחוף או דורש פעולה
                if (parsed.urgency >= 7 || parsed.required_actions.length > 0) {
                    processedEmails.push({
                        email,
                        classification: parsed,
                        suggestedAction: parsed.required_actions[0] || 'בדוק את המייל',
                        requiresApproval: true
                    });
                }

            } catch (error) {
                console.error('שגיאה בעיבוד מייל:', error);
                // המשך עם המייל הבא
            }
        }

        return {
            ...state,
            pendingActions: [...(state.pendingActions || []), ...processedEmails.map(e => ({
                type: 'email_task',
                id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                data: e,
                requiresApproval: true,
                timestamp: new Date().toISOString(),
                source: 'email_processing'
            }))]
        };
    }

    /**
     * 📄 עיבוד מסמכים עם OCR
     */
    async processDocuments(state) {
        const { documents } = state.currentContext;
        const processedDocs = [];

        for (const doc of documents) {
            try {
                console.log(`📑 מעבד מסמך: ${doc.filename}`);

                // OCR למסמכים סרוקים
                let documentText = doc.text;
                if (!documentText && doc.buffer && doc.mimetype.startsWith('image/')) {
                    console.log('🔍 מריץ OCR על תמונה...');
                    const ocrResult = await Tesseract.recognize(
                        doc.buffer,
                        ['heb', 'deu', 'eng'],
                        {
                            logger: m => console.log('OCR:', m.status)
                        }
                    );
                    documentText = ocrResult.data.text;
                } else if (!documentText && doc.buffer && doc.mimetype === 'application/pdf') {
                    console.log('📋 מחלץ טקסט מ-PDF...');
                    const pdfData = await pdfParse(doc.buffer);
                    documentText = pdfData.text;
                }

                // ניתוח חכם של המסמך
                const analysis = await this.openai.invoke(`
נתח את המסמך הזה עבור מערכת הניהול של מיכל.

טקסט המסמך (3000 תווים ראשונים): ${documentText.substring(0, 3000)}

זהה:
1. סוג מסמך (seminar, debt_notice, bureaucracy, contract, other)
2. אם זה סמינר:
   - נושא
   - שם הלקוח
   - שם הפרופסור
   - אוניברסיטה
   - חלק/פרק נוכחי
   - חלקים חסרים
   - הערכת איכות
3. אם זה הודעת חוב:
   - מספר תיק
   - הנושה המקורי
   - חברת הגבייה
   - סכום ומטבע
   - תאריך פירעון
   - סטטוס משפטי
4. אם זה ביורוקרטיה:
   - רשות (Jobcenter, TK, Standesamt, וכו')
   - פעולה נדרשת
   - דדליין
   - מסמכים חסרים
5. חלץ את כל התאריכים, הסכומים, השמות, ופריטי הפעולה
6. הצע צעדים הבאים בעברית

קח בחשבון את ההקשר של מיכל:
- יש לה ADHD - צריכה פריטי פעולה ברורים ופשוטים
- לחץ כלכלי - תעדוף משימות המניבות הכנסה
- גרה בברלין - ביורוקרטיה גרמנית חשובה

החזר ניתוח JSON מקיף.
                `);

                const parsed = JSON.parse(analysis.content);
                processedDocs.push({
                    document: doc,
                    analysis: parsed,
                    text: documentText
                });

            } catch (error) {
                console.error('שגיאה בעיבוד מסמך:', error);
            }
        }

        return {
            ...state,
            pendingActions: [...(state.pendingActions || []), ...processedDocs.map(d => ({
                type: 'document_task',
                id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                data: d,
                requiresApproval: true,
                timestamp: new Date().toISOString(),
                source: 'document_processing'
            }))]
        };
    }

    /**
     * ⚡ תעדוף משימות חכם
     */
    async prioritizeTasks(state) {
        const { tasks, projects, debts, financialStatus } = state.currentContext;
        const { workPatterns } = state.memory;

        try {
            const prioritization = await this.openai.invoke(`
אתה עוזר למיכל לאופטימיזציה של היום שלה. יש לה ADHD וצריכה סדרי עדיפויות ברורים.

מצב נוכחי:
- משימות: ${JSON.stringify(tasks)}
- פרויקטים פעילים: ${JSON.stringify(projects.map(p => ({
    client: p.client_name,
    deadline: p.deadline,
    payment: p.payment_amount,
    progress: p.progress_percentage
})))}
- חובות דחופים: ${JSON.stringify(debts.filter(d => d.urgency_level >= 7))}
- כלכלי: הכנסה חודשית ${financialStatus.monthlyIncome || 0}/12000 שקלים
- דפוסי עבודה: ${JSON.stringify(workPatterns)}

צור לוח זמנים אופטימלי בהתחשב ב:
1. ADHD - מקסימום 3 משימות מרכזיות ביום
2. דחיפות כלכלית - תעדוף הכנסה
3. דדליינים משפטיים - הימנעות מקנסות
4. דפוסי אנרגיה - משימות קשות כשרעננה
5. יחסי לקוחות - שמירת אמון

החזר JSON עם:
{
  "top_3_today": [
    {
      "task": "משימה",
      "reason": "סיבה",
      "time_estimate": "זמן מוערך",
      "energy_level": "high|medium|low"
    }
  ],
  "time_blocks": [
    {
      "time": "09:00-11:00",
      "task": "משימה",
      "type": "deep_work|admin|break"
    }
  ],
  "quick_wins": ["משימה קלה", "עוד משימה קלה"],
  "danger_zone": "מה קורה אם לא עושים",
  "motivation": "הודעת עידוד בעברית",
  "financial_impact": "השפעה כלכלית"
}
            `);

            const parsed = JSON.parse(prioritization.content);

            return {
                ...state,
                currentContext: {
                    ...state.currentContext,
                    prioritizedTasks: parsed,
                    lastPrioritization: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('שגיאה בתעדוף:', error);
            return state;
        }
    }

    /**
     * 🧠 למידה מפידבק המשתמש
     */
    async learn(state, event = null) {
        console.log('🎓 לומד מפידבק...');
        
        const { feedback } = event || {};
        if (!feedback) {
            // אם אין פידבק ספציפי, פשוט החזר את המצב
            return state;
        }

        const newMemory = { ...state.memory };

        // עדכון זיכרון בהתבסס על סוג הפידבק
        switch (feedback.type) {
            case 'client_preference':
                if (!newMemory.clientPreferences) newMemory.clientPreferences = {};
                newMemory.clientPreferences[feedback.client] = {
                    ...newMemory.clientPreferences[feedback.client],
                    ...feedback.preferences
                };
                break;

            case 'action_result':
                if (feedback.successful) {
                    if (!newMemory.successfulActions) newMemory.successfulActions = [];
                    newMemory.successfulActions.push({
                        action: feedback.action,
                        context: feedback.context,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    if (!newMemory.commonMistakes) newMemory.commonMistakes = [];
                    newMemory.commonMistakes.push({
                        mistake: feedback.action,
                        reason: feedback.reason,
                        timestamp: new Date().toISOString()
                    });
                }
                break;

            case 'work_pattern':
                if (!newMemory.workPatterns) newMemory.workPatterns = {};
                newMemory.workPatterns = {
                    ...newMemory.workPatterns,
                    [feedback.pattern]: feedback.value
                };
                break;

            case 'email_classification':
                // למידה מסיווג מיילים
                if (!newMemory.emailPatterns) newMemory.emailPatterns = {};
                newMemory.emailPatterns = {
                    ...newMemory.emailPatterns,
                    [feedback.sender]: feedback.classification
                };
                break;

            case 'user_pattern':
                if (!newMemory.userPatterns) newMemory.userPatterns = {};
                newMemory.userPatterns[feedback.pattern] = feedback.preference;
                break;
        }

        // שמירת הפידבק
        if (!newMemory.feedback) newMemory.feedback = [];
        newMemory.feedback.push({
            ...feedback,
            timestamp: new Date().toISOString()
        });

        return {
            ...state,
            memory: newMemory
        };
    }

    /**
     * ✅ ביצוע פעולות מאושרות
     */
    async executeAction(state, event) {
        const { action, approved, modifications } = event;

        if (!approved) {
            console.log('❌ פעולה נדחתה על ידי המשתמש');
            // למידה מדחייה
            return await this.learn(state, {
                feedback: {
                    type: 'action_result',
                    action: action,
                    successful: false,
                    reason: 'User rejected'
                }
            });
        }

        console.log('✅ מבצע פעולה מאושרת:', action.type);

        // החלת שינויים אם יש
        if (modifications) {
            Object.assign(action.data, modifications);
        }

        // ביצוע הפעולה בהתאם לסוג
        try {
            switch (action.type) {
                case 'create_task':
                    if (this.config.supabase) {
                        const { error } = await this.config.supabase
                            .from('tasks')
                            .insert(action.data);
                        if (error) throw error;
                    }
                    break;

                case 'update_project':
                    if (this.config.supabase) {
                        const { error } = await this.config.supabase
                            .from('projects')
                            .update(action.data)
                            .eq('id', action.id);
                        if (error) throw error;
                    }
                    break;

                case 'send_message':
                    // הכנת הודעה לשליחה
                    if (this.config.supabase) {
                        const { error } = await this.config.supabase
                            .from('queued_messages')
                            .insert(action.data);
                        if (error) throw error;
                    }
                    break;

                default:
                    console.log('סוג פעולה לא מוכר:', action.type);
            }

            // למידה מהצלחה
            return await this.learn(state, {
                feedback: {
                    type: 'action_result',
                    action: action,
                    successful: true,
                    modifications: modifications
                }
            });

        } catch (error) {
            console.error('שגיאה בביצוע פעולה:', error);
            return await this.learn(state, {
                feedback: {
                    type: 'action_result',
                    action: action,
                    successful: false,
                    reason: error.message
                }
            });
        }
    }

    /**
     * 🔄 הפעלת פעולה ספציפית
     */
    async runAction(actionId, approved = true, modifications = {}) {
        const action = this.currentState.pendingActions?.find(a => a.id === actionId);
        if (!action) {
            throw new Error('פעולה לא נמצאה');
        }

        const result = await this.executeAction(this.currentState, {
            action,
            approved,
            modifications
        });

        // הסרת הפעולה מהרשימה
        this.currentState.pendingActions = this.currentState.pendingActions?.filter(
            a => a.id !== actionId
        ) || [];

        this.currentState = result;
        return result;
    }

    /**
     * 🎯 הפעלת הסוכן החכם
     */
    async invoke(input) {
        try {
            // מיזוג הקלט עם המצב הנוכחי
            const mergedState = {
                ...this.currentState,
                ...input
            };

            // אם יש LangGraph agent
            if (this.agent) {
                const result = await this.agent.invoke(mergedState, {
                    configurable: { thread_id: "michal_main_thread" }
                });

                // עדכון המצב הנוכחי
                this.currentState = { ...result };
                return result;
            } else {
                // Fallback - עיבוד פשוט
                console.log('🔄 Processing without LangGraph...');
                
                // עיבוד ישיר של מיילים אם יש
                if (input.currentContext?.emails?.length > 0) {
                    const processedState = await this.processEmails(mergedState);
                    this.currentState = { ...processedState };
                    return processedState;
                }
                
                // עיבוד ישיר של מסמכים אם יש
                if (input.currentContext?.documents?.length > 0) {
                    const processedState = await this.processDocuments(mergedState);
                    this.currentState = { ...processedState };
                    return processedState;
                }

                // החזרת המצב המעודכן
                this.currentState = mergedState;
                return mergedState;
            }
        } catch (error) {
            console.error('שגיאה בהפעלת הסוכן:', error);
            // החזרת המצב הנוכחי כ-fallback
            return this.currentState;
        }
    }

    /**
     * 💾 שמירת מצב המערכת
     */
    async saveState() {
        if (this.config.supabase) {
            try {
                await this.config.supabase.from('ai_context').upsert({
                    context_type: 'langgraph_state',
                    context_data: this.currentState,
                    updated_at: new Date().toISOString()
                });
                console.log('💾 מצב המערכת נשמר');
            } catch (error) {
                console.error('שגיאה בשמירת מצב:', error);
            }
        }
    }

    /**
     * 📥 טעינת מצב המערכת
     */
    async loadState() {
        if (this.config.supabase) {
            try {
                const { data, error } = await this.config.supabase
                    .from('ai_context')
                    .select('context_data')
                    .eq('context_type', 'langgraph_state')
                    .single();

                if (!error && data) {
                    this.currentState = { ...this.currentState, ...data.context_data };
                    console.log('📥 מצב המערכת נטען');
                }
            } catch (error) {
                console.error('שגיאה בטעינת מצב:', error);
            }
        }
    }

    /**
     * 📊 קבלת סטטוס המערכת
     */
    getSystemStatus() {
        return {
            ready: true,
            tasksInMemory: this.currentState.currentContext.tasks.length,
            emailsInMemory: this.currentState.currentContext.emails.length,
            documentsInMemory: this.currentState.currentContext.documents.length,
            pendingActions: this.currentState.pendingActions.length,
            memorySize: Object.keys(this.currentState.memory.clientPreferences || {}).length,
            lastSync: this.currentState.currentContext.lastSync
        };
    }
}

module.exports = LangGraphAgent;