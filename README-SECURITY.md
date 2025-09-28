# הערה חשובה - מפתחות הוסרו מהפרויקט
**⚠️ קובץ זה הוכן להעלאה ב-Cursor ללא מפתחות רגישים**

## מפתחות שהוסרו וצריכים להיות מוגדרים:

### 1. קובץ הקונפיגורציה (config.env)
- `SUPABASE_URL` - כתובת מסד הנתונים של Supabase
- `SUPABASE_KEY` - מפתח אנונימי של Supabase  
- `SUPABASE_SERVICE_KEY` - מפתח שירות של Supabase
- `GOOGLE_CLIENT_ID` - מזהה לקוח Google OAuth
- `GOOGLE_CLIENT_SECRET` - סוד לקוח Google OAuth
- `OPENAI_API_KEY` - מפתח API של OpenAI
- `GEMINI_API_KEY` - מפתח API של Gemini

### 2. קבצי הקוד שתוקנו:
- `simple-server.js` - הוחלפו מפתחות ה-API בטקסט שומר מקום
- `config/supabase.js` - הוסר כתובת Supabase הקשיחה
- `michal-ai-system/simple-server.js` - תוקן גם כן

### 3. כיצד להשתמש בפרויקט:
1. העתק את `env.example` ל-`config.env` או `.env`
2. מלא את כל המפתחות הנדרשים
3. הפעל `npm install` להתקנת התלויות
4. הפעל `npm start` או `node simple-server.js`

### 4. הערות:
- כל המפתחות הרגישים הוסרו בבטחה
- הפרויקט כולל שני עותקים של הקוד - בתיקייה הראשית ובתיקיית michal-ai-system
- יש קבצים כפולים - מומלץ לבחור אחד מהם לעבודה

**אל תשכח להוסיף את קובץ הקונפיגורציה ל-.gitignore כדי למנוע דליפת מפתחות!**