
import { useRef, useEffect } from "react";
import ChatInterface from "@/components/ChatInterface";
import Workspace from "@/components/Workspace";
import Header from "@/components/Header";
import { useChat } from "@/hooks/useChat";
import { useSequence } from "@/hooks/useSequence";

const Index = () => {
  const userId = "demo-user-123";
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const sequenceHook = useSequence({ userId });
  const { 
    sequence, 
    isGenerating, 
    generateSequenceFromMessage, 
    updateSequenceStep, 
    addSequenceStep, 
    removeSequenceStep 
  } = sequenceHook;

  const chatHook = useChat({ 
    userId, 
    sequenceId: sequence.length > 0 ? "current-sequence" : undefined,
    onSequenceRequest: (content) => generateSequenceFromMessage(content, addMessage)
  });
  
  const { messages, isLoading, handleUserMessage, addMessage } = chatHook;

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
