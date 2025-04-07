
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

  const generateSequenceFromMessage = async (userMessage: string, addMessage: (message: Omit<import("@/types/chat").Message, "id">) => void) => {
    if (
      userMessage.toLowerCase().includes("software") || 
      userMessage.toLowerCase().includes("engineer") || 
      userMessage.toLowerCase().includes("developer")
    ) {
      setIsGenerating(true);
      addMessage({
        role: "assistant",
        content: "Generating a recruiting sequence for software engineers...",
      });
      
      try {
        const response = await sequenceApi.generate({
          title: "Software Engineer Outreach",
          position: "Software Engineer",
          userId,
          additionalInfo: userMessage,
        });

        if (response.success && response.data) {
          setSequence(response.data.steps);
        } else {
          console.log("Backend API failed, falling back to direct OpenAI");
          const generatedSequence = await generateSequence("Software Engineer", userMessage);
          setSequence(generatedSequence);
        }

        addMessage({
          role: "assistant",
          content: "I've created a draft recruiting sequence for software engineers. You can edit any step directly in the workspace, or let me know what changes you'd like to make.",
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

    try {
      await sequenceApi.update({
        sequenceId: "current-sequence",
        steps: [...sequence],
        userId,
      });
      toast.success("Sequence updated successfully");
    } catch (error) {
      console.error("Error updating sequence:", error);
      toast.error("Failed to sync sequence with server");
    }
  };

  const addSequenceStep = async () => {
    const newStep: SequenceStep = {
      id: crypto.randomUUID(),
      title: `Step ${sequence.length + 1}`,
      content: "New message content goes here.",
    };
    
    const updatedSequence = [...sequence, newStep];
    setSequence(updatedSequence);
    
    try {
      await sequenceApi.update({
        sequenceId: "current-sequence",
        steps: updatedSequence,
        userId,
      });
      toast.success("New step added to sequence");
    } catch (error) {
      console.error("Error adding sequence step:", error);
      toast.error("Failed to sync new step with server");
    }
  };

  const removeSequenceStep = async (id: string) => {
    const updatedSequence = sequence.filter((step) => step.id !== id);
    setSequence(updatedSequence);
    
    try {
      await sequenceApi.update({
        sequenceId: "current-sequence",
        steps: updatedSequence,
        userId,
      });
      toast.success("Step removed from sequence");
    } catch (error) {
      console.error("Error removing sequence step:", error);
      toast.error("Failed to sync removal with server");
    }
  };

  return {
    sequence,
    isGenerating,
    generateSequenceFromMessage,
    updateSequenceStep,
    addSequenceStep,
    removeSequenceStep,
  };
};
