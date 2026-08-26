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
    <div className="bg-surface rounded-xl border border-border p-6 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2 mb-6">
          <Calendar className="text-accent" size={24} />
          Protein Tracker
        </h1>
        <div className="flex items-center justify-end gap-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <User size={16} />
            {userDisplayName || "Loading..."}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSettingsClick}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={onLogoutClick}
              className="flex items-center gap-2 px-3 py-2 text-danger hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
