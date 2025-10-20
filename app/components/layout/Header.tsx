import { Calendar, LogOut, Settings, User } from "lucide-react";
import React from "react";

interface HeaderProps {
  userDisplayName: string | null;
  onSettingsClick: () => void;
  onLogoutClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userDisplayName,
  onSettingsClick,
  onLogoutClick,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2 mb-6">
          <Calendar className="text-blue-600" />
          Protein Tracker
        </h1>
        <div className="flex items-center justify-end gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User size={16} />
            {userDisplayName || "Loading..."}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSettingsClick}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={onLogoutClick}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
