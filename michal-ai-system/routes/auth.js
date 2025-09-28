const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const database = require('../config/database');
const { generateAccessToken, generateRefreshToken } = require('../middleware/auth');
const { logUserActivity, logSecurityEvent } = require('../utils/logger');

// POST /api/auth/login - התחברות
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // במצב mock - תמיד החזר הצלחה
        if (process.env.DB_MOCK === 'true') {
            const mockToken = require('jsonwebtoken').sign(
                { userId: 1 },
                process.env.JWT_SECRET || 'michal_ai_super_secret_key_2025_secure',
                { expiresIn: '24h' }
            );
            
            return res.json({
                success: true,
                message: 'התחברת בהצלחה',
                data: {
                    user: {
                        id: 1,
                        email: 'michal@example.com',
                        fullName: 'מיכל',
                        role: 'admin'
                    },
                    accessToken: mockToken,
                    refreshToken: 'mock-refresh-token'
                }
            });
        }

        // וולידציה בסיסית
        if (!email || !password) {
            logSecurityEvent('login_attempt_missing_credentials', { email, ip: req.ip });
            return res.status(400).json({
                success: false,
                message: 'יש למלא מייל וסיסמה'
            });
        }

        // חיפוש המשתמש
        const userResult = await database.query(
            'SELECT id, email, password_hash, full_name, role, is_active FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (userResult.rows.length === 0) {
            logSecurityEvent('login_attempt_user_not_found', { email, ip: req.ip });
            return res.status(401).json({
                success: false,
                message: 'מייל או סיסמה שגויים'
            });
        }

        const user = userResult.rows[0];

        // בדיקה שהחשבון פעיל
        if (!user.is_active) {
            logSecurityEvent('login_attempt_inactive_user', { userId: user.id, email, ip: req.ip });
            return res.status(403).json({
                success: false,
                message: 'חשבון המשתמש לא פעיל'
            });
        }

        // בדיקת סיסמה
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            logSecurityEvent('login_attempt_wrong_password', { userId: user.id, email, ip: req.ip });
            return res.status(401).json({
                success: false,
                message: 'מייל או סיסמה שגויים'
            });
        }

        // יצירת טוקנים
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        // עדכון זמן כניסה אחרונה
        await database.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // לוג פעילות מוצלחת
        logUserActivity(user.id, 'login_success', { ip: req.ip });

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role
                },
                accessToken,
                refreshToken
            },
            message: `שלום ${user.full_name}! התחברת בהצלחה`
        });

    } catch (error) {
        console.error('שגיאה בהתחברות:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה פנימית בשרת'
        });
    }
});

// POST /api/auth/register - רישום (רק למיכל כרגע)
router.post('/register', async (req, res) => {
    try {
        const { email, password, fullName } = req.body;

        // וולידציה
        if (!email || !password || !fullName) {
            return res.status(400).json({
                success: false,
                message: 'יש למלא את כל השדות'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'סיסמה חייבת להכיל לפחות 6 תווים'
            });
        }

        // בדיקה שהמייל לא קיים
        const existingUser = await database.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            logSecurityEvent('register_attempt_existing_email', { email, ip: req.ip });
            return res.status(409).json({
                success: false,
                message: 'המייל כבר רשום במערכת'
            });
        }

        // הצפנת סיסמה
        const hashedPassword = await bcrypt.hash(password, 12);

        // יצירת המשתמש
        const newUser = await database.query(`
            INSERT INTO users (email, password_hash, full_name, role, preferences)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, email, full_name, role
        `, [
            email.toLowerCase(),
            hashedPassword,
            fullName,
            'user', // תפקיד רגיל
            JSON.stringify({ language: 'he', notifications: true })
        ]);

        const user = newUser.rows[0];

        // יצירת טוקנים
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        logUserActivity(user.id, 'register_success', { email, ip: req.ip });

        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role
                },
                accessToken,
                refreshToken
            },
            message: `שלום ${user.full_name}! החשבון נוצר בהצלחה`
        });

    } catch (error) {
        console.error('שגיאה ברישום:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה ביצירת החשבון'
        });
    }
});

