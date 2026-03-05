export declare function listAccounts(): Promise<unknown>;
export declare function getLocation(readMask?: string): Promise<unknown>;
export declare function updateLocation(updates: Record<string, unknown>, updateMask: string): Promise<unknown>;
export declare const infoTools: {
    gbp_list_accounts: {
        description: string;
        inputSchema: {
            type: "object";
            properties: {};
        };
        handler: () => Promise<unknown>;
    };
    gbp_get_location: {
        description: string;
        inputSchema: {
            type: "object";
            properties: {
                fields: {
                    type: string;
                    description: string;
                };
            };
        };
        handler: (args: {
            fields?: string;
        }) => Promise<unknown>;
    };
    gbp_update_location: {
        description: string;
        inputSchema: {
            type: "object";
            properties: {
                phone: {
                    type: string;
                    description: string;
                };
                websiteUri: {
                    type: string;
                    description: string;
                };
                description: {
                    type: string;
                    description: string;
                };
                regularHours: {
                    type: string;
                    description: string;
                };
            };
        };
        handler: (args: {
            phone?: string;
            websiteUri?: string;
            description?: string;
            regularHours?: unknown;
        }) => Promise<unknown>;
    };
};
//# sourceMappingURL=info.d.ts.map