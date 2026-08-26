import React from "react";

export const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-border border-t-accent mx-auto mb-4"></div>
        <p className="text-muted">로딩 중...</p>
      </div>
    </div>
  );
};
