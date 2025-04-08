import { useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import ChatInterface from "@/components/ChatInterface";
import Workspace from "@/components/Workspace";
import Header from "@/components/Header";
import { useChat } from "@/hooks/useChat";
import { useSequence } from "@/hooks/useSequence";
import { useUserSequences } from "@/hooks/useUserSequences";

const Index = () => {
  const userId = "demo-user-123";
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { id: routeSequenceId } = useParams<{ id: string }>();

  const sequenceHook = useSequence({ userId });
  const {
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
  } = sequenceHook;

  const chatHook = useChat({
    userId,
    sequenceId: sequenceId || undefined,
    onSequenceRequest: (content) =>
      generateSequenceFromMessage(content, addMessage),
  });

  const { messages, isLoading, handleUserMessage, addMessage, clearMessages } =
    chatHook;

  const userSequencesHook = useUserSequences({ userId });
  const {
    userSequences,
    isLoading: isLoadingSequences,
    selectSequence,
    deleteSequence,
  } = userSequencesHook;

  // Improved function to handle sequence selection
  const handleSelectSequence = async (selectedId: string) => {
    console.log("Selecting sequence:", selectedId);

    // Fetch sequence data using selectSequence from userSequencesHook
    const selectedSequence = await selectSequence(selectedId);

    if (selectedSequence) {
      // Clear existing messages to reset the chat context
      if (clearMessages) {
        clearMessages();
      }

      // Add a system message indicating context change
      addMessage({
        role: "system",
        content: `Switched to sequence: "${selectedSequence.title}" for ${selectedSequence.position}`,
      });
    }
  };

  // Handle sequence deletion
  const handleDeleteSequence = async (deleteId: string) => {
    console.log("Deleting sequence:", deleteId);

    // If current sequence is being deleted, clear it
    if (deleteId === sequenceId) {
      // Add a system message indicating deletion
      addMessage({
        role: "system",
        content: "The current sequence has been deleted.",
      });
    }

    // Delete the sequence
    await deleteSequence(deleteId);
  };

  // Load sequence from URL param on mount
  useEffect(() => {
    if (routeSequenceId) {
      console.log("Loading sequence from URL parameter:", routeSequenceId);
      handleSelectSequence(routeSequenceId);
    }
  }, [routeSequenceId]);

  // Auto-scroll chat on new messages
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
            isSaving={isSaving}
            sequenceTitle={sequenceTitle}
            onUpdateStep={updateSequenceStep}
            onAddStep={addSequenceStep}
            onRemoveStep={removeSequenceStep}
            onSaveSequence={saveSequence}
            onTitleChange={setSequenceTitle}
            userSequences={userSequences || []} // 来自 useUserSequences
            onSelectSequence={handleSelectSequence}
            currentSequenceId={sequenceId}
            userId={userId}
            isLoadingSequences={isLoadingSequences} // 来自 useUserSequences
            onDeleteSequence={handleDeleteSequence}
          />{" "}
        </div>
      </div>
    </div>
  );
};

export default Index;
