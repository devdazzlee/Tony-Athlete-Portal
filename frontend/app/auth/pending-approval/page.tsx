"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { StandardPageLoading } from "@/components/ui/loading";
import { getPostAuthRedirectPath, isAffiliateApproved } from "@/lib/affiliate-status";
import { LogoutButton } from "@/components/auth/LogoutButton";

function PendingApprovalContent() {
  const { user, isLoading, isAuthenticated, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRejected = searchParams?.get("status") === "rejected";

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) {
      router.replace("/auth/login");
      return;
    }
    if (user.role !== "AFFILIATE") {
      router.replace(getPostAuthRedirectPath(user));
      return;
    }
    if (isAffiliateApproved(user)) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !user) {
    return <StandardPageLoading message="Loading..." showBackground={true} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0 bg-white">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto">
              <Image
                src="/logo.png"
                alt="TC Nutrition"
                width={200}
                height={60}
                className="h-auto w-[200px] max-h-12 object-contain mx-auto"
                priority
              />
            </div>
            <div
              className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                isRejected ? "bg-red-100" : "bg-amber-100"
              }`}
            >
              {isRejected ? (
                <XCircle className="h-8 w-8 text-red-600" />
              ) : (
                <Clock className="h-8 w-8 text-amber-600" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {isRejected ? "Application Not Approved" : "Application Under Review"}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {isRejected
                ? "Unfortunately, your affiliate application was not approved at this time."
                : "Thanks for signing up! Our team is reviewing your application."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isRejected && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700 space-y-2">
                <p>
                  <strong>What happens next?</strong>
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>We&apos;ll review your application shortly</li>
                  <li>You&apos;ll receive an email when you&apos;re approved</li>
                  <li>Then you can log in and access your dashboard</li>
                </ul>
              </div>
            )}
            {isRejected && (
              <p className="text-sm text-gray-600 text-center">
                If you believe this was a mistake, please contact our support team.
              </p>
            )}
            <p className="text-xs text-center text-gray-500">
              Signed in as <strong>{user.email}</strong>
            </p>
            <div className="flex flex-col gap-2">
              {!isRejected && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => refreshUser()}
                >
                  Check Approval Status
                </Button>
              )}
              <LogoutButton
                variant="default"
                className="w-full bg-black hover:bg-gray-900 text-white"
              />
              <Link href="/" className="text-center text-sm text-gray-600 hover:text-gray-900">
                Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PendingApprovalPage() {
  return (
    <Suspense
      fallback={
        <StandardPageLoading message="Loading..." showBackground={true} />
      }
    >
      <PendingApprovalContent />
    </Suspense>
  );
}
