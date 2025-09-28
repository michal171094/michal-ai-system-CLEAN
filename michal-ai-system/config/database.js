const { Pool } = require('pg');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

dotenv.config();

class Database {
    constructor() {
        this.pool = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            // במצב mock - לא צריך חיבור אמיתי למסד נתונים
            if (process.env.DB_MOCK === 'true') {
                this.isConnected = true;
                logger.info('🗄️  מצב Mock פעיל - דמה חיבור למסד נתונים');
                return true;
            }

            // יצירת חיבור למסד הנתונים
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
                max: 20, // מקסימום חיבורים בבריכה
                idleTimeoutMillis: 30000, // זמן המתנה לחיבור בטלנות
                connectionTimeoutMillis: 2000, // זמן המתנה לחיבור חדש
            });

            // בדיקת חיבור
            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW() as now');
            client.release();

            this.isConnected = true;
            logger.info('🗄️  חיבור למסד הנתונים הושלם בהצלחה');
            logger.info(`⏰ זמן שרת מסד הנתונים: ${result.rows[0].now}`);
            
            return true;
        } catch (error) {
            logger.error('❌ שגיאה בחיבור למסד הנתונים:', error);
            this.isConnected = false;
            throw error;
        }
    }

    async disconnect() {
        try {
            if (process.env.DB_MOCK === 'true') {
                this.isConnected = false;
                logger.info('🔌 מצב Mock - סגירת חיבור דמה למסד נתונים');
                return;
            }

            if (this.pool) {
                await this.pool.end();
                this.isConnected = false;
                logger.info('🔌 חיבור למסד הנתונים נסגר');
            }
        } catch (error) {
            logger.error('שגיאה בסגירת חיבור מסד הנתונים:', error);
        }
    }

    // ביצוע שאילתה
    async query(text, params) {
        // במצב mock - החזר תשובה דמה
        if (process.env.DB_MOCK === 'true') {
            logger.warn('🎭 מצב Mock - שאילתה דמה:', text.substring(0, 50) + '...');
            return { rows: [], rowCount: 0 };
        }

        const start = Date.now();
        try {
            const res = await this.pool.query(text, params);
            const duration = Date.now() - start;
            
            if (duration > 100) { // יותר מ-100ms
                logger.warn(`🐌 שאילתה איטית (${duration}ms): ${text.substring(0, 100)}...`);
            }
            
            return res;
        } catch (error) {
            logger.error('❌ שגיאה בביצוע שאילתה:', {
                error: error.message,
                query: text.substring(0, 100) + '...',
                params
            });
            throw error;
        }
    }

    // התחלת טרנזקציה
    async beginTransaction() {
        const client = await this.pool.connect();
        await client.query('BEGIN');
        return client;
    }

    // commit טרנזקציה
    async commitTransaction(client) {
        try {
            await client.query('COMMIT');
        } finally {
            client.release();
        }
    }

    // rollback טרנזקציה
    async rollbackTransaction(client) {
        try {
            await client.query('ROLLBACK');
        } finally {
            client.release();
        }
    }

    // בדיקת בריאות מסד הנתונים
    async healthCheck() {
        try {
            const result = await this.query('SELECT 1 as healthy');
            return {
                status: 'healthy',
                connected: this.isConnected,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                connected: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // סטטיסטיקות מסד הנתונים
    async getStats() {
        try {
            const stats = await this.query(`
                SELECT 
                    schemaname,
                    tablename,
                    n_tup_ins as inserts,
                    n_tup_upd as updates,
                    n_tup_del as deletes,
                    n_live_tup as live_rows,
                    n_dead_tup as dead_rows
                FROM pg_stat_user_tables 
                ORDER BY n_live_tup DESC
            `);
            
            return {
                tables: stats.rows,
                poolStats: {
                    totalCount: this.pool.totalCount,
                    idleCount: this.pool.idleCount,
                    waitingCount: this.pool.waitingCount
                }
            };
        } catch (error) {
            logger.error('שגיאה בקבלת סטטיסטיקות:', error);
            throw error;
        }
    }

    // מיגרציה של מבנה מסד הנתונים
    async migrate() {
        try {
            logger.info('🔄 מתחיל מיגרציה של מסד הנתונים...');
            
            // קריאת קובץ הסכמה
            const fs = require('fs').promises;
            const path = require('path');
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schema = await fs.readFile(schemaPath, 'utf8');
            
            // ביצוע הסכמה
            await this.query(schema);
            
            logger.info('✅ מיגרציה הושלמה בהצלחה');
            return true;
        } catch (error) {
            logger.error('❌ שגיאה במיגרציה:', error);
            throw error;
        }
    }

    // יצירת משתמש ברירת מחדל (מיכל)
    async createDefaultUser() {
        try {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('michal123', 12);
            // No default user creation - users must register or authenticate properly
            logger.info('🏁 Database initialization complete - ready for real users');
        } catch (error) {
            logger.error('שגיאה ביצירת משתמש ברירת מחדל:', error);
            throw error;
        }
    }

    // מילוי נתוני דמו
    async seedDemoData() {
        try {
            logger.info('🌱 מתחיל מילוי נתוני דמו...');
            
            // קבלת מזהה המשתמש
            const userResult = await this.query('SELECT id FROM users WHERE email = $1', ['michal@example.com']);
            const userId = userResult.rows[0].id;
            
            // יצירת לקוחות לדוגמה
            const clients = [
                { name: 'דני כהן', company: 'אוניברסיטת תל-אביב', email: 'danny@tau.ac.il', client_type: 'academic' },
                { name: 'רחל לוי', company: 'המכללה האקדמית תל-אביב', email: 'rachel@mta.ac.il', client_type: 'academic' },
                { name: 'משה אברהם', company: null, email: 'moshe@gmail.com', client_type: 'debt' }
            ];
            
            for (const client of clients) {
                await this.query(`
                    INSERT INTO clients (user_id, name, company, email, client_type)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT DO NOTHING
                `, [userId, client.name, client.company, client.email, client.client_type]);
            }
            
            logger.info('✅ נתוני דמו נוספו בהצלחה');
        } catch (error) {
            logger.error('❌ שגיאה במילוי נתוני דמו:', error);
            throw error;
        }
    }
}

// יצירת אינסטנס יחיד (Singleton)
const database = new Database();

module.exports = database;