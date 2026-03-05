// Google Business Profile - Local Posts Tools
// API: Google My Business API v4 (accounts.locations.localPosts)
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
export async function listPosts(pageSize = 20, pageToken) {
    const config = getConfig();
    const params = new URLSearchParams({ pageSize: String(pageSize) });
    if (pageToken)
        params.set('pageToken', pageToken);
    return apiRequest(config, `/${getParent(config)}/localPosts?${params}`);
}
export async function createPost(post) {
    const config = getConfig();
    return apiRequest(config, `/${getParent(config)}/localPosts`, 'POST', {
        languageCode: post.languageCode || 'es',
        summary: post.summary,
        topicType: post.topicType || 'STANDARD',
        ...(post.callToAction ? { callToAction: post.callToAction } : {}),
        ...(post.event ? { event: post.event } : {}),
        ...(post.offer ? { offer: post.offer } : {}),
    });
}
export async function updatePost(postId, updates) {
    const config = getConfig();
    const name = `${getParent(config)}/localPosts/${postId}`;
    return apiRequest(config, `/${name}`, 'PATCH', updates);
}
export async function deletePost(postId) {
    const config = getConfig();
    const name = `${getParent(config)}/localPosts/${postId}`;
    return apiRequest(config, `/${name}`, 'DELETE');
}
export const postTools = {
    gbp_list_posts: {
        description: 'List Google Business Profile local posts (updates, events, offers).',
        inputSchema: {
            type: 'object',
            properties: {
                pageSize: { type: 'number', description: 'Number of posts per page (max 100)', default: 20 },
                pageToken: { type: 'string', description: 'Token for next page' },
            },
        },
        handler: async (args) => {
            return await listPosts(args.pageSize, args.pageToken);
        },
    },
    gbp_create_post: {
        description: 'Create a new Google Business Profile post. Types: STANDARD (update), EVENT, OFFER.',
        inputSchema: {
            type: 'object',
            properties: {
                summary: { type: 'string', description: 'Post text content (max 1500 chars)' },
                topicType: { type: 'string', enum: ['STANDARD', 'EVENT', 'OFFER'], description: 'Post type', default: 'STANDARD' },
                languageCode: { type: 'string', description: 'Language: "es" for Spanish, "en" for English', default: 'es' },
                callToActionType: { type: 'string', enum: ['BOOK', 'ORDER', 'SHOP', 'LEARN_MORE', 'SIGN_UP', 'CALL'], description: 'CTA button type' },
                callToActionUrl: { type: 'string', description: 'URL for CTA button' },
                eventTitle: { type: 'string', description: 'Event title (required for EVENT type)' },
                eventStartDate: { type: 'string', description: 'Event start date YYYY-MM-DD' },
                eventEndDate: { type: 'string', description: 'Event end date YYYY-MM-DD' },
                couponCode: { type: 'string', description: 'Coupon code (for OFFER type)' },
                redeemUrl: { type: 'string', description: 'Redeem URL (for OFFER type)' },
            },
            required: ['summary'],
        },
        handler: async (args) => {
            const post = {
                summary: args.summary,
                topicType: args.topicType,
                languageCode: args.languageCode,
            };
            if (args.callToActionType && args.callToActionUrl) {
                post.callToAction = { actionType: args.callToActionType, url: args.callToActionUrl };
            }
            if (args.topicType === 'EVENT' && args.eventTitle && args.eventStartDate && args.eventEndDate) {
                const [sy, sm, sd] = args.eventStartDate.split('-').map(Number);
                const [ey, em, ed] = args.eventEndDate.split('-').map(Number);
                post.event = {
                    title: args.eventTitle,
                    schedule: {
                        startDate: { year: sy, month: sm, day: sd },
                        endDate: { year: ey, month: em, day: ed },
                    },
                };
            }
            if (args.topicType === 'OFFER') {
                post.offer = { couponCode: args.couponCode, redeemOnlineUrl: args.redeemUrl };
            }
            return await createPost(post);
        },
    },
    gbp_update_post: {
        description: 'Update an existing Google Business Profile post.',
        inputSchema: {
            type: 'object',
            properties: {
                postId: { type: 'string', description: 'The post ID to update' },
                summary: { type: 'string', description: 'Updated post text' },
            },
            required: ['postId'],
        },
        handler: async (args) => {
            const updates = {};
            if (args.summary)
                updates.summary = args.summary;
            return await updatePost(args.postId, updates);
        },
    },
    gbp_delete_post: {
        description: 'Delete a Google Business Profile post.',
        inputSchema: {
            type: 'object',
            properties: {
                postId: { type: 'string', description: 'The post ID to delete' },
            },
            required: ['postId'],
        },
        handler: async (args) => {
            return await deletePost(args.postId);
        },
    },
};
//# sourceMappingURL=posts.js.map