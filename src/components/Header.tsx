
import { MessageSquare } from "lucide-react";

const Header = () => {
  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-2">
        <div className="bg-purple-100 p-2 rounded-md">
          <MessageSquare className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Helix AI</h1>
          <p className="text-sm text-gray-500">Recruitment Assistant</p>
        </div>
      </div>
      <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
        3 Active Tasks
      </div>
    </header>
  );
};

export default Header;
