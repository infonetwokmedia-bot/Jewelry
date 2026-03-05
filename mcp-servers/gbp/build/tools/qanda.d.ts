export declare function listQuestions(pageSize?: number, pageToken?: string, orderBy?: string): Promise<unknown>;
export declare function answerQuestion(questionId: string, text: string): Promise<unknown>;
export declare function deleteAnswer(questionId: string): Promise<unknown>;
export declare function listAnswers(questionId: string, pageSize?: number, pageToken?: string): Promise<unknown>;
export declare const qandaTools: {
    gbp_list_questions: {
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
    gbp_answer_question: {
        description: string;
        inputSchema: {
            type: "object";
            properties: {
                questionId: {
                    type: string;
                    description: string;
                };
                text: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        handler: (args: {
            questionId: string;
            text: string;
        }) => Promise<unknown>;
    };
    gbp_delete_answer: {
        description: string;
        inputSchema: {
            type: "object";
            properties: {
                questionId: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        handler: (args: {
            questionId: string;
        }) => Promise<unknown>;
    };
    gbp_list_answers: {
        description: string;
        inputSchema: {
            type: "object";
            properties: {
                questionId: {
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
            questionId: string;
            pageSize?: number;
            pageToken?: string;
        }) => Promise<unknown>;
    };
};
//# sourceMappingURL=qanda.d.ts.map