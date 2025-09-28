// Mock data לפיתוח ובדיקות
// נתונים אמיתיים של מיכל

const tasks = [
    // עבודות אקדמיות
    {id: 1, project: "תזת מאסטר - מרב", client: "מרב שטרן", type: "תזה", status: "בעבודה", progress: 65, deadline: "2025-10-30", currency: "₪", value: 2500, priority: "בינוני", action: "כתיבת פרק 3"},
    {id: 2, project: "סמינר פסיכולוגיה - כרמית", client: "כרמית לוי", type: "סמינר", status: "לסיום", progress: 85, deadline: "2025-09-24", currency: "₪", value: 800, priority: "דחוף", action: "סיכום וביבליוגרפיה"},
    {id: 3, project: "מחקר איכותני - יונתן", client: "יונתן כהן", type: "מחקר", status: "הצעת מחקר", progress: 30, deadline: "2025-11-15", currency: "₪", value: 1500, priority: "בינוני", action: "איסוף נתונים"},
    {id: 4, project: "עבודה סמינריונית - שירה", client: "שירה אברהם", type: "סמינר", status: "בעבודה", progress: 45, deadline: "2025-10-20", currency: "₪", value: 650, priority: "בינוני", action: "ביקורת ספרות"},
    {id: 5, project: "פרויקט גמר - אלי", client: "אלי רוזנברג", type: "פרויקט", status: "טיוטה", progress: 70, deadline: "2025-12-01", currency: "₪", value: 1200, priority: "נמוך", action: "עריכה"},
    {id: 6, project: "מאמר לפרסום - ד\"ר ברק", client: "ד\"ר דוד ברק", type: "מאמר", status: "הגשה", progress: 95, deadline: "2025-10-05", currency: "₪", value: 3000, priority: "גבוה", action: "הגשה לכתב עת"},
    {id: 7, project: "הצעת מחקר - רינה", client: "רינה פרידמן", type: "הצעה", status: "בעבודה", progress: 55, deadline: "2025-11-30", currency: "₪", value: 900, priority: "בינוני", action: "כתיבת מתודולוגיה"},
    {id: 8, project: "סקירת ספרות - משה", client: "משה גולדשטיין", type: "סקירה", status: "בעבודה", progress: 40, deadline: "2025-10-15", currency: "₪", value: 500, priority: "גבוה", action: "הרחבת מקורות"},
    {id: 9, project: "תרגום מחקר - גרמנית", client: "אוני' תל אביב", type: "תרגום", status: "בעבודה", progress: 25, deadline: "2025-12-15", currency: "₪", value: 800, priority: "נמוך", action: "תרגום פרק 2"},
    {id: 10, project: "ייעוץ סטטיסטי - נועה", client: "נועה בן דוד", type: "ייעוץ", status: "בעבודה", progress: 60, deadline: "2025-10-10", currency: "₪", value: 400, priority: "גבוה", action: "ניתוח SPSS"},
    {id: 11, project: "עריכת תזה - גרמנית", client: "מרקו שמידט", type: "עריכה", status: "בעבודה", progress: 80, deadline: "2025-10-25", currency: "€", value: 150, priority: "בינוני", action: "עריכה סופית"},
    {id: 12, project: "כתיבת CV אקדמי", client: "ענת מור", type: "כתיבה", status: "הושלם", progress: 100, deadline: "2025-09-20", currency: "₪", value: 300, priority: "הושלם", action: "נמסר ללקוח"},
    {id: 13, project: "הכנת מצגת - אנגלית", client: "רון כץ", type: "מצגת", status: "בעבודה", progress: 35, deadline: "2025-10-12", currency: "₪", value: 450, priority: "גבוה", action: "עיצוב סלידים"},
    {id: 14, project: "ביקורת עמיתים", client: "כתב עת במדעי החברה", type: "ביקורת", status: "בעבודה", progress: 20, deadline: "2025-11-05", currency: "₪", value: 600, priority: "בינוני", action: "קריאה וניתוח"},
    {id: 15, project: "סדנת כתיבה אקדמית", client: "המכללה האקדמית", type: "הדרכה", status: "מתוכנן", progress: 10, deadline: "2025-12-20", currency: "₪", value: 1800, priority: "נמוך", action: "הכנת חומרים"}
];

const clients = [
    {id: 1, name: "מרב שטרן", email: "merav.stern@gmail.com", phone: "050-1234567", type: "סטודנט מ.א", university: "אוניברסיטת חיפה", field: "פסיכולוגיה"},
    {id: 2, name: "כרמית לוי", email: "carmit.l@walla.com", phone: "052-9876543", type: "סטודנט ב.א", university: "אוניברסיטת בר אילן", field: "חינוך"},
    {id: 3, name: "יונתן כהן", email: "yonatan.cohen@mail.tau.ac.il", phone: "054-5556789", type: "דוקטורנט", university: "אוניברסיטת תל אביב", field: "סוציולוגיה"},
    {id: 4, name: "שירה אברהם", email: "shira.av@gmail.com", phone: "050-1111222", type: "סטודנט מ.א", university: "האוניברסיטה העברית", field: "מדעי המדינה"},
    {id: 5, name: "אלי רוזנברג", email: "eli.rosen@student.bgu.ac.il", phone: "052-3334445", type: "סטודנט ב.א", university: "אוניברסיטת בן גוריון", field: "כלכלה"},
    {id: 6, name: "ד\"ר דוד ברק", email: "david.barak@research.org", phone: "03-6667778", type: "חוקר בכיר", university: "מכון וייצמן", field: "מדעי החברה"},
    {id: 7, name: "רינה פרידמן", email: "rina.f@technion.ac.il", phone: "054-8889990", type: "סטודנט מ.א", university: "הטכניון", field: "ניהול טכנולוגיה"},
    {id: 8, name: "משה גולדשטיין", email: "moshe.gold@openu.ac.il", phone: "050-7776665", type: "סטודנט מ.א", university: "האוניברסיטה הפתוחה", field: "היסטוריה"}
];

const debts = [
    {id: 1, creditor: "PAIR Finance", company: "Vodafone", amount: 89.12, currency: "€", case_number: "PF2024-8901", status: "פתוח", deadline: "2025-09-26", action: "כתיבת מכתב התנגדות", priority: "דחוף"},
    {id: 2, creditor: "Creditreform", company: "Deutsche Telekom", amount: 156.45, currency: "€", case_number: "CR2024-1564", status: "התראה", deadline: "2025-10-01", action: "בירור החוב", priority: "גבוה"},
    {id: 3, creditor: "רשות האכיפה והגביה", company: "עיריית ירושלים", amount: 1250, currency: "₪", case_number: "EA2024-3456", status: "בהתנגדות", deadline: "2025-10-15", action: "המתנה לתשובה", priority: "בינוני"},
    {id: 4, creditor: "EOS Germany", company: "Amazon", amount: 234.78, currency: "€", case_number: "EOS2024-7890", status: "פתוח", deadline: "2025-10-08", action: "בקשת פירוט החוב", priority: "גבוה"},
    {id: 5, creditor: "משרד עורכי דין כהן ושות'", company: "בזק בינלאומי", amount: 890, currency: "₪", case_number: "KS2024-5678", status: "פתוח", deadline: "2025-09-30", action: "יצירת קשר", priority: "דחוף"},
    {id: 6, creditor: "Arvato Financial", company: "Otto Group", amount: 67.34, currency: "€", case_number: "AF2024-2345", status: "נסגר", deadline: "2025-08-15", action: "הושלם", priority: "סגור"},
    {id: 7, creditor: "רשות המיסים", company: "מס הכנסה", amount: 3200, currency: "₪", case_number: "TAX2024-9876", status: "בהסדר", deadline: "2025-11-30", action: "תשלום חודשי", priority: "בינוני"},
    {id: 8, creditor: "Inkasso Moskowitz", company: "הוט מובייל", amount: 2015, currency: "₪", case_number: "IM2024-4567", status: "פתוח", deadline: "2025-10-05", action: "הצעת פשרה", priority: "גבוה"}
];

const bureaucracy = [
    {id: 1, task: "רישום נישואין", authority: "Standesamt Berlin", status: "בהמתנה", deadline: "2025-10-15", action: "בירור סטטוס בקשה", priority: "גבוה"},
    {id: 2, task: "ביטוח בריאות - אוריון", authority: "TK", status: "טרם פתור", deadline: "2025-09-30", action: "הגשת מסמכים", priority: "דחוף"},
    {id: 3, task: "בקשת אישור שהייה", authority: "LEA Berlin", status: "בהליך", deadline: "2025-11-01", action: "מעקב אחר בקשה", priority: "בינוני"},
    {id: 4, task: "דיווח Bürgergeld", authority: "Jobcenter", status: "מאושר", deadline: "2025-10-31", action: "דיווח חודשי", priority: "נמוך"},
    {id: 5, task: "חידוש דרכון ישראלי", authority: "הקונסוליה בברלין", status: "בהליך", deadline: "2025-12-15", action: "המתנה לתור", priority: "בינוני"},
    {id: 6, task: "אישור לימודים", authority: "Universität Berlin", status: "מאושר", deadline: "2025-09-25", action: "קבלת אישור", priority: "הושלם"},
    {id: 7, task: "בקשת מלגה", authority: "DAAD", status: "הוגש", deadline: "2025-11-30", action: "המתנה לתשובה", priority: "נמוך"},
    {id: 8, task: "רישום כתובת", authority: "Bürgeramt", status: "מעודכן", deadline: "2025-09-20", action: "הושלם", priority: "סגור"},
    {id: 9, task: "בקשת העברת קצבת ילדים", authority: "Familienkasse", status: "בהליך", deadline: "2025-10-20", action: "המתנה לאישור", priority: "גבוה"},
    {id: 10, task: "פטור מביטוח חובה", authority: "GEZ", status: "נדחה", deadline: "2025-09-28", action: "הגשת ערעור", priority: "דחוף"},
    {id: 11, task: "אישור הכנסות לדירה", authority: "Vermietungsgesellschaft", status: "נדרש", deadline: "2025-10-10", action: "הכנת מסמכים", priority: "גבוה"},
    {id: 12, task: "בקשת WBS", authority: "Wohnungsamt", status: "בהליך", deadline: "2025-11-15", action: "המתנה לעדכון", priority: "בינוני"}
];

module.exports = {
    tasks,
    clients, 
    debts,
    bureaucracy
};