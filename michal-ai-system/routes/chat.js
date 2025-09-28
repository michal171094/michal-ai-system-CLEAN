const express = require('express');
const router = express.Router();
const database = require('../config/database');
const AIService = require('../services/AIService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');

// הגדרת multer להעלאת קבצים
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/chat/'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('סוג קובץ לא נתמך'));
        }
    }
});

// POST /api/chat/message - שליחת הודעה חדשה
router.post('/message', async (req, res) => {
    try {
        const userId = req.user.id;
        const { message, sessionId, context = {} } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'הודעה ריקה'
            });
        }

        logger.info(`💬 הודעה חדשה מ-${userId}: ${message.substring(0, 100)}...`);

        // יצירת session ID אם לא קיים
        const currentSessionId = sessionId || uuidv4();

        // בניית קונטקסט עשיר מהמערכת
        const enrichedContext = await buildChatContext(userId, context);

        // יצירת תגובה עם AI
        const aiResponse = await AIService.generateResponse(message, userId, enrichedContext);

        // שמירת ההודעות בהיסטוריה (השמירה כבר מתבצעת בAIService)
        
        // בדיקה אם צריך לבצע פעולות אוטומטיות
        const suggestedActions = await detectActionableContent(message, userId);

        res.json({
            success: true,
            data: {
                response: aiResponse,
                sessionId: currentSessionId,
                suggestedActions: suggestedActions,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('❌ שגיאה בעיבוד הודעת צ\'ט:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בעיבוד ההודעה',
            fallbackResponse: 'סליחה, נתקלתי בבעיה טכנית. אנא נסי שוב.'
        });
    }
});

// GET /api/chat/history - קבלת היסטוריית שיחות
router.get('/history', async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT 
                id,
                session_id,
                message_type,
                message,
                ai_model,
                tokens_used,
                context,
                created_at
            FROM chat_history 
            WHERE user_id = $1
        `;
        const params = [userId];

        if (sessionId) {
            query += ` AND session_id = $2`;
            params.push(sessionId);
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await database.query(query, params);

        // ספירת סה"כ הודעות
        let countQuery = 'SELECT COUNT(*) as total FROM chat_history WHERE user_id = $1';
        let countParams = [userId];
        
        if (sessionId) {
            countQuery += ' AND session_id = $2';
            countParams.push(sessionId);
        }
        
        const countResult = await database.query(countQuery, countParams);

        res.json({
            success: true,
            data: result.rows.reverse(), // הופך כדי שההודעות יהיו בסדר כרונולוגי
            pagination: {
                total: parseInt(countResult.rows[0].total),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });

    } catch (error) {
        logger.error('שגיאה בקבלת היסטוריית צ\'ט:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בקבלת ההיסטוריה'
        });
    }
});

// POST /api/chat/upload - העלאת קובץ לצ'ט
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const userId = req.user.id;
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'לא נמצא קובץ'
            });
        }

        // שמירת פרטי הקובץ במסד הנתונים
        const documentId = uuidv4();
        await database.query(`
            INSERT INTO documents (
                id, user_id, related_type, document_type, filename, 
                original_filename, file_path, file_size, mime_type
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            documentId,
            userId,
            'chat',
            'chat_upload',
            req.file.filename,
            req.file.originalname,
            req.file.path,
            req.file.size,
            req.file.mimetype
        ]);

        logger.info(`📁 קובץ הועלה לצ'ט: ${req.file.originalname} (${documentId})`);

        // אם זה קובץ טקסט או PDF, נתחיל OCR
        let extractedText = null;
        if (req.file.mimetype === 'application/pdf' || req.file.mimetype.startsWith('image/')) {
            try {
                extractedText = await performOCR(req.file.path);
                
                if (extractedText) {
                    // עדכון המסמך עם הטקסט
                    await database.query(
                        'UPDATE documents SET ocr_text = $1 WHERE id = $2',
                        [extractedText, documentId]
                    );

                    // ניתוח הטקסט עם AI
                    const analysis = await AIService.extractDataFromText(extractedText, 'document');
                    
                    // עדכון metadata עם הניתוח
                    await database.query(
                        'UPDATE documents SET metadata = $1 WHERE id = $2',
                        [JSON.stringify({ ocr_analysis: analysis }), documentId]
                    );
                }
            } catch (ocrError) {
                logger.warn('שגיאה ב-OCR:', ocrError);
            }
        }

        res.json({
            success: true,
            data: {
                documentId: documentId,
                filename: req.file.originalname,
                size: req.file.size,
                type: req.file.mimetype,
                extractedText: extractedText ? extractedText.substring(0, 500) + '...' : null,
                url: `/api/documents/${documentId}`
            },
            message: 'הקובץ הועלה בהצלחה'
        });

    } catch (error) {
        logger.error('שגיאה בהעלאת קובץ:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בהעלאת הקובץ'
        });
    }
});

