"use client";

import { ReactNode } from "react";
import { Loader2, RefreshCw } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  color?: "black" | "gray" | "white";
}

export function LoadingSpinner({ 
  size = "md", 
  className = "",
  color = "black"
}: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-8 w-8", 
    lg: "h-12 w-12",
    xl: "h-16 w-16",
    "2xl": "h-32 w-32"
  };

  const colorClasses = {
    black: "text-gray-900",
    gray: "text-gray-600",
    white: "text-white"
  };

  return (
    <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-900" />
        </div>
      </div>
  );
}

interface LoadingContainerProps {
  children?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  minHeight?: "sm" | "md" | "lg" | "xl" | "screen";
  message?: string;
  className?: string;
}

export function LoadingContainer({ 
  children, 
  size = "md", 
  minHeight = "md",
  message,
  className = ""
}: LoadingContainerProps) {
  const heightClasses = {
    sm: "min-h-[200px]",
    md: "min-h-[400px]", 
    lg: "min-h-[600px]",
    xl: "min-h-[800px]",
    screen: "min-h-screen"
  };

  return (
    <div className="p-6 space-y-6">
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="h-8 w-8 animate-spin text-gray-900" />
    </div>
  </div>
  );
}

interface PageLoadingProps {
  message?: string;
  minHeight?: "sm" | "md" | "lg" | "xl" | "screen";
}

export function PageLoading({ message = "Loading...", minHeight = "md" }: PageLoadingProps) {
  return (
    <LoadingContainer size="lg" minHeight={minHeight} message={message} />
  );
}

interface DataLoadingProps {
  message?: string;
}

export function DataLoading({ message = "Loading data..." }: DataLoadingProps) {
  return (
    <LoadingContainer size="md" minHeight="md" message={message} />
  );
}

interface AuthLoadingProps {
  message?: string;
}

export function AuthLoading({ message = "Authenticating..." }: AuthLoadingProps) {
  return (
    <LoadingContainer size="xl" minHeight="screen" message={message} />
  );
}

// Standardized page loading components
interface PageLoadingProps {
  message?: string;
  minHeight?: "sm" | "md" | "lg" | "xl" | "screen";
  showBackground?: boolean;
}

export function StandardPageLoading({ 
  message = "Loading...", 
  minHeight = "md",
  showBackground = false
}: PageLoadingProps) {
  const backgroundClass = showBackground 
    ? "bg-gradient-to-br from-blue-50 via-white to-teal-50" 
    : "bg-gray-100";
    
  return (
    <div className={`min-h-screen ${backgroundClass} flex items-center justify-center px-4 py-16`}>
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    </div>
  );
}

interface DashboardLoadingProps {
  message?: string;
}

export function DashboardLoading({ message = "Loading dashboard..." }: DashboardLoadingProps) {
  return (
    <LoadingContainer size="lg" minHeight="md" message={message} />
  );
}

interface AdminLoadingProps {
  message?: string;
}

export function AdminLoading({ message = "Loading admin panel..." }: AdminLoadingProps) {
  return (
    <LoadingContainer size="lg" minHeight="md" message={message} />
  );
}

interface ManagerLoadingProps {
  message?: string;
}

export function ManagerLoading({ message = "Loading manager dashboard..." }: ManagerLoadingProps) {
  return (
    <LoadingContainer size="lg" minHeight="md" message={message} />
  );
}

interface SectionLoadingProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function SectionLoading({ message, size = "md" }: SectionLoadingProps) {
  return (
    <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-900" />
        </div>
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
  minHeight?: "sm" | "md" | "lg" | "xl" | "screen";
}

export function ErrorState({ 
  title = "Something went wrong",
  message = "An error occurred while loading the page.",
  actionText = "Try Again",
  onAction,
  minHeight = "md"
}: ErrorStateProps) {
  const heightClasses = {
    sm: "min-h-[200px]",
    md: "min-h-[400px]", 
    lg: "min-h-[600px]",
    xl: "min-h-[800px]",
    screen: "min-h-screen"
  };

  return (
    <div className={`flex items-center justify-center ${heightClasses[minHeight]}`}>
      <div className="text-center max-w-md mx-auto p-6">
        <div className="mb-4">
          <div className="mx-auto h-12 w-12 text-red-500">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        {onAction && (
          <button
            onClick={onAction}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: ReactNode;
  minHeight?: "sm" | "md" | "lg" | "xl" | "screen";
}

export function EmptyState({ 
  title = "No data available",
  message = "There's nothing to show here yet.",
  actionText,
  onAction,
  icon,
  minHeight = "md"
}: EmptyStateProps) {
  const heightClasses = {
    sm: "min-h-[200px]",
    md: "min-h-[400px]", 
    lg: "min-h-[600px]",
    xl: "min-h-[800px]",
    screen: "min-h-screen"
  };

  return (
    <div className={`flex items-center justify-center ${heightClasses[minHeight]}`}>
      <div className="text-center max-w-md mx-auto p-6">
        {icon && (
          <div className="mb-4 text-gray-400">
            {icon}
          </div>
        )}
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        {onAction && actionText && (
          <button
            onClick={onAction}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
}

interface AuthRequiredProps {
  message?: string;
  actionText?: string;
  actionUrl?: string;
}

export function AuthRequired({ 
  message = "Authentication Required",
  actionText = "Go to Login",
  actionUrl = "/auth/login"
}: AuthRequiredProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="mb-4">
          <div className="mx-auto h-12 w-12 text-blue-500">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{message}</h2>
        <p className="text-gray-600 mb-6">
          Please log in to access this page.
        </p>
        <a
          href={actionUrl}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {actionText}
        </a>
      </div>
    </div>
  );
}

interface AccessDeniedProps {
  message?: string;
  actionText?: string;
  actionUrl?: string;
}

export function AccessDenied({ 
  message = "Access Denied",
  actionText = "Go to Dashboard",
  actionUrl = "/dashboard"
}: AccessDeniedProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="mb-4">
          <div className="mx-auto h-12 w-12 text-red-500">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{message}</h2>
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page.
        </p>
        <a
          href={actionUrl}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {actionText}
        </a>
      </div>
    </div>
  );
}
