const winston = require('winston');
const path = require('path');

// יצירת תיקיית לוגים אם לא קיימת
const fs = require('fs');
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// הגדרות פורמט לוגים
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        
        // הוספת מידע נוסף אם קיים
        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta, null, 2)}`;
        }
        
        return log;
    })
);

// הגדרת הלוגר
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'michal-ai-assistant' },
    transports: [
        // לוגים כלליים
        new winston.transports.File({
            filename: path.join(logDir, 'app.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        
        // לוגי שגיאות נפרדים
        new winston.transports.File({
            filename: path.join(logDir, 'errors.log'),
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5,
        }),
        
        // לוגי ביצועים
        new winston.transports.File({
            filename: path.join(logDir, 'performance.log'),
            level: 'warn',
            maxsize: 5242880,
            maxFiles: 3,
        })
    ],
    
    // טיפול בשגיאות חריגות
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logDir, 'exceptions.log')
        })
    ],
    
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logDir, 'rejections.log')
        })
    ]
});

// בסביבת פיתוח - הצגה גם בקונסול
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// פונקציות עזר ללוגים מובנים
const logRequest = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'error' : 'info';
        
        logger.log(logLevel, `${req.method} ${req.originalUrl}`, {
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user ? req.user.id : null,
            contentLength: res.get('Content-Length')
        });
    });
    
    next();
};

// לוג פעילות משתמש
const logUserActivity = (userId, action, details = {}) => {
    logger.info(`פעילות משתמש: ${action}`, {
        userId,
        action,
        details,
        timestamp: new Date().toISOString()
    });
};

// לוג ביצועים
const logPerformance = (operation, duration, details = {}) => {
    const logLevel = duration > 1000 ? 'warn' : 'info'; // אזהרה אם יותר מ-1 שנייה
    
    logger.log(logLevel, `ביצועים: ${operation}`, {
        operation,
        duration: `${duration}ms`,
        details
    });
};

// לוג שגיאות מבנה
const logSystemError = (component, error, context = {}) => {
    logger.error(`שגיאת מערכת: ${component}`, {
        component,
        error: error.message,
        stack: error.stack,
        context
    });
};

// לוג אבטחה
const logSecurityEvent = (event, details = {}) => {
    logger.warn(`אירוע אבטחה: ${event}`, {
        securityEvent: event,
        details,
        timestamp: new Date().toISOString()
    });
};

// לוג פעולות AI
const logAIOperation = (operation, tokens, model, userId, success = true) => {
    logger.info(`פעולת AI: ${operation}`, {
        operation,
        tokens,
        model,
        userId,
        success,
        timestamp: new Date().toISOString()
    });
};

// ניקוי לוגים ישנים (ירוץ כל יום)
const cleanOldLogs = () => {
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 יום
    const now = Date.now();
    
    fs.readdir(logDir, (err, files) => {
        if (err) {
            logger.error('שגיאה בקריאת תיקיית לוגים:', err);
            return;
        }
        
        files.forEach(file => {
            const filePath = path.join(logDir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) return;
                
                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlink(filePath, (err) => {
                        if (err) {
                            logger.error(`שגיאה במחיקת לוג ישן: ${file}`, err);
                        } else {
                            logger.info(`לוג ישן נמחק: ${file}`);
                        }
                    });
                }
            });
        });
    });
};

// הרץ ניקוי כל יום ב-2 בלילה
setInterval(cleanOldLogs, 24 * 60 * 60 * 1000);

module.exports = {
    logger,
    logRequest,
    logUserActivity,
    logPerformance,
    logSystemError,
    logSecurityEvent,
    logAIOperation,
    cleanOldLogs
};