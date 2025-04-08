import { useState, RefObject, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Message } from "@/types/chat";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import QuickActions from "./QuickActions";

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
}

const ChatInterface = ({
  messages,
  onSendMessage,
  isLoading,
  messagesEndRef,
}: ChatInterfaceProps) => {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Function to render message content with markdown-like formatting
  const renderContent = (content: string | undefined) => {
    // Add null check to avoid "cannot read property 'replace' of undefined"
    if (!content) return "";

    // Simple markdown parser for bold and code
    const formattedContent = content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br />");

    return <span dangerouslySetInnerHTML={{ __html: formattedContent }} />;
  };

  useEffect(() => {
    console.log("ChatInterface: isLoading changed to:", isLoading);
  }, [isLoading]);

  const sendMessageWithTimeout = async () => {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), 15000)
    );

    try {
      const result = await Promise.race([
        chatApi.sendMessage({
          /*...*/
        }),
        timeoutPromise,
      ]);
      return result;
    } catch (e) {
      console.error("Request failed or timed out:", e);
      setIsLoading(false);
      addMessage({
        role: "system",
        content: "The request is taking too long. Please try again.",
      });
    }
  };

  const handleQuickAction = (prompt: string) => {
    // Set the prompt in the input
    setInputValue(prompt);
    // Optionally, you can directly send the message
    // handleSubmit(prompt);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Chat</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex flex-col max-w-[90%] rounded-lg p-4",
              message.role === "user"
                ? "bg-purple-100 ml-auto"
                : message.role === "system"
                ? "bg-blue-50 border border-blue-200 mr-auto"
                : "bg-gray-100 mr-auto"
            )}
          >
            {message.role === "system" && (
              <div className="text-xs text-blue-600 font-semibold mb-1">
                System
              </div>
            )}
            <span className="text-sm text-gray-900">
              {renderContent(message.content)}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-4 max-w-[90%] mr-auto">
            <div className="flex space-x-1">
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "600ms" }}
              ></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <QuickActions onActionClick={handleQuickAction} />

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex items-end space-x-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="min-h-[60px] resize-none"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!inputValue.trim() || isLoading}
            className="h-10 w-10 bg-purple-600 hover:bg-purple-700"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
