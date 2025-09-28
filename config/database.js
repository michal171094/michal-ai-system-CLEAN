const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class Database {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '../data/tasks.db');
        this.isConnected = false;
    }

    async connect() {
        try {
            // יצירת תיקיית data אם לא קיימת
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // חיבור למסד הנתונים
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    logger.error('❌ שגיאה בחיבור ל-SQLite:', err);
                    throw err;
                }
                console.log('✅ חובר בהצלחה ל-SQLite');
                this.isConnected = true;
            });

            // יצירת הטבלאות
            await this.createTables();
            
            // טעינת נתוני דמו אם הטבלאות ריקות
            await this.loadMockData();
            
            return true;
        } catch (error) {
            logger.error('❌ שגיאה בהתחברות למסד נתונים:', error);
            this.isConnected = false;
            throw error;
        }
    }

    async createTables() {
        return new Promise((resolve, reject) => {
            const schemaPath = path.join(__dirname, '../database/schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            this.db.exec(schema, (err) => {
                if (err) {
                    logger.error('❌ שגיאה ביצירת טבלאות:', err);
                    reject(err);
                } else {
                    console.log('✅ טבלאות נוצרו בהצלחה');
                    resolve();
                }
            });
        });
    }

    async loadMockData() {
        try {
            // בדיקה אם יש כבר נתונים
            const count = await this.query('SELECT COUNT(*) as count FROM tasks');
            if (count[0].count > 0) {
                console.log('📊 נתונים כבר קיימים במסד הנתונים');
                return;
            }

            console.log('📊 טוען נתוני דמו...');
            const mockData = require('../scripts/mockData');

            // טעינת לקוחות
            for (const client of mockData.clients) {
                await this.query(`
                    INSERT INTO clients (id, name, company, email, phone, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [client.id, client.name, client.company, client.email, client.phone, new Date().toISOString()]);
            }

            // טעינת משימות
            for (const task of mockData.tasks) {
                await this.query(`
                    INSERT INTO tasks (id, title, description, category, priority, status, deadline, client_id, amount, case_number, authority, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    task.id, 
                    task.project || task.title, 
                    task.description || task.action,
                    this.mapCategory(task),
                    this.mapPriority(task.priority),
                    this.mapStatus(task.status),
                    task.deadline,
                    task.client_id || null,
                    task.value || task.amount || null,
                    task.case_number || null,
                    task.authority || null,
                    new Date().toISOString()
                ]);
            }

            // טעינת חובות
            for (const debt of mockData.debts) {
                await this.query(`
                    INSERT INTO debts (id, task_id, creditor, collection_company, original_amount, current_amount, case_number, court, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    debt.id,
                    debt.id, // משתמש באותו ID כמו task
                    debt.creditor,
                    debt.company,
                    debt.amount,
                    debt.amount,
                    debt.case_number,
                    null,
                    debt.status,
                    new Date().toISOString()
                ]);
            }

            // טעינת בירוקרטיה
            for (const item of mockData.bureaucracy) {
                await this.query(`
                    INSERT INTO bureaucracy (id, task_id, authority, form_type, reference_number, required_documents, submitted_documents, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    item.id,
                    item.id + 15, // מתחיל מ-ID 16
                    item.authority,
                    item.task,
                    null,
                    null,
                    null,
                    item.status,
                    new Date().toISOString()
                ]);
            }

            console.log('✅ נתוני דמו נטענו בהצלחה');
        } catch (error) {
            logger.error('❌ שגיאה בטעינת נתוני דמו:', error);
            throw error;
        }
    }

    // פונקציות עזר למיפוי נתונים
    mapCategory(task) {
        if (task.type) {
            if (['תזה', 'סמינר', 'מחקר', 'פרויקט', 'מאמר', 'הצעה', 'סקירה', 'תרגום', 'ייעוץ', 'עריכה', 'כתיבה', 'מצגת', 'ביקורת', 'הדרכה'].includes(task.type)) {
                return 'academic';
            }
        }
        return 'personal';
    }

    mapPriority(priority) {
        const priorityMap = {
            'דחוף': 10,
            'גבוה': 8,
            'בינוני': 5,
            'נמוך': 3,
            'הושלם': 1,
            'סגור': 1
        };
        return priorityMap[priority] || 5;
    }

    mapStatus(status) {
        const statusMap = {
            'בעבודה': 'in_progress',
            'לסיום': 'in_progress',
            'הצעת מחקר': 'pending',
            'טיוטה': 'pending',
            'הגשה': 'in_progress',
            'הושלם': 'done',
            'נסגר': 'done',
            'פתוח': 'pending',
            'התראה': 'pending',
            'בהתנגדות': 'in_progress',
            'בהליך': 'in_progress',
            'מאושר': 'done',
            'נדחה': 'pending',
            'נדרש': 'pending'
        };
        return statusMap[status] || 'pending';
    }

    // פונקציות עזר לשאילתות
    query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    logger.error('❌ שגיאה בשאילתה:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    queryOne(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    logger.error('❌ שגיאה בשאילתה:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    logger.error('❌ שגיאה בביצוע:', err);
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    async disconnect() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    logger.error('❌ שגיאה בסגירת מסד נתונים:', err);
                } else {
                    console.log('✅ חיבור למסד נתונים נסגר');
                    this.isConnected = false;
                }
            });
        }
    }

    // בדיקת חיבור
    async healthCheck() {
        try {
            const result = await this.queryOne('SELECT 1 as test');
            return result && result.test === 1;
        } catch (error) {
            return false;
        }
    }
}

module.exports = new Database();