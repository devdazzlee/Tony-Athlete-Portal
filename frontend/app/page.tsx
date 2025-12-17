"use client";

import { LoginForm } from "@/components/auth/LoginForm";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export default function HomePage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 relative">
      <LoginForm showBackButton={false} verified={null} />
    </div>
  );
}
