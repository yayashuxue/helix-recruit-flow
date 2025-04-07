import React from "react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import {
  Tag,
  Briefcase,
  Code,
  Palette,
  Book,
  ChevronRight,
} from "lucide-react";

interface QuickActionsProps {
  onActionClick: (prompt: string) => void;
  conversationState?: "initial" | "sequence_created" | "refining";
}

const QuickActions: React.FC<QuickActionsProps> = ({
  onActionClick,
  conversationState = "initial",
}) => {
  // Job role specific prompts
  const rolePrompts = [
    {
      label: "Software Engineer",
      icon: <Code className="h-3 w-3 mr-1" />,
      prompt:
        "I need to create a recruiting sequence for a Senior Software Engineer who should have experience with React, Node.js and cloud infrastructure.",
    },
    {
      label: "Product Designer",
      icon: <Palette className="h-3 w-3 mr-1" />,
      prompt:
        "Help me write emails for a Product Designer role requiring 3+ years of experience with UI/UX and design systems.",
    },
    {
      label: "Product Manager",
      icon: <Briefcase className="h-3 w-3 mr-1" />,
      prompt:
        "Draft a sequence for a Product Manager position focusing on candidates with B2B SaaS experience and data-driven decision making.",
    },
    {
      label: "Data Scientist",
      icon: <Tag className="h-3 w-3 mr-1" />,
      prompt:
        "Create outreach emails for a Senior Data Scientist role requiring experience with machine learning models and Python.",
    },
    {
      label: "Content Writer",
      icon: <Book className="h-3 w-3 mr-1" />,
      prompt:
        "I need a recruiting sequence for a Content Writer position that requires SEO knowledge and B2B content experience.",
    },
  ];

  const getPromptsForState = () => {
    switch (conversationState) {
      case "sequence_created":
        return [
          {
            label: "Add Step",
            prompt: "Add another follow-up email to this sequence.",
          },
          {
            label: "Edit First Email",
            prompt: "Make the first email more concise.",
          },
          {
            label: "Add Testimonial",
            prompt: "Add a customer testimonial to the second email.",
          },
          {
            label: "Export Sequence",
            prompt: "How can I export this sequence?",
          },
        ];
      case "refining":
        return [
          {
            label: "More Casual",
            prompt: "Make this email sound more casual and friendly.",
          },
          { label: "Add Urgency", prompt: "Add more urgency to this message." },
          {
            label: "Shorter Version",
            prompt: "Create a shorter version of this email.",
          },
          {
            label: "Add Benefits",
            prompt: "Add more benefits about the role.",
          },
        ];
      default:
        return [
          {
            label: "Create Sequence",
            prompt:
              "I need to create a recruiting sequence for a position at my company.",
          },
          {
            label: "Improve Email",
            prompt:
              "Help me improve this follow-up email to make it more engaging.",
          },
          {
            label: "Personalization Tips",
            prompt: "Give me tips for personalizing outreach to candidates.",
          },
          {
            label: "Subject Lines",
            prompt: "Suggest 5 effective subject lines for recruiting emails.",
          },
        ];
    }
  };

  const quickPrompts = getPromptsForState();

  return (
    <div className="p-3 border-t border-gray-200">
      <div className="mb-2 text-xs text-gray-500 font-medium">
        Quick Actions
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {quickPrompts.map((item, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onActionClick(item.prompt)}
            className={cn(
              "text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 border-gray-200",
              "transition-all duration-200"
            )}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="mb-2 text-xs text-gray-500 font-medium">Job Roles</div>
      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
        {rolePrompts.map((item, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onActionClick(item.prompt)}
            className={cn(
              "text-xs whitespace-nowrap bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700",
              "transition-all duration-200 flex items-center"
            )}
          >
            {item.icon}
            {item.label}
            <ChevronRight className="h-3 w-3 ml-1 opacity-70" />
          </Button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
