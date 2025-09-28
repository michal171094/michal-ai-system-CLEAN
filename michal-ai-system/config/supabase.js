/**
 * Supabase Database Connection & Management
 * מנהל את החיבור למסד הנתונים והפעולות
 */

const { createClient } = require('@supabase/supabase-js');

// הגדרת החיבור
const supabaseUrl = 'https://cnvfscvhwmhttcrhvftx.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;

// אתחול החיבור
function initSupabase() {
    if (!supabaseKey) {
        console.warn('⚠️ SUPABASE_KEY לא מוגדר - עובד במצב mock');
        return null;
    }
    
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
        console.log('✅ חובר בהצלחה ל-Supabase');
        return supabase;
    } catch (error) {
        console.error('❌ שגיאה בחיבור ל-Supabase:', error);
        return null;
    }
}

// פונקציות עזר למשימות
async function getTasks(userId = 1) {
    if (!supabase) {
        // נתונים מדומים אם אין חיבור
        return {
            data: [
                {id: 1, project: "תזת מאסטר - מרב", client: "מרב שטרן", type: "תזה", status: "בעבודה", progress: 65, deadline: "2025-10-30", currency: "₪", value: 2500, priority: "בינוני", action: "כתיבת פרק 3"},
                {id: 2, project: "סמינר פסיכולוגיה - כרמית", client: "כרמית לוי", type: "סמינר", status: "לסיום", progress: 85, deadline: "2025-09-24", currency: "₪", value: 800, priority: "דחוף", action: "סיכום וביבליוגרפיה"}
            ],
            error: null
        };
    }
    
    try {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId)
            .order('deadline', { ascending: true });
            
        return { data, error };
    } catch (error) {
        console.error('שגיאה בקריאת משימות:', error);
        return { data: null, error };
    }
}

async function getDebts(userId = 1) {
    if (!supabase) {
        return {
            data: [
                {id: 1, creditor: "PAIR Finance", company: "Vodafone", amount: 89.12, currency: "€", case_number: "PF2024-8901", status: "פתוח", deadline: "2025-09-26", action: "כתיבת מכתב התנגדות", priority: "דחוף"},
                {id: 2, creditor: "Creditreform", company: "Deutsche Telekom", amount: 156.45, currency: "€", case_number: "CR2024-1564", status: "התראה", deadline: "2025-10-01", action: "בירור החוב", priority: "גבוה"}
            ],
            error: null
        };
    }
    
    try {
        const { data, error } = await supabase
            .from('debts')
            .select('*')
            .eq('user_id', userId)
            .order('deadline', { ascending: true });
            
        return { data, error };
    } catch (error) {
        console.error('שגיאה בקריאת חובות:', error);
        return { data: null, error };
    }
}

async function getBureaucracy(userId = 1) {
    if (!supabase) {
        return {
            data: [
                {id: 1, task: "רישום נישואין", authority: "Standesamt Berlin", status: "בהמתנה", deadline: "2025-10-15", action: "בירור סטטוס בקשה", priority: "גבוה"},
                {id: 2, task: "ביטוח בריאות - אוריון", authority: "TK", status: "טרם פתור", deadline: "2025-09-30", action: "הגשת מסמכים", priority: "דחוף"}
            ],
            error: null
        };
    }
    
    try {
        const { data, error } = await supabase
            .from('bureaucracy')
            .select('*')
            .eq('user_id', userId)
            .order('deadline', { ascending: true });
            
        return { data, error };
    } catch (error) {
        console.error('שגיאה בקריאת בירוקרטיה:', error);
        return { data: null, error };
    }
}

// הוספת משימה חדשה
async function addTask(taskData) {
    if (!supabase) {
        console.log('מצב mock - משימה לא נשמרה:', taskData);
        return { data: {...taskData, id: Math.random()}, error: null };
    }
    
    try {
        const { data, error } = await supabase
            .from('tasks')
            .insert([taskData])
            .select();
            
        return { data: data?.[0], error };
    } catch (error) {
        console.error('שגיאה בהוספת משימה:', error);
        return { data: null, error };
    }
}

// עדכון סטטוס
async function updateTaskStatus(taskId, status) {
    if (!supabase) {
        console.log(`מצב mock - עדכון משימה ${taskId} לסטטוס ${status}`);
        return { data: { id: taskId, status }, error: null };
    }
    
    try {
        const { data, error } = await supabase
            .from('tasks')
            .update({ status, updated_at: new Date() })
            .eq('id', taskId)
            .select();
            
        return { data: data?.[0], error };
    } catch (error) {
        console.error('שגיאה בעדכון משימה:', error);
        return { data: null, error };
    }
}

// אתחול החיבור
const db = initSupabase();

module.exports = {
    supabase: db,
    getTasks,
    getDebts,
    getBureaucracy,
    addTask,
    updateTaskStatus,
    initSupabase
};