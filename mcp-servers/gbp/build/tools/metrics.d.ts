import type { DailyMetric } from '../types.js';
export declare function fetchMultiDailyMetrics(startDate: string, endDate: string, metrics?: DailyMetric[]): Promise<unknown>;
export declare function getSearchKeywords(startDate: string, endDate: string, pageSize?: number, pageToken?: string): Promise<unknown>;
export declare const metricsTools: {
    gbp_get_performance: {
        description: string;
        inputSchema: {
            type: "object";
            properties: {
                startDate: {
                    type: string;
                    description: string;
                };
                endDate: {
                    type: string;
                    description: string;
                };
                metrics: {
                    type: string;
                    items: {
                        type: string;
                        enum: string[];
                    };
                    description: string;
                };
            };
            required: string[];
        };
        handler: (args: {
            startDate: string;
            endDate: string;
            metrics?: DailyMetric[];
        }) => Promise<unknown>;
    };
    gbp_get_search_keywords: {
        description: string;
        inputSchema: {
            type: "object";
            properties: {
                startDate: {
                    type: string;
                    description: string;
                };
                endDate: {
                    type: string;
                    description: string;
                };
                pageSize: {
                    type: string;
                    description: string;
                    default: number;
                };
                pageToken: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        handler: (args: {
            startDate: string;
            endDate: string;
            pageSize?: number;
            pageToken?: string;
        }) => Promise<unknown>;
    };
};
//# sourceMappingURL=metrics.d.ts.map