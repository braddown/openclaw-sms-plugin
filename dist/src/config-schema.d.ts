export declare const SmsConfigSchema: {
    schema: {
        type: string;
        properties: {
            enabled: {
                type: string;
                default: boolean;
            };
            apiKey: {
                type: string;
                description: string;
            };
            baseUrl: {
                type: string;
                default: string;
                description: string;
            };
            agentId: {
                type: string;
                description: string;
            };
            allowFrom: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
                default: any[];
            };
            dmPolicy: {
                type: string;
                enum: string[];
                default: string;
                description: string;
            };
            callbackSecret: {
                type: string;
                description: string;
            };
            webhookPath: {
                type: string;
                default: string;
                description: string;
            };
        };
        required: string[];
    };
    uiHints: {
        enabled: {
            label: string;
            help: string;
        };
        apiKey: {
            label: string;
            help: string;
            sensitive: boolean;
            placeholder: string;
        };
        baseUrl: {
            label: string;
            help: string;
            advanced: boolean;
        };
        agentId: {
            label: string;
            help: string;
            advanced: boolean;
        };
        allowFrom: {
            label: string;
            help: string;
            itemTemplate: string;
        };
        dmPolicy: {
            label: string;
            help: string;
        };
        callbackSecret: {
            label: string;
            help: string;
            sensitive: boolean;
            advanced: boolean;
        };
        webhookPath: {
            label: string;
            help: string;
            advanced: boolean;
        };
    };
};
