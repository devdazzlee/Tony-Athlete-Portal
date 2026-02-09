"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  BarChart3,
  Link as LinkIcon,
  DollarSign,
  BookOpen,
  Settings,
  User,
  Users,
  Menu,
  LogOut,
  ChevronDown,
  HelpCircle,
  CreditCard,
  Shield,
  Wrench,
  FileText,
  Send,
  AlertTriangle,
  Tag,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getFullName, getInitials } from "@/lib/auth-client";
import { config } from "@/config/config";
import { AuthLoading } from "@/components/ui/loading";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userType?: "affiliate" | "admin" | "manager";
}

// Helper function to get full avatar URL
const getAvatarUrl = (avatar: string | null | undefined): string => {
  if (!avatar) {
    console.log("No avatar provided, using placeholder");
    return "/placeholder-avatar.jpg";
  }

  // If avatar is already a full URL (starts with http:// or https://), return as is
  if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
    console.log("Avatar is full URL:", avatar);
    return avatar;
  }

  // If avatar is a relative path, construct full URL
  // Remove leading slash if present to avoid double slashes
  const cleanPath = avatar.startsWith("/") ? avatar.slice(1) : avatar;
  const baseUrl = config.apiUrl.replace("/api", "");
  const fullUrl = `${baseUrl}/${cleanPath}`;

  console.log("Constructed avatar URL:", fullUrl, "from avatar:", avatar);
  return fullUrl;
};

const affiliateNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Statistics",
    href: "/dashboard/statistics",
    icon: BarChart3,
  },
  {
    title: "My Links & Assets",
    href: "/dashboard/links",
    icon: LinkIcon,
  },
  {
    title: "Commissions & Payouts",
    href: "/dashboard/commissions",
    icon: DollarSign,
  },
  {
    title: "Resources & Support",
    href: "/dashboard/resources",
    icon: BookOpen,
    subItems: [
      { title: "FAQ/Knowledge Base", href: "/dashboard/resources/faq" },
      { title: "Contact Support", href: "/dashboard/resources/support" },
    ],
  },
  {
    title: "Account Settings",
    href: "/dashboard/settings",
    icon: Settings,
    subItems: [
      { title: "Profile", href: "/dashboard/settings/profile" },
      { title: "Security", href: "/dashboard/settings/security" },
      { title: "Websites", href: "/dashboard/settings/websites" },
    ],
  },
];

const managerNavItems = [
  {
    title: "Manager Dashboard",
    href: "/manager",
    icon: Home,
  },
  {
    title: "Affiliate Management",
    href: "/manager/affiliates",
    icon: User,
    subItems: [
      { title: "All Affiliates", href: "/manager/affiliates/all" },
      { title: "Approval Queue", href: "/manager/affiliates/approval" },
      { title: "Performance Review", href: "/manager/affiliates/performance" },
    ],
  },
  {
    title: "Analytics & Reports",
    href: "/manager/analytics",
    icon: BarChart3,
    subItems: [
      { title: "Revenue Reports", href: "/manager/analytics/revenue" },
      { title: "Traffic Analysis", href: "/manager/analytics/traffic" },
      { title: "Conversion Reports", href: "/manager/analytics/conversions" },
    ],
  },
  {
    title: "Offer Management",
    href: "/manager/offers",
    icon: LinkIcon,
    subItems: [
      { title: "Active Offers", href: "/manager/offers/active" },
      { title: "Create Offer", href: "/manager/offers/create" },
      { title: "Performance", href: "/manager/offers/performance" },
    ],
  },
  {
    title: "Payout Management",
    href: "/manager/payouts",
    icon: DollarSign,
    subItems: [
      { title: "Pending Payouts", href: "/manager/payouts/pending" },
      { title: "Payout History", href: "/manager/payouts/history" },
      { title: "Payout Settings", href: "/manager/payouts/settings" },
    ],
  },
  {
    title: "Team Management",
    href: "/manager/team",
    icon: Users,
    subItems: [
      { title: "Team Overview", href: "/manager/team/overview" },
      { title: "Performance", href: "/manager/team/performance" },
      { title: "Assignments", href: "/manager/team/assignments" },
    ],
  },
  {
    title: "Settings",
    href: "/manager/settings",
    icon: Settings,
    subItems: [
      { title: "Profile", href: "/manager/settings/profile" },
      { title: "Security", href: "/manager/settings/security" },
    ],
  },
];

const adminNavItems = [
  {
    title: "Program Overview",
    href: "/admin",
    icon: BarChart3,
  },
  {
    title: "Manage Affiliates",
    href: "/admin/affiliates",
    icon: User,
  },
  {
    title: "Affiliate Codes",
    href: "/admin/affiliate-codes",
    icon: Tag,
  },
  {
    title: "Deliverables",
    href: "/admin/deliverables",
    icon: FileText,
  },
  {
    title: "Commission Management",
    href: "/admin/commissions",
    icon: DollarSign,
  },
  {
    title: "Payout Queue",
    href: "/admin/payouts",
    icon: CreditCard,
  },
  // {
  //   title: "Offers & Creatives",
  //   href: "/admin/offers",
  //   icon: LinkIcon,
  // },
  {
    title: "General Feedback",
    href: "/admin/feedback",
    icon: MessageSquare,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
    subItems: [
      { title: "Profile", href: "/admin/settings/profile" },
      // { title: "System Settings", href: "/admin/settings" },
      // { title: "Websites", href: "/admin/settings/websites" },
      { title: "Security", href: "/admin/settings/security" },
    ],
  },
];

