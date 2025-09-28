# מערכת עוזר AI אישית למיכל 🤖

מערכת ניהול חכמה המשלבת AI לניהול משימות אקדמיות, תיקי גביה ובירוקרטיה.

## 🏃‍♀️ התחלה מהירה (למיכל)

**להפעלת המערכת מיידית:**

1. **Windows**: לחץ כפול על `start.bat`
2. **או בטרמינל**: `npm start` (גרסה פשוטה) או `npm run start-full` (גרסה מלאה)
3. **פתח דפדפן**: http://localhost:3000

זהו! המערכת תעבוד עם כל הנתונים שלך שכבר טעונים.

**שני מצבים זמינים:**
- **גרסה פשוטה** (`npm start`): עובדת מיד, ללא צורך במסד נתונים
- **גרסה מלאה** (`npm run start-full`): מתקדמת יותר, דורשת PostgreSQL

---

## 🌟 תכונות עיקריות

### 📚 ניהול עבודות אקדמיות
- מעקב אחר תזות, מאמרים ופרויקטים
- ניהול לקוחות אקדמיים (סטודנטים, חוקרים)
- חישוב תמחור ומעקב תשלומים
- יצירת טיוטות וקווים מנחים אוטומטית

### ⚖️ ניהול תיקי גביה
- מעקב אחר חובות ותיקי גביה
- יצירת מכתבי התנגדות אוטומטיים
- הצעות פשרה חכמות
- מעקב מועדים ופעולות נדרשות

### 🏛️ ניהול בירוקרטיה
- מעקב בקשות למוסדות ממשלתיים
- ניהול מסמכים נדרשים
- יצירת ערעורים אוטומטיים
- התראות על מועדים חשובים

### 💬 עוזר AI חכם
- צ'ט אינטראקטיבי בעברית
- הבנת הקשר ומידע מצטבר
- יצירת מסמכים על פי בקשה
- הצעות פעולות אוטומטיות

## 🛠️ דרישות מערכת

- **Node.js** גרסה 18 ומעלה
- **PostgreSQL** גרסה 13 ומעלה  
- **npm** או **yarn**
- חשבון **OpenAI** עם API key
- (אופציונלי) חשבון **Gmail** לשילוב מיילים

## 🚀 התקנה מהירה

### שלב 1: הכנת הסביבה

```bash
# שכפול הפרויקט
git clone <repository-url>
cd michal-ai-assistant

# התקנת חבילות
npm install

# יצירת קובץ משתני סביבה
cp .env.example .env
```

### שלב 2: הגדרת מסד נתונים

```bash
# התקנת PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# יצירת מסד נתונים ומשתמש
sudo -u postgres createdb michal_assistant
sudo -u postgres createuser -P michal_user
# הזן סיסמה חזקה

# מתן הרשאות
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE michal_assistant TO michal_user;"
```

### שלב 3: עריכת קובץ .env

ערוך את הקובץ `.env` עם הפרטים שלך:

```env
# Database
DATABASE_URL=postgresql://michal_user:your_password@localhost:5432/michal_assistant

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here

# Security
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# Application
NODE_ENV=development
PORT=3000
```

### שלב 4: אתחול המערכת

```bash
# אתחול מלא של המערכת
npm run initialize

# התחלת השרת
npm start
```

🎉 **המערכת מוכנה!** גש ל-http://localhost:3000

### פרטי כניסה ברירת מחדל:
- **מייל:** michal@michal-ai.local  
- **סיסמה:** michal123!@#

---

## 🌐 פריסה לייצור

מוכנה לעבור לדומיין אמיתי? ראה את מדריך הפריסה המלא בתיקייה `deploy/README_DEPLOY.md`.

הוא כולל:

- Dockerfiles נפרדים לשרת ה-Node.js ולסוכן ה-AI ב-Python
- דוגמאות `.env` (web + agent) להגדרת משתני סביבה מאובטחים
- הוראות צעד-אחר-צעד לפריסה ב-Render / Railway והגדרת DNS מותאם אישית
- הנחיות לעדכון Google OAuth Redirect URI לאחר הפריסה

