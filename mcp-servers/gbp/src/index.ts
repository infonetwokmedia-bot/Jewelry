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

import { infoTools } from './tools/info.js';
import { mediaTools } from './tools/media.js';
import { metricsTools } from './tools/metrics.js';
import { postTools } from './tools/posts.js';
import { qandaTools } from './tools/qanda.js';
import { reviewTools } from './tools/reviews.js';

const server = new McpServer({
    name: 'google-business-profile',
    version: '1.0.0',
    description: 'Manage Google Business Profile for Tu Joyita Miami - reviews, posts, metrics, media, Q&A, and business information.',
});

// Helper: convert a JSON Schema property definition to a Zod schema
function jsonPropToZod(prop: Record<string, unknown>): z.ZodTypeAny {
    const t = prop.type as string;
    if (t === 'number') return z.number().optional();
    if (t === 'array') return z.array(z.string()).optional();
    if (t === 'object') return z.record(z.string(), z.unknown()).optional();
    return z.string().optional();
}

// Register all tools from each module
function registerTools(
    toolDefs: Record<string, {
        description: string;
        inputSchema: { type: string; properties: Record<string, unknown>; required?: string[] };
        handler: (args: Record<string, unknown>) => Promise<unknown>;
    }>
) {
    for (const [name, def] of Object.entries(toolDefs)) {
        // Build Zod shape from inputSchema properties
        const shape: Record<string, z.ZodTypeAny> = {};
        const props = def.inputSchema.properties || {};
        const required = def.inputSchema.required || [];

        for (const [key, propDef] of Object.entries(props)) {
            const prop = propDef as Record<string, unknown>;
            let zSchema = jsonPropToZod(prop);
            if (prop.description) {
                zSchema = zSchema.describe(prop.description as string);
            }
            // If required, unwrap optional
            if (required.includes(key)) {
                if (prop.type === 'number') {
                    zSchema = z.number().describe((prop.description as string) || key);
                } else {
                    zSchema = z.string().describe((prop.description as string) || key);
                }
            }
            shape[key] = zSchema;
        }

        server.tool(
            name,
            def.description,
            shape,
            async (args: Record<string, unknown>) => {
                try {
                    const result = await def.handler(args);
                    return {
                        content: [{
                            type: 'text' as const,
                            text: JSON.stringify(result, null, 2),
                        }],
                    };
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    return {
                        content: [{
                            type: 'text' as const,
                            text: `Error: ${message}`,
                        }],
                        isError: true,
                    };
                }
            }
        );
    }
}

// Register all tool modules
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- handler arg types are intentionally broader
registerTools(reviewTools as any);
registerTools(postTools as any);
registerTools(metricsTools as any);
registerTools(mediaTools as any);
registerTools(qandaTools as any);
registerTools(infoTools as any);

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
