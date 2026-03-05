// Google Business Profile - OAuth2 Authentication
// Uses refresh token flow (no interactive login needed after initial setup)

import { OAuth2Client } from 'google-auth-library';
import type { GBPConfig } from './types.js';

let oauth2Client: OAuth2Client | null = null;

export function getAuthClient(config: GBPConfig): OAuth2Client {
    if (!oauth2Client) {
        oauth2Client = new OAuth2Client(
            config.clientId,
            config.clientSecret
        );
        oauth2Client.setCredentials({
            refresh_token: config.refreshToken,
        });
    }
    return oauth2Client;
}

export async function getAccessToken(config: GBPConfig): Promise<string> {
    const client = getAuthClient(config);
    const { token } = await client.getAccessToken();
    if (!token) {
        throw new Error('Failed to obtain access token. Check your refresh token and credentials.');
    }
    return token;
}

export function getConfig(): GBPConfig {
    const required = [
        'GBP_CLIENT_ID',
        'GBP_CLIENT_SECRET',
        'GBP_REFRESH_TOKEN',
        'GBP_ACCOUNT_ID',
        'GBP_LOCATION_ID',
    ] as const;

    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}\n` +
            'Set them in your .env file or pass them via the MCP server config.'
        );
    }

    return {
        clientId: process.env.GBP_CLIENT_ID!,
        clientSecret: process.env.GBP_CLIENT_SECRET!,
        refreshToken: process.env.GBP_REFRESH_TOKEN!,
        accountId: process.env.GBP_ACCOUNT_ID!,
        locationId: process.env.GBP_LOCATION_ID!,
    };
}
