"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { config } from "@/config/config";

interface LinkContinueButtonProps {
  trackingCode: string;
}

export function LinkContinueButton({ trackingCode }: LinkContinueButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${config.apiUrl}/links/track/${trackingCode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error("Failed to record click");
      }

      const data = await response.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error("No destination URL provided");
      }
    } catch (err: any) {
      console.error("Error forwarding to destination:", err);
      setError(err.message || "Unable to continue to destination");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleContinue}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Redirecting...
          </>
        ) : (
          <>
            <ExternalLink className="w-4 h-4 mr-2" />
            Continue to destination
          </>
        )}
      </Button>
      {error && (
        <p className="text-sm text-red-600 text-center">
          {error}
        </p>
      )}
    </div>
  );
}

