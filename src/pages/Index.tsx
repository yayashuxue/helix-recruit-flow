
import { useState, useRef, useEffect } from "react";
import ChatInterface from "@/components/ChatInterface";
import Workspace from "@/components/Workspace";
import { SequenceStep } from "@/types/sequence";
import { Message } from "@/types/chat";
import { toast } from "sonner";
import Header from "@/components/Header";

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

  const addMessage = (newMessage: Omit<Message, "id">) => {
    const id = crypto.randomUUID();
    setMessages((prev) => [...prev, { ...newMessage, id }]);
  };

  const handleUserMessage = async (content: string) => {
    // Add user message to chat
    addMessage({ role: "user", content });
    setIsLoading(true);

    // Here we'd normally call the backend API
    // For demo purposes, we'll simulate a response
    setTimeout(() => {
      handleAgentResponse(content);
      setIsLoading(false);
    }, 1000);
  };

  const handleAgentResponse = (userMessage: string) => {
    // Simple logic to determine response based on user message
    if (userMessage.toLowerCase().includes("sequence") || userMessage.toLowerCase().includes("email")) {
      addMessage({
        role: "assistant",
        content: "I'll help you create a recruiting outreach sequence. What position are you hiring for?",
      });
    } else if (userMessage.toLowerCase().includes("software") || userMessage.toLowerCase().includes("engineer") || userMessage.toLowerCase().includes("developer")) {
      setIsGenerating(true);
      addMessage({
        role: "assistant",
        content: "Generating a recruiting sequence for software engineers...",
      });
      
      // Simulate sequence generation
      setTimeout(() => {
        generateSampleSequence();
        setIsGenerating(false);
        addMessage({
          role: "assistant",
          content: "I've created a draft recruiting sequence for software engineers. You can edit any step directly in the workspace, or let me know what changes you'd like to make.",
        });
      }, 2000);
    } else if (userMessage.toLowerCase().includes("change") || userMessage.toLowerCase().includes("update") || userMessage.toLowerCase().includes("edit")) {
      // Handle edit request
      if (sequence.length > 0) {
        addMessage({
          role: "assistant",
          content: "I've updated the sequence based on your feedback. Feel free to make any additional edits directly in the workspace.",
        });
        // Simulate an edit to the first step
        if (sequence.length > 0) {
          updateSequenceStep(0, {
            ...sequence[0],
            content: sequence[0].content + " I noticed your impressive background and thought you might be interested in an exciting opportunity at our company.",
          });
        }
      } else {
        addMessage({
          role: "assistant",
          content: "It looks like we don't have a sequence yet. Let's create one first! What position are you hiring for?",
        });
      }
    } else {
      addMessage({
        role: "assistant",
        content: "I'm here to help you create recruiting outreach sequences. Would you like me to help you create one? Just let me know what position you're hiring for.",
      });
    }
  };

  const generateSampleSequence = () => {
    const newSequence: SequenceStep[] = [
      {
        id: "1",
        title: "Initial Outreach",
        content: "Hi {{first_name}}, I hope this message finds you well. I'm a recruiter at [Company Name] and I came across your profile.",
      },
      {
        id: "2",
        title: "Position Details",
        content: "We're looking for a talented Software Engineer to join our growing team. This role offers competitive compensation and exciting projects working with cutting-edge technologies.",
      },
      {
        id: "3",
        title: "Follow-up",
        content: "I'd love to discuss this opportunity further and learn more about your career aspirations. Would you be available for a quick call this week?",
      },
    ];
    setSequence(newSequence);
  };

  const updateSequenceStep = (index: number, updatedStep: SequenceStep) => {
    setSequence((prev) => {
      const newSequence = [...prev];
      newSequence[index] = updatedStep;
      return newSequence;
    });
    toast.success("Sequence updated successfully");
  };

  const addSequenceStep = () => {
    const newStep: SequenceStep = {
      id: crypto.randomUUID(),
      title: `Step ${sequence.length + 1}`,
      content: "New message content goes here.",
    };
    setSequence((prev) => [...prev, newStep]);
    toast.success("New step added to sequence");
  };

  const removeSequenceStep = (id: string) => {
    setSequence((prev) => prev.filter((step) => step.id !== id));
    toast.success("Step removed from sequence");
  };

  // Scroll to bottom of messages
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
