"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  LayoutDashboard,
  FileText,
  MessageSquare,
  Star,
  Menu,
  LogOut,
  User,
  Settings,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  Check,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getFullName, getInitials } from "@/lib/auth-client";
import { config } from "@/config/config";
import apiClient from "@/lib/api-client";
import { AuthLoading } from "@/components/ui/loading";

interface TCNutritionDashboardLayoutProps {
  children: React.ReactNode;
}

// Helper function to get full avatar URL
const getAvatarUrl = (avatar: string | null | undefined): string => {
  if (!avatar) {
    return "/placeholder-avatar.jpg";
  }
  if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
    return avatar;
  }
  const cleanPath = avatar.startsWith("/") ? avatar.slice(1) : avatar;
  const baseUrl = config.apiUrl.replace("/api", "");
  return `${baseUrl}/${cleanPath}`;
};

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Tracking",
    href: "/dashboard/referrals",
    icon: TrendingUp,
  },
  {
    title: "Deliverables",
    href: "/dashboard/deliverables",
    icon: FileText,
  },
  {
    title: "Feedback",
    href: "/dashboard/feedback",
    icon: MessageSquare,
  },
];

interface Notification {
  id: string;
  type: "COMMISSION" | "PAYOUT" | "SYSTEM" | "PERFORMANCE" | "INFO";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export default function TCNutritionDashboardLayout({
  children,
}: TCNutritionDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated, hasToken } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    // Only redirect to login when we're completely done loading AND
    // there's no token left (meaning refresh failed or user never logged in)
    if (isLoading) return;
    if (!isAuthenticated && !hasToken) {
      router.replace("/auth/login");
    }
  }, [isLoading, isAuthenticated, hasToken, router]);

  async function fetchNotifications() {
    try {
      setNotificationsLoading(true);
      const response = await apiClient.get("/notifications");
      setNotifications(response.data?.notifications || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      // Use mock data on error
      setNotifications(getMockNotifications());
    } finally {
      setNotificationsLoading(false);
    }
  }

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    fetchNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isLoading, isAuthenticated]);

  // Show loading while auth state is being determined (initial load or token refresh)
  if (isLoading || (hasToken && !isAuthenticated)) {
    return <AuthLoading message="Authenticating..." />;
  }

  // No token and not authenticated — show loading while redirect happens
  if (!isAuthenticated) {
    return <AuthLoading message="Redirecting to login..." />;
  }

  const getMockNotifications = (): Notification[] => {
    return [
      {
        id: "1",
        type: "COMMISSION",
        title: "New Commission Earned!",
        message: "You earned $125.50 from your latest referral.",
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        actionUrl: "/dashboard/commissions",
      },
      {
        id: "2",
        type: "PAYOUT",
        title: "Payout Processed",
        message: "Your payout of $850.00 has been processed.",
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        actionUrl: "/dashboard/commissions/history",
      },
      {
        id: "3",
        type: "PERFORMANCE",
        title: "Milestone Achieved! 🎉",
        message: "Congratulations! You've reached 100 conversions.",
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        actionUrl: "/dashboard/statistics",
      },
    ];
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.patch(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // Update locally anyway
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      );
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "COMMISSION":
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case "PAYOUT":
        return <Bell className="h-4 w-4 text-blue-600" />;
      case "PERFORMANCE":
        return <TrendingUp className="h-4 w-4 text-purple-600" />;
      case "SYSTEM":
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case "INFO":
        return <Info className="h-4 w-4 text-gray-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const recentNotifications = notifications.slice(0, 5);

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const handleProfileClick = () => {
    router.push("/dashboard/settings/profile");
  };

  const SidebarContent = ({
    showCollapseButton = false,
  }: {
    showCollapseButton?: boolean;
  }) => (
    <div className="flex h-full flex-col bg-white text-gray-900 border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center px-6 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center space-x-2">
          {sidebarCollapsed ? (
            <Image
              src="/sidebar.png"
              alt="TC Nutrition compact"
              width={120}
              height={36}
              className="h-auto w-[120px] min-w-[120px] max-h-10 object-contain"
              priority
            />
          ) : (
            <Image
              src="/logo.png"
              alt="TC Nutrition"
              width={180}
              height={50}
              className="h-auto w-[180px] max-h-12 object-contain"
              priority
            />
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {!sidebarCollapsed && (
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
            Navigation
          </div>
        )}
        {navItems.map((item) => {
          const isItemActive = isActive(item.href);

          return (
            <Button
              key={item.title}
              variant="ghost"
              asChild
              className={cn(
                "w-full justify-start h-10 px-3 text-left font-normal text-gray-700 hover:text-gray-900 hover:bg-gray-100",
                isItemActive && "bg-gray-100 text-gray-900",
                sidebarCollapsed && "justify-center px-2",
              )}
              title={sidebarCollapsed ? item.title : undefined}
            >
              <Link href={item.href}>
                <item.icon
                  className={cn("h-4 w-4", !sidebarCollapsed && "mr-3")}
                />
                {!sidebarCollapsed && item.title}
              </Link>
            </Button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden md:flex md:flex-col transition-all duration-300",
          sidebarCollapsed ? "md:w-20" : "md:w-64",
        )}
      >
        <div className="flex flex-col flex-grow">
          <SidebarContent showCollapseButton={false} />
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-white">
          <SidebarContent showCollapseButton={false} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Desktop Sidebar Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden md:flex text-gray-700 hover:bg-gray-100"
              >
                <PanelLeft className="h-5 w-5" />
              </Button>

              {/* Mobile Sidebar Toggle */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden text-gray-700 hover:bg-gray-100"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64 bg-white">
                  <SidebarContent showCollapseButton={false} />
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex items-center space-x-4">
              {/* Welcome Message */}
              <div className="hidden md:flex items-center space-x-2 text-gray-900">
                <span className="text-sm">
                  Welcome,{" "}
                  {user ? `${user.firstName} ${user.lastName}` : "User"}
                </span>
              </div>

              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-700 hover:bg-gray-100 relative"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-80 bg-white border-gray-200"
                >
                  <DropdownMenuLabel className="text-gray-900 flex items-center justify-between">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <Badge className="bg-blue-600 text-white">
                        {unreadCount} new
                      </Badge>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-200" />
                  {notificationsLoading ? (
                    <div className="p-4 text-center text-sm text-gray-600">
                      Loading...
                    </div>
                  ) : recentNotifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-600">
                      No notifications
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {recentNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={cn(
                            "px-3 py-2 hover:bg-gray-100 transition-colors border-b border-gray-100",
                            !notification.read && "bg-blue-50/50",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    {notification.title}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {formatTimeAgo(notification.createdAt)}
                                  </p>
                                </div>
                                {!notification.read && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(notification.id);
                                    }}
                                    className="flex-shrink-0 p-1 text-gray-400 hover:text-blue-600 rounded"
                                    title="Mark as read"
                                  >
                                    <Check className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                              {notification.actionUrl && (
                                <Link
                                  href={notification.actionUrl}
                                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  View details →
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <DropdownMenuSeparator className="bg-gray-200" />
                  <DropdownMenuItem
                    onClick={() => router.push("/dashboard/notifications")}
                    className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    View all notifications
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Account Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 text-gray-700 hover:bg-gray-100"
                  >
                    <span className="hidden md:block">Account</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-white border-gray-200"
                >
                  <DropdownMenuLabel className="text-gray-900">
                    My Account
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-200" />
                  <DropdownMenuItem
                    onClick={handleProfileClick}
                    className="text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/dashboard/settings")}
                    className="text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
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
        <main className="flex-1 overflow-auto bg-white text-gray-900 flex flex-col">
          <div className="flex-1">{children}</div>
          <footer className="border-t border-gray-200 px-4 sm:px-6 py-4 bg-white mt-auto">
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between text-gray-600 text-sm gap-2 sm:gap-0">
              <div className="text-center sm:text-left">
                TC Nutrition Athlete Portal
              </div>
              {/* <div className="text-center sm:text-right">© 2025 RK Brands Ltd. All rights reserved.</div> */}
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
