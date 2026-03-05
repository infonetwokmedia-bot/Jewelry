#!/usr/bin/env node
// authenticate.js - One-time OAuth2 flow to obtain refresh token
// Run: node authenticate.js
//
// Requires GBP_CLIENT_ID and GBP_CLIENT_SECRET in environment or .env
// Opens a browser URL for authorization, listens for callback on port 3001

import { OAuth2Client } from 'google-auth-library';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root if it exists
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx > 0) {
                const key = trimmed.slice(0, eqIdx).trim();
                const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
                if (!process.env[key]) process.env[key] = val;
            }
        }
    }
}

const CLIENT_ID = process.env.GBP_CLIENT_ID;
const CLIENT_SECRET = process.env.GBP_CLIENT_SECRET;
const PORT = 3001;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('ERROR: Set GBP_CLIENT_ID and GBP_CLIENT_SECRET in your .env file first.');
    console.error('Path: /srv/stacks/jewelry/.env');
    process.exit(1);
}

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = ['https://www.googleapis.com/auth/business.manage'];

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent to get refresh_token
});

console.log('\n=== Google Business Profile OAuth Setup ===\n');
console.log('1. Open this URL in your browser:\n');
console.log(`   ${authUrl}\n`);
console.log('2. Sign in with the Google account that owns Tu Joyita Miami GBP');
console.log('3. Approve the permissions');
console.log(`4. You will be redirected to localhost:${PORT} - the token will be captured automatically\n`);
console.log('Waiting for authorization callback...\n');

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);

    if (url.pathname === '/oauth2callback') {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`<h1>Authorization failed</h1><p>Error: ${error}</p>`);
            console.error(`Authorization failed: ${error}`);
            server.close();
            process.exit(1);
        }

        if (!code) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<h1>No authorization code received</h1>');
            return;
        }

        try {
            const { tokens } = await oauth2Client.getToken(code);

            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
                <html><body style="font-family:sans-serif;padding:40px;text-align:center;">
                <h1 style="color:green;">✅ Authorization successful!</h1>
                <p>Refresh token obtained. You can close this window.</p>
                <p style="color:#666;">Check your terminal for next steps.</p>
                </body></html>
            `);

            console.log('\n✅ Authorization successful!\n');
            console.log('Add these to your /srv/stacks/jewelry/.env file:\n');
            console.log(`GBP_REFRESH_TOKEN=${tokens.refresh_token}`);
            console.log(`\nAccess token (temporary, auto-refreshes): ${tokens.access_token?.slice(0, 30)}...`);
            console.log(`Token type: ${tokens.token_type}`);
            console.log(`Expiry: ${tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'N/A'}`);

            if (!tokens.refresh_token) {
                console.warn('\n⚠️  No refresh_token received!');
                console.warn('This happens if you already authorized before.');
                console.warn('Go to https://myaccount.google.com/permissions');
                console.warn('Remove "TuJoyita GBP MCP" access, then run this script again.');
            }

            console.log('\n=== Next Steps ===');
            console.log('1. Add GBP_REFRESH_TOKEN to .env');
            console.log('2. Also add GBP_ACCOUNT_ID and GBP_LOCATION_ID');
            console.log('   (Run: node get-ids.js to discover them)');
            console.log('3. Build the MCP server: cd mcp-servers/gbp && npm run build');
            console.log('4. Restart VS Code to load the new MCP server\n');

        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`<h1>Token exchange failed</h1><p>${err instanceof Error ? err.message : err}</p>`);
            console.error('Token exchange failed:', err);
        }

        setTimeout(() => { server.close(); process.exit(0); }, 2000);
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`OAuth callback server listening on http://localhost:${PORT}`);
});
