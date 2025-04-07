export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  arguments: any;
  result?: any;
}
