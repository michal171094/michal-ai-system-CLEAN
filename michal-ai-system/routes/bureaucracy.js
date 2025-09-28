const express = require('express');
const router = express.Router();
const database = require('../config/database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// GET /api/bureaucracy - קבלת כל המשימות הבירוקרטיות
router.get('/', async (req, res) => {
    try {
        // במצב mock - החזר נתונים סטטיים
        if (process.env.DB_MOCK === 'true') {
            const mockBureaucracy = require('../scripts/mockData').bureaucracy;
            return res.json({
                success: true,
                data: mockBureaucracy,
                total: mockBureaucracy.length,
                message: 'משימות בירוקרטיות נטענו בהצלחה'
            });
        }

        const userId = req.user.id;
        const { status, institution, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT 
                b.*,
                c.name as client_name,
                CASE 
                    WHEN b.deadline < CURRENT_DATE AND b.status NOT IN ('approved', 'rejected') THEN 'overdue'
                    WHEN b.deadline <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
                    ELSE 'normal'
                END as urgency_status
            FROM bureaucracy b
            LEFT JOIN clients c ON b.client_id = c.id
            WHERE b.user_id = $1
        `;
        const params = [userId];
        let paramIndex = 2;

        if (status) {
            query += ` AND b.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (institution) {
            query += ` AND b.institution ILIKE $${paramIndex}`;
            params.push(`%${institution}%`);
            paramIndex++;
        }

        query += ` 
            ORDER BY 
                CASE b.status
                    WHEN 'submitted' THEN 1
                    WHEN 'in_review' THEN 2
                    WHEN 'appealed' THEN 3
                    ELSE 4
                END,
                b.deadline ASC NULLS LAST,
                b.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);

        const result = await database.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        logger.error('שגיאה בקבלת משימות בירוקרטיות:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בקבלת המשימות הבירוקרטיות'
        });
    }
});

// GET /api/bureaucracy/stats - סטטיסטיקות בירוקרטיה
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.id;

        const stats = await database.query(`
            SELECT 
                COUNT(*) as total_requests,
                COUNT(*) FILTER (WHERE status = 'submitted') as submitted,
                COUNT(*) FILTER (WHERE status = 'in_review') as in_review,
                COUNT(*) FILTER (WHERE status = 'approved') as approved,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
                COUNT(*) FILTER (WHERE status = 'appealed') as appealed,
                COUNT(*) FILTER (WHERE deadline < CURRENT_DATE AND status NOT IN ('approved', 'rejected')) as overdue
            FROM bureaucracy 
            WHERE user_id = $1
        `, [userId]);

        const institutionStats = await database.query(`
            SELECT 
                institution,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'approved') as approved,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected
            FROM bureaucracy 
            WHERE user_id = $1
            GROUP BY institution
            ORDER BY total DESC
        `, [userId]);

        res.json({
            success: true,
            data: {
                overview: stats.rows[0],
                by_institution: institutionStats.rows
            }
        });

    } catch (error) {
        logger.error('שגיאה בקבלת סטטיסטיקות בירוקרטיה:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בקבלת הסטטיסטיקות'
        });
    }
});

// POST /api/bureaucracy - יצירת בקשה בירוקרטית חדשה
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            institution,
            request_type,
            request_number,
            client_id,
            submission_date,
            deadline,
            documents_required = [],
            contact_person,
            contact_details,
            notes
        } = req.body;

        if (!institution || !request_type) {
            return res.status(400).json({
                success: false,
                message: 'מוסד וסוג בקשה הם שדות חובה'
            });
        }

        const bureaucracyId = uuidv4();
        const result = await database.query(`
            INSERT INTO bureaucracy (
                id, user_id, client_id, institution, request_type, request_number,
                submission_date, deadline, documents_required, contact_person,
                contact_details, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [
            bureaucracyId, userId, client_id, institution, request_type, request_number,
            submission_date, deadline, JSON.stringify(documents_required), contact_person,
            contact_details, notes
        ]);

        logger.info(`📋 בקשה בירוקרטית חדשה נוצרה: ${request_type} ב${institution}`);

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'הבקשה הבירוקרטית נוצרה בהצלחה'
        });

    } catch (error) {
        logger.error('שגיאה ביצירת בקשה בירוקרטית:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה ביצירת הבקשה הבירוקרטית'
        });
    }
});

// PUT /api/bureaucracy/:id - עדכון בקשה בירוקרטית
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const bureaucracyId = req.params.id;
        const updates = req.body;

        const existingRequest = await database.query(
            'SELECT * FROM bureaucracy WHERE id = $1 AND user_id = $2',
            [bureaucracyId, userId]
        );

        if (existingRequest.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'בקשה בירוקרטית לא נמצאה'
            });
        }

        const allowedFields = [
            'status', 'response_date', 'deadline', 'documents_submitted',
            'contact_person', 'contact_details', 'notes', 'request_number'
        ];

        const updateFields = [];
        const updateValues = [];
        let paramIndex = 3;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                if (key === 'documents_submitted' && Array.isArray(value)) {
                    updateFields.push(`${key} = $${paramIndex}`);
                    updateValues.push(JSON.stringify(value));
                } else {
                    updateFields.push(`${key} = $${paramIndex}`);
                    updateValues.push(value);
                }
                paramIndex++;
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'לא נמצאו שדות תקינים לעדכון'
            });
        }

        const query = `
            UPDATE bureaucracy 
            SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;

        const result = await database.query(query, [bureaucracyId, userId, ...updateValues]);

        res.json({
            success: true,
            data: result.rows[0],
            message: 'הבקשה הבירוקרטית עודכנה בהצלחה'
        });

    } catch (error) {
        logger.error('שגיאה בעדכון בקשה בירוקרטית:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בעדכון הבקשה הבירוקרטית'
        });
    }
});

// POST /api/bureaucracy/:id/appeal - יצירת ערעור
router.post('/:id/appeal', async (req, res) => {
    try {
        const userId = req.user.id;
        const bureaucracyId = req.params.id;
        const { appeal_reasons, additional_documents } = req.body;

        const requestResult = await database.query(`
            SELECT b.*, c.name as client_name
            FROM bureaucracy b
            LEFT JOIN clients c ON b.client_id = c.id
            WHERE b.id = $1 AND b.user_id = $2
        `, [bureaucracyId, userId]);

        if (requestResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'בקשה בירוקרטית לא נמצאה'
            });
        }

        const request = requestResult.rows[0];

        if (request.status !== 'rejected') {
            return res.status(400).json({
                success: false,
                message: 'ניתן להגיש ערעור רק על בקשות שנדחו'
            });
        }

        // יצירת מכתב ערעור עם AI
        const AIService = require('../services/AIService');
        const appealLetter = await AIService.generateDocument('appeal', {
            institution: request.institution,
            requestNumber: request.request_number,
            requestType: request.request_type,
            decisionType: 'דחיית הבקשה',
            reasonsForAppeal: appeal_reasons,
            clientName: request.client_name,
            originalSubmissionDate: request.submission_date
        }, userId);

        // שמירת מסמך הערעור
        const documentId = uuidv4();
        await database.query(`
            INSERT INTO documents (
                id, user_id, related_id, related_type, document_type,
                filename, original_filename, file_path, ocr_text, metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            documentId,
            userId,
            bureaucracyId,
            'bureaucracy',
            'appeal',
            `appeal_${request.request_number}_${Date.now()}.txt`,
            `ערעור_${request.institution}_${new Date().toISOString().split('T')[0]}.txt`,
            '/generated/',
            appealLetter,
            JSON.stringify({ 
                generated_by_ai: true,
                institution: request.institution,
                request_type: request.request_type,
                appeal_reasons: appeal_reasons
            })
        ]);

        // עדכון סטטוס הבקשה
        await database.query(`
            UPDATE bureaucracy 
            SET status = 'appealed', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [bureaucracyId]);

        logger.info(`⚖️ ערעור נוצר לבקשה: ${request.request_type} ב${request.institution}`);

        res.json({
            success: true,
            data: {
                documentId: documentId,
                appealLetter: appealLetter,
                filename: `ערעור_${request.institution}_${new Date().toISOString().split('T')[0]}.txt`
            },
            message: 'ערעור נוצר בהצלחה'
        });

    } catch (error) {
        logger.error('שגיאה ביצירת ערעור:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה ביצירת הערעור'
        });
    }
});

// GET /api/bureaucracy/deadlines - מועדים קרובים
router.get('/deadlines', async (req, res) => {
    try {
        const userId = req.user.id;
        const { days = 30 } = req.query;

        const result = await database.query(`
            SELECT 
                b.*,
                c.name as client_name,
                EXTRACT(DAY FROM b.deadline - CURRENT_DATE) as days_remaining
            FROM bureaucracy b
            LEFT JOIN clients c ON b.client_id = c.id
            WHERE b.user_id = $1 
            AND b.deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
            AND b.status NOT IN ('approved', 'rejected')
            ORDER BY b.deadline ASC
        `, [userId]);

        res.json({
            success: true,
            data: result.rows.map(row => ({
                ...row,
                urgency: row.days_remaining <= 3 ? 'critical' : 
                        row.days_remaining <= 7 ? 'high' : 'medium'
            }))
        });

    } catch (error) {
        logger.error('שגיאה בקבלת מועדים:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בקבלת המועדים'
        });
    }
});

module.exports = router;