
import { SequenceStep } from "@/types/sequence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface WorkspaceProps {
  sequence: SequenceStep[];
  isGenerating: boolean;
  onUpdateStep: (index: number, step: SequenceStep) => void;
  onAddStep: () => void;
  onRemoveStep: (id: string) => void;
}

const Workspace = ({
  sequence,
  isGenerating,
  onUpdateStep,
  onAddStep,
  onRemoveStep,
}: WorkspaceProps) => {
  const [editingTitles, setEditingTitles] = useState<Record<string, boolean>>({});

  const handleTitleEdit = (id: string, editing: boolean) => {
    setEditingTitles(prev => ({
      ...prev,
      [id]: editing
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

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Workspace</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex justify-between items-center">
              <span>Sequence</span>
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
                  <Card key={step.id} className="border border-gray-200">
                    <CardHeader className="py-2 px-4 flex flex-row items-center justify-between">
                      {editingTitles[step.id] ? (
                        <Input
                          value={step.title}
                          onChange={(e) => handleTitleChange(index, e.target.value)}
                          onBlur={() => handleTitleEdit(step.id, false)}
                          autoFocus
                          className="h-8 text-sm font-medium"
                        />
                      ) : (
                        <CardTitle 
                          className="text-sm font-medium cursor-pointer hover:text-purple-600"
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
                        onChange={(e) => handleContentChange(index, e.target.value)}
                        className="min-h-[100px] text-sm resize-none focus:border-purple-300"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="h-64 flex justify-center items-center">
                <div className="text-center">
                  <p className="text-gray-500 mb-4">No sequence generated yet.</p>
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
