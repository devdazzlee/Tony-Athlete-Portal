import TCNutritionDashboardLayout from "@/components/layout/aybl-dashboard-layout"

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TCNutritionDashboardLayout>
      {children}
    </TCNutritionDashboardLayout>
  )
}


