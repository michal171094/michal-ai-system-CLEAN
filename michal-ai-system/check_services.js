#!/usr/bin/env node

/**
 * Services Health Check Script
 * ===========================
 * בודק את סטטוס כל השירותים החיצוניים
 */

require('dotenv').config();
const fs = require('fs');

console.log(`
╔══════════════════════════════════════════════════════════╗
║        Services Health Check - Life Orchestrator       ║
║                    Version 1.0.0                         ║
╚══════════════════════════════════════════════════════════╝
`);

async function checkServices() {
    console.log('🔍 בודק שירותים...\n');
    
    const results = {
        supabase: { status: '❌', message: 'לא מוגדר' },
        gmail: { status: '❌', message: 'לא מוגדר' },
        whatsapp: { status: '❌', message: 'לא מוגדר' },
        ocr: { status: '❌', message: 'לא מוגדר' },
        ai: { status: '❌', message: 'לא מוגדר' },
        email: { status: '❌', message: 'לא מוגדר' }
    };
    
    // Check Supabase
    if (process.env.SUPABASE_KEY && process.env.SUPABASE_KEY !== 'your_supabase_anon_key_here') {
        try {
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
            
            // Test connection
            const { data, error } = await supabase.from('tasks').select('count').limit(1);
            
            if (error) {
                results.supabase = { status: '⚠️', message: `שגיאה: ${error.message}` };
            } else {
                results.supabase = { status: '✅', message: 'מחובר בהצלחה' };
            }
        } catch (error) {
            results.supabase = { status: '❌', message: `שגיאה: ${error.message}` };
        }
    }
    
    // Check Gmail
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && 
        process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id_here') {
        results.gmail = { status: '✅', message: 'מוגדר (נדרש אימות)' };
    }
    
    // Check WhatsApp
    if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID &&
        process.env.WHATSAPP_TOKEN !== 'your_whatsapp_token_here') {
        results.whatsapp = { status: '✅', message: 'מוגדר' };
    }
    
    // Check OCR
    if (process.env.OCR_API_KEY && process.env.OCR_API_KEY !== 'your_ocr_api_key_here') {
        results.ocr = { status: '✅', message: 'מוגדר' };
    }
    
    // Check AI Services
    if ((process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') ||
        (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here')) {
        results.ai = { status: '✅', message: 'מוגדר' };
    }
    
    // Check Email
    if (process.env.SMTP_USER && process.env.SMTP_PASS &&
        process.env.SMTP_USER !== 'your_email@gmail.com') {
        results.email = { status: '✅', message: 'מוגדר' };
    }
    
    // Display results
    console.log('📊 תוצאות הבדיקה:\n');
    
    Object.entries(results).forEach(([service, result]) => {
        const serviceNames = {
            supabase: 'Supabase Database',
            gmail: 'Gmail Integration',
            whatsapp: 'WhatsApp Business',
            ocr: 'OCR Service',
            ai: 'AI Services',
            email: 'Email Service'
        };
        
        console.log(`${result.status} ${serviceNames[service]}: ${result.message}`);
    });
    
    // Summary
    const workingServices = Object.values(results).filter(r => r.status === '✅').length;
    const totalServices = Object.keys(results).length;
    
    console.log(`\n📈 סיכום: ${workingServices}/${totalServices} שירותים פעילים`);
    
    if (workingServices === 0) {
        console.log('\n⚠️ אף שירות לא מוגדר!');
        console.log('הרץ: node setup_external_services.js');
    } else if (workingServices < totalServices) {
        console.log('\n💡 טיפ: הרץ setup_external_services.js להגדרת שירותים נוספים');
    } else {
        console.log('\n🎉 כל השירותים מוגדרים!');
    }
    
    // Check if .env file exists
    if (!fs.existsSync('.env')) {
        console.log('\n❌ קובץ .env לא קיים!');
        console.log('הרץ: node setup_external_services.js');
    }
}

checkServices().catch(console.error);