// POST /api/auth/logout - התנתקות
router.post('/logout', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            // כאן אפשר להוסיף רשימה שחורה של טוקנים (blacklist)
            // לעת עתה נסתמך על פקיעת הטוקן
            
            // אם יש משתמש מזוהה
            if (req.user) {
                logUserActivity(req.user.id, 'logout', { ip: req.ip });
            }
        }

        res.json({
            success: true,
            message: 'התנתקת בהצלחה'
        });

    } catch (error) {
        console.error('שגיאה בהתנתקות:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בהתנתקות'
        });
    }
});

// GET /api/auth/me - קבלת פרטי המשתמש הנוכחי
router.get('/me', require('../middleware/auth').authenticateToken, async (req, res) => {
    try {
        // במצב mock - תמיד החזר נתוני משתמש בסיסיים
        if (process.env.DB_MOCK === 'true') {
            return res.json({
                success: true,
                data: {
                    user: {
                        id: 1,
                        email: 'michal@example.com',
                        full_name: 'מיכל',
                        role: 'admin',
                        preferences: {},
                        created_at: '2025-01-01T00:00:00.000Z',
                        last_login: new Date().toISOString(),
                        is_active: true
                    },
                    stats: {
                        total_tasks: 35,
                        completed_tasks: 15,
                        urgent_tasks: 8
                    }
                },
                message: 'פרטי המשתמש נטענו בהצלחה'
            });
        }

        // קבלת נתונים מעודכנים מהמסד
        const userResult = await database.query(`
            SELECT 
                id, email, full_name, role, preferences, 
                created_at, last_login, is_active
            FROM users 
            WHERE id = $1
        `, [req.user.id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'משתמש לא נמצא'
            });
        }

        const user = userResult.rows[0];

        // קבלת סטטיסטיקות בסיסיות
        const stats = await database.query(`
            SELECT 
                COUNT(*) as total_tasks,
                COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
                COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_tasks
            FROM tasks 
            WHERE user_id = $1
        `, [user.id]);

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role,
                    preferences: user.preferences,
                    createdAt: user.created_at,
                    lastLogin: user.last_login,
                    isActive: user.is_active
                },
                stats: stats.rows[0]
            }
        });

    } catch (error) {
        console.error('שגיאה בקבלת פרטי משתמש:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בקבלת פרטי המשתמש'
        });
    }
});

// PUT /api/auth/profile - עדכון פרופיל
router.put('/profile', require('../middleware/auth').authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { fullName, preferences } = req.body;

        const updates = [];
        const values = [];
        let paramIndex = 2;

        if (fullName) {
            updates.push(`full_name = $${paramIndex}`);
            values.push(fullName);
            paramIndex++;
        }

        if (preferences) {
            updates.push(`preferences = $${paramIndex}`);
            values.push(JSON.stringify(preferences));
            paramIndex++;
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'לא נמצאו שדות לעדכון'
            });
        }

        const query = `
            UPDATE users 
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, email, full_name, preferences
        `;

        const result = await database.query(query, [userId, ...values]);

        logUserActivity(userId, 'profile_updated', { updates: Object.keys(req.body) });

        res.json({
            success: true,
            data: result.rows[0],
            message: 'הפרופיל עודכן בהצלחה'
        });

    } catch (error) {
        console.error('שגיאה בעדכון פרופיל:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בעדכון הפרופיל'
        });
    }
});

// POST /api/auth/change-password - שינוי סיסמה
router.post('/change-password', require('../middleware/auth').authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'יש למלא סיסמה נוכחית וחדשה'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'סיסמה חדשה חייבת להכיל לפחות 6 תווים'
            });
        }

        // בדיקת סיסמה נוכחית
        const userResult = await database.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [userId]
        );

        const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
        if (!validPassword) {
            logSecurityEvent('change_password_wrong_current', { userId, ip: req.ip });
            return res.status(401).json({
                success: false,
                message: 'סיסמה נוכחית שגויה'
            });
        }

        // עדכון סיסמה חדשה
        const hashedNewPassword = await bcrypt.hash(newPassword, 12);
        await database.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [hashedNewPassword, userId]
        );

        logUserActivity(userId, 'password_changed', { ip: req.ip });

        res.json({
            success: true,
            message: 'הסיסמה שונתה בהצלחה'
        });

    } catch (error) {
        console.error('שגיאה בשינוי סיסמה:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בשינוי הסיסמה'
        });
    }
});

module.exports = router;