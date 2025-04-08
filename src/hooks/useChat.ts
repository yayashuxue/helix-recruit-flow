import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Message } from "@/types/chat";
import { generateCompletion } from "@/services/aiService";
import { chatApi } from "@/api/client";
import { FEATURES, API_CONFIG } from "@/config/appConfig";
import io, { Socket } from 'socket.io-client';

type UseChatProps = {
  userId: string;
  sequenceId?: string;
  onSequenceRequest: (content: string) => void;
};

export const useChat = ({ userId, sequenceId, onSequenceRequest }: UseChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi, I'm Helix, your recruiting assistant. How can I help you today?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [useFallbackPolling, setUseFallbackPolling] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Track whether we're in a save operation to prevent redundant updates
  const isLocalUpdateRef = useRef(false);

  // Setup event listener for save operations
  useEffect(() => {
    const handleSaveStarted = () => {
      console.log('Detected local save operation, ignoring next socket update');
      isLocalUpdateRef.current = true;
      
      // Reset the flag after a reasonable timeout in case the save response is delayed
      setTimeout(() => {
        isLocalUpdateRef.current = false;
      }, 5000);
    };
    
    window.addEventListener('sequence_save_started', handleSaveStarted);
    
    return () => {
      window.removeEventListener('sequence_save_started', handleSaveStarted);
    };
  }, []);

  // Clear polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const addMessage = (newMessage: Omit<Message, "id">) => {
    const id = crypto.randomUUID();
    setMessages((prev) => [...prev, { ...newMessage, id }]);
  };

  // Function to fetch latest messages using standard HTTP
  const pollForUpdates = async () => {
    try {
      const response = await chatApi.getChatHistory(userId);
      if (response.success && response.data) {
        // Only add new messages that aren't already in the state
        const currentIds = new Set(messages.map(msg => msg.id));
        const newMessages = response.data.filter(msg => !currentIds.has(msg.id));
        
        if (newMessages.length > 0) {
          setMessages(prev => [...prev, ...newMessages]);
        }
      }
    } catch (error) {
      console.error("Error polling for updates:", error);
    }
  };

  // Start or stop polling based on useFallbackPolling state
  useEffect(() => {
    if (useFallbackPolling) {
      console.log("Starting fallback polling for updates");
      pollingIntervalRef.current = setInterval(pollForUpdates, 3000); // Poll every 3 seconds
    } else if (pollingIntervalRef.current) {
      console.log("Stopping fallback polling");
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [useFallbackPolling]);

  const processResponseContent = (content: string): string => {
    if (!content) {
      console.log("Warning: Received empty content to process");
      return '';
    }
    
    console.log("Processing content:", content.substring(0, 100) + "...");
    
    // Remove thinking tags and their content
    let processed = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
    
    // Remove any HTML-like tags that might remain
    processed = processed.replace(/<[^>]*>/g, '');
    
    // Trim whitespace
    processed = processed.trim();
    
    // If empty after processing but had content, use original
    if (!processed && content) {
      console.warn("Processing removed all content, using original");
      processed = content.trim();
    }
    
    return processed;
  };

  const handleUserMessage = async (content: string) => {
    console.log("isLoading before:", isLoading);
    addMessage({ role: "user", content });
    setIsLoading(true);
    console.log("isLoading set to true");

    try {
      if (FEATURES.USE_BACKEND_API) {
        console.log("Using backend API to send message");
        console.log("Request payload:", {
          message: content,
          userId,
          sequenceId: sequenceId ? sequenceId : undefined,
        });
        
        // Log the actual fetch request
        console.log("API endpoint:", API_CONFIG.BASE_URL + "/chat/message");
        
        try {
          const response = await chatApi.sendMessage({
            message: content,
            userId,
            sequenceId: sequenceId ? sequenceId : undefined,
          });
          
          console.log("Response received:", response);
          
          if (response.success) {
            console.log("Processing successful response");
            
            // Handle nested data structures
            let responseData: any = response.data;
            
            // Check if we have nested data structure (response.data.data)
            if (responseData && responseData.data) {
              console.log("Detected nested data structure, extracting inner data");
              responseData = responseData.data;
            }
            
            if (!responseData) {
              console.error("Response data is missing");
              throw new Error("Invalid response structure");
            }
            
            // Process the content if available
            let messageContent = responseData.content || "";
            
            if (messageContent) {
              messageContent = processResponseContent(messageContent);
            }
            
            // If we still have no content, use a fallback
            if (!messageContent) {
              console.warn("No valid content found in response, using fallback");
              messageContent = "I'm processing your request. Please provide more information about your recruiting needs.";
            }
            
            // Add the assistant's response
            addMessage({ role: "assistant", content: messageContent });
            
            // Handle any tool calls in the response
            const toolCalls = responseData.tool_calls || [];
            if (toolCalls.length > 0) {
              console.log("Processing tool calls:", toolCalls);
              // Show what tools are being used
              for (const toolCall of toolCalls) {
                setActiveTool(toolCall.name);
                
                // Add a message indicating a tool is being used
                addMessage({
                  role: "system",
                  content: `🔧 Using ${formatToolName(toolCall.name)}...`,
                });
                
                // Display the result if available
                if (toolCall.result) {
                  console.log(`Tool ${toolCall.name} result:`, toolCall.result);
                  
                  if (toolCall.name === "generate_sequence") {
                    // Handle sequence generation result
                    addMessage({
                      role: "system",
                      content: "✅ Generated sequence successfully!",
                    });
                    
                    // If we have sequence data, update the workspace
                    const resultData = toolCall.result.result || toolCall.result;
                    console.log("Generated sequence data:", resultData);
                    
                    if (resultData && resultData.position) {
                      // Pass the entire result data instead of just additionalInfo
                      // This ensures the sequence steps are passed to the useSequence hook
                      onSequenceRequest(JSON.stringify(resultData));
                      
                      // Add a message confirming the sequence was created
                      const stepsCount = (resultData.steps && resultData.steps.length) || 0;
                      addMessage({
                        role: "system",
                        content: `✅ ${stepsCount}-step sequence for ${resultData.position} created!`,
                      });
                    } else if (toolCall.result.error) {
                      addMessage({
                        role: "system",
                        content: `❌ Error generating sequence: ${toolCall.result.error}`,
                      });
                    }
                  } else if (toolCall.name === "refine_sequence_step") {
                    addMessage({
                      role: "system",
                      content: "✅ Refined sequence step successfully!",
                    });
                  } else if (toolCall.name === "analyze_sequence") {
                    // Format the analysis result for display
                    const resultData = toolCall.result.result || toolCall.result;
                    const analysis = resultData?.analysis;
                    if (analysis) {
                      addMessage({
                        role: "system", 
                        content: `📊 **Sequence Analysis**:\n\nQuality: ${analysis.overall_quality}\n\nSuggestions:\n${analysis.suggestions.map(s => `- ${s}`).join('\n')}`,
                      });
                    }
                  }
                } else {
                  console.warn(`Tool ${toolCall.name} has no result`);
                }
              }
              
              // Reset active tool
              setActiveTool(null);
            }

            // 当从AI接收序列数据时
            if (responseData && responseData.id) {
              console.log("设置序列ID:", responseData.id);
            }
          } else {
            console.warn("Backend API failed, falling back to direct AI service");
            const aiResponse = await generateCompletion([...messages, { id: "temp", role: "user", content }]);
            addMessage({ role: "assistant", content: aiResponse });
          }
        } catch (networkError) {
          console.error("Network error details:", networkError);
          // Check for CORS or network issues
          if (networkError.message && networkError.message.includes('NetworkError')) {
            console.error("Possible CORS issue detected");
          }
          
          // Re-throw to be caught by outer try/catch
          throw networkError;
        }
      } else {
        const aiResponse = await generateCompletion([...messages, { id: "temp", role: "user", content }]);
        addMessage({ role: "assistant", content: aiResponse });
      }
    } catch (error) {
      console.error("Error processing message:", error);
      addMessage({ 
        role: "assistant", 
        content: "I'm having trouble connecting to the AI service. Please try again later." 
      });
    } finally {
      console.log("Setting isLoading to false");
      setIsLoading(false);
      
      // make sure isLoading is set to false after the message is sent
      setTimeout(() => {
        console.log("isLoading after timeout:", isLoading);
      }, 100);
    }
  };

  // Format tool names for display
  const formatToolName = (name: string): string => {
    switch (name) {
      case "generate_sequence":
        return "Sequence Generator";
      case "refine_sequence_step":
        return "Sequence Editor";
      case "analyze_sequence":
        return "Sequence Analyzer";
      default:
        return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
  };

  // Only setup Socket.IO for scenarios requiring real-time updates
  useEffect(() => {
    // Only use WebSockets if we're working with sequences or have specific real-time needs
    const needsRealtime = !!sequenceId;
    
    if (!needsRealtime || useFallbackPolling) {
      // Either we don't need real-time updates or we're using polling fallback
      if (socketRef.current) {
        console.log('Disconnecting Socket.IO - not needed for this view');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }
    
    const serverUrl = API_CONFIG.BASE_URL.replace('/api', '');
    console.log(`Connecting to Socket.IO server for real-time sequence updates: ${serverUrl}`);
    
    // Use connection tracking
    let connectionAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 3;
    
    // Configure Socket.IO - only use for specific real-time scenarios
    const socket = io(serverUrl, {
      transports: ['polling'], // Start with polling for Python 3.12 compatibility
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      timeout: 5000 // Shorter timeout
    });
    
    socketRef.current = socket;
    
    // Debug socket connection
    socket.on('connect', () => {
      console.log('Socket.IO connected successfully using', socket.io.engine.transport.name);
      console.log('Socket ID:', socket.id);
      connectionAttempts = 0;
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      connectionAttempts++;
      
      // After MAX_RECONNECT_ATTEMPTS, fall back to polling
      if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log(`Socket.IO failed after ${connectionAttempts} attempts, falling back to HTTP polling`);
        setUseFallbackPolling(true);
        socket.disconnect();
      }
    });
    
    // Only listen for specific events relevant to sequences
    socket.on('sequence_updated', (data) => {
      try {
        console.log("Received sequence update from socket:", data);
        
        // Skip if this is just a response to our own save operation
        if (isLocalUpdateRef.current) {
          console.log("Ignoring socket update as it's from our own save operation");
          isLocalUpdateRef.current = false;
          return;
        }
        
        // Important fix: correctly extract sequence data
        // data might be {result: {...}} or directly the sequence object
        const sequenceData = data.result || data;
        
        console.log("Extracted sequence data:", sequenceData);
        
        // Check if sequence ID exists
        if (sequenceData && sequenceData.id) {
          console.log("Found sequence ID in socket event:", sequenceData.id);
        } else {
          console.warn("No sequence ID found in socket data");
        }
        
        // Ensure we pass complete data to sequence processing function
        if (sequenceData && sequenceData.steps) {
          console.log("Passing complete sequence data to useSequence");
          onSequenceRequest(JSON.stringify(sequenceData));
        }
      } catch (error) {
        console.error("Error handling sequence update:", error);
        // Don't throw the error - this prevents page refresh
      }
    });

    // Add more debugging events
    socket.on('message', (data) => {
      console.log('Socket.IO received message:', data);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected, reason:', reason);
    });
    
    // Log connection status (move this out of nested useEffect)
    console.log("Socket.IO connection status:", socketRef.current ? "connected" : "disconnected");
    
    return () => {
      console.log('Disconnecting Socket.IO');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [sequenceId, useFallbackPolling, onSequenceRequest]);

  // Add separate useEffect for logging socket connection status
  useEffect(() => {
    if (socketRef.current) {
      console.log("Socket.IO connection status updated:", socketRef.current.connected ? "connected" : "disconnected");
    }
  }, []);

  return {
    messages,
    isLoading,
    handleUserMessage,
    addMessage,
    activeTool
  };
};