> טיפ: לאחר שהפרויקט רץ על הדומיין שלך, וודא ש-`AI_AGENT_URL` מצביע על תת-הדומיין של הסוכן (`agent.example.com`) ושגוגל מאשר את כתובת ה-Callback החדשה.

## 📁 מבנה הפרויקט

```
michal-ai-assistant/
├── 📂 public/              # קבצי Frontend
│   ├── index.html         # דף ראשי
│   ├── style.css          # עיצוב
│   └── app.js             # לוגיקה
├── 📂 routes/              # API Routes
│   ├── auth.js            # אימות
│   ├── tasks.js           # משימות
│   ├── clients.js         # לקוחות
│   ├── debts.js           # גביה
│   ├── bureaucracy.js     # בירוקרטיה
│   └── chat.js            # צ'ט AI
├── 📂 services/            # שירותים
│   └── AIService.js       # שירות AI
├── 📂 config/              # הגדרות
│   └── database.js        # מסד נתונים
├── 📂 middleware/          # Middleware
│   ├── auth.js            # אימות
│   └── errorHandler.js    # טיפול בשגיאות
├── 📂 database/            # מסד נתונים
│   └── schema.sql         # מבנה טבלאות
├── 📂 scripts/             # סקריפטים
│   └── initialize.js      # אתחול מערכת
├── 📂 utils/               # כלים
│   └── logger.js          # מערכת לוגים
├── server.js              # שרת ראשי
├── package.json           # תלויות
└── .env.example           # דוגמת משתני סביבה
```

## 🔧 פקודות npm זמינות

```bash
# הפעלה
npm start                  # הפעלת השרת בפרודקשן
npm run dev               # הפעלה במצב פיתוח (עם nodemon)
npm run initialize        # אתחול מערכת חדשה

# בדיקות
npm test                  # הרצת בדיקות
npm run test:watch        # בדיקות במצב מעקב

# תחזוקה
npm run migrate           # הרצת מיגרציות
npm run seed              # מילוי נתוני דמו
npm run logs              # הצגת לוגים אחרונים
```

## 🔌 שילובים חיצוניים

### OpenAI GPT-4
המערכת משתמשת ב-GPT-4 ליצירת:
- תגובות חכמות בצ'ט
- מכתבי התנגדות
- הצעות פשרה  
- ערעורים לרשויות
- טיוטות אקדמיות

### Gmail API (אופציונלי)
לשילוב מיילים:
1. צור פרויקט ב-Google Cloud Console
2. הפעל Gmail API
3. צור OAuth 2.0 credentials
4. הוסף לקובץ .env:
```env
GMAIL_CLIENT_ID=your-client-id
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token
```

## 📊 API Documentation

### Authentication
```http
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
```

### Tasks (משימות)
```http
GET /api/tasks              # כל המשימות
GET /api/tasks/urgent       # משימות דחופות
POST /api/tasks             # משימה חדשה
PUT /api/tasks/:id          # עדכון משימה
DELETE /api/tasks/:id       # מחיקת משימה
POST /api/tasks/:id/action  # פעולה חכמה
```

### Clients (לקוחות)
```http
GET /api/clients            # כל הלקוחות  
GET /api/clients/:id        # פרטי לקוח
POST /api/clients           # לקוח חדש
PUT /api/clients/:id        # עדכון לקוח
GET /api/clients/:id/projects # פרויקטים של לקוח
```

### Debts (גביה)
```http
GET /api/debts              # תיקי גביה
GET /api/debts/stats        # סטטיסטיקות
POST /api/debts             # תיק חדש
PUT /api/debts/:id          # עדכון תיק
POST /api/debts/:id/objection  # מכתב התנגדות
POST /api/debts/:id/settlement # הצעת פשרה
POST /api/debts/:id/payment    # רישום תשלום
```

### Chat (צ'ט)
```http
POST /api/chat/message      # הודעה חדשה
GET /api/chat/history       # היסטורית שיחות
POST /api/chat/upload       # העלאת קובץ
POST /api/chat/voice        # הודעה קולית
```

## 🛡️ אבטחה

