#!/usr/bin/env node
// MCP Server - Google Business Profile
// Tu Joyita Miami - Manages reviews, posts, metrics, media, Q&A, and business info
//
// Requires environment variables:
//   GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN,
//   GBP_ACCOUNT_ID, GBP_LOCATION_ID
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { reviewTools } from './tools/reviews.js';
import { postTools } from './tools/posts.js';
import { metricsTools } from './tools/metrics.js';
import { mediaTools } from './tools/media.js';
import { qandaTools } from './tools/qanda.js';
import { infoTools } from './tools/info.js';
const server = new McpServer({
    name: 'google-business-profile',
    version: '1.0.0',
    description: 'Manage Google Business Profile for Tu Joyita Miami - reviews, posts, metrics, media, Q&A, and business information.',
});
// Helper: convert a JSON Schema property definition to a Zod schema
function jsonPropToZod(prop) {
    const t = prop.type;
    if (t === 'number')
        return z.number().optional();
    if (t === 'array')
        return z.array(z.string()).optional();
    if (t === 'object')
        return z.record(z.string(), z.unknown()).optional();
    return z.string().optional();
}
// Register all tools from each module
function registerTools(toolDefs) {
    for (const [name, def] of Object.entries(toolDefs)) {
        // Build Zod shape from inputSchema properties
        const shape = {};
        const props = def.inputSchema.properties || {};
        const required = def.inputSchema.required || [];
        for (const [key, propDef] of Object.entries(props)) {
            const prop = propDef;
            let zSchema = jsonPropToZod(prop);
            if (prop.description) {
                zSchema = zSchema.describe(prop.description);
            }
            // If required, unwrap optional
            if (required.includes(key)) {
                if (prop.type === 'number') {
                    zSchema = z.number().describe(prop.description || key);
                }
                else {
                    zSchema = z.string().describe(prop.description || key);
                }
            }
            shape[key] = zSchema;
        }
        server.tool(name, def.description, shape, async (args) => {
            try {
                const result = await def.handler(args);
                return {
                    content: [{
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        }],
                };
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return {
                    content: [{
                            type: 'text',
                            text: `Error: ${message}`,
                        }],
                    isError: true,
                };
            }
        });
    }
}
// Register all tool modules
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- handler arg types are intentionally broader
registerTools(reviewTools);
registerTools(postTools);
registerTools(metricsTools);
registerTools(mediaTools);
registerTools(qandaTools);
registerTools(infoTools);
// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Google Business Profile MCP Server started (stdio transport)');
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map