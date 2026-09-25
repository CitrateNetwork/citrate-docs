export declare const MIN_MCP_KEY_PEPPER_LENGTH: number;
export declare const MIN_MCP_KEY_PEPPER_DISTINCT: number;
export type McpPepperStatus = "ok" | "missing" | "weak";
export declare function pepperStatus(raw: string | undefined | null): McpPepperStatus;
export declare function mcpPepperStatus(env?: NodeJS.ProcessEnv): McpPepperStatus;
