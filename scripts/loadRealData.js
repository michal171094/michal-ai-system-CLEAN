const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Load real data from CSV files
function loadTasksFromCSV() {
    return new Promise((resolve, reject) => {
        const tasks = [];
        
        const csvPath = path.join(__dirname, '../all_tasks_cleaned.csv');
        
        // Check if file exists
        if (!fs.existsSync(csvPath)) {
            console.log('⚠️ קובץ משימות לא נמצא, משתמש בנתונים ריקים');
            resolve([]);
            return;
        }
        
        fs.createReadStream(csvPath, { encoding: 'utf8' })
            .pipe(csv())
            .on('data', (row) => {
                // Debug: log the first row
                if (tasks.length === 0) {
                    console.log('First row keys:', Object.keys(row));
                    console.log('First row entity:', row.entity);
                    console.log('First row subject:', row.subject);
                }
                
                // Check if we have the required fields
                const entity = row.entity || row['entity'];
                const subject = row.subject || row['subject'];
                
                if (entity && subject) {
                    tasks.push({
                        id: tasks.length + 1,
                        title: subject,
                        description: row.notes || '',
                        category: mapCategory(row.category),
                        priority: row.urgent === 'True' ? 9 : 5,
                        status: mapStatus(row.status),
                        deadline: row.deadline || null,
                        client_name: entity,
                        amount: null,
                        case_number: null,
                        urgent_actions: row.required_actions ? JSON.parse(row.required_actions) : [],
                        documents_needed: row.documents_needed || row.doccuments_needed ? JSON.parse(row.documents_needed || row.doccuments_needed) : []
                    });
                }
            })
            .on('end', () => {
                console.log(`✅ נטענו ${tasks.length} משימות מהקובץ CSV`);
                resolve(tasks);
            })
            .on('error', reject);
    });
}

function loadDebtsFromCSV() {
    return new Promise((resolve, reject) => {
        const debts = [];
        
        const csvPath = path.join(__dirname, '../all_debts_final_cleaned.csv');
        
        // Check if file exists
        if (!fs.existsSync(csvPath)) {
            console.log('⚠️ קובץ חובות לא נמצא, משתמש בנתונים ריקים');
            resolve([]);
            return;
        }
        
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (row) => {
                if (row.creditor && row.amount) {
                    debts.push({
                        id: debts.length + 1,
                        title: `חוב - ${row.creditor}`,
                        description: row.notes || '',
                        category: 'debt',
                        priority: 8,
                        status: 'pending',
                        deadline: null,
                        creditor: row.creditor, // שמור את שם הנושה
                        client_name: row.collection_agency || row.creditor,
                        amount: parseFloat(row.amount) || 0,
                        case_number: row.case_number || null,
                        currency: row.currency || 'EUR',
                        collection_agency: row.collection_agency || ''
                    });
                }
            })
            .on('end', () => {
                console.log(`✅ נטענו ${debts.length} חובות מהקובץ CSV`);
                resolve(debts);
            })
            .on('error', reject);
    });
}

function loadClientsFromCSV() {
    return new Promise((resolve, reject) => {
        const clientsPath = path.join(__dirname, '../clients_no_id.csv');
        
        // Check if file exists
        if (!fs.existsSync(clientsPath)) {
            console.log('⚠️ קובץ לקוחות לא נמצא, משתמש בנתונים ריקים');
            resolve([]);
            return;
        }
        
        const clients = [];
        
        fs.createReadStream(clientsPath)
            .pipe(csv())
            .on('data', (row) => {
                if (row.name) {
                    clients.push({
                        id: clients.length + 1,
                        name: row.name,
                        notes: row.notes || '',
                        total_projects: parseInt(row.total_projects) || 0,
                        created_at: row.created_at || new Date().toISOString()
                    });
                }
            })
            .on('end', () => {
                console.log(`✅ נטענו ${clients.length} לקוחות מהקובץ CSV`);
                resolve(clients);
            })
            .on('error', reject);
    });
}

function mapCategory(csvCategory) {
    const categoryMap = {
        'Legal': 'bureaucracy',
        'Immigration': 'bureaucracy', 
        'Health': 'personal',
        'Finance': 'debt',
        'Bureaucracy': 'bureaucracy'
    };
    return categoryMap[csvCategory] || 'personal';
}

function mapStatus(csvStatus) {
    const statusMap = {
        'pending': 'pending',
        'in_progress': 'in_progress',
        'completed': 'done',
        'done': 'done'
    };
    return statusMap[csvStatus] || 'pending';
}

async function loadAllRealData() {
    try {
        const [tasks, debts, clients] = await Promise.all([
            loadTasksFromCSV(),
            loadDebtsFromCSV(), 
            loadClientsFromCSV()
        ]);

        // Create empty bureaucracy array
        const bureaucracy = [];

        // Combine all data
        const allTasks = [...tasks, ...debts];
        
        return {
            tasks: allTasks,
            clients: clients,
            debts: debts,
            bureaucracy: bureaucracy,
            stats: {
                total: allTasks.length,
                urgent: allTasks.filter(t => t.priority >= 8).length,
                pending: allTasks.filter(t => t.status === 'pending').length,
                in_progress: allTasks.filter(t => t.status === 'in_progress').length,
                done: allTasks.filter(t => t.status === 'done').length
            }
        };
    } catch (error) {
        console.error('❌ שגיאה בטעינת נתונים אמיתיים:', error);
        throw error;
    }
}

module.exports = { loadAllRealData };
