export declare function listPosts(pageSize?: number, pageToken?: string): Promise<unknown>;
export declare function createPost(post: {
    summary: string;
    topicType?: string;
    callToAction?: {
        actionType: string;
        url: string;
    };
    event?: {
        title: string;
        schedule: unknown;
    };
    offer?: {
        couponCode?: string;
        redeemOnlineUrl?: string;
        termsConditions?: string;
    };
    languageCode?: string;
}): Promise<unknown>;
export declare function updatePost(postId: string, updates: {
    summary?: string;
    callToAction?: {
        actionType: string;
        url: string;
    };
}): Promise<unknown>;
export declare function deletePost(postId: string): Promise<unknown>;
export declare const postTools: {
    gbp_list_posts: {
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
    gbp_create_post: {
        description: string;
        inputSchema: {
            type: "object";
            properties: {
                summary: {
                    type: string;
                    description: string;
                };
                topicType: {
                    type: string;
                    enum: string[];
                    description: string;
                    default: string;
                };
                languageCode: {
                    type: string;
                    description: string;
                    default: string;
                };
                callToActionType: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                callToActionUrl: {
                    type: string;
                    description: string;
                };
                eventTitle: {
                    type: string;
                    description: string;
                };
                eventStartDate: {
                    type: string;
                    description: string;
                };
                eventEndDate: {
                    type: string;
                    description: string;
                };
                couponCode: {
                    type: string;
                    description: string;
                };
                redeemUrl: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        handler: (args: {
            summary: string;
            topicType?: string;
            languageCode?: string;
            callToActionType?: string;
            callToActionUrl?: string;
            eventTitle?: string;
            eventStartDate?: string;
            eventEndDate?: string;
            couponCode?: string;
            redeemUrl?: string;
        }) => Promise<unknown>;
    };
    gbp_update_post: {
        description: string;
        inputSchema: {
            type: "object";
            properties: {
                postId: {
                    type: string;
                    description: string;
                };
                summary: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        handler: (args: {
            postId: string;
            summary?: string;
        }) => Promise<unknown>;
    };
    gbp_delete_post: {
        description: string;
        inputSchema: {
            type: "object";
            properties: {
                postId: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        handler: (args: {
            postId: string;
        }) => Promise<unknown>;
    };
};
//# sourceMappingURL=posts.d.ts.map