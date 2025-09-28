#!/usr/bin/env node

/**
 * External Services Setup Script
 * =============================
 * סקריפט זה עוזר להגדיר את כל השירותים החיצוניים
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

console.log(`
╔══════════════════════════════════════════════════════════╗
║        External Services Setup - Life Orchestrator      ║
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

async function setupServices() {
    console.log('🔧 הגדרת שירותים חיצוניים...\n');
    
    const config = {};
    
    // Supabase Setup
    console.log('📊 Supabase Configuration:');
    console.log('1. לך ל: https://supabase.com/dashboard');
    console.log('2. צור פרויקט חדש או בחר פרויקט קיים');
    console.log('3. לך ל Settings > API');
    console.log('4. העתק את ה-anon public key\n');
    
    const supabaseKey = await question('הכנס את Supabase anon key (או Enter לדילוג): ');
    if (supabaseKey.trim()) {
        config.SUPABASE_KEY = supabaseKey.trim();
    }
    
    // Google OAuth Setup
    console.log('\n📧 Google OAuth Configuration:');
    console.log('1. לך ל: https://console.developers.google.com');
    console.log('2. צור פרויקט חדש או בחר פרויקט קיים');
    console.log('3. הפעל את Gmail API');
    console.log('4. צור OAuth 2.0 credentials');
    console.log('5. הוסף http://localhost:3000/auth/google/callback ל-Authorized redirect URIs\n');
    
    const googleClientId = await question('הכנס את Google Client ID (או Enter לדילוג): ');
    if (googleClientId.trim()) {
        config.GOOGLE_CLIENT_ID = googleClientId.trim();
    }
    
    const googleClientSecret = await question('הכנס את Google Client Secret (או Enter לדילוג): ');
    if (googleClientSecret.trim()) {
        config.GOOGLE_CLIENT_SECRET = googleClientSecret.trim();
    }
    
    // WhatsApp Setup
    console.log('\n📱 WhatsApp Business API Configuration:');
    console.log('1. לך ל: https://developers.facebook.com');
    console.log('2. צור אפליקציה חדשה');
    console.log('3. הוסף WhatsApp Business API');
    console.log('4. קבל את ה-Access Token ו-Phone Number ID\n');
    
    const whatsappToken = await question('הכנס את WhatsApp Access Token (או Enter לדילוג): ');
    if (whatsappToken.trim()) {
        config.WHATSAPP_TOKEN = whatsappToken.trim();
    }
    
    const whatsappPhoneId = await question('הכנס את WhatsApp Phone Number ID (או Enter לדילוג): ');
    if (whatsappPhoneId.trim()) {
        config.WHATSAPP_PHONE_NUMBER_ID = whatsappPhoneId.trim();
    }
    
    // OCR Setup
    console.log('\n🔍 OCR Configuration:');
    console.log('אפשרויות:');
    console.log('1. Google Vision API');
    console.log('2. Azure Computer Vision');
    console.log('3. AWS Textract');
    console.log('4. Tesseract (local)\n');
    
    const ocrApiKey = await question('הכנס את OCR API Key (או Enter לדילוג): ');
    if (ocrApiKey.trim()) {
        config.OCR_API_KEY = ocrApiKey.trim();
    }
    
    // AI Services Setup
    console.log('\n🤖 AI Services Configuration:');
    console.log('אפשרויות:');
    console.log('1. OpenAI API');
    console.log('2. Anthropic Claude API');
    console.log('3. Google Gemini API\n');
    
    const openaiKey = await question('הכנס את OpenAI API Key (או Enter לדילוג): ');
    if (openaiKey.trim()) {
        config.OPENAI_API_KEY = openaiKey.trim();
    }
    
    const anthropicKey = await question('הכנס את Anthropic API Key (או Enter לדילוג): ');
    if (anthropicKey.trim()) {
        config.ANTHROPIC_API_KEY = anthropicKey.trim();
    }
    
    // Email Setup
    console.log('\n📬 Email Configuration:');
    console.log('לשימוש עם Gmail SMTP:');
    console.log('1. הפעל 2-Factor Authentication');
    console.log('2. צור App Password');
    console.log('3. השתמש ב-App Password במקום הסיסמה הרגילה\n');
    
    const smtpUser = await question('הכנס את Email Address (או Enter לדילוג): ');
    if (smtpUser.trim()) {
        config.SMTP_USER = smtpUser.trim();
    }
    
    const smtpPass = await question('הכנס את App Password (או Enter לדילוג): ');
    if (smtpPass.trim()) {
        config.SMTP_PASS = smtpPass.trim();
    }
    
    // Security
    console.log('\n🔐 Security Configuration:');
    const jwtSecret = await question('הכנס את JWT Secret (או Enter ליצירה אוטומטית): ');
    if (jwtSecret.trim()) {
        config.JWT_SECRET = jwtSecret.trim();
    } else {
        config.JWT_SECRET = require('crypto').randomBytes(64).toString('hex');
    }
    
    const sessionSecret = await question('הכנס את Session Secret (או Enter ליצירה אוטומטית): ');
    if (sessionSecret.trim()) {
        config.SESSION_SECRET = sessionSecret.trim();
    } else {
        config.SESSION_SECRET = require('crypto').randomBytes(64).toString('hex');
    }
    
    // Add default values
    config.SUPABASE_URL = 'https://cnvfscvhwmhttcrhvftx.supabase.co';
    config.GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/google/callback';
    config.PORT = '3000';
    config.NODE_ENV = 'development';
    config.SMTP_HOST = 'smtp.gmail.com';
    config.SMTP_PORT = '587';
    
    // Create .env file
    const envContent = Object.entries(config)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    
    fs.writeFileSync('.env', envContent);
    
    console.log('\n✅ קובץ .env נוצר בהצלחה!');
    console.log('\n📋 סיכום השירותים שהוגדרו:');
    
    Object.entries(config).forEach(([key, value]) => {
        if (value && value !== 'your_' + key.toLowerCase() + '_here') {
            console.log(`✅ ${key}: מוגדר`);
        } else {
            console.log(`⚠️ ${key}: לא מוגדר`);
        }
    });
    
    console.log('\n🚀 השלבים הבאים:');
    console.log('1. בדוק את קובץ .env וודא שהכל נכון');
    console.log('2. הפעל מחדש את השרתים');
    console.log('3. בדוק את החיבורים בדשבורד');
    
    rl.close();
}

setupServices().catch(console.error);
