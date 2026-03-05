#!/usr/bin/env node
// get-ids.js - Discover your GBP Account ID and Location ID
// Run after authentication: node get-ids.js
// Requires GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN in .env

import { OAuth2Client } from 'google-auth-library';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env
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

const { GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN } = process.env;

if (!GBP_CLIENT_ID || !GBP_CLIENT_SECRET || !GBP_REFRESH_TOKEN) {
    console.error('ERROR: Set GBP_CLIENT_ID, GBP_CLIENT_SECRET, and GBP_REFRESH_TOKEN in .env');
    console.error('Run "node authenticate.js" first to get the refresh token.');
    process.exit(1);
}

const oauth2Client = new OAuth2Client(GBP_CLIENT_ID, GBP_CLIENT_SECRET);
oauth2Client.setCredentials({ refresh_token: GBP_REFRESH_TOKEN });

async function main() {
    const { token } = await oauth2Client.getAccessToken();

    console.log('\n=== Discovering GBP Account & Location IDs ===\n');

    // 1. List accounts
    const accountsRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    const accountsData = await accountsRes.json();

    if (!accountsData.accounts || accountsData.accounts.length === 0) {
        console.error('No GBP accounts found for this Google account.');
        console.error('Make sure you sign in with the account that owns your Google Business Profile.');
        process.exit(1);
    }

    console.log('Accounts found:');
    for (const acc of accountsData.accounts) {
        const accountId = acc.name.replace('accounts/', '');
        console.log(`  Account: ${acc.accountName || '(unnamed)'}`);
        console.log(`  ID: ${accountId}`);
        console.log(`  Type: ${acc.type}`);
        console.log(`  Role: ${acc.role}`);
        console.log('');

        // 2. List locations for each account
        const locRes = await fetch(
            `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title,storefrontAddress,websiteUri,phoneNumbers`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const locData = await locRes.json();

        if (locData.locations && locData.locations.length > 0) {
            console.log('  Locations:');
            for (const loc of locData.locations) {
                const locationId = loc.name.replace('locations/', '');
                console.log(`    📍 ${loc.title}`);
                console.log(`       Location ID: ${locationId}`);
                if (loc.storefrontAddress) {
                    const addr = loc.storefrontAddress;
                    console.log(`       Address: ${(addr.addressLines || []).join(', ')}, ${addr.locality}, ${addr.administrativeArea} ${addr.postalCode}`);
                }
                if (loc.phoneNumbers?.primaryPhone) {
                    console.log(`       Phone: ${loc.phoneNumbers.primaryPhone}`);
                }
                if (loc.websiteUri) {
                    console.log(`       Website: ${loc.websiteUri}`);
                }
                console.log('');
            }

            // Output the env vars for the first location
            const firstLoc = locData.locations[0];
            const locationId = firstLoc.name.replace('locations/', '');
            console.log('═══════════════════════════════════════════');
            console.log('Add these to your /srv/stacks/jewelry/.env:');
            console.log('═══════════════════════════════════════════');
            console.log(`GBP_ACCOUNT_ID=${accountId}`);
            console.log(`GBP_LOCATION_ID=${locationId}`);
            console.log('═══════════════════════════════════════════\n');
        } else {
            console.log('  No locations found for this account.');
            console.log('  Response:', JSON.stringify(locData, null, 2));
        }
    }
}

main().catch((err) => {
    console.error('Error:', err.message || err);
    process.exit(1);
});
