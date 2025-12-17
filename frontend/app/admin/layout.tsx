import DashboardLayout from "@/components/layout/dashboard-layout";

export default function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout userType="admin">{children}</DashboardLayout>;
}
