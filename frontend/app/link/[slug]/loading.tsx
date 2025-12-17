import { RefreshCw } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-16">
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    </div>
  );
}

