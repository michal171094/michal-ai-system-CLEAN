#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const database = require('../config/database');
const { logger } = require('../utils/logger');
const bcrypt = require('bcryptjs');

/**
 * סקריפט לאתחול המערכת - מריץ את כל התהליכים הנדרשים להפעלת המערכת לראשונה
 */

async function createDirectories() {
    try {
        logger.info('🗂️  יוצר תיקיות נדרשות...');
        
        const directories = [
            'logs',
            'uploads',
            'uploads/chat',
            'uploads/documents',
            'uploads/temp',
            'generated'
        ];

        for (const dir of directories) {
            const dirPath = path.join(__dirname, '..', dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                logger.info(`✅ תיקיה נוצרה: ${dir}`);
            } else {
                logger.info(`📁 תיקיה קיימת: ${dir}`);
            }
        }

        logger.info('✅ כל התיקיות מוכנות');
    } catch (error) {
        logger.error('❌ שגיאה ביצירת תיקיות:', error);
        throw error;
    }
}

async function checkEnvironmentVariables() {
    try {
        logger.info('🔍 בודק משתני סביבה...');
        
        const requiredVars = [
            'DATABASE_URL',
            'JWT_SECRET',
            'OPENAI_API_KEY'
        ];

        const missingVars = [];
        
        for (const varName of requiredVars) {
            if (!process.env[varName]) {
                missingVars.push(varName);
            }
        }

        if (missingVars.length > 0) {
            logger.error('❌ משתני סביבה חסרים:', missingVars);
            logger.info('💡 אנא העתק את .env.example ל-.env ומלא את הערכים החסרים');
            throw new Error(`משתני סביבה חסרים: ${missingVars.join(', ')}`);
        }

        logger.info('✅ כל משתני הסביבה מוגדרים');
    } catch (error) {
        logger.error('❌ שגיאה בבדיקת משתני סביבה:', error);
        throw error;
    }
}

async function initializeDatabase() {
    try {
        logger.info('🗄️  מתחיל אתחול מסד נתונים...');
        
        // חיבור למסד נתונים
        await database.connect();
        
        // הרצת מיגרציות
        await database.migrate();
        
        // יצירת משתמש ברירת מחדל (מיכל)
        await createDefaultUser();
        
        // מילוי נתוני דמו
        await seedDemoData();
        
        logger.info('✅ מסד הנתונים מוכן לשימוש');
    } catch (error) {
        logger.error('❌ שגיאה באתחול מסד נתונים:', error);
        throw error;
    }
}

