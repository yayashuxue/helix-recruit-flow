
import { SequenceStep } from './sequence';

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

export interface SequenceRequest {
  title: string;
  position: string;
  userId: string;
  additionalInfo?: string;
}

export interface SequenceUpdateRequest {
  sequenceId: string;
  steps: SequenceStep[];
  userId: string;
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
  steps: SequenceStep[];
  createdAt: string;
  updatedAt: string;
}
