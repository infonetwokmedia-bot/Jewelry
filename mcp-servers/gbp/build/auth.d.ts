import { OAuth2Client } from 'google-auth-library';
import type { GBPConfig } from './types.js';
export declare function getAuthClient(config: GBPConfig): OAuth2Client;
export declare function getAccessToken(config: GBPConfig): Promise<string>;
export declare function getConfig(): GBPConfig;
//# sourceMappingURL=auth.d.ts.map