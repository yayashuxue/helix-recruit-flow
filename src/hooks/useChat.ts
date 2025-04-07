
import { useState } from "react";
import { toast } from "sonner";
import { Message } from "@/types/chat";
import { generateCompletion } from "@/services/aiService";
import { chatApi } from "@/api/client";
import { FEATURES } from "@/config/appConfig";

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

  const addMessage = (newMessage: Omit<Message, "id">) => {
    const id = crypto.randomUUID();
    setMessages((prev) => [...prev, { ...newMessage, id }]);
  };

  const handleUserMessage = async (content: string) => {
    addMessage({ role: "user", content });
    setIsLoading(true);

    try {
      if (FEATURES.USE_BACKEND_API) {
        const response = await chatApi.sendMessage({
          message: content,
          userId,
          sequenceId: sequenceId ? sequenceId : undefined,
        });

        if (response.success && response.data) {
          addMessage({ role: "assistant", content: response.data.content });
        } else {
          console.log("Backend API failed, falling back to direct AI service");
          const aiResponse = await generateCompletion([...messages, { id: "temp", role: "user", content }]);
          addMessage({ role: "assistant", content: aiResponse });
          
          checkForSequenceRequest(content);
        }
      } else {
        const aiResponse = await generateCompletion([...messages, { id: "temp", role: "user", content }]);
        addMessage({ role: "assistant", content: aiResponse });
        
        checkForSequenceRequest(content);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      addMessage({ 
        role: "assistant", 
        content: "I'm having trouble connecting to the AI service. Please try again later." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkForSequenceRequest = (content: string) => {
    if (
      content.toLowerCase().includes("sequence") || 
      content.toLowerCase().includes("email") ||
      content.toLowerCase().includes("recruit") ||
      content.toLowerCase().includes("developer") ||
      content.toLowerCase().includes("engineer") ||
      content.toLowerCase().includes("hire")
    ) {
      onSequenceRequest(content);
    }
  };

  return {
    messages,
    isLoading,
    handleUserMessage,
    addMessage
  };
};