async function createDefaultUser() {
    try {
        logger.info('👤 יוצר משתמש ברירת מחדל (מיכל)...');
        
        const existingUser = await database.query(
            'SELECT id FROM users WHERE email = $1',
            ['michal@michal-ai.local']
        );
        
        if (existingUser.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('michal123!@#', 12);
            
            await database.query(`
                INSERT INTO users (email, password_hash, full_name, role, preferences)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                'michal@michal-ai.local',
                hashedPassword,
                'מיכל',
                'admin',
                JSON.stringify({
                    language: 'he',
                    notifications: true,
                    theme: 'light',
                    dateFormat: 'DD/MM/YYYY',
                    timeFormat: '24h'
                })
            ]);
            
            logger.info('✅ משתמש ברירת מחדל נוצר בהצלחה');
            logger.info('📧 מייל: michal@michal-ai.local');
            logger.info('🔑 סיסמה: michal123!@#');
        } else {
            logger.info('👤 משתמש ברירת מחדל כבר קיים');
        }
    } catch (error) {
        logger.error('❌ שגיאה ביצירת משתמש ברירת מחדל:', error);
        throw error;
    }
}

async function seedDemoData() {
    try {
        logger.info('🌱 מוסיף נתוני דמו...');
        
        // קבלת מזהה המשתמש
        const userResult = await database.query('SELECT id FROM users WHERE email = $1', ['michal@michal-ai.local']);
        const userId = userResult.rows[0].id;
        
        // בדיקה אם כבר יש נתונים
        const existingData = await database.query('SELECT COUNT(*) as count FROM clients WHERE user_id = $1', [userId]);
        
        if (parseInt(existingData.rows[0].count) > 0) {
            logger.info('📊 נתוני דמו כבר קיימים');
            return;
        }

        // יצירת לקוחות לדוגמה (מהנתונים האמיתיים של מיכל)
        const clients = [
            {
                name: 'כרמית',
                company: 'אוניברסיטה',
                email: 'karmit@student.ac.il',
                phone: null,
                client_type: 'academic',
                notes: 'סטודנטית לפסיכולוגיה, עובדת על סמינריון'
            },
            {
                name: 'ישראל',
                company: 'אוניברסיטה',
                email: 'israel@student.ac.il', 
                phone: null,
                client_type: 'academic',
                notes: 'סטודנט להיסטוריה, צריך עזרה עם סמינריון'
            },
            {
                name: 'מרג\'ורי',
                company: null,
                email: 'marjorie@gmail.com',
                phone: null,
                client_type: 'academic',
                notes: 'לקוחה לתרגום מסמכים מגרמנית לעברית'
            },
            {
                name: 'PAIR Finance',
                company: 'חברת גביה',
                email: 'info@pairfinance.de',
                phone: null,
                client_type: 'debt',
                notes: 'חברת גביה גרמנית - מטפלת בכמה תיקים'
            },
            {
                name: 'רשות האכיפה',
                company: 'משרד הביטחון',
                email: null,
                phone: '02-5303333',
                client_type: 'debt',
                notes: 'רשות האכיפה במשרד הביטחון - תיק גביה של 7355 ש"ח'
            }
        ];

        const clientIds = [];
        for (const client of clients) {
            const result = await database.query(`
                INSERT INTO clients (user_id, name, company, email, phone, client_type, notes)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `, [userId, client.name, client.company, client.email, client.phone, client.client_type, client.notes]);
            
            clientIds.push(result.rows[0].id);
        }

        // יצירת משימות לדוגמה (מהנתונים האמיתיים של מיכל)
        const tasks = [
            {
                client_id: clientIds[0], // כרמית
                title: 'סמינר פסיכולוגיה',
                description: 'כתיבת סמינריון בנושא פסיכולוגיה חינוכית',
                module: 'academic',
                task_type: 'thesis',
                priority: 'urgent',
                deadline: '2025-09-24',
                price_quoted: 3500,
                status: 'in_progress',
                action_required: 'שליחת טיוטה'
            },
            {
                client_id: clientIds[1], // ישראל
                title: 'סמינר היסטוריה',
                description: 'עבודת גמר בנושא היסטוריה של המזרח התיכון',
                module: 'academic',
                task_type: 'thesis',
                priority: 'high',
                deadline: '2025-09-28',
                price_quoted: 4200,
                status: 'waiting',
                action_required: 'מעקב אחר מענה'
            },
            {
                client_id: clientIds[2], // מרג'ורי
                title: 'תרגום מסמכים',
                description: 'תרגום מסמכים רשמיים מגרמנית לעברית',
                module: 'academic',
                task_type: 'translation',
                priority: 'medium',
                deadline: '2025-10-01',
                price_quoted: 450,
                status: 'pending',
                action_required: 'בירור סטטוס'
            }
        ];

        for (const task of tasks) {
            await database.query(`
                INSERT INTO tasks (
                    user_id, client_id, title, description, module, task_type,
                    priority, deadline, price_quoted, status, action_required
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
                userId, task.client_id, task.title, task.description, task.module,
                task.task_type, task.priority, task.deadline, task.price_quoted,
                task.status, task.action_required
            ]);
        }

        // יצירת תיקי גביה אמיתיים
        const debts = [
            {
                case_number: 'PAIR-2024-001',
                debtor_name: 'מיכל',
                debtor_id: '999999999',
                original_amount: 1248.50,
                current_amount: 1248.50,
                case_status: 'active',
                court: null,
                next_action: 'הכנת מכתב התנגדות בגרמנית',
                next_action_date: '2024-09-30',
                notes: 'חוב צרכני מגרמניה מ-PAIR Finance - דורש התנגדות מיידית. החברה הגרמנית ניסתה לגבות חוב ישן.'
            },
            {
                case_number: 'ENF-2024-001',
                debtor_name: 'מיכל',
                debtor_id: '999999999',
                original_amount: 2300,
                current_amount: 2300,
                case_status: 'in_dispute',
                court: 'בית משפט תעבורה',
                next_action: 'מעקב אחר תגובת רשות האכיפה',
                next_action_date: '2024-10-05',
                notes: 'קנסות תחבורה ישנים מהרשות לאכיפה וגביה. הוגש ערעור על הקנסות בטענה לפקיעת תוקף.'
            }
        ];

        for (let i = 0; i < debts.length; i++) {
            const debt = debts[i];
            const clientId = i < 3 ? clientIds[3] : clientIds[4]; // PAIR Finance או רשות האכיפה
            
            await database.query(`
                INSERT INTO debts (
                    user_id, client_id, case_number, debtor_name, debtor_id,
                    original_amount, current_amount, case_status, court,
                    next_action, next_action_date, notes
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `, [
                userId, clientId, debt.case_number, debt.debtor_name, debt.debtor_id,
                debt.original_amount, debt.current_amount, debt.case_status, debt.court,
                debt.next_action, debt.next_action_date, debt.notes
            ]);
        }

        // יצירת פניות ביורוקרטיות אמיתיות
        const bureaucracyRequests = [
            {
                institution: 'רשות האכיפה והגבייה',
                request_type: 'ערעור על קנס',
                request_number: 'ENF-APPEAL-2024',
                status: 'in_review',
                submission_date: '2024-08-20',
                deadline: '2024-10-05',
                notes: 'ערעור על קנסות תחבורה בסך 2,300 ש"ח. נטען כי הקנסות התיישנו וכי לא התקבלו התראות כנדרש.'
            },
            {
                institution: 'PAIR Finance - גרמניה',
                request_type: 'התנגדות לגביית חוב',
                request_number: 'PAIR-OBJ-2024',
                status: 'draft',
                submission_date: null,
                deadline: '2024-09-30',
                notes: 'הכנת מכתב התנגדות בגרמנית לחברת PAIR Finance בנוגע לחוב של 1,248.50 יורו. יש לבדוק את תקופת ההתיישנות לפי החוק הגרמני.'
            }
        ];

        for (const request of bureaucracyRequests) {
            await database.query(`
                INSERT INTO bureaucracy (
                    user_id, institution, request_type, request_number,
                    status, submission_date, deadline, notes
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                userId, request.institution, request.request_type, request.request_number,
                request.status, request.submission_date, request.deadline, request.notes
            ]);
        }

        logger.info('✅ נתוני דמו נוספו בהצלחה');
    } catch (error) {
        logger.error('❌ שגיאה בהוספת נתוני דמו:', error);
        throw error;
    }
}

async function createEmailTemplates() {
    try {
        logger.info('📧 יוצר תבניות מיילים בסיסיות...');
        
        const userResult = await database.query('SELECT id FROM users WHERE email = $1', ['michal@michal-ai.local']);
        const userId = userResult.rows[0].id;

        const templates = [
            {
                name: 'תזכורת תשלום',
                template_type: 'reminder',
                subject: 'תזכורת - תשלום עבור {{project_name}}',
                body: `שלום {{client_name}},

זוהי תזכורת נועם בנוגע לתשלום עבור {{project_name}}.

פרטי התשלום:
- סכום: {{amount}}
- מועד פרעון: {{due_date}}
- פרטי העברה: {{payment_details}}

אשמח לקבל את התשלום בהקדם האפשרי.

בברכה,
מיכל`,
                variables: JSON.stringify(['client_name', 'project_name', 'amount', 'due_date', 'payment_details'])
            },
            {
                name: 'אישור קבלת עבודה',
                template_type: 'confirmation',
                subject: 'אישור קבלת עבודה - {{project_name}}',
                body: `שלום {{client_name}},

תודה שפנית אליי. אני מאשרת את קבלת העבודה: {{project_name}}

פרטי העבודה:
- היקף: {{scope}}
- לוח זמנים: {{timeline}}
- מחיר: {{price}}

אתחיל לעבוד על הפרויקט בהתאם ללוח הזמנים שסוכם.

בברכה,
מיכל`,
                variables: JSON.stringify(['client_name', 'project_name', 'scope', 'timeline', 'price'])
            }
        ];

        for (const template of templates) {
            await database.query(`
                INSERT INTO email_templates (user_id, name, template_type, subject, body, variables)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT DO NOTHING
            `, [userId, template.name, template.template_type, template.subject, template.body, template.variables]);
        }

        logger.info('✅ תבניות מיילים נוצרו');
    } catch (error) {
        logger.error('❌ שגיאה ביצירת תבניות מיילים:', error);
        throw error;
    }
}

async function runHealthChecks() {
    try {
        logger.info('🏥 מריץ בדיקות תקינות...');
        
        // בדיקת מסד נתונים
        const dbHealth = await database.healthCheck();
        if (dbHealth.status !== 'healthy') {
            throw new Error('מסד נתונים לא תקין');
        }
        
        // בדיקת OpenAI
        try {
            const openai = require('openai');
            const client = new openai({ apiKey: process.env.OPENAI_API_KEY });
            // בדיקה בסיסית - לא משלחים בקשה אמיתית
            logger.info('✅ מפתח OpenAI מוגדר');
        } catch (error) {
            logger.warn('⚠️  שגיאה בהגדרת OpenAI:', error.message);
        }
        
        logger.info('✅ כל בדיקות התקינות עברו בהצלחה');
    } catch (error) {
        logger.error('❌ שגיאה בבדיקות תקינות:', error);
        throw error;
    }
}

async function printStartupInfo() {
    try {
        logger.info('');
        logger.info('🎉 ===== מערכת עוזר AI אישית למיכל מוכנה לשימוש! =====');
        logger.info('');
        logger.info('📊 מידע חשוב:');
        logger.info(`🔗 כתובת המערכת: http://localhost:${process.env.PORT || 3000}`);
        logger.info('📧 משתמש: michal@michal-ai.local');
        logger.info('🔑 סיסמה: michal123!@#');
        logger.info('');
        logger.info('📋 פעולות זמינות:');
        logger.info('- ניהול משימות אקדמיות');
        logger.info('- ניהול תיקי גביה');
        logger.info('- ניהול משימות בירוקרטיות');
        logger.info('- צ\'ט חכם עם AI');
        logger.info('- יצירת מסמכים אוטומטיים');
        logger.info('');
        logger.info('🚀 להתחלת השרת הרץ: npm start');
        logger.info('🛠️  למצב פיתוח הרץ: npm run dev');
        logger.info('');
        logger.info('==================================================');
        logger.info('');
    } catch (error) {
        logger.error('שגיאה בהדפסת מידע התחלתי:', error);
    }
}

// הרצת התהליך הראשי
async function initializeSystem() {
    try {
        logger.info('🚀 מתחיל אתחול מערכת עוזר AI אישית למיכל...');
        
        await checkEnvironmentVariables();
        await createDirectories();
        await initializeDatabase();
        await createEmailTemplates();
        await runHealthChecks();
        await printStartupInfo();
        
        logger.info('✅ אתחול המערכת הושלם בהצלחה!');
        process.exit(0);
        
    } catch (error) {
        logger.error('❌ שגיאה קריטית באתחול המערכת:', error);
        process.exit(1);
    }
}

// הרצה רק אם הקובץ מופעל ישירות
if (require.main === module) {
    initializeSystem();
}

module.exports = {
    initializeSystem,
    createDirectories,
    checkEnvironmentVariables,
    initializeDatabase,
    createDefaultUser,
    seedDemoData
};