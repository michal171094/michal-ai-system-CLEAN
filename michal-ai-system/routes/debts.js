const express = require('express');
const router = express.Router();
const database = require('../config/database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// GET /api/debts - קבלת כל תיקי הגביה
router.get('/', async (req, res) => {
    try {
        // במצב mock - החזר נתונים סטטיים
        if (process.env.DB_MOCK === 'true') {
            const mockDebts = require('../scripts/mockData').debts;
            return res.json({
                success: true,
                data: mockDebts,
                total: mockDebts.length,
                message: 'תיקי גביה נטענו בהצלחה'
            });
        }

        const userId = req.user.id;
        const { case_status, search, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT 
                d.*,
                c.name as client_name,
                c.company as client_company,
                CASE 
                    WHEN d.next_action_date < CURRENT_DATE THEN 'overdue'
                    WHEN d.next_action_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
                    ELSE 'normal'
                END as urgency_status
            FROM debts d
            LEFT JOIN clients c ON d.client_id = c.id
            WHERE d.user_id = $1
        `;
        const params = [userId];
        let paramIndex = 2;

        if (case_status) {
            query += ` AND d.case_status = $${paramIndex}`;
            params.push(case_status);
            paramIndex++;
        }

        if (search) {
            query += ` AND (d.debtor_name ILIKE $${paramIndex} OR d.case_number ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        query += ` 
            ORDER BY 
                CASE d.case_status 
                    WHEN 'active' THEN 1
                    WHEN 'appealed' THEN 2
                    ELSE 3
                END,
                d.next_action_date ASC NULLS LAST,
                d.current_amount DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);

        const result = await database.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        logger.error('שגיאה בקבלת תיקי גביה:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בקבלת תיקי הגביה'
        });
    }
});

// GET /api/debts/stats - סטטיסטיקות תיקי גביה
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.id;

        const stats = await database.query(`
            SELECT 
                COUNT(*) as total_cases,
                COUNT(*) FILTER (WHERE case_status = 'active') as active_cases,
                COUNT(*) FILTER (WHERE case_status = 'settled') as settled_cases,
                COUNT(*) FILTER (WHERE case_status = 'appealed') as appealed_cases,
                COUNT(*) FILTER (WHERE next_action_date < CURRENT_DATE) as overdue_actions,
                COALESCE(SUM(current_amount) FILTER (WHERE case_status = 'active'), 0) as total_active_amount,
                COALESCE(SUM(original_amount - current_amount) FILTER (WHERE case_status = 'settled'), 0) as total_collected
            FROM debts 
            WHERE user_id = $1
        `, [userId]);

        const monthlyStats = await database.query(`
            SELECT 
                DATE_TRUNC('month', created_at) as month,
                COUNT(*) as new_cases,
                SUM(original_amount) as new_amount
            FROM debts 
            WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month DESC
        `, [userId]);

        res.json({
            success: true,
            data: {
                overview: stats.rows[0],
                monthly: monthlyStats.rows
            }
        });

    } catch (error) {
        logger.error('שגיאה בקבלת סטטיסטיקות גביה:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בקבלת הסטטיסטיקות'
        });
    }
});

// POST /api/debts - יצירת תיק גביה חדש
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            case_number,
            debtor_name,
            debtor_id,
            original_amount,
            current_amount,
            interest_rate = 0,
            court,
            judgment_date,
            execution_date,
            next_action,
            next_action_date,
            client_id,
            notes
        } = req.body;

        // וולידציה
        if (!case_number || !debtor_name || !original_amount) {
            return res.status(400).json({
                success: false,
                message: 'מספר תיק, שם חייב וסכום מקורי הם שדות חובה'
            });
        }

        // בדיקה שמספר התיק לא קיים
        const existingCase = await database.query(
            'SELECT id FROM debts WHERE case_number = $1',
            [case_number]
        );

        if (existingCase.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'מספר תיק כבר קיים במערכת'
            });
        }

        const debtId = uuidv4();
        const result = await database.query(`
            INSERT INTO debts (
                id, user_id, client_id, case_number, debtor_name, debtor_id,
                original_amount, current_amount, interest_rate, court,
                judgment_date, execution_date, next_action, next_action_date, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `, [
            debtId, userId, client_id, case_number, debtor_name, debtor_id,
            original_amount, current_amount || original_amount, interest_rate, court,
            judgment_date, execution_date, next_action, next_action_date, notes
        ]);

        logger.info(`💰 תיק גביה חדש נוצר: ${case_number} - ${debtor_name} - ₪${original_amount}`);

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'תיק הגביה נוצר בהצלחה'
        });

    } catch (error) {
        logger.error('שגיאה ביצירת תיק גביה:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה ביצירת תיק הגביה'
        });
    }
});

// PUT /api/debts/:id - עדכון תיק גביה
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const debtId = req.params.id;
        const updates = req.body;

        // בדיקה שהתיק שייך למשתמש
        const existingDebt = await database.query(
            'SELECT * FROM debts WHERE id = $1 AND user_id = $2',
            [debtId, userId]
        );

        if (existingDebt.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'תיק גביה לא נמצא'
            });
        }

        const allowedFields = [
            'current_amount', 'case_status', 'next_action', 'next_action_date',
            'court', 'judgment_date', 'execution_date', 'notes', 'interest_rate'
        ];

        const updateFields = [];
        const updateValues = [];
        let paramIndex = 3;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = $${paramIndex}`);
                updateValues.push(value);
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
            UPDATE debts 
            SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;

        const result = await database.query(query, [debtId, userId, ...updateValues]);

        res.json({
            success: true,
            data: result.rows[0],
            message: 'תיק הגביה עודכן בהצלחה'
        });

    } catch (error) {
        logger.error('שגיאה בעדכון תיק גביה:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בעדכון תיק הגביה'
        });
    }
});

// POST /api/debts/:id/objection - יצירת מכתב התנגדות
router.post('/:id/objection', async (req, res) => {
    try {
        const userId = req.user.id;
        const debtId = req.params.id;
        const { reasons, additional_info } = req.body;

        // קבלת פרטי התיק
        const debtResult = await database.query(`
            SELECT d.*, c.name as client_name
            FROM debts d
            LEFT JOIN clients c ON d.client_id = c.id
            WHERE d.id = $1 AND d.user_id = $2
        `, [debtId, userId]);

        if (debtResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'תיק גביה לא נמצא'
            });
        }

        const debt = debtResult.rows[0];

        // יצירת מכתב התנגדות עם AI
        const AIService = require('../services/AIService');
        const objectionLetter = await AIService.generateDocument('objection', {
            debtorName: debt.debtor_name,
            caseNumber: debt.case_number,
            amount: debt.current_amount,
            creditor: debt.client_name || 'לא צוין',
            court: debt.court,
            reasons: reasons,
            additionalInfo: additional_info
        }, userId);

        // שמירת המסמך
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
            debtId,
            'debt',
            'objection',
            `objection_${debt.case_number}_${Date.now()}.txt`,
            `מכתב_התנגדות_${debt.case_number}_${new Date().toISOString().split('T')[0]}.txt`,
            '/generated/',
            objectionLetter,
            JSON.stringify({ 
                generated_by_ai: true, 
                case_number: debt.case_number,
                debtor_name: debt.debtor_name,
                reasons: reasons
            })
        ]);

        // עדכון תיק הגביה
        await database.query(`
            UPDATE debts 
            SET case_status = 'appealed', 
                next_action = 'המתנה לתגובת בית המשפט על ההתנגדות',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [debtId]);

        logger.info(`📜 מכתב התנגדות נוצר לתיק: ${debt.case_number}`);

        res.json({
            success: true,
            data: {
                documentId: documentId,
                objectionLetter: objectionLetter,
                filename: `מכתב_התנגדות_${debt.case_number}_${new Date().toISOString().split('T')[0]}.txt`
            },
            message: 'מכתב התנגדות נוצר בהצלחה'
        });

    } catch (error) {
        logger.error('שגיאה ביצירת מכתב התנגדות:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה ביצירת מכתב ההתנגדות'
        });
    }
});

// POST /api/debts/:id/settlement - הצעת פשרה
router.post('/:id/settlement', async (req, res) => {
    try {
        const userId = req.user.id;
        const debtId = req.params.id;
        const { settlement_amount, payment_terms, reasoning } = req.body;

        const debtResult = await database.query(`
            SELECT d.*, c.name as client_name
            FROM debts d
            LEFT JOIN clients c ON d.client_id = c.id
            WHERE d.id = $1 AND d.user_id = $2
        `, [debtId, userId]);

        if (debtResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'תיק גביה לא נמצא'
            });
        }

        const debt = debtResult.rows[0];

        // יצירת הצעת פשרה עם AI
        const AIService = require('../services/AIService');
        const settlementLetter = await AIService.generateDocument('settlement', {
            debtorName: debt.debtor_name,
            originalAmount: debt.original_amount,
            settlementAmount: settlement_amount,
            paymentTerms: payment_terms,
            caseNumber: debt.case_number,
            reasoning: reasoning
        }, userId);

        // שמירת המסמך
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
            debtId,
            'debt',
            'settlement',
            `settlement_${debt.case_number}_${Date.now()}.txt`,
            `הצעת_פשרה_${debt.case_number}_${new Date().toISOString().split('T')[0]}.txt`,
            '/generated/',
            settlementLetter,
            JSON.stringify({ 
                generated_by_ai: true, 
                case_number: debt.case_number,
                settlement_amount: settlement_amount,
                payment_terms: payment_terms
            })
        ]);

        logger.info(`🤝 הצעת פשרה נוצרה לתיק: ${debt.case_number} - ₪${settlement_amount}`);

        res.json({
            success: true,
            data: {
                documentId: documentId,
                settlementLetter: settlementLetter,
                filename: `הצעת_פשרה_${debt.case_number}_${new Date().toISOString().split('T')[0]}.txt`
            },
            message: 'הצעת פשרה נוצרה בהצלחה'
        });

    } catch (error) {
        logger.error('שגיאה ביצירת הצעת פשרה:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה ביצירת הצעת הפשרה'
        });
    }
});

// POST /api/debts/:id/payment - רישום תשלום
router.post('/:id/payment', async (req, res) => {
    try {
        const userId = req.user.id;
        const debtId = req.params.id;
        const { amount, payment_date, payment_method, notes } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'סכום תשלום חייב להיות גדול מ-0'
            });
        }

        // קבלת התיק הנוכחי
        const debtResult = await database.query(
            'SELECT * FROM debts WHERE id = $1 AND user_id = $2',
            [debtId, userId]
        );

        if (debtResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'תיק גביה לא נמצא'
            });
        }

        const debt = debtResult.rows[0];
        const newAmount = parseFloat(debt.current_amount) - parseFloat(amount);

        // עדכון היתרה
        const paymentHistory = debt.payment_history || [];
        paymentHistory.push({
            amount: parseFloat(amount),
            date: payment_date || new Date().toISOString().split('T')[0],
            method: payment_method || 'לא צוין',
            notes: notes || '',
            recorded_at: new Date().toISOString()
        });

        await database.query(`
            UPDATE debts 
            SET 
                current_amount = $1,
                payment_history = $2,
                case_status = CASE 
                    WHEN $1 <= 0 THEN 'settled'
                    ELSE case_status
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
        `, [newAmount, JSON.stringify(paymentHistory), debtId]);

        logger.info(`💳 תשלום נרשם: ₪${amount} עבור תיק ${debt.case_number}`);

        res.json({
            success: true,
            data: {
                previous_amount: debt.current_amount,
                payment_amount: amount,
                new_amount: newAmount,
                is_settled: newAmount <= 0
            },
            message: `תשלום של ₪${amount} נרשם בהצלחה`
        });

    } catch (error) {
        logger.error('שגיאה ברישום תשלום:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה ברישום התשלום'
        });
    }
});

module.exports = router;