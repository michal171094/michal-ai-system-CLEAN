#!/usr/bin/env node

/**
 * Supabase Database Setup Script
 * =============================
 * סקריפט זה עוזר להגדיר את הטבלאות ב-Supabase
 */

require('dotenv').config();
const fs = require('fs');
const readline = require('readline');

console.log(`
╔══════════════════════════════════════════════════════════╗
║        Supabase Database Setup - Life Orchestrator      ║
║                    Version 1.0.0                         ║
╚══════════════════════════════════════════════════════════╝
`);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (prompt) => {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
};

async function setupSupabase() {
    console.log('🔧 הגדרת Supabase Database...\n');
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        console.log('❌ חסרים משתני סביבה ל-Supabase!');
        console.log('ודא שקובץ .env קיים ומכיל SUPABASE_URL ו-SUPABASE_KEY');
        rl.close();
        return;
    }
    
    console.log('✅ משתני סביבה נמצאו');
    console.log(`📊 Supabase URL: ${process.env.SUPABASE_URL}`);
    console.log(`🔑 Supabase Key: ${process.env.SUPABASE_KEY.substring(0, 20)}...`);
    
    console.log('\n📋 הוראות הגדרה:');
    console.log('1. לך ל-Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. בחר את הפרויקט שלך');
    console.log('3. לך ל-SQL Editor');
    console.log('4. העתק והדבק את הקוד מ-database/supabase_schema.sql');
    console.log('5. הרץ את הקוד');
    
    const schemaPath = path.join(__dirname, 'database', 'supabase_schema.sql');
    if (fs.existsSync(schemaPath)) {
        console.log('\n📄 קובץ הסכמה נמצא: database/supabase_schema.sql');
        
        const showSchema = await question('האם להציג את הסכמה? (y/n): ');
        if (showSchema.toLowerCase() === 'y') {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            console.log('\n' + '='.repeat(80));
            console.log('SUPABASE SCHEMA:');
            console.log('='.repeat(80));
            console.log(schema);
            console.log('='.repeat(80));
        }
    }
    
    console.log('\n🚀 לאחר הגדרת הטבלאות:');
    console.log('1. הרץ: node check_services.js');
    console.log('2. בדוק שהחיבור ל-Supabase עובד');
    console.log('3. התחל להשתמש במערכת!');
    
    rl.close();
}

setupSupabase().catch(console.error);
