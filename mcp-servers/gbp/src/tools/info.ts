// Google Business Profile - Business Information Tools
// API: My Business Business Information API v1
// API: My Business Account Management API v1

import { getAccessToken, getConfig } from '../auth.js';
import type { GBPConfig } from '../types.js';

const ACCOUNT_API = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const INFO_API = 'https://mybusinessbusinessinformation.googleapis.com/v1';

async function apiRequest(baseUrl: string, config: GBPConfig, path: string, method = 'GET', body?: unknown): Promise<unknown> {
    const token = await getAccessToken(config);
    const url = `${baseUrl}${path}`;
    const options: RequestInit = {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    };
    if (body && (method === 'POST' || method === 'PATCH')) {
        options.body = JSON.stringify(body);
    }
    const res = await fetch(url, options);
    if (!res.ok) {
        const error = await res.text();
        throw new Error(`GBP Info API error (${res.status}): ${error}`);
    }
    return res.json();
}

export async function listAccounts() {
    const config = getConfig();
    return apiRequest(ACCOUNT_API, config, '/accounts');
}

export async function getLocation(readMask?: string) {
    const config = getConfig();
    const params = new URLSearchParams();
    if (readMask) params.set('readMask', readMask);
    const query = params.toString() ? `?${params}` : '';
    return apiRequest(INFO_API, config, `/locations/${config.locationId}${query}`);
}

export async function updateLocation(updates: Record<string, unknown>, updateMask: string) {
    const config = getConfig();
    const params = new URLSearchParams({ updateMask });
    return apiRequest(INFO_API, config, `/locations/${config.locationId}?${params}`, 'PATCH', updates);
}

export const infoTools = {
    gbp_list_accounts: {
        description: 'List all Google Business Profile accounts associated with the authenticated user.',
        inputSchema: {
            type: 'object' as const,
            properties: {},
        },
        handler: async () => {
            return await listAccounts();
        },
    },
    gbp_get_location: {
        description: 'Get detailed information about the business location (name, address, phone, hours, categories, website, etc.).',
        inputSchema: {
            type: 'object' as const,
            properties: {
                fields: {
                    type: 'string',
                    description: 'Comma-separated fields to return. E.g.: "title,phoneNumbers,regularHours,websiteUri,storefrontAddress,profile,categories"',
                },
            },
        },
        handler: async (args: { fields?: string }) => {
            return await getLocation(args.fields);
        },
    },
    gbp_update_location: {
        description: 'Update business location info (phone, hours, website, description, etc.).',
        inputSchema: {
            type: 'object' as const,
            properties: {
                phone: { type: 'string', description: 'Primary phone number' },
                websiteUri: { type: 'string', description: 'Website URL' },
                description: { type: 'string', description: 'Business description' },
                regularHours: {
                    type: 'object',
                    description: 'Business hours object with periods array. Each period: { openDay, openTime: {hours, minutes}, closeDay, closeTime: {hours, minutes} }',
                },
            },
        },
        handler: async (args: { phone?: string; websiteUri?: string; description?: string; regularHours?: unknown }) => {
            const updates: Record<string, unknown> = {};
            const masks: string[] = [];

            if (args.phone) {
                updates.phoneNumbers = { primaryPhone: args.phone };
                masks.push('phoneNumbers');
            }
            if (args.websiteUri) {
                updates.websiteUri = args.websiteUri;
                masks.push('websiteUri');
            }
            if (args.description) {
                updates.profile = { description: args.description };
                masks.push('profile.description');
            }
            if (args.regularHours) {
                updates.regularHours = args.regularHours;
                masks.push('regularHours');
            }

            if (masks.length === 0) {
                throw new Error('No fields to update. Provide at least one: phone, websiteUri, description, or regularHours.');
            }

            return await updateLocation(updates, masks.join(','));
        },
    },
};
