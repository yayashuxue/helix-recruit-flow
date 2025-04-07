import { ApiResponse, ChatRequest, SequenceRequest, SequenceUpdateRequest, Sequence } from '@/types/api';
import { Message } from '@/types/chat';
import { API_CONFIG } from '@/config/appConfig';

// Generic fetch function with error handling
async function fetchAPI<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
      method,
      headers: API_CONFIG.DEFAULT_HEADERS,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Something went wrong',
      };
    }

    return {
      success: true,
      data: data as T,
    };
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// API endpoints for chat
export const chatApi = {
  sendMessage: async (data: ChatRequest): Promise<ApiResponse<Message>> => {
    console.log("Starting API request to:", `${API_CONFIG.BASE_URL}/chat/message`);
    try {
      const result = await fetchAPI<Message>('/chat/message', 'POST', data);
      console.log("API response received:", result);
      return result;
    } catch (error) {
      console.error("API request failed with error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  },
  getChatHistory: (userId: string): Promise<ApiResponse<Message[]>> => {
    return fetchAPI<Message[]>(`/chat/history/${userId}`, 'GET');
  },
};

// API endpoints for sequences
export const sequenceApi = {
  generate: (request: SequenceRequest): Promise<ApiResponse<Sequence>> => {
    return fetchAPI<Sequence>('/sequences/generate', 'POST', request);
  },
  update: (request: SequenceUpdateRequest): Promise<ApiResponse<Sequence>> => {
    return fetchAPI<Sequence>('/sequences/update', 'PUT', request);
  },
  get: (sequenceId: string): Promise<ApiResponse<Sequence>> => {
    return fetchAPI<Sequence>(`/sequences/${sequenceId}`, 'GET');
  },
  list: (userId: string): Promise<ApiResponse<Sequence[]>> => {
    return fetchAPI<Sequence[]>(`/sequences/user/${userId}`, 'GET');
  },
};
