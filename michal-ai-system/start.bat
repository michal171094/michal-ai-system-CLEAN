לחצי כפול על start.bat@echo off
echo מתחיל מערכת עוזר AI אישית למיכל...
echo.

REM בדיקת Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [שגיאה] Node.js לא מותקן במערכת
    echo אנא התקן Node.js מהכתובת: https://nodejs.org/
    pause
    exit /b 1
)

REM בדיקת npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo [שגיאה] npm לא זמין
    pause
    exit /b 1
)

REM בדיקת תיקיית node_modules
if not exist "node_modules" (
    echo התקנת תלויות...
    npm install
    if errorlevel 1 (
        echo [שגיאה] ההתקנה נכשלה
        pause
        exit /b 1
    )
)

REM יצירת תיקיית לוגים
if not exist "logs" mkdir logs

REM בדיקת קובץ .env
if not exist ".env" (
    echo יוצר קובץ הגדרות...
    copy ".env.example" ".env"
    echo אנא ערוך את קובץ .env עם ההגדרות שלך
)

echo.
echo הפעלת השרת...
echo פתח דפדפן וגש לכתובת: http://localhost:3000
echo לעצירת השרת לחץ Ctrl+C
echo.

REM הפעלת השרת
node simple-server.js

pause