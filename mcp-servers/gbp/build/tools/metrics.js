// Google Business Profile - Performance Metrics Tools
// API: Business Profile Performance API v1
// Note: This replaces the deprecated reportInsights from v4
import { getAccessToken, getConfig } from '../auth.js';
const API_BASE = 'https://businessprofileperformance.googleapis.com/v1';
async function apiRequest(config, path) {
    const token = await getAccessToken(config);
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) {
        const error = await res.text();
        throw new Error(`GBP Performance API error (${res.status}): ${error}`);
    }
    return res.json();
}
// All available daily metrics for a jewelry store
const DEFAULT_METRICS = [
    'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
    'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
    'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
    'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
    'BUSINESS_DIRECTION_REQUESTS',
    'CALL_CLICKS',
    'WEBSITE_CLICKS',
];
export async function fetchMultiDailyMetrics(startDate, endDate, metrics) {
    const config = getConfig();
    const location = `locations/${config.locationId}`;
    const metricsToFetch = metrics || DEFAULT_METRICS;
    const params = new URLSearchParams();
    for (const m of metricsToFetch) {
        params.append('dailyMetrics', m);
    }
    // Date range: YYYY-MM-DD format
    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [ey, em, ed] = endDate.split('-').map(Number);
    params.set('dailyRange.startDate.year', String(sy));
    params.set('dailyRange.startDate.month', String(sm));
    params.set('dailyRange.startDate.day', String(sd));
    params.set('dailyRange.endDate.year', String(ey));
    params.set('dailyRange.endDate.month', String(em));
    params.set('dailyRange.endDate.day', String(ed));
    return apiRequest(config, `/${location}:fetchMultiDailyMetricsTimeSeries?${params}`);
}
export async function getSearchKeywords(startDate, endDate, pageSize = 20, pageToken) {
    const config = getConfig();
    const location = `locations/${config.locationId}`;
    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [ey, em, ed] = endDate.split('-').map(Number);
    const params = new URLSearchParams({
        'dailyRange.startDate.year': String(sy),
        'dailyRange.startDate.month': String(sm),
        'dailyRange.startDate.day': String(sd),
        'dailyRange.endDate.year': String(ey),
        'dailyRange.endDate.month': String(em),
        'dailyRange.endDate.day': String(ed),
        'pageSize': String(pageSize),
    });
    if (pageToken)
        params.set('pageToken', pageToken);
    return apiRequest(config, `/${location}/searchkeywords/impressions/monthly?${params}`);
}
export const metricsTools = {
    gbp_get_performance: {
        description: 'Get Google Business Profile performance metrics (impressions, clicks, calls, directions) for a date range. Uses the new Performance API v1.',
        inputSchema: {
            type: 'object',
            properties: {
                startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
                endDate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
                metrics: {
                    type: 'array',
                    items: {
                        type: 'string',
                        enum: [
                            'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
                            'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
                            'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
                            'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
                            'BUSINESS_DIRECTION_REQUESTS',
                            'CALL_CLICKS',
                            'WEBSITE_CLICKS',
                            'BUSINESS_BOOKINGS',
                            'BUSINESS_FOOD_ORDERS',
                            'BUSINESS_CONVERSATIONS',
                        ],
                    },
                    description: 'Specific metrics to fetch. Defaults to all relevant metrics.',
                },
            },
            required: ['startDate', 'endDate'],
        },
        handler: async (args) => {
            return await fetchMultiDailyMetrics(args.startDate, args.endDate, args.metrics);
        },
    },
    gbp_get_search_keywords: {
        description: 'Get the search keywords that customers used to find the business on Google. Returns monthly impression counts per keyword.',
        inputSchema: {
            type: 'object',
            properties: {
                startDate: { type: 'string', description: 'Start date YYYY-MM-DD' },
                endDate: { type: 'string', description: 'End date YYYY-MM-DD' },
                pageSize: { type: 'number', description: 'Results per page (max 100)', default: 20 },
                pageToken: { type: 'string', description: 'Token for next page' },
            },
            required: ['startDate', 'endDate'],
        },
        handler: async (args) => {
            return await getSearchKeywords(args.startDate, args.endDate, args.pageSize, args.pageToken);
        },
    },
};
//# sourceMappingURL=metrics.js.map