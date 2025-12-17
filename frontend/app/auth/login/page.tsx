"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StandardPageLoading } from "@/components/ui/loading";
import { LoginForm } from "@/components/auth/LoginForm";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified");

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <LoginForm showBackButton={true} verified={verified} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<StandardPageLoading message="Loading login page..." showBackground={true} />}
    >
      <LoginPageContent />
    </Suspense>
  );
}
