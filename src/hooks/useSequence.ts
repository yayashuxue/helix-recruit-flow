import { useState, useEffect } from "react";
import { toast } from "sonner";
import { SequenceStep } from "@/types/sequence";
import { generateSequence } from "@/services/aiService";
import { sequenceApi } from "@/api/client";
import { FEATURES } from "@/config/appConfig";

type UseSequenceProps = {
  userId: string;
};

export const useSequence = ({ userId }: UseSequenceProps) => {
  const [sequence, setSequence] = useState<SequenceStep[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sequenceId, setSequenceId] = useState<string | null>(null);
  const [sequenceTitle, setSequenceTitle] = useState<string>("New Sequence");
  const [sequencePosition, setSequencePosition] = useState<string>("Position");

  // 增加sequenceId的设置监听器
  useEffect(() => {
    console.log("sequenceId updated:", sequenceId);
  }, [sequenceId]);

  const generateSequenceFromMessage = async (userMessage: string, addMessage: (message: Omit<import("@/types/chat").Message, "id">) => void) => {
    // 判断是否已经有序列以及消息的类型
    const hasExistingSequence = sequence.length > 0;
    console.log("generateSequenceFromMessage called", { 
      messageLength: userMessage.length,
      hasExistingSequence,
      currentSequenceId: sequenceId,
      sequenceLength: sequence.length
    });
    
    // 非序列数据JSON，是正常用户消息
    if (!userMessage.includes('"steps"')) {
      // 检查是否已有序列，且消息是关于修改序列的
      if (hasExistingSequence) {
        console.log("Working with existing sequence, analyzing user message");
        
        const lowerMessage = userMessage.toLowerCase();
        
        // 处理常见的修改请求
        if (lowerMessage.includes("email") || 
            lowerMessage.includes("contact") || 
            lowerMessage.includes("add") ||
            lowerMessage.includes("update") ||
            lowerMessage.includes("change") ||
            lowerMessage.includes("edit")) {
          
          // 根据消息内容提供针对性回复
          if (lowerMessage.includes("email") || lowerMessage.includes("contact")) {
            addMessage({
              role: "assistant",
              content: "You can edit the sequence directly in the workspace. Feel free to add your contact information or any other specific details you'd like to include.",
            });
          } else {
            addMessage({
              role: "assistant",
              content: "I'm here to help with your sequence. You can edit it directly in the workspace, or let me know what specific changes you'd like to make.",
            });
          }
          
          return;
        }
      }
      
      // 继续正常流程...
    }
    
    try {
      // 尝试解析JSON数据
      console.log("Parsing message data:", userMessage.substring(0, 100) + "...");
      const parsedData = JSON.parse(userMessage);
      
      if (parsedData && parsedData.steps && Array.isArray(parsedData.steps)) {
        console.log("Using pre-generated sequence:", parsedData);
        setIsGenerating(true);
        
        try {
          // 检查是否是来自工具调用的结果
          if (parsedData._toolCall && parsedData._toolCall.name === "generate_sequence") {
            console.log("Sequence data comes from tool call:", parsedData._toolCall);
            // 调用我们新增的处理函数
            handleToolCallResultWithID(parsedData._toolCall);
          }
          
          if (parsedData.id) {
            console.log("IMPORTANT: Setting sequence ID from parsed data:", parsedData.id);
            setSequenceId(parsedData.id);
          } else {
            console.warn("WARNING: No ID found in parsed sequence data");
          }
          
          // 然后设置其他数据
          setSequence(parsedData.steps);
          
          if (parsedData.title) {
            setSequenceTitle(parsedData.title);
          }
          
          if (parsedData.position) {
            setSequencePosition(parsedData.position);
          }
          
          // 检查是否为静默更新(来自Socket)
          if (parsedData._silentUpdate) {
            console.log("Silent update detected, not adding assistant message");
          } else {
            // 只有在非静默更新时才添加消息
            addMessage({
              role: "assistant",
              content: `I've created a draft recruiting sequence for ${parsedData.position}. You can edit any step directly in the workspace, or let me know what changes you'd like to make.`,
            });
          }
        } catch (error) {
          console.error("Error setting pre-generated sequence:", error);
          addMessage({
            role: "assistant",
            content: "I had trouble setting up the sequence. Please try again.",
          });
        } finally {
          setIsGenerating(false);
        }
        return;
      }
    } catch (e) {
      // Not JSON data, proceed with normal intent detection
      console.log("No pre-generated sequence data, proceeding with normal flow");
    }

    // Improved intent detection for sequence creation
    const intentTriggers = {
      position: [
        'engineer', 'developer', 'manager', 'director', 'vp', 'executive',
        'designer', 'product', 'sales', 'marketing', 'hr', 'recruiter', 
        'specialist', 'analyst', 'lead', 'head of', 'consultant', 'architect',
        'devops', 'data scientist', 'researcher'
      ],
      action: [
        'create', 'generate', 'make', 'build', 'draft', 'write', 'compose',
        'outreach', 'sequence', 'campaign', 'recruiting', 'sourcing', 'email',
        'message', 'template', 'recruit', 'hire', 'reach out', 'contact'
      ]
    };
    
    // Check if message contains position AND action intent
    const hasPositionIntent = intentTriggers.position.some(keyword => 
      userMessage.toLowerCase().includes(keyword));
    const hasActionIntent = intentTriggers.action.some(keyword => 
      userMessage.toLowerCase().includes(keyword));
    
    // Extract position from message using simple heuristic
    const extractPosition = (message: string): string => {
      const positionPatterns = [
        /(?:for|hiring|recruiting|seeking|looking for)(?: a| an)? ([a-zA-Z]+(?: [a-zA-Z]+){0,3} (?:engineer|developer|manager|director|designer|specialist|analyst|consultant|architect))/i,
        /([a-zA-Z]+(?: [a-zA-Z]+){0,3} (?:engineer|developer|manager|director|designer|specialist|analyst|consultant|architect)) position/i
      ];
      
      for (const pattern of positionPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
      
      // Fallback to default if we can't extract a specific position
      if (message.toLowerCase().includes('software') || message.toLowerCase().includes('developer')) {
        return 'Software Engineer';
      } else if (message.toLowerCase().includes('product')) {
        return 'Product Manager';
      } else if (message.toLowerCase().includes('designer')) {
        return 'UX/UI Designer';
      }
      
      return 'Engineering Position';
    };
    
    if (hasPositionIntent && hasActionIntent) {
      setIsGenerating(true);
      const position = extractPosition(userMessage);
      setSequencePosition(position);
      setSequenceTitle(`${position} Outreach`);
      
      addMessage({
        role: "assistant",
        content: `Generating a recruiting sequence for ${position}...`,
      });
      
      try {
        const response = await sequenceApi.generate({
          title: `${position} Outreach`,
          position: position,
          userId,
          additionalInfo: userMessage,
        });

        if (response.success && response.data) {
          setSequence(response.data.steps);
          
          // IMPORTANT FIX: Store the sequence ID returned from the backend
          if (response.data.id) {
            console.log("Setting sequence ID from API response:", response.data.id);
            setSequenceId(response.data.id);
          }
        } else {
          console.log("Backend API failed, falling back to direct AI service");
          const generatedSequence = await generateSequence(position, userMessage);
          setSequence(generatedSequence);
        }

        addMessage({
          role: "assistant",
          content: `I've created a draft recruiting sequence for ${position}. You can edit any step directly in the workspace, or let me know what changes you'd like to make.`,
        });
      } catch (error) {
        console.error("Error generating sequence:", error);
        addMessage({
          role: "assistant",
          content: "I had trouble generating the sequence. Please try again.",
        });
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const updateSequenceStep = async (index: number, updatedStep: SequenceStep) => {
    setSequence((prev) => {
      const newSequence = [...prev];
      newSequence[index] = updatedStep;
      return newSequence;
    });

    // 本地更新立即生效，但不立即同步到服务器
    // 用户需要点击保存按钮来同步更改
  };

  const saveSequence = async () => {
    console.log("Save sequence called, current sequenceId:", sequenceId);
    console.log("Current sequence state:", { 
      title: sequenceTitle, 
      position: sequencePosition,
      stepsCount: sequence.length 
    });
    
    if (sequence.length === 0) {
      toast.error("Can't save an empty sequence");
      return;
    }
    
    // Dispatch event to notify that a local save operation is starting
    window.dispatchEvent(new CustomEvent('sequence_save_started'));
    
    setIsSaving(true);
    
    try {
      // Check if sequenceId is valid (not null, undefined, or empty string)
      if (sequenceId) {
        console.log("Updating existing sequence with ID:", sequenceId);
        
        try {
          // Update existing sequence with update API
          const response = await sequenceApi.update({
            sequenceId: sequenceId,
            title: sequenceTitle, // Add title to update
            position: sequencePosition, // Add position to update
            steps: [...sequence],
            userId,
          });
          
          if (response.success) {
            toast.success("Sequence updated successfully");
            console.log("Sequence updated successfully with ID:", sequenceId);
          } else {
            console.error("Update failed:", response.error);
            toast.error("Failed to update sequence: " + (response.error || "Unknown error"));
          }
        } catch (updateError) {
          console.error("Error during sequence update:", updateError);
          toast.error("Error updating sequence: " + (updateError instanceof Error ? updateError.message : "Unknown error"));
        }
      } else {
        console.log("No valid sequence ID found - creating new sequence");
        
        try {
          // Create new sequence only when no ID exists
          const response = await sequenceApi.generate({
            title: sequenceTitle,
            position: sequencePosition,
            userId,
            additionalInfo: "Created from workspace",
            steps: sequence, // Add steps to initial creation
          });
          
          if (response.success && response.data) {
            // Store new ID
            if (response.data.id) {
              const newId = response.data.id;
              console.log("New sequence created with ID:", newId);
              setSequenceId(newId);
              toast.success("New sequence created and saved");
            } else {
              console.error("Create succeeded but no ID returned");
              toast.warning("Sequence created but ID not returned properly");
            }
          } else {
            console.error("Create failed:", response.error || "No data returned");
            toast.error("Failed to create sequence: " + (response.error || "No data returned"));
          }
        } catch (createError) {
          console.error("Error during sequence creation:", createError);
          toast.error("Error creating sequence: " + (createError instanceof Error ? createError.message : "Unknown error"));
        }
      }
    } catch (error) {
      console.error("Overall error in save sequence:", error);
      toast.error("Error saving sequence: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  const addSequenceStep = async () => {
    const newStep: SequenceStep = {
      id: crypto.randomUUID(),
      title: `Step ${sequence.length + 1}`,
      content: "New message content goes here.",
    };
    
    setSequence(prev => [...prev, newStep]);
    // 不立即同步到服务器，等待用户主动保存
  };

  const removeSequenceStep = async (id: string) => {
    setSequence(prev => prev.filter(step => step.id !== id));
    // 不立即同步到服务器，等待用户主动保存
  };

  // Enhanced debugging helper: log state changes and ID tracking
  useEffect(() => {
    const logState = {
      hasSequence: sequence.length > 0,
      sequenceId,
      sequenceTitle,
      sequencePosition,
      stepCount: sequence.length
    };
    
    console.log("useSequence hook state updated:", logState);
    
    // Special log when sequenceId changes
    if (sequenceId) {
      console.log("⭐ Sequence ID is now set to:", sequenceId);
      // Add verification to ensure ID is properly stored
      console.log("Verification - Current sequence state with ID:", {
        id: sequenceId,
        title: sequenceTitle,
        position: sequencePosition,
        steps: sequence.length
      });
    }
  }, [sequenceId, sequence.length, sequenceTitle, sequencePosition]);

  // 重置序列状态的函数（用于调试）
  const resetSequenceState = () => {
    console.log("Resetting sequence state");
    setSequence([]);
    setSequenceId(null);
    setSequenceTitle("New Sequence");
    setSequencePosition("Position");
    setIsGenerating(false);
    setIsSaving(false);
  };

  // 修改处理序列工具调用结果的逻辑
  const handleToolCallResultWithID = (toolCall) => {
    if (toolCall && toolCall.name === "generate_sequence" && toolCall.result) {
      console.log("Processing generate_sequence tool call result:", toolCall);
      // 从工具调用结果中提取序列ID
      const resultData = toolCall.result.result || toolCall.result;
      if (resultData && resultData.id) {
        console.log("✅ SETTING SEQUENCE ID FROM TOOL CALL:", resultData.id);
        setSequenceId(resultData.id);
      } else {
        console.warn("⚠️ Tool call result doesn't contain a valid sequence ID");
      }
    }
  };

  // 添加序列ID同步方法
  const syncSequenceId = (id: string) => {
    console.log("Manually syncing sequence ID:", id);
    setSequenceId(id);
  };

  return {
    sequence,
    isGenerating,
    isSaving,
    sequenceId,
    sequenceTitle,
    sequencePosition,
    generateSequenceFromMessage,
    updateSequenceStep,
    addSequenceStep,
    removeSequenceStep,
    saveSequence,
    setSequenceTitle,
    resetSequenceState,
    syncSequenceId,
  };
};