export default function DashboardLayout({
  children,
  userType = "affiliate",
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated, hasToken } = useAuth();

  useEffect(() => {
    // Only redirect to login when we're completely done loading AND
    // there's no token left (meaning refresh failed or user never logged in)
    if (isLoading) return;
    if (!isAuthenticated && !hasToken) {
      router.replace("/auth/login");
    }
  }, [isLoading, isAuthenticated, hasToken, router]);

  // Show loading while auth state is being determined (initial load or token refresh)
  if (isLoading || (hasToken && !isAuthenticated)) {
    return <AuthLoading message="Authenticating..." />;
  }

  // No token and not authenticated — show loading while redirect happens
  if (!isAuthenticated) {
    return <AuthLoading message="Redirecting to login..." />;
  }

  const navItems =
    userType === "admin"
      ? adminNavItems
      : userType === "manager"
      ? managerNavItems
      : affiliateNavItems;

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/dashboard" || href === "/admin") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const handleProfileClick = () => {
    let profilePath = "/dashboard/settings/profile";
    if (userType === "admin") profilePath = "/admin/settings/profile";
    else if (userType === "manager") profilePath = "/manager/settings/profile";
    router.push(profilePath);
  };

  const handleSettingsClick = () => {
    let settingsPath = "/dashboard/settings";
    if (userType === "admin") settingsPath = "/admin/settings";
    else if (userType === "manager") settingsPath = "/manager/settings";
    router.push(settingsPath);
  };

  const handleSupportClick = () => {
    let supportPath = "/dashboard/resources/support";
    if (userType === "admin") supportPath = "/admin/settings";
    else if (userType === "manager") supportPath = "/manager/settings";
    router.push(supportPath);
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-gray-200">
        <Link href="/" className="flex items-center space-x-2">
          <Image 
            src="/logo.png" 
            alt="TC Nutrition" 
            width={180} 
            height={50}
            className="h-auto w-auto max-w-[180px]"
            priority
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const hasSubItems =
            (item as any).subItems && (item as any).subItems.length > 0;
          const isExpanded = expandedItems.includes(item.title);
          const isItemActive = isActive(item.href);

          return (
            <div key={item.title}>
              {hasSubItems ? (
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-10 px-3 text-left font-normal text-gray-700 hover:text-gray-900 hover:bg-gray-100",
                    isItemActive && "bg-gray-100 text-gray-900"
                  )}
                  onClick={() => toggleExpanded(item.title)}
                >
                  <item.icon className="mr-3 h-4 w-4" />
                  {item.title}
                  <ChevronDown
                    className={cn(
                      "ml-auto h-4 w-4 transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  asChild
                  className={cn(
                    "w-full justify-start h-10 px-3 text-left font-normal text-gray-700 hover:text-gray-900 hover:bg-gray-100",
                    isItemActive && "bg-gray-100 text-gray-900"
                  )}
                >
                  <Link href={item.href}>
                    <item.icon className="mr-3 h-4 w-4" />
                    {item.title}
                  </Link>
                </Button>
              )}

              {/* Sub Items */}
              {hasSubItems && isExpanded && (
                <div className="ml-6 mt-1 space-y-1">
                  {(item as any).subItems?.map((subItem: any) => (
                    <Button
                      key={subItem.title}
                      variant="ghost"
                      asChild
                      size="sm"
                      className={cn(
                        "w-full justify-start h-8 px-3 text-left font-normal text-sm text-gray-600 hover:bg-gray-100",
                        pathname === subItem.href &&
                          "bg-gray-100 text-gray-900"
                      )}
                    >
                      <Link href={subItem.href}>{subItem.title}</Link>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
          <Avatar className="h-8 w-8">
            <AvatarImage src={getAvatarUrl(user?.avatar)} />
            <AvatarFallback>{user ? getInitials(user) : "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user ? getFullName(user) : "User"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {userType === "admin"
                ? "Admin"
                : userType === "manager"
                ? "Manager"
                : "Affiliate Partner"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex overflow-hidden bg-gray-50 w-full max-w-full">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-white border-gray-200">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden w-full min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between w-full max-w-full">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="md:hidden text-gray-700 flex-shrink-0">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64 bg-white border-gray-200">
                  <SidebarContent />
                </SheetContent>
              </Sheet>

              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-semibold text-gray-900 truncate">
                  {userType === "admin"
                    ? "Admin Dashboard"
                    : userType === "manager"
                    ? "Manager Dashboard"
                    : "Affiliate Dashboard"}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  {userType === "admin"
                    ? "Manage your affiliate program"
                    : userType === "manager"
                    ? "Manage affiliates and performance"
                    : "Track your performance and earnings"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-4 flex-shrink-0">
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center space-x-1 sm:space-x-2 text-gray-700 hover:bg-gray-100"
                  >
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                      <AvatarImage src={getAvatarUrl(user?.avatar)} />
                      <AvatarFallback>
                        {user ? getInitials(user) : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user ? getFullName(user) : "User"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {userType === "admin"
                          ? "Admin"
                          : userType === "manager"
                          ? "Manager"
                          : "Affiliate"}
                      </p>
                    </div>
                    <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border-gray-200">
                  <DropdownMenuLabel className="text-gray-900">My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-200" />
                  <DropdownMenuItem 
                    onClick={handleProfileClick}
                    className="text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleSettingsClick}
                    className="text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleSupportClick}
                    className="text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Help & Support
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-200" />
                  <div onClick={(e) => e.stopPropagation()}>
                    <LogoutButton
                      variant="ghost"
                      className="w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                      size="sm"
                    >
                      Sign out
                    </LogoutButton>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-white text-gray-900 w-full max-w-full">{children}</main>
      </div>
    </div>
  );
}
