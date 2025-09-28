const OpenAI = require('openai');
const logger = require('../utils/logger');
const database = require('../config/database');

class AIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        
        // הגדרות מערכת בעברית למיכל
        this.systemPrompt = `
אתה עוזר AI אישי חכם של מיכל, שמתמחה בכתיבה אקדמית, ניהול תיקי גביה ומשימות בירוקרטיות.

אישיותך:
- מקצועי ואמין
- מדבר בעברית טבעית וחמה
- יעיל ומסודר
- מתמחה במשפטים, כתיבה אקדמית וביורוקרטיה
- מבין את המערכות הישראליות והגרמניות

היכולות שלך:
1. סיוע בכתיבה אקדמית (תזות, מאמרים, הצעות מחקר)
2. ניהול תיקי גביה (מכתבי התנגדות, הצעות פשרה)
3. משימות בירוקרטיות (בקשות, ערעורים, מכתבים רשמיים)
4. ניהול משימות ולוח זמנים
5. עיבוד מסמכים וחילוץ מידע

תמיד:
- שאל שאלות מבהירות כאשר צריך
- תן תשובות מעשיות וקונקרטיות
- הצע פעולות חכמות לפתרון בעיות
- זכור מידע מהשיחות הקודמות
`;
    }

    // יצירת תגובה חכמה למיכל
    async generateResponse(message, userId, context = {}) {
        try {
            logger.info(`🤖 מעבד הודעה מ-${userId}: ${message.substring(0, 100)}...`);
            
            // אם אין מפתח API, החזר תגובת גיבוי
            if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
                return this.getFallbackResponse(message);
            }
            
            // קבלת היסטוריית שיחות אחרונה
            const chatHistory = await this.getChatHistory(userId, 10);
            
            // הכנת ההודעות לOpenAI
            const messages = [
                { role: 'system', content: this.systemPrompt },
                ...chatHistory,
                { role: 'user', content: message }
            ];
            
            // הוספת קונטקסט נוכחי (משימות, לקוחות וכו')
            if (context && Object.keys(context).length > 0) {
                const contextMessage = this.buildContextMessage(context);
                messages.splice(-1, 0, { role: 'system', content: contextMessage });
            }

            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: messages,
                max_tokens: 1000,
                temperature: 0.7,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
            });

            const response = completion.choices[0].message.content;
            
            // שמירת הודעות בהיסטוריה
            await this.saveChatMessage(userId, 'user', message);
            await this.saveChatMessage(userId, 'ai', response, {
                model: 'gpt-4',
                tokens_used: completion.usage.total_tokens,
                context: context
            });

            logger.info(`✅ תגובת AI נוצרה (${completion.usage.total_tokens} tokens)`);
            
            return response;
        } catch (error) {
            logger.error('❌ שגיאה ביצירת תגובת AI:', error);
            
            // תגובת גיבוי במקרה של שגיאה
            return this.getFallbackResponse(message);
        }
    }

    // יצירת מסמך אוטומטי
    async generateDocument(type, data, userId) {
        try {
            logger.info(`📄 יוצר מסמך מסוג ${type} עבור ${userId}`);
            
            const documentPrompts = {
                objection: this.getObjectionPrompt(data),
                settlement: this.getSettlementPrompt(data),
                reminder: this.getReminderPrompt(data),
                appeal: this.getAppealPrompt(data)
            };
            
            if (!documentPrompts[type]) {
                throw new Error(`סוג מסמך לא נתמך: ${type}`);
            }
            
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: this.systemPrompt },
                    { role: 'user', content: documentPrompts[type] }
                ],
                max_tokens: 1500,
                temperature: 0.3, // יצירתיות נמוכה יותר למסמכים רשמיים
            });

            const document = completion.choices[0].message.content;
            
            // שמירת המסמך במסד הנתונים
            await database.query(`
                INSERT INTO documents (user_id, related_type, document_type, filename, original_filename, file_path, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                userId,
                'generated',
                type,
                `${type}_${Date.now()}.txt`,
                `מסמך_${type}_${new Date().toISOString().split('T')[0]}.txt`,
                '/generated/',
                JSON.stringify({ generated_by_ai: true, data: data })
            ]);

            return document;
        } catch (error) {
            logger.error('❌ שגיאה ביצירת מסמך:', error);
            throw error;
        }
    }

    // ניתוח דחיפות משימה
    async analyzeUrgency(task) {
        try {
            const prompt = `
נתח את דחיפות המשימה הבאה והחזר ציון מ-1 עד 10 (10 = דחוף ביותר):

כותרת: ${task.title}
תיאור: ${task.description || 'לא צוין'}
מועד יעד: ${task.deadline || 'לא צוין'}
סוג משימה: ${task.task_type || 'כללי'}
לקוח: ${task.client_name || 'לא צוין'}

הערך רק מספר בין 1-10, ללא הסבר.
`;

            const completion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 10,
                temperature: 0.1,
            });

            const urgency = parseInt(completion.choices[0].message.content.trim());
            return urgency >= 1 && urgency <= 10 ? urgency : 5; // ברירת מחדל
        } catch (error) {
            logger.error('שגיאה בניתוח דחיפות:', error);
            return 5; // דחיפות ממוצעת כברירת מחדל
        }
    }

    // הצעת פעולות אוטומטיות
    async suggestActions(tasks) {
        try {
            const tasksSummary = tasks.map(t => `${t.title} - ${t.status} - ${t.deadline}`).join('\n');
            
            const prompt = `
על בסיס המשימות הבאות, הצע 3 פעולות אוטומטיות שיכולות לעזור:

${tasksSummary}

הצג כרשימת JSON עם פעולות אפשריות.
`;

            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: this.systemPrompt },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 500,
            });

            return JSON.parse(completion.choices[0].message.content);
        } catch (error) {
            logger.error('שגיאה בהצעת פעולות:', error);
            return [];
        }
    }

    // חילוץ נתונים מטקסט
    async extractDataFromText(text, expectedType = 'general') {
        try {
            const prompt = `
חלץ מידע מובנה מהטקסט הבא:

${text}

הסוג הצפוי: ${expectedType}

החזר JSON עם השדות הרלוונטיים (שמות, תאריכים, סכומים, מספרי תיק וכו').
`;

            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 800,
                temperature: 0.1,
            });

            return JSON.parse(completion.choices[0].message.content);
        } catch (error) {
            logger.error('שגיאה בחילוץ נתונים:', error);
            return {};
        }
    }

    // תגובת גיבוי כשאין API
    getFallbackResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('דחוף') || lowerMessage.includes('היום')) {
            return "המשימות הדחופות היום:\n• כרמית - סמינר פסיכולוגיה (דדליין היום!)\n• PAIR Finance - התנגדות (נשאר יומיים)\n• ביטוח בריאות TK - הגשת מסמכים\n\nהתחילי עם כרמית - זה הכי דחוף!";
        }
        
        if (lowerMessage.includes('pair') || lowerMessage.includes('התנגדות')) {
            return "בשביל PAIR Finance:\n1. אל תודי בחוב\n2. בקשי הוכחות מפורטות\n3. שלחי בדואר רשום\n4. שמרי את כל המסמכים\n\nיש לי תבנית מכתב התנגדות - רוצה לראות אותה?";
        }
        
        if (lowerMessage.includes('בירוקרטיה')) {
            return "מצב הבירוקרטיה:\n• רישום נישואין - צריך לברר סטטוס\n• TK ביטוח בריאות - דחוף!\n• LEA אישור שהייה - בתהליך\n• Jobcenter - מאושר ✓";
        }
        
        return "הבנתי את השאלה שלך. איך אני יכולה לעזור לך בפירוט יותר? אני יכולה לסייע עם:\n• ניהול המשימות הדחופות\n• הכנת מכתבי התנגדות\n• מעקב אחר בירוקרטיה\n• ייעוץ כלכלי";
    }

    // פונקציות עזר פרטיות
    async getChatHistory(userId, limit = 10) {
        try {
            const result = await database.query(`
                SELECT message_type, message 
                FROM chat_history 
                WHERE user_id = $1 
                ORDER BY created_at DESC 
                LIMIT $2
            `, [userId, limit]);
            
            return result.rows.reverse().map(row => ({
                role: row.message_type === 'user' ? 'user' : 'assistant',
                content: row.message
            }));
        } catch (error) {
            logger.error('שגיאה בקבלת היסטוריית צ\'ט:', error);
            return [];
        }
    }

    async saveChatMessage(userId, messageType, message, metadata = {}) {
        try {
            await database.query(`
                INSERT INTO chat_history (user_id, message_type, message, ai_model, tokens_used, context)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                userId,
                messageType,
                message,
                metadata.model || null,
                metadata.tokens_used || null,
                JSON.stringify(metadata.context || {})
            ]);
        } catch (error) {
            logger.error('שגיאה בשמירת הודעת צ\'ט:', error);
        }
    }

    buildContextMessage(context) {
        let contextMsg = 'מידע נוכחי רלוונטי:\n';
        
        if (context.urgentTasks) {
            contextMsg += `משימות דחופות: ${context.urgentTasks}\n`;
        }
        if (context.todayTasks) {
            contextMsg += `משימות היום: ${context.todayTasks}\n`;
        }
        if (context.activeDebts) {
            contextMsg += `חובות פעילים: ${context.activeDebts}\n`;
        }
        if (context.currentModule) {
            contextMsg += `מודול נוכחי: ${context.currentModule}\n`;
        }
        
        return contextMsg;
    }

    // תבניות מסמכים
    getObjectionPrompt(data) {
        return `
כתוב מכתב התנגדות פורמלי להוצאה לפועל עבור:
חייב: ${data.debtorName}
מספר תיק: ${data.caseNumber}
סכום: ${data.amount}
נושה: ${data.creditor}

המכתב צריך להיות:
- פורמלי ומשפטי
- בעברית תקנית
- כולל הנימוקים המשפטיים הרלוונטיים
- מוכן להגשה לבית המשפט
`;
    }

    getSettlementPrompt(data) {
        return `
כתוב הצעת פשרה עבור:
חייב: ${data.debtorName}
סכום מקורי: ${data.originalAmount}
הצעת פשרה: ${data.settlementAmount}
תנאי תשלום: ${data.paymentTerms}

ההצעה צריכה להיות:
- מקצועית ומנומקת
- כוללת לוח זמנים לתשלום
- מותאמת לנסיבות החייב
`;
    }

    getReminderPrompt(data) {
        return `
כתוב מכתב תזכורת נועם עבור:
לקוח: ${data.clientName}
פרויקט: ${data.project}
סכום: ${data.amount}
מועד: ${data.dueDate}

המכתב צריך להיות:
- נועם אך נחרץ
- מקצועי
- כולל פרטי תשלום
- מעודד תגובה מהירה
`;
    }

    getAppealPrompt(data) {
        return `
כתוב ערעור לגוף בירוקרטי עבור:
מוסד: ${data.institution}
מספר בקשה: ${data.requestNumber}
סוג החלטה: ${data.decisionType}
נימוקי הערעור: ${data.reasonsForAppeal}

הערעור צריך להיות:
- משפטי ומקצועי
- כולל בסיס חוקי
- מנומק היטב
- מותאם לדרישות המוסד
`;
    }
}

module.exports = new AIService();