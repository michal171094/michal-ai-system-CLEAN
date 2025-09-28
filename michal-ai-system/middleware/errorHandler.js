const { logger } = require('../utils/logger');

// Middleware לטיפול בשגיאות כללי
const errorHandler = (err, req, res, next) => {
    // רישום השגיאה
    logger.error('שגיאה לא מטופלת:', {
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user ? req.user.id : null
    });

    // שגיאות ולידציה
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'נתונים לא תקינים',
            errors: err.details || err.message
        });
    }

    // שגיאות מסד נתונים
    if (err.code === '23505') { // PostgreSQL unique violation
        return res.status(409).json({
            success: false,
            message: 'נתון כבר קיים במערכת'
        });
    }

    if (err.code === '23503') { // PostgreSQL foreign key violation
        return res.status(400).json({
            success: false,
            message: 'נתון קשור לרשומות אחרות'
        });
    }

    // שגיאות JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'אימות לא תקין'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'פג תוקף האימות'
        });
    }

    // שגיאות Multer (העלאת קבצים)
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'קובץ גדול מדי'
        });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
            success: false,
            message: 'יותר מדי קבצים'
        });
    }

    // שגיאות Rate Limiting
    if (err.status === 429) {
        return res.status(429).json({
            success: false,
            message: 'יותר מדי בקשות, נסה שוב מאוחר יותר'
        });
    }

    // שגיאת 404
    if (err.status === 404) {
        return res.status(404).json({
            success: false,
            message: 'המשאב לא נמצא'
        });
    }

    // שגיאת הרשאות
    if (err.status === 403) {
        return res.status(403).json({
            success: false,
            message: 'אין הרשאה לפעולה זו'
        });
    }

    // שגיאות OpenAI
    if (err.message && err.message.includes('OpenAI')) {
        return res.status(503).json({
            success: false,
            message: 'שירות AI זמנית לא זמין'
        });
    }

    // שגיאה כללית
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(err.status || 500).json({
        success: false,
        message: isDevelopment ? err.message : 'שגיאה פנימית בשרת',
        ...(isDevelopment && { stack: err.stack })
    });
};

// Middleware לטיפול בנתיבים לא קיימים
const notFoundHandler = (req, res) => {
    logger.warn(`נתיב לא נמצא: ${req.method} ${req.originalUrl} מ-${req.ip}`);
    
    res.status(404).json({
        success: false,
        message: 'נתיב לא נמצא',
        path: req.originalUrl,
        method: req.method
    });
};

// Middleware לווידוא תקינות JSON
const validateJSON = (err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        logger.warn(`JSON לא תקין מ-${req.ip}: ${err.message}`);
        return res.status(400).json({
            success: false,
            message: 'פורמט JSON לא תקין'
        });
    }
    next(err);
};

module.exports = {
    errorHandler,
    notFoundHandler,
    validateJSON
};