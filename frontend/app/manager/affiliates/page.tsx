"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ManagerLoading, AuthRequired } from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";
import { Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ManagerAffiliatesPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <ManagerLoading message="Loading affiliates..." />;
  }

  if (!user) {
    return (
      <AuthRequired
        message="Manager Access Required"
        actionText="Go to Login"
        actionUrl="/auth/login"
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Affiliate Management
        </h1>
        <p className="mt-2 text-gray-600">
          Manage and monitor your affiliates
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Affiliates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              View and manage all affiliate accounts
            </p>
            <Button asChild>
              <Link href="/manager/affiliates/all">View All</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Approval Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Review and approve pending affiliate applications
            </p>
            <Button asChild>
              <Link href="/manager/affiliates/approval">Review Queue</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Performance Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Analyze affiliate performance metrics
            </p>
            <Button asChild>
              <Link href="/manager/affiliates/performance">
                View Performance
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}






