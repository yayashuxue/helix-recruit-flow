import { SequenceStep } from "@/types/sequence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, List, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { Sequence } from "@/types/api";
import { toast } from "sonner";

interface WorkspaceProps {
  sequence: SequenceStep[];
  isGenerating: boolean;
  isSaving?: boolean;
  sequenceTitle?: string;
  onUpdateStep: (index: number, step: SequenceStep) => void;
  onAddStep: () => void;
  onRemoveStep: (id: string) => void;
  onSaveSequence?: () => void;
  onTitleChange?: (title: string) => void;
  userSequences?: Sequence[];
  onSelectSequence?: (id: string) => void;
  currentSequenceId?: string | null;
  userId?: string;
  isLoadingSequences?: boolean;
  onDeleteSequence?: (id: string) => void;
}

const Workspace = ({
  sequence,
  isGenerating,
  isSaving = false,
  sequenceTitle = "Sequence",
  onUpdateStep,
  onAddStep,
  onRemoveStep,
  onSaveSequence,
  onTitleChange,
  userSequences,
  onSelectSequence,
  currentSequenceId,
  userId,
  isLoadingSequences,
  onDeleteSequence,
}: WorkspaceProps) => {
  const [editingTitles, setEditingTitles] = useState<Record<string, boolean>>(
    {}
  );
  const [isEditingSequenceTitle, setIsEditingSequenceTitle] = useState(false);
  const [showSequenceList, setShowSequenceList] = useState(false);
  const [sequenceToDelete, setSequenceToDelete] = useState<string | null>(null);

  const handleTitleEdit = (id: string, editing: boolean) => {
    setEditingTitles((prev) => ({
      ...prev,
      [id]: editing,
    }));
  };

  const handleTitleChange = (index: number, title: string) => {
    onUpdateStep(index, {
      ...sequence[index],
      title,
    });
  };

  const handleContentChange = (index: number, content: string) => {
    onUpdateStep(index, {
      ...sequence[index],
      content,
    });
  };

  const handleSequenceTitleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (onTitleChange) {
      onTitleChange(e.target.value);
    }
  };

  const toggleSequenceList = () => {
    setShowSequenceList(!showSequenceList);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent triggering the row click
    if (confirm("Are you sure you want to delete this sequence?")) {
      if (onDeleteSequence) {
        onDeleteSequence(id);
        toast.success("Sequence deleted");
      }
    }
  };

  useEffect(() => {
    if (sequence && Array.isArray(sequence) && sequence.length > 0) {
      console.log("Workspace received sequence update:", sequence);
    }
  }, [sequence]);

  // Add debug logs
  useEffect(() => {
    console.log("Workspace render:", {
      userSequencesLength: userSequences?.length || 0,
      hasSelectHandler: !!onSelectSequence,
    });
  }, [userSequences, onSelectSequence]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium text-gray-900">Workspace</h2>
          {Array.isArray(userSequences) &&
            userSequences.length > 0 &&
            onSelectSequence && (
              <Button
                onClick={toggleSequenceList}
                variant="outline"
                size="sm"
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              >
                <List className="h-4 w-4 mr-1" />
                Sequences
              </Button>
            )}
        </div>
        {sequence.length > 0 && onSaveSequence && (
          <Button
            onClick={onSaveSequence}
            disabled={isGenerating || isSaving}
            className="bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 border-2 border-t-white border-gray-200 rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Save Sequence
              </>
            )}
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {showSequenceList && (
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Your Sequences</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSequences ? (
                <div className="flex justify-center py-4">
                  <div className="h-6 w-6 border-2 border-t-purple-600 border-gray-200 rounded-full animate-spin"></div>
                </div>
              ) : userSequences && userSequences.length > 0 ? (
                <div className="space-y-2">
                  {userSequences.map((seq) => (
                    <div
                      key={seq.id}
                      onClick={() =>
                        onSelectSequence && onSelectSequence(seq.id)
                      }
                      className={`p-3 rounded-md cursor-pointer hover:bg-purple-50 transition-colors duration-200 flex items-center justify-between ${
                        currentSequenceId === seq.id
                          ? "bg-purple-100 border border-purple-300"
                          : "border border-gray-200"
                      }`}
                    >
                      <div className="flex items-center flex-1">
                        <FileText className="h-4 w-4 mr-2 text-purple-600" />
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">{seq.title}</h3>
                          <p className="text-xs text-gray-500">
                            {seq.position} •{" "}
                            {new Date(seq.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {onDeleteSequence && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDeleteClick(e, seq.id)}
                          className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
                          title="Delete sequence"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No sequences found
                </p>
              )}
            </CardContent>
          </Card>
        )}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex justify-between items-center">
              {isEditingSequenceTitle && onTitleChange ? (
                <Input
                  value={sequenceTitle}
                  onChange={handleSequenceTitleChange}
                  onBlur={() => setIsEditingSequenceTitle(false)}
                  autoFocus
                  className="max-w-[300px] text-xl font-medium"
                />
              ) : (
                <span
                  className={
                    onTitleChange ? "cursor-pointer hover:text-purple-600" : ""
                  }
                  onClick={() =>
                    onTitleChange && setIsEditingSequenceTitle(true)
                  }
                >
                  {sequenceTitle || "Sequence"}
                </span>
              )}
              {sequence.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onAddStep}
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Step
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isGenerating ? (
              <div className="h-64 flex justify-center items-center">
                <div className="text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="h-8 w-8 border-4 border-t-purple-600 border-gray-200 rounded-full animate-spin"></div>
                  </div>
                  <p className="text-gray-500">Generating sequence...</p>
                </div>
              </div>
            ) : sequence.length > 0 ? (
              <div className="space-y-4">
                {sequence.map((step, index) => (
                  <Card
                    key={step.id}
                    className={`border transition-all duration-300 ${
                      step._highlight
                        ? "border-green-500 bg-green-50 shadow-md ring-2 ring-green-300"
                        : "border-gray-200"
                    }`}
                  >
                    <CardHeader className="py-2 px-4 flex flex-row items-center justify-between">
                      {editingTitles[step.id] ? (
                        <Input
                          value={step.title}
                          onChange={(e) =>
                            handleTitleChange(index, e.target.value)
                          }
                          onBlur={() => handleTitleEdit(step.id, false)}
                          autoFocus
                          className={`h-8 text-sm font-medium ${
                            step._highlight
                              ? "border-green-300 focus:border-green-500"
                              : ""
                          }`}
                        />
                      ) : (
                        <CardTitle
                          className={`text-sm font-medium cursor-pointer hover:text-purple-600 ${
                            step._highlight ? "text-green-700" : ""
                          }`}
                          onClick={() => handleTitleEdit(step.id, true)}
                        >
                          {step.title}
                        </CardTitle>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveStep(step.id)}
                        className="h-7 w-7 text-gray-500 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="py-2 px-4">
                      <Textarea
                        value={step.content}
                        onChange={(e) =>
                          handleContentChange(index, e.target.value)
                        }
                        className={`min-h-[100px] text-sm resize-none ${
                          step._highlight
                            ? "border-green-300 focus:border-green-500 bg-green-50"
                            : "focus:border-purple-300"
                        }`}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="h-64 flex justify-center items-center">
                <div className="text-center">
                  <p className="text-gray-500 mb-4">
                    No sequence generated yet.
                  </p>
                  <Button
                    onClick={onAddStep}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create Sequence
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Workspace;
