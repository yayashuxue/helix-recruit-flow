import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import ChatInterface from "@/components/ChatInterface";
import Workspace from "@/components/Workspace";
import Header from "@/components/Header";
import { SequenceStep } from "@/types/sequence";
import { Message } from "@/types/chat";
import { generateCompletion, generateSequence } from "@/services/aiService";
import { chatApi, sequenceApi } from "@/api/client";
import { FEATURES } from "@/config/appConfig";

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi, I'm Helix, your recruiting assistant. How can I help you today?",
    },
  ]);
  const [sequence, setSequence] = useState<SequenceStep[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const userId = "demo-user-123";

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
          sequenceId: sequence.length > 0 ? "current-sequence" : undefined,
        });

        if (response.success && response.data) {
          addMessage({ role: "assistant", content: response.data.content });
        } else {
          console.log("Backend API failed, falling back to direct AI service");
          const aiResponse = await generateCompletion([...messages, { id: "temp", role: "user", content }]);
          addMessage({ role: "assistant", content: aiResponse });
          
          if (
            content.toLowerCase().includes("sequence") || 
            content.toLowerCase().includes("email") ||
            content.toLowerCase().includes("recruit") ||
            content.toLowerCase().includes("developer") ||
            content.toLowerCase().includes("engineer") ||
            content.toLowerCase().includes("hire")
          ) {
            handleSequenceGeneration(content);
          }
        }
      } else {
        const aiResponse = await generateCompletion([...messages, { id: "temp", role: "user", content }]);
        addMessage({ role: "assistant", content: aiResponse });
        
        if (
          content.toLowerCase().includes("sequence") || 
          content.toLowerCase().includes("email") ||
          content.toLowerCase().includes("recruit") ||
          content.toLowerCase().includes("developer") ||
          content.toLowerCase().includes("engineer") ||
          content.toLowerCase().includes("hire")
        ) {
          handleSequenceGeneration(content);
        }
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

  const handleSequenceGeneration = async (userMessage: string) => {
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col border-r border-gray-200 bg-white max-w-md">
          <ChatInterface 
            messages={messages} 
            onSendMessage={handleUserMessage} 
            isLoading={isLoading}
            messagesEndRef={messagesEndRef}
          />
        </div>
        <div className="flex-1 bg-white">
          <Workspace 
            sequence={sequence}
            isGenerating={isGenerating}
            onUpdateStep={updateSequenceStep}
            onAddStep={addSequenceStep}
            onRemoveStep={removeSequenceStep}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
