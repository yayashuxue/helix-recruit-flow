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
  generate: async (request: SequenceRequest): Promise<ApiResponse<Sequence>> => {
    console.log("Calling generate sequence API with:", {
      title: request.title,
      position: request.position,
      userId: request.userId
    });
    
    try {
      const result = await fetchAPI<Sequence>('/sequences/generate', 'POST', request);
      console.log("Generate sequence API response:", result);
      
      if (result.success && result.data) {
        console.log("Successfully generated sequence with ID:", result.data.id);
      } else {
        console.error("Failed to generate sequence:", result.error);
      }
      
      return result;
    } catch (error) {
      console.error("Error in generate sequence API call:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during sequence generation'
      };
    }
  },
  
  update: async (request: SequenceUpdateRequest): Promise<ApiResponse<Sequence>> => {
    console.log("Calling update sequence API with ID:", request.sequenceId);
    
    try {
      const result = await fetchAPI<Sequence>('/sequences/update', 'PUT', request);
      console.log("Update sequence API response:", result);
      
      if (result.success) {
        console.log("Successfully updated sequence");
      } else {
        console.error("Failed to update sequence:", result.error);
      }
      
      return result;
    } catch (error) {
      console.error("Error in update sequence API call:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during sequence update'
      };
    }
  },
  
  get: async (sequenceId: string): Promise<ApiResponse<Sequence>> => {
    console.log("Fetching sequence with ID:", sequenceId);
    
    try {
      const result = await fetchAPI<Sequence>(`/sequences/${sequenceId}`, 'GET');
      return result;
    } catch (error) {
      console.error("Error fetching sequence:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error fetching sequence'
      };
    }
  },
  
  list: async (userId: string): Promise<ApiResponse<Sequence[]>> => {
    try {
      const result = await fetchAPI<Sequence[]>(`/sequences/user/${userId}`, 'GET');
      return result;
    } catch (error) {
      console.error("Error listing sequences:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error listing sequences'
      };
    }
  },
};
