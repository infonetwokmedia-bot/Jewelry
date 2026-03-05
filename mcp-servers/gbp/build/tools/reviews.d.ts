export declare function listReviews(pageSize?: number, pageToken?: string, orderBy?: string): Promise<unknown>;
export declare function getReview(reviewId: string): Promise<unknown>;
export declare function replyToReview(reviewId: string, comment: string): Promise<unknown>;
export declare function deleteReply(reviewId: string): Promise<unknown>;
export declare const reviewTools: {
    gbp_list_reviews: {
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
                orderBy: {
                    type: string;
                    description: string;
                };
            };
        };
        handler: (args: {
            pageSize?: number;
            pageToken?: string;
            orderBy?: string;
        }) => Promise<unknown>;
    };
    gbp_get_review: {
        description: string;
        inputSchema: {
            type: "object";
            properties: {
                reviewId: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        handler: (args: {
            reviewId: string;
        }) => Promise<unknown>;
    };
    gbp_reply_review: {
        description: string;
        inputSchema: {
            type: "object";
            properties: {
                reviewId: {
                    type: string;
                    description: string;
                };
                comment: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        handler: (args: {
            reviewId: string;
            comment: string;
        }) => Promise<unknown>;
    };
    gbp_delete_reply: {
        description: string;
        inputSchema: {
            type: "object";
            properties: {
                reviewId: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        handler: (args: {
            reviewId: string;
        }) => Promise<unknown>;
    };
};
//# sourceMappingURL=reviews.d.ts.map