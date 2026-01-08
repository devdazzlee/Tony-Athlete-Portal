import TCNutritionDashboardLayout from "@/components/layout/aybl-dashboard-layout"
import { CartProvider } from "@/contexts/CartContext"

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CartProvider>
      <TCNutritionDashboardLayout>
        {children}
      </TCNutritionDashboardLayout>
    </CartProvider>
  )
}


