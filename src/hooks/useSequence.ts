import { useState } from "react";
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

  const generateSequenceFromMessage = async (userMessage: string, addMessage: (message: Omit<import("@/types/chat").Message, "id">) => void) => {
    // Check if we received pre-generated sequence data (JSON stringified)
    try {
      // Try to parse as JSON first to see if we received pre-generated data
      const parsedData = JSON.parse(userMessage);
      
      // If this is a pre-generated sequence with steps, use it directly
      if (parsedData && parsedData.steps && Array.isArray(parsedData.steps)) {
        console.log("Using pre-generated sequence:", parsedData);
        setIsGenerating(true);
        try {
          // Set the sequence directly from the parsed data
          setSequence(parsedData.steps);
          
          if (parsedData.id) {
            setSequenceId(parsedData.id);
            console.log("Setting real sequence ID:", parsedData.id);
          }
          
          if (parsedData.title) {
            setSequenceTitle(parsedData.title);
          }
          
          if (parsedData.position) {
            setSequencePosition(parsedData.position);
          }
          
          addMessage({
            role: "assistant",
            content: `I've created a draft recruiting sequence for ${parsedData.position}. You can edit any step directly in the workspace, or let me know what changes you'd like to make.`,
          });
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
          
          if (response.data.id) {
            setSequenceId(response.data.id);
            console.log("Backend returned sequence ID:", response.data.id);
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
    if (sequence.length === 0) {
      toast.error("Can't save an empty sequence");
      return;
    }
    
    setIsSaving(true);
    
    try {
      if (sequenceId) {
        const response = await sequenceApi.update({
          sequenceId: sequenceId,
          steps: [...sequence],
          userId,
        });
        
        if (response.success) {
          toast.success("Sequence saved successfully");
        } else {
          toast.error("Failed to save sequence");
        }
      } else {
        const response = await sequenceApi.generate({
          title: sequenceTitle,
          position: sequencePosition,
          userId,
          additionalInfo: "Created from workspace",
        });
        
        if (response.success && response.data && response.data.id) {
          setSequenceId(response.data.id);
          toast.success("New sequence created and saved");
          
          await sequenceApi.update({
            sequenceId: response.data.id,
            steps: [...sequence],
            userId,
          });
        } else {
          toast.error("Failed to create new sequence");
        }
      }
    } catch (error) {
      console.error("Error saving sequence:", error);
      toast.error("Error saving sequence");
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
  };
};