- **JWT Authentication** - אימות מבוסס טוקנים
- **bcrypt** - הצפנת סיסמאות
- **Rate Limiting** - הגבלת בקשות
- **Input Validation** - וולידציה של נתונים
- **CORS Protection** - הגנה מפני CORS
- **SQL Injection Prevention** - הגנה מפני SQL injection

## 🐛 Debugging ופתרון בעיות

### בעיות נפוצות:

**שגיאת חיבור למסד נתונים:**
```bash
# בדיקת סטטוס PostgreSQL
sudo systemctl status postgresql

# התחלה מחדש
sudo systemctl restart postgresql

# בדיקת חיבור
psql -h localhost -U michal_user -d michal_assistant -c "SELECT 1;"
```

**שגיאת OpenAI API:**
- ודא שה-API key תקין ב-.env
- בדוק מכסה ויתרה בחשבון OpenAI
- ודא גישת אינטרנט מהשרת

**בעיות הרשאות:**
```bash
# הרשאות לתיקיות
chmod -R 755 uploads/ logs/ generated/

# בעלות על קבצים
sudo chown -R $USER:$USER .
```

### לוגים וניטור:
```bash
# צפיה בלוגים חיים
tail -f logs/app.log

# לוגי שגיאות
tail -f logs/errors.log

# לוגי ביצועים
tail -f logs/performance.log
```

## 🔄 עדכון המערכת

```bash
# גיבוי מסד נתונים
pg_dump -h localhost -U michal_user michal_assistant > backup.sql

# משיכת עדכונים
git pull origin main

# עדכון חבילות
npm install

# הרצת מיגרציות חדשות
npm run migrate

# התחלה מחדש
npm restart
```

## 📈 ביצועים ואופטימיזציה

### מניטור ביצועים:
- **Winston Logs** - מעקב פעילות מפורט
- **Database Monitoring** - ניטור שאילתות
- **Memory Usage** - מעקב זיכרון
- **Response Times** - מדידת זמני תגובה

### אופטימיזציות:
- **Connection Pooling** - מאגר חיבורי DB
- **Query Optimization** - שאילתות מותאמות
- **Caching** - קיישינג נתונים
- **Compression** - דחיסת תגובות

## 🤝 תמיכה ופיתוח

### דיווח באגים:
1. בדוק אם הבאג כבר דווח
2. צור Issue חדש עם פרטים מלאים
3. צרף לוגים רלוונטיים
4. תאר שלבים לשחזור

### הצעות שיפור:
- שלח Feature Request
- תאר את הצורך
- הצע מימוש אפשרי

### פיתוח מקומי:
```bash
# פיתוח עם hot reload
npm run dev

# בדיקות
npm test

# בדיקת לינטר
npm run lint
```

## 📋 Roadmap עתידי

### גרסה 1.1 (חודש הבא):
- [ ] שילוב WhatsApp Business API
- [ ] OCR למסמכים עבריים
- [ ] תמלול הודעות קוליות
- [ ] יצוא דוחות Excel/PDF

### גרסה 1.2 (בעוד חודשיים):
- [ ] אפליקציית מובייל
- [ ] Dashboard אנליטיקה
- [ ] אוטומציות מתקדמות
- [ ] שילוב לוח השנה

### גרסה 2.0 (עתיד רחוק):
- [ ] למידת מכונה אישית
- [ ] בינה מלאכותית חזוייתית
- [ ] שילובים נוספים (Slack, Zoom)
- [ ] ממשק API ציבורי

## 📄 רישיון

MIT License - ראה קובץ LICENSE

## 🙏 תודות

- **OpenAI** על GPT-4 המדהים
- **PostgreSQL** על מסד נתונים אמין
- **Node.js Community** על הכלים המעולים

---

**נוצר באהבה עבור מיכל 💝**

*מערכת זו פותחה במיוחד לצרכים המקצועיים של מיכל וניתנת להתאמה אישית נוספת על פי דרישה.*#   F o r c e   d e p l o y m e n t   t r i g g e r  
 #   F o r c e   d e p l o y   0 9 / 2 6 / 2 0 2 5   0 9 : 5 3 : 4 6  
 U p d a t e d   O A u t h   c r e d e n t i a l s   0 9 / 2 6 / 2 0 2 5   1 0 : 1 7 : 1 5  
 