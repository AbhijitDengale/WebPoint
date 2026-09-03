/**
 * Minimal WebMCP typings based on the spec at webmachinelearning/webmcp.
 * Full spec: https://github.com/webmachinelearning/webmcp
 */
interface ModelContextTool {
  name: string;
  description: string;
  inputSchema?: object;
  execute: (input: Record<string, unknown>, context?: unknown) => unknown | Promise<unknown>;
}

interface ModelContext {
  registerTool(
    tool: ModelContextTool,
    options?: { signal?: AbortSignal }
  ): Promise<undefined>;
  getTools(options?: { exposeToOrigin?: boolean }): Promise<ModelContextTool[]>;
}

interface Document {
  /** Present only in WebMCP-capable browsers (ChatGPT in-app browser, Chrome 149+ with flag). */
  readonly modelContext: ModelContext;
}
