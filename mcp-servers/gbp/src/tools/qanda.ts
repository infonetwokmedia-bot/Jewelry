// Google Business Profile - Q&A Tools
// API: My Business Q&A API

import { getAccessToken, getConfig } from '../auth.js';
import type { GBPConfig } from '../types.js';

const API_BASE = 'https://mybusinessqanda.googleapis.com/v1';

async function apiRequest(config: GBPConfig, path: string, method = 'GET', body?: unknown): Promise<unknown> {
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
        throw new Error(`GBP Q&A API error (${res.status}): ${error}`);
    }
    if (method === 'DELETE') return { success: true };
    return res.json();
}

export async function listQuestions(pageSize = 20, pageToken?: string, orderBy?: string) {
    const config = getConfig();
    const parent = `locations/${config.locationId}`;
    const params = new URLSearchParams({ pageSize: String(pageSize) });
    if (pageToken) params.set('pageToken', pageToken);
    if (orderBy) params.set('orderBy', orderBy);
    return apiRequest(config, `/${parent}/questions?${params}`);
}

export async function answerQuestion(questionId: string, text: string) {
    const config = getConfig();
    const parent = `locations/${config.locationId}/questions/${questionId}`;
    return apiRequest(config, `/${parent}/answers:upsert`, 'POST', { text });
}

export async function deleteAnswer(questionId: string) {
    const config = getConfig();
    const parent = `locations/${config.locationId}/questions/${questionId}`;
    return apiRequest(config, `/${parent}/answers:delete`, 'DELETE');
}

export async function listAnswers(questionId: string, pageSize = 20, pageToken?: string) {
    const config = getConfig();
    const parent = `locations/${config.locationId}/questions/${questionId}`;
    const params = new URLSearchParams({ pageSize: String(pageSize) });
    if (pageToken) params.set('pageToken', pageToken);
    return apiRequest(config, `/${parent}/answers?${params}`);
}

export const qandaTools = {
    gbp_list_questions: {
        description: 'List questions asked about the business on Google Business Profile.',
        inputSchema: {
            type: 'object' as const,
            properties: {
                pageSize: { type: 'number', description: 'Questions per page (max 50)', default: 20 },
                pageToken: { type: 'string', description: 'Token for next page' },
                orderBy: { type: 'string', description: 'Sort order: "updateTime desc" or "upvoteCount desc"' },
            },
        },
        handler: async (args: { pageSize?: number; pageToken?: string; orderBy?: string }) => {
            return await listQuestions(args.pageSize, args.pageToken, args.orderBy);
        },
    },
    gbp_answer_question: {
        description: 'Answer a question on Google Business Profile (as the business owner).',
        inputSchema: {
            type: 'object' as const,
            properties: {
                questionId: { type: 'string', description: 'The question ID to answer' },
                text: { type: 'string', description: 'The answer text' },
            },
            required: ['questionId', 'text'],
        },
        handler: async (args: { questionId: string; text: string }) => {
            return await answerQuestion(args.questionId, args.text);
        },
    },
    gbp_delete_answer: {
        description: 'Delete your answer from a Google Business Profile question.',
        inputSchema: {
            type: 'object' as const,
            properties: {
                questionId: { type: 'string', description: 'The question ID whose answer to delete' },
            },
            required: ['questionId'],
        },
        handler: async (args: { questionId: string }) => {
            return await deleteAnswer(args.questionId);
        },
    },
    gbp_list_answers: {
        description: 'List answers to a specific question on Google Business Profile.',
        inputSchema: {
            type: 'object' as const,
            properties: {
                questionId: { type: 'string', description: 'The question ID' },
                pageSize: { type: 'number', description: 'Answers per page', default: 20 },
                pageToken: { type: 'string', description: 'Token for next page' },
            },
            required: ['questionId'],
        },
        handler: async (args: { questionId: string; pageSize?: number; pageToken?: string }) => {
            return await listAnswers(args.questionId, args.pageSize, args.pageToken);
        },
    },
};