// POST /api/chat/voice - תמלול הודעה קולית
router.post('/voice', upload.single('audio'), async (req, res) => {
    try {
        const userId = req.user.id;
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'לא נמצא קובץ אודיו'
            });
        }

        logger.info(`🎤 קובץ אודיו הועלה לתמלול: ${req.file.originalname}`);

        // תמלול האודיו (זה ידרוש שירות נוסף כמו Google Speech-to-Text)
        let transcription = null;
        try {
            transcription = await performSpeechToText(req.file.path);
        } catch (speechError) {
            logger.warn('שגיאה בתמלול:', speechError);
            return res.status(500).json({
                success: false,
                message: 'שגיאה בתמלול ההודעה הקולית'
            });
        }

        // אם התמלול הצליח, עבד את ההודעה כרגיל
        if (transcription) {
            const enrichedContext = await buildChatContext(userId, { source: 'voice' });
            const aiResponse = await AIService.generateResponse(transcription, userId, enrichedContext);

            res.json({
                success: true,
                data: {
                    transcription: transcription,
                    response: aiResponse,
                    timestamp: new Date().toISOString()
                },
                message: 'הודעה קולית עובדה בהצלחה'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'לא הצלחתי לתמלל את ההודעה הקולית'
            });
        }

        // מחיקת קובץ האודיו הזמני
        const fs = require('fs').promises;
        await fs.unlink(req.file.path);

    } catch (error) {
        logger.error('שגיאה בעיבוד הודעה קולית:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בעיבוד ההודעה הקולית'
        });
    }
});

// GET /api/chat/suggestions - קבלת הצעות למשתמש
router.get('/suggestions', async (req, res) => {
    try {
        const userId = req.user.id;
        
        // קבלת נתונים נוכחיים למתן הצעות
        const urgentTasks = await database.query(`
            SELECT title, deadline FROM tasks 
            WHERE user_id = $1 AND priority = 'urgent' AND status != 'completed'
            LIMIT 5
        `, [userId]);

        const recentActivity = await database.query(`
            SELECT action_type, created_at FROM actions_log 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT 10
        `, [userId]);

        // הצעות מותאמות אישית
        const suggestions = [];

        if (urgentTasks.rows.length > 0) {
            suggestions.push({
                type: 'urgent_reminder',
                title: 'משימות דחופות',
                message: `יש לך ${urgentTasks.rows.length} משימות דחופות שדורשות תשומת לב`,
                action: 'show_urgent_tasks'
            });
        }

        // הצעות בהתבסס על שעה ויום
        const now = new Date();
        const hour = now.getHours();

        if (hour >= 9 && hour <= 17) {
            suggestions.push({
                type: 'productivity_tip',
                title: 'טיפ ליום',
                message: 'האם תרצי שאכין לך סיכום משימות היום?',
                action: 'daily_summary'
            });
        }

        res.json({
            success: true,
            data: suggestions
        });

    } catch (error) {
        logger.error('שגיאה בקבלת הצעות:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בקבלת הצעות'
        });
    }
});

// פונקציות עזר
async function buildChatContext(userId, additionalContext = {}) {
    try {
        // משימות דחופות
        const urgentTasks = await database.query(`
            SELECT COUNT(*) as count FROM tasks 
            WHERE user_id = $1 AND priority = 'urgent' AND status != 'completed'
        `, [userId]);

        // משימות היום
        const todayTasks = await database.query(`
            SELECT COUNT(*) as count FROM tasks 
            WHERE user_id = $1 AND deadline <= CURRENT_DATE AND status != 'completed'
        `, [userId]);

        // חובות פעילים
        const activeDebts = await database.query(`
            SELECT COUNT(*) as count FROM debts 
            WHERE user_id = $1 AND case_status = 'active'
        `, [userId]);

        return {
            urgentTasks: urgentTasks.rows[0].count,
            todayTasks: todayTasks.rows[0].count,
            activeDebts: activeDebts.rows[0].count,
            currentTime: new Date().toISOString(),
            ...additionalContext
        };
    } catch (error) {
        logger.error('שגיאה בבניית קונטקסט צ\'ט:', error);
        return additionalContext;
    }
}

async function detectActionableContent(message, userId) {
    // זיהוי פעולות אוטומטיות מהודעה
    const suggestions = [];

    // זיהוי בקשות ליצירת משימה
    const taskKeywords = ['משימה חדשה', 'צריך לעשות', 'להזכיר לי', 'דדליין'];
    if (taskKeywords.some(keyword => message.includes(keyword))) {
        suggestions.push({
            type: 'create_task',
            title: 'יצירת משימה',
            message: 'האם תרצי שאכין משימה חדשה בהתבסס על ההודעה?'
        });
    }

    // זיהוי בקשות ליצירת מסמך
    const docKeywords = ['מכתב התנגדות', 'הצעת פשרה', 'מכתב תזכורת'];
    if (docKeywords.some(keyword => message.includes(keyword))) {
        suggestions.push({
            type: 'generate_document',
            title: 'יצירת מסמך',
            message: 'האם תרצי שאכין מסמך מתאים?'
        });
    }

    return suggestions;
}

async function performOCR(filePath) {
    // פונקציה זו תמומש בהמשך עם Google Vision API או Tesseract
    logger.info('OCR לא זמין עדיין');
    return null;
}

async function performSpeechToText(audioPath) {
    // פונקציה זו תמומש בהמשך עם Google Speech-to-Text
    logger.info('Speech-to-Text לא זמין עדיין');
    return null;
}

module.exports = router;