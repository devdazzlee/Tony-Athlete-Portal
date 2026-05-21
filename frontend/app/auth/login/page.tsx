"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { StandardPageLoading } from "@/components/ui/loading";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/contexts/AuthContext";
import { getPostAuthRedirectPath } from "@/lib/affiliate-status";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const verified = searchParams?.get("verified") || null;
  const router = useRouter();
  const { isLoading, isAuthenticated, user, hasToken } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      router.replace(getPostAuthRedirectPath(user));
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || (hasToken && !isAuthenticated)) {
    return <StandardPageLoading message="Authenticating..." showBackground={true} />;
  }

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
