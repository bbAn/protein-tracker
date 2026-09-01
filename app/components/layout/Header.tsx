import { Calendar, LogOut, Moon, Settings, Sun, User } from "lucide-react";
import React from "react";
import { useTheme } from "../../hooks/useTheme";

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
  const { theme, toggleTheme } = useTheme();

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
              onClick={toggleTheme}
              aria-label="다크모드 전환"
              className="flex items-center gap-2 px-3 py-2 bg-muted-bg text-foreground rounded-lg hover:bg-muted-bg-hover transition-colors"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={onSettingsClick}
              aria-label="설정"
              className="flex items-center gap-2 px-3 py-2 bg-muted-bg text-foreground rounded-lg hover:bg-muted-bg-hover transition-colors"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={onLogoutClick}
              aria-label="로그아웃"
              className="flex items-center gap-2 px-3 py-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
