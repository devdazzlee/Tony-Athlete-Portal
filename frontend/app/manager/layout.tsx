import React from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";

export default function ManagerLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout userType="manager">{children}</DashboardLayout>;
}

