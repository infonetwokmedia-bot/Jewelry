export declare function listMedia(pageSize?: number, pageToken?: string): Promise<unknown>;
export declare function listCustomerMedia(pageSize?: number, pageToken?: string): Promise<unknown>;
export declare function createMedia(sourceUrl: string, mediaFormat: string, category: string, description?: string): Promise<unknown>;
export declare function deleteMedia(mediaId: string): Promise<unknown>;
export declare const mediaTools: {
    gbp_list_media: {
        description: string;
        inputSchema: {
            type: "object";
            properties: {
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
        };
        handler: (args: {
            pageSize?: number;
            pageToken?: string;
        }) => Promise<unknown>;
    };
    gbp_list_customer_media: {
        description: string;
        inputSchema: {
            type: "object";
            properties: {
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
        };
        handler: (args: {
            pageSize?: number;
            pageToken?: string;
        }) => Promise<unknown>;
    };
    gbp_upload_media: {
        description: string;
        inputSchema: {
            type: "object";
            properties: {
                sourceUrl: {
                    type: string;
                    description: string;
                };
                category: {
                    type: string;
                    enum: string[];
                    description: string;
                    default: string;
                };
                mediaFormat: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                description: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        handler: (args: {
            sourceUrl: string;
            category?: string;
            mediaFormat?: string;
            description?: string;
        }) => Promise<unknown>;
    };
    gbp_delete_media: {
        description: string;
        inputSchema: {
            type: "object";
            properties: {
                mediaId: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        handler: (args: {
            mediaId: string;
        }) => Promise<unknown>;
    };
};
//# sourceMappingURL=media.d.ts.map