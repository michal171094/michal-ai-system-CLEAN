const express = require('express');
const router = express.Router();
const database = require('../config/database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// GET /api/clients - קבלת כל הלקוחות
router.get('/', async (req, res) => {
    try {
        // במצב mock - החזר נתונים סטטיים
        if (process.env.DB_MOCK === 'true') {
            const mockClients = require('../scripts/mockData').clients;
            return res.json({
                success: true,
                data: mockClients,
                total: mockClients.length,
                message: 'לקוחות נטענו בהצלחה'
            });
        }

        const userId = req.user.id;
        const { client_type, status, search, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT 
                c.*,
                COUNT(t.id) as total_tasks,
                COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
                COALESCE(SUM(t.price_final) FILTER (WHERE t.payment_status = 'paid'), 0) as total_revenue
            FROM clients c
            LEFT JOIN tasks t ON c.id = t.client_id
            WHERE c.user_id = $1
        `;
        const params = [userId];
        let paramIndex = 2;

        // פילטרים
        if (client_type) {
            query += ` AND c.client_type = $${paramIndex}`;
            params.push(client_type);
            paramIndex++;
        }

        if (status) {
            query += ` AND c.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (search) {
            query += ` AND (c.name ILIKE $${paramIndex} OR c.company ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        query += ` 
            GROUP BY c.id
            ORDER BY c.name 
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);

        const result = await database.query(query, params);
        
        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        logger.error('שגיאה בקבלת לקוחות:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בקבלת רשימת הלקוחות'
        });
    }
});

// GET /api/clients/:id - קבלת פרטי לקוח ספציפי
router.get('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const clientId = req.params.id;

        const clientResult = await database.query(`
            SELECT * FROM clients 
            WHERE id = $1 AND user_id = $2
        `, [clientId, userId]);

        if (clientResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'לקוח לא נמצא'
            });
        }

        // קבלת משימות הלקוח
        const tasksResult = await database.query(`
            SELECT 
                id, title, status, priority, deadline, price_quoted, 
                price_final, payment_status, created_at
            FROM tasks 
            WHERE client_id = $1 
            ORDER BY created_at DESC
        `, [clientId]);

        const client = clientResult.rows[0];
        client.tasks = tasksResult.rows;

        res.json({
            success: true,
            data: client
        });

    } catch (error) {
        logger.error('שגיאה בקבלת פרטי לקוח:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בקבלת פרטי הלקוח'
        });
    }
});

// POST /api/clients - יצירת לקוח חדש
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            name,
            company,
            email,
            phone,
            address,
            contact_person,
            notes,
            client_type = 'academic'
        } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'שם הלקוח הוא שדה חובה'
            });
        }

        const clientId = uuidv4();
        const result = await database.query(`
            INSERT INTO clients (
                id, user_id, name, company, email, phone, 
                address, contact_person, notes, client_type
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            clientId, userId, name, company, email, phone,
            address, contact_person, notes, client_type
        ]);

        logger.info(`✅ לקוח חדש נוצר: ${name} (${clientId})`);

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'הלקוח נוסף בהצלחה'
        });

    } catch (error) {
        logger.error('שגיאה ביצירת לקוח:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה ביצירת הלקוח'
        });
    }
});

// PUT /api/clients/:id - עדכון לקוח
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const clientId = req.params.id;
        const updates = req.body;

        // בדיקה שהלקוח שייך למשתמש
        const existingClient = await database.query(
            'SELECT * FROM clients WHERE id = $1 AND user_id = $2',
            [clientId, userId]
        );

        if (existingClient.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'לקוח לא נמצא'
            });
        }

        // בניית שאילתת עדכון
        const allowedFields = [
            'name', 'company', 'email', 'phone', 'address',
            'contact_person', 'notes', 'status', 'client_type'
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
            UPDATE clients 
            SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;

        const result = await database.query(query, [clientId, userId, ...updateValues]);

        res.json({
            success: true,
            data: result.rows[0],
            message: 'הלקוח עודכן בהצלחה'
        });

    } catch (error) {
        logger.error('שגיאה בעדכון לקוח:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בעדכון הלקוח'
        });
    }
});

// DELETE /api/clients/:id - מחיקת לקוח
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const clientId = req.params.id;

        // בדיקה שאין משימות פעילות
        const activeTasks = await database.query(`
            SELECT COUNT(*) as count 
            FROM tasks 
            WHERE client_id = $1 AND status NOT IN ('completed', 'cancelled')
        `, [clientId]);

        if (parseInt(activeTasks.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                message: 'לא ניתן למחוק לקוח עם משימות פעילות'
            });
        }

        const result = await database.query(
            'DELETE FROM clients WHERE id = $1 AND user_id = $2 RETURNING name',
            [clientId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'לקוח לא נמצא'
            });
        }

        logger.info(`🗑️ לקוח נמחק: ${result.rows[0].name} (${clientId})`);

        res.json({
            success: true,
            message: 'הלקוח נמחק בהצלחה'
        });

    } catch (error) {
        logger.error('שגיאה במחיקת לקוח:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה במחיקת הלקוח'
        });
    }
});

// GET /api/clients/:id/projects - פרויקטים של לקוח
router.get('/:id/projects', async (req, res) => {
    try {
        const userId = req.user.id;
        const clientId = req.params.id;

        const result = await database.query(`
            SELECT 
                t.*,
                CASE 
                    WHEN t.deadline < CURRENT_DATE AND t.status != 'completed' THEN 'overdue'
                    WHEN t.deadline <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
                    ELSE 'normal'
                END as urgency_status
            FROM tasks t
            WHERE t.client_id = $1 AND t.user_id = $2
            ORDER BY t.created_at DESC
        `, [clientId, userId]);

        // חישוב סטטיסטיקות
        const stats = {
            total: result.rows.length,
            completed: result.rows.filter(t => t.status === 'completed').length,
            in_progress: result.rows.filter(t => t.status === 'in_progress').length,
            pending: result.rows.filter(t => t.status === 'pending').length,
            overdue: result.rows.filter(t => t.urgency_status === 'overdue').length
        };

        res.json({
            success: true,
            data: {
                projects: result.rows,
                stats: stats
            }
        });

    } catch (error) {
        logger.error('שגיאה בקבלת פרויקטי לקוח:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בקבלת פרויקטי הלקוח'
        });
    }
});

module.exports = router;