// Gmail OAuth Configuration
// Set these as environment variables in your deployment platform

const getGmailConfig = () => {
  // Always use environment variables - no hardcoded values
  const config = {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
  };
  
  if (!config.CLIENT_ID || !config.CLIENT_SECRET) {
    console.warn('⚠️ Gmail OAuth not configured - set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables');
    return null;
  }
  
  return config;
};

module.exports = { getGmailConfig };