import { Message, ToolCall } from "./chat";
import { SequenceStep } from "./sequence";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ChatRequest {
  message: string;
  userId: string;
  sequenceId?: string;
}

export interface ChatResponse {
  id: string;
  role: string;
  content: string;
  tool_calls?: ToolCall[];
}

export interface SequenceRequest {
  title: string;
  position: string;
  userId: string;
  additionalInfo?: string;
  steps?: SequenceStep[];
}

export interface SequenceUpdateRequest {
  sequenceId: string;
  steps: SequenceStep[];
  userId: string;
  title?: string;
  position?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  company?: string;
}

export interface Sequence {
  id: string;
  title: string;
  position: string;
  userId: string;
  additionalInfo?: string;
  steps: SequenceStep[];
  createdAt: string;
  updatedAt: string;
}
