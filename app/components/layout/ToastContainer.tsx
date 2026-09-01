"use client";

import { useEffect, useState } from "react";
import { subscribeToasts, ToastMessage } from "../../../lib/toast";

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-foreground text-background px-4 py-2 rounded-lg text-sm shadow-md"
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};
