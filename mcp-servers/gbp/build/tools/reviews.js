// Google Business Profile - Reviews Tools
// API: Google My Business API v4 (accounts.locations.reviews)
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
    return res.json();
}
export async function listReviews(pageSize = 50, pageToken, orderBy) {
    const config = getConfig();
    const parent = `accounts/${config.accountId}/locations/${config.locationId}`;
    const params = new URLSearchParams();
    params.set('pageSize', String(pageSize));
    if (pageToken)
        params.set('pageToken', pageToken);
    if (orderBy)
        params.set('orderBy', orderBy);
    return apiRequest(config, `/${parent}/reviews?${params}`);
}
export async function getReview(reviewId) {
    const config = getConfig();
    const name = `accounts/${config.accountId}/locations/${config.locationId}/reviews/${reviewId}`;
    return apiRequest(config, `/${name}`);
}
export async function replyToReview(reviewId, comment) {
    const config = getConfig();
    const name = `accounts/${config.accountId}/locations/${config.locationId}/reviews/${reviewId}`;
    return apiRequest(config, `/${name}/reply`, 'PUT', { comment });
}
export async function deleteReply(reviewId) {
    const config = getConfig();
    const name = `accounts/${config.accountId}/locations/${config.locationId}/reviews/${reviewId}`;
    return apiRequest(config, `/${name}/reply`, 'DELETE');
}
export const reviewTools = {
    gbp_list_reviews: {
        description: 'List Google Business Profile reviews with pagination. Returns reviews, average rating, and total count.',
        inputSchema: {
            type: 'object',
            properties: {
                pageSize: { type: 'number', description: 'Number of reviews per page (max 50)', default: 20 },
                pageToken: { type: 'string', description: 'Token for next page of results' },
                orderBy: { type: 'string', description: 'Sort order: "updateTime desc" or "rating desc"' },
            },
        },
        handler: async (args) => {
            return await listReviews(args.pageSize, args.pageToken, args.orderBy);
        },
    },
    gbp_get_review: {
        description: 'Get a specific Google Business Profile review by ID.',
        inputSchema: {
            type: 'object',
            properties: {
                reviewId: { type: 'string', description: 'The review ID' },
            },
            required: ['reviewId'],
        },
        handler: async (args) => {
            return await getReview(args.reviewId);
        },
    },
    gbp_reply_review: {
        description: 'Reply to a Google Business Profile review. Creates or updates the business owner reply.',
        inputSchema: {
            type: 'object',
            properties: {
                reviewId: { type: 'string', description: 'The review ID to reply to' },
                comment: { type: 'string', description: 'The reply text' },
            },
            required: ['reviewId', 'comment'],
        },
        handler: async (args) => {
            return await replyToReview(args.reviewId, args.comment);
        },
    },
    gbp_delete_reply: {
        description: 'Delete the business owner reply from a Google Business Profile review.',
        inputSchema: {
            type: 'object',
            properties: {
                reviewId: { type: 'string', description: 'The review ID whose reply to delete' },
            },
            required: ['reviewId'],
        },
        handler: async (args) => {
            return await deleteReply(args.reviewId);
        },
    },
};
//# sourceMappingURL=reviews.js.map