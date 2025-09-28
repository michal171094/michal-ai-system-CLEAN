const jwt = require('jsonwebtoken');
const database = require('../config/database');
const logger = require('../utils/logger');

// Middleware לבדיקת אימות משתמש
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'נדרש אימות - אין טוקן'
            });
        }

        // אימות הטוקן
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'michal_ai_super_secret_key_2025_secure');
        
        // במצב mock - החזר משתמש דמה
        if (process.env.DB_MOCK === 'true') {
            req.user = {
                id: decoded.userId || 1,
                email: 'michal@example.com',
                full_name: 'מיכל',
                role: 'admin',
                is_active: true
            };
            return next();
        }
        
        // בדיקה שהמשתמש קיים ופעיל
        const userResult = await database.query(
            'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'משתמש לא נמצא'
            });
        }

        const user = userResult.rows[0];
        
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'חשבון המשתמש לא פעיל'
            });
        }

        // עדכון זמן כניסה אחרונה
        await database.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // הוספת פרטי המשתמש לבקשה
        req.user = user;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'טוקן לא תקין'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'טוקן פג תוקף'
            });
        }

        logger.error('שגיאה באימות טוקן:', error);
        return res.status(500).json({
            success: false,
            message: 'שגיאה פנימית באימות'
        });
    }
};

// Middleware לבדיקת הרשאות לפי תפקיד
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'נדרש אימות קודם'
            });
        }

        const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
        const requiredRoles = Array.isArray(roles) ? roles : [roles];
        
        const hasPermission = requiredRoles.some(role => userRoles.includes(role));
        
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'אין הרשאה לגשת למשאב זה'
            });
        }

        next();
    };
};

// Middleware לוולידציה אופציונלית (אם יש טוקן)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userResult = await database.query(
                'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1 AND is_active = true',
                [decoded.userId]
            );

            if (userResult.rows.length > 0) {
                req.user = userResult.rows[0];
            }
        }

        next();
    } catch (error) {
        // אם יש שגיאה באימות אופציונלי, פשוט ממשיכים בלי משתמש
        next();
    }
};

// יצירת JWT token
const generateAccessToken = (userId) => {
    return jwt.sign(
        { userId: userId },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

// יצירת Refresh token (לעתיד)
const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId: userId, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
};

module.exports = {
    authenticateToken,
    requireRole,
    optionalAuth,
    generateAccessToken,
    generateRefreshToken
};