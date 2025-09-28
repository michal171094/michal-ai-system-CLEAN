# Life Context Agent - המערכת החכמה של מיכל

## 🧠 מה זה Life Context Agent?

Life Context Agent הוא מערכת AI מתקדמת שמבינה את ההקשר של החיים שלך ומטפלת בכל המידע באופן חכם ואוטומטי.

## 🏗️ ארכיטקטורה

### רכיבים עיקריים:
- **Context Graph**: גרף הקשרים שמתאר את כל האלמנטים בחיים
- **Perception Module**: קליטת מידע מכל המקורות (מייל, מסמכים, וכו')
- **Understanding Module**: הבנת משמעויות והקשרים
- **Decision Module**: קבלת החלטות חכמות
- **Action Module**: ביצוע פעולות אוטומטיות
- **Main Orchestrator**: הלולאה הראשית שמתזמרת הכל

### קבצים:
- `ContextGraph.js` - גרף הקשרים בין כל האלמנטים
- `PerceptionModule.js` - קליטת מידע ממיילים ומקורות אחרים
- `UnderstandingModule.js` - הבנת משמעויות והקשרים
- `DecisionModule.js` - קבלת החלטות אסטרטגיות
- `ActionModule.js` - ביצוע פעולות (שליחת הודעות, יצירת תזכורות)
- `LifeOrchestratorAgent.js` - הלולאה הראשית

## 🚀 איך זה עובד?

1. **Perception**: המערכת סורקת מיילים ומקורות מידע
2. **Understanding**: מנתחת את המשמעות וההקשר
3. **Decision**: מחליטה מה צריך לעשות
4. **Action**: מבצעת פעולות אוטומטיות
5. **Learning**: לומדת מהתוצאות ומשפרת

## 🎯 יכולות עיקריות:

- **זיהוי חכם של עדכונים**: מזהה עדכוני חובות, בירוקרטיה, בריאות
- **שיוך למשימות קיימות**: משייך עדכונים למשימות הנכונות
- **החלטות אסטרטגיות**: מציעה פעולות חכמות
- **למידה מתמדת**: משפרת את הביצועים עם הזמן

## 🔧 התקנה והפעלה:

1. ודא שיש לך את כל המפתחות הנדרשים בקובץ `.env`
2. הפעל את השרת: `node simple-server.js`
3. הפעל את Life Context Agent דרך ה-API: `POST /api/life-context/start`

## 📊 API Endpoints:

- `POST /api/life-context/start` - הפעלת המערכת
- `POST /api/life-context/stop` - עצירת המערכת
- `GET /api/life-context/status` - סטטוס המערכת
- `GET /api/life-context/context-graph` - גרף הקשרים

## 🧠 פילוסופיה: "Life Orchestrator"

המערכת פועלת לפי הפילוסופיה של "Life Orchestrator" - מנצח על החיים שלך כמו מנצח תזמורת, שמתזמר את כל האלמנטים השונים להרמוניה מושלמת.
