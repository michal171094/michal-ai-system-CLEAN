const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { getGmailConfig } = require('../config/gmail-config');

class GmailService {
    constructor() {
        const gmailConfig = getGmailConfig();
        
        if (!gmailConfig) {
            throw new Error('Gmail configuration not available - check environment variables');
        }

        const clientId = gmailConfig.CLIENT_ID;
        const clientSecret = gmailConfig.CLIENT_SECRET;
        const redirectUri = gmailConfig.REDIRECT_URI;

        if (!clientId || !clientSecret) {
            throw new Error('Missing Google OAuth credentials in configuration');
        }

        this.tokenPath = path.resolve(__dirname, '../config/gmail-tokens.json');
        this.ensureTokenDirectory();

        this.oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

        this.authScopes = [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/userinfo.email'
        ];

        this.accounts = {};       // { email: tokens }
        this.activeEmail = null;  // currently selected account
        this.authenticated = false;
        this.loadTokensFromDisk();
    }

    ensureTokenDirectory() {
        const dir = path.dirname(this.tokenPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    getAuthUrl() {
        return this.oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: this.authScopes
        });
    }

    async exchangeCodeForTokens(code) {
        const { tokens } = await this.oAuth2Client.getToken(code);
        this.oAuth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: this.oAuth2Client });
        const profile = await oauth2.userinfo.get();
        const email = profile.data?.email;
        if (!email) {
            throw new Error('EMAIL_NOT_FOUND');
        }
        this.saveAccount(email, tokens);
        this.setActiveAccount(email);
        return { email };
    }

    saveAccount(email, tokens) {
        this.accounts[email] = tokens;
        this.persist();
    }

    loadTokensFromDisk() {
        try {
            if (fs.existsSync(this.tokenPath)) {
                const raw = fs.readFileSync(this.tokenPath, 'utf8');
                if (!raw) return false;
                const parsed = JSON.parse(raw);
                if (parsed.accounts) {
                    this.accounts = parsed.accounts;
                    this.activeEmail = parsed.activeEmail || Object.keys(this.accounts)[0] || null;
                } else {
                    // backward compatibility (single token file)
                    this.accounts = { default: parsed };
                    this.activeEmail = 'default';
                }
                if (this.activeEmail && this.accounts[this.activeEmail]) {
                    this.oAuth2Client.setCredentials(this.accounts[this.activeEmail]);
                    this.authenticated = true;
                }
                return true;
            }
            return false;
        } catch (error) {
            console.warn('Failed to load Gmail tokens:', error.message);
            return false;
        }
    }

    persist() {
        const payload = { accounts: this.accounts, activeEmail: this.activeEmail };
        fs.writeFileSync(this.tokenPath, JSON.stringify(payload, null, 2), 'utf8');
    }

    hasValidTokens() {
        return this.authenticated && !!this.activeEmail && !!this.accounts[this.activeEmail];
    }

    setActiveAccount(email) {
        if (!this.accounts[email]) {
            throw new Error('ACCOUNT_NOT_FOUND');
        }
        this.activeEmail = email;
        this.oAuth2Client.setCredentials(this.accounts[email]);
        this.authenticated = true;
        this.persist();
        return { email };
    }

    removeAccount(email) {
        if (!this.accounts[email]) return false;
        delete this.accounts[email];
        if (this.activeEmail === email) {
            const remaining = Object.keys(this.accounts);
            this.activeEmail = remaining[0] || null;
            if (this.activeEmail) {
                this.oAuth2Client.setCredentials(this.accounts[this.activeEmail]);
                this.authenticated = true;
            } else {
                this.oAuth2Client.setCredentials({});
                this.authenticated = false;
            }
        }
        this.persist();
        return true;
    }

    listAccounts() {
        return {
            accounts: Object.keys(this.accounts).map(email => ({ email, active: email === this.activeEmail })),
            activeEmail: this.activeEmail,
            configured: Object.keys(this.accounts).length > 0
        };
    }

    async listRecentEmails(maxResults = 10) {
        if (!this.hasValidTokens()) {
            throw new Error('AUTH_REQUIRED');
        }

        try {
            const gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client });

            const listResponse = await gmail.users.messages.list({
                userId: 'me',
                maxResults,
                q: 'newer_than:7d'
            });

            const messages = listResponse.data.messages || [];
            if (messages.length === 0) {
                return [];
            }

            const emails = [];
            for (const message of messages) {
                const email = await gmail.users.messages.get({
                    userId: 'me',
                    id: message.id,
                    format: 'full'
                });

                const normalized = this.normalizeEmail(email.data);
                emails.push(normalized);
            }

            return emails;
        } catch (error) {
            if (error && error.code === 401) {
                // Tokens invalid, require re-auth
                this.authenticated = false;
                throw new Error('AUTH_REQUIRED');
            }
            console.error('Gmail API error:', error);
            throw error;
        }
    }

    normalizeEmail(rawEmail) {
        const headers = rawEmail.payload?.headers || [];
        const getHeader = (name) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

        const subject = getHeader('Subject');
        const from = getHeader('From');
        const to = getHeader('To');
        const date = getHeader('Date');

        const body = this.extractBody(rawEmail.payload);
        const attachments = this.extractAttachments(rawEmail.payload);

        return {
            id: rawEmail.id,
            threadId: rawEmail.threadId,
            subject,
            from,
            to,
            date,
            snippet: rawEmail.snippet,
            body,
            attachments
        };
    }

    extractBody(payload) {
        if (!payload) return '';

        if (payload.body && payload.body.data) {
            return this.decodeBase64(payload.body.data);
        }

        if (payload.parts && Array.isArray(payload.parts)) {
            for (const part of payload.parts) {
                if (part.mimeType === 'text/plain' && part.body?.data) {
                    return this.decodeBase64(part.body.data);
                }
                if (part.mimeType === 'text/html' && part.body?.data) {
                    // Strip HTML tags
                    const html = this.decodeBase64(part.body.data);
                    return this.stripHtml(html);
                }
                if (part.parts) {
                    const nested = this.extractBody(part);
                    if (nested) return nested;
                }
            }
        }

        return '';
    }

    extractAttachments(payload) {
        if (!payload || !payload.parts) return [];

        const attachments = [];
        const traverse = (parts) => {
            parts.forEach(part => {
                if (part.filename && part.body && part.body.attachmentId) {
                    attachments.push({
                        filename: part.filename,
                        mimeType: part.mimeType,
                        size: part.body.size
                    });
                }
                if (part.parts) {
                    traverse(part.parts);
                }
            });
        };

        traverse(payload.parts);
        return attachments;
    }

    decodeBase64(data) {
        const buff = Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
        return buff.toString('utf8');
    }

    stripHtml(html) {
        return html
            .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .trim();
    }
}

module.exports = GmailService;
