// Google Business Profile - Media Tools
// API: Google My Business API v4 (accounts.locations.media)
import { getAccessToken, getConfig } from '../auth.js';
const API_BASE = 'https://mybusiness.googleapis.com/v4';
async function apiRequest(config, path, method = 'GET', body) {
    const token = await getAccessToken(config);
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
        const error = await res.text();
        throw new Error(`GBP API error (${res.status}): ${error}`);
    }
    if (method === 'DELETE')
        return { success: true };
    return res.json();
}
function getParent(config) {
    return `accounts/${config.accountId}/locations/${config.locationId}`;
}
export async function listMedia(pageSize = 50, pageToken) {
    const config = getConfig();
    const params = new URLSearchParams({ pageSize: String(pageSize) });
    if (pageToken)
        params.set('pageToken', pageToken);
    return apiRequest(config, `/${getParent(config)}/media?${params}`);
}
export async function listCustomerMedia(pageSize = 50, pageToken) {
    const config = getConfig();
    const params = new URLSearchParams({ pageSize: String(pageSize) });
    if (pageToken)
        params.set('pageToken', pageToken);
    return apiRequest(config, `/${getParent(config)}/media/customers?${params}`);
}
export async function createMedia(sourceUrl, mediaFormat, category, description) {
    const config = getConfig();
    return apiRequest(config, `/${getParent(config)}/media`, 'POST', {
        mediaFormat: mediaFormat || 'PHOTO',
        sourceUrl,
        locationAssociation: { category: category || 'ADDITIONAL' },
        ...(description ? { description } : {}),
    });
}
export async function deleteMedia(mediaId) {
    const config = getConfig();
    const name = `${getParent(config)}/media/${mediaId}`;
    return apiRequest(config, `/${name}`, 'DELETE');
}
export const mediaTools = {
    gbp_list_media: {
        description: 'List photos and videos on the Google Business Profile (owner-uploaded).',
        inputSchema: {
            type: 'object',
            properties: {
                pageSize: { type: 'number', description: 'Number of items (max 50)', default: 50 },
                pageToken: { type: 'string', description: 'Token for next page' },
            },
        },
        handler: async (args) => {
            return await listMedia(args.pageSize, args.pageToken);
        },
    },
    gbp_list_customer_media: {
        description: 'List photos uploaded by customers to the Google Business Profile.',
        inputSchema: {
            type: 'object',
            properties: {
                pageSize: { type: 'number', description: 'Number of items (max 50)', default: 50 },
                pageToken: { type: 'string', description: 'Token for next page' },
            },
        },
        handler: async (args) => {
            return await listCustomerMedia(args.pageSize, args.pageToken);
        },
    },
    gbp_upload_media: {
        description: 'Upload a photo to the Google Business Profile from a public URL.',
        inputSchema: {
            type: 'object',
            properties: {
                sourceUrl: { type: 'string', description: 'Public URL of the image to upload' },
                category: {
                    type: 'string',
                    enum: ['COVER', 'PROFILE', 'LOGO', 'EXTERIOR', 'INTERIOR', 'PRODUCT', 'AT_WORK', 'FOOD_AND_DRINK', 'MENU', 'COMMON_AREA', 'TEAMS', 'ADDITIONAL'],
                    description: 'Photo category',
                    default: 'PRODUCT',
                },
                mediaFormat: { type: 'string', enum: ['PHOTO', 'VIDEO'], default: 'PHOTO' },
                description: { type: 'string', description: 'Optional description for the media' },
            },
            required: ['sourceUrl'],
        },
        handler: async (args) => {
            return await createMedia(args.sourceUrl, args.mediaFormat || 'PHOTO', args.category || 'PRODUCT', args.description);
        },
    },
    gbp_delete_media: {
        description: 'Delete a photo/video from the Google Business Profile.',
        inputSchema: {
            type: 'object',
            properties: {
                mediaId: { type: 'string', description: 'The media item ID to delete' },
            },
            required: ['mediaId'],
        },
        handler: async (args) => {
            return await deleteMedia(args.mediaId);
        },
    },
};
//# sourceMappingURL=media.js.map