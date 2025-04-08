import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Message } from "@/types/chat";
import { generateCompletion } from "@/services/aiService";
import { chatApi, sequenceApi } from "@/api/client";
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
  
  const clearMessages = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Hi, I'm Helix, your recruiting assistant. How can I help you today?",
      },
    ]);
  };
  
  useEffect(() => {
    const loadInitialHistory = async () => {
      if (!userId) {
        console.log("No user ID provided, skipping initial history load");
        return;
      }
      console.log("Loading initial chat history for user:", userId);
      try {
        const response = await chatApi.getChatHistory(userId);
        console.log("Initial history response:", response);
        
        // Debug the structure of response.data
        console.log("Response data type:", typeof response.data);
        console.log("Response data structure:", response.data);
        
        // Handle different response structures - check if data is itself an object with 'data' property
        let historyData;
        if (response.success) {
          if (Array.isArray(response.data)) {
            // Direct array in response.data
            historyData = response.data;
          } else if (typeof response.data === 'object' && response.data !== null) {
            // Check if it has a nested data array
            if (response.data.data && Array.isArray(response.data.data)) {
              historyData = response.data.data;
            } else if (response.data.messages && Array.isArray(response.data.messages)) {
              historyData = response.data.messages;
            } else {
              // Maybe it's a single message object or contains messages in a different property
              console.log("Exploring response data properties:", Object.keys(response.data));
              
              // Check if any property contains an array that might be messages
              for (const key of Object.keys(response.data)) {
                const value = response.data[key];
                if (Array.isArray(value) && value.length > 0) {
                  console.log(`Found array in property '${key}':`, value);
                  historyData = value;
                  break;
                }
              }
              
              // If still no array found, convert the object to an array if it looks like a message
              if (!historyData && 'content' in response.data && 'role' in response.data) {
                historyData = [response.data];
              }
            }
          }
        }
        
        if (historyData && historyData.length > 0) {
          console.log("Found history data:", historyData);
          
          // Convert each message to match Message type exactly
          const processedMessages = historyData.map(msg => {
            // Ensure message has all required properties
            if (!msg || typeof msg !== 'object') {
              console.warn("Invalid message format:", msg);
              return null; // Skip invalid messages
            }
            
            if (!msg.content) {
              console.warn("Message missing content:", msg);
              msg.content = ""; // Provide default content
            }
            
            if (!msg.role) {
              console.warn("Message missing role:", msg);
              msg.role = "user"; // Default role
            }
            
            if (!msg.id) {
              console.warn("Message missing id:", msg);
              msg.id = crypto.randomUUID(); // Generate id if missing
            }
            
            // Create new object to ensure shape matches exactly
            return {
              id: msg.id,
              role: msg.role,
              content: msg.content
            };
          }).filter(Boolean); // Remove any null entries
          
          if (processedMessages.length > 0) {
            console.log("Processed messages:", processedMessages);
            
            // Update state with a function to ensure latest state
            setMessages(prevMessages => {
              const welcomeMsg = prevMessages.find(m => m.id === "welcome");
              const newMessages = welcomeMsg 
                ? [welcomeMsg, ...processedMessages.filter(m => m.id !== "welcome")]
                : processedMessages;
              
              console.log("Final message array to be set:", newMessages);
              return newMessages;
            });
          } else {
            console.warn("No valid messages found after processing");
          }
        } else {
          console.warn("No valid history data found in response");
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
      }
    };
    
    console.log("Initial render, messages:", messages);
    loadInitialHistory();
  }, [userId]);

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

    // 添加关键日志，记录sequenceId的传递情况
    console.log("Current sequenceId being sent with request:", sequenceId);
    
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
          
          // 添加新日志，检查响应中的上下文信息
          if (response.data && response.success && typeof response.data === 'object' && 'context' in response.data) {
            console.log("Context from response:", (response.data as any).context);
          }
          
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
              processToolCalls(toolCalls);
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

  // Handle specific tool calls in the response
  const processToolCalls = async (toolCalls) => {
    console.log("Processing tool calls:", toolCalls);
    
    for (const toolCall of toolCalls) {
      console.log(`Processing tool call: ${toolCall.name}`);
      setActiveTool(toolCall.name);
      
      // 添加工具使用消息
      addMessage({
        role: "system",
        content: `🔧 Using ${formatToolName(toolCall.name)}...`,
      });
      
      // 处理工具结果
      if (toolCall.result) {
        console.log(`Tool ${toolCall.name} result:`, toolCall.result);
        
        // 工具成功完成的通用处理逻辑
        if (toolCall.result.error) {
          // 如果有错误，添加错误消息
          addMessage({
            role: "system",
            content: `❌ Error: ${toolCall.result.error}`,
          });
        } else {
          // 为所有工具添加成功消息
          addMessage({
            role: "system",
            content: `✅ ${formatToolName(toolCall.name)} completed successfully!`,
          });
          
          // 工具特定的处理逻辑
          if (toolCall.name === "generate_sequence") {
            // 序列生成逻辑
            const resultData = toolCall.result.result || toolCall.result;
            console.log("Generated sequence data:", resultData);
            
            if (resultData && resultData.position) {
              // 传递序列数据
              onSequenceRequest(JSON.stringify({
                ...resultData,
                _toolCall: { name: toolCall.name, arguments: toolCall.arguments }
              }));
            }
          } else if (toolCall.name === "refine_sequence_step") {
            // 处理序列修改工具
            const resultData = toolCall.result.result || toolCall.result;
            console.log("🔄 Sequence refinement result:", resultData);
            
            if (resultData) {
              // 添加工具执行成功消息
              addMessage({
                role: "system",
                content: "✅ Sequence updated successfully!"
              });
              
              // 如果当前有序列ID，获取完整的序列数据
              if (sequenceId) {
                console.log("⚠️ Current sequence ID:", sequenceId);
                // 请求完整序列数据
                try {
                  // 使用正确的API方法名
                  sequenceApi.get(sequenceId)
                    .then(fullSequence => {
                      if (fullSequence.success && fullSequence.data) {
                        // 标记修改的步骤以供高亮
                        const steps = fullSequence.data.steps.map(step => 
                          step.id === resultData.step_id 
                            ? { ...step, _highlight: true } 
                            : step
                        );
                        
                        // 传递完整序列数据
                        onSequenceRequest(JSON.stringify({
                          ...fullSequence.data,
                          steps,
                          _toolCall: { name: toolCall.name, arguments: toolCall.arguments }
                        }));
                      }
                    })
                    .catch(error => {
                      console.error("Error fetching full sequence:", error);
                      
                      // 在API调用失败时，至少传递我们有的部分数据
                      onSequenceRequest(JSON.stringify({
                        ...resultData,
                        _toolCall: { name: toolCall.name, arguments: toolCall.arguments },
                        _highlight: true // 添加高亮标记
                      }));
                    });
                } catch (error) {
                  console.error("Error setting up sequence fetch:", error);
                  
                  // 即使在出错时也发送数据
                  onSequenceRequest(JSON.stringify({
                    ...resultData,
                    _toolCall: { name: toolCall.name, arguments: toolCall.arguments },
                    _highlight: true
                  }));
                }
              } else {
                // 如果没有sequenceId，直接传递我们有的数据
                onSequenceRequest(JSON.stringify({
                  ...resultData,
                  _toolCall: { name: toolCall.name, arguments: toolCall.arguments },
                  _highlight: true
                }));
              }
            }
          }
        }
      } else {
        // 没有结果时，添加默认处理完成消息防止卡住
        console.warn(`No result for tool ${toolCall.name}, adding default completion message`);
        addMessage({
          role: "system",
          content: `✅ ${formatToolName(toolCall.name)} operation completed.`,
        });
      }
    }
    
    // 重置活动工具
    setActiveTool(null);
    // 确保加载状态结束
    setIsLoading(false);
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
        
        // 简化标志检查 - 只有当这是我们自己的保存操作时忽略更新
        if (isLocalUpdateRef.current) {
          console.log("Ignoring socket update as it's from our own save operation");
          isLocalUpdateRef.current = false;
          return;
        }
        
        // 提取序列数据
        const sequenceData = data.result || data;
        
        // 直接处理序列ID并更新状态
        if (sequenceData && sequenceData.id) {
          console.log("Found sequence ID in socket event:", sequenceData.id);
          
          // 只有当序列有步骤时才更新 - 同步序列数据
          if (sequenceData.steps && Array.isArray(sequenceData.steps)) {
            // 更新序列数据，但不添加额外消息
            console.log("Silently updating sequence data in workspace");
            
            // 传递给序列处理函数，但添加标记防止显示额外消息
            const dataWithFlag = {
              ...sequenceData,
              _silentUpdate: true
            };
            
            onSequenceRequest(JSON.stringify(dataWithFlag));
          }
        } else {
          console.warn("No sequence ID found in socket data");
        }
      } catch (error) {
        console.error("Error handling sequence update:", error);
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
    clearMessages,
    activeTool
  };
};
