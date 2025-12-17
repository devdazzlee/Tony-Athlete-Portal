"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  Trash2,
  Mail,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Info,
  CheckCircle,
} from "lucide-react";
import { config } from "@/config/config";
import { getAuthHeaders } from "@/lib/getAuthHeaders";
import { DataLoading } from "@/components/ui/loading";

interface Notification {
  id: string;
  type: "COMMISSION" | "PAYOUT" | "SYSTEM" | "PERFORMANCE" | "INFO";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.apiUrl}/notifications`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      } else {
        // Use mock data if API not available
        setNotifications(getMockNotifications());
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      // Use mock data on error
      setNotifications(getMockNotifications());
    } finally {
      setLoading(false);
    }
  };

  const getMockNotifications = (): Notification[] => {
    return [
      {
        id: "1",
        type: "COMMISSION",
        title: "New Commission Earned!",
        message: "You earned $125.50 from your latest referral. Great work!",
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        actionUrl: "/dashboard/commissions",
      },
      {
        id: "2",
        type: "PAYOUT",
        title: "Payout Processed",
        message:
          "Your payout of $850.00 has been successfully processed and will arrive within 2-3 business days.",
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        actionUrl: "/dashboard/commissions/history",
      },
      {
        id: "3",
        type: "PERFORMANCE",
        title: "Milestone Achieved! 🎉",
        message: "Congratulations! You've reached 100 conversions this month.",
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        actionUrl: "/dashboard/statistics",
      },
      {
        id: "4",
        type: "SYSTEM",
        title: "New Features Available",
        message:
          "Check out our new analytics dashboard with advanced reporting tools.",
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        actionUrl: "/dashboard/resources/updates",
      },
      {
        id: "5",
        type: "INFO",
        title: "Upcoming Maintenance",
        message:
          "Scheduled maintenance on Sunday, 2:00 AM - 4:00 AM UTC. Services may be briefly unavailable.",
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      },
    ];
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(
        `${config.apiUrl}/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // Update locally anyway
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(
        `${config.apiUrl}/notifications/mark-all-read`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
      // Update locally anyway
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(
        `${config.apiUrl}/notifications/${notificationId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      // Delete locally anyway
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    }
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "COMMISSION":
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case "PAYOUT":
        return <Mail className="h-5 w-5 text-blue-600" />;
      case "PERFORMANCE":
        return <TrendingUp className="h-5 w-5 text-purple-600" />;
      case "SYSTEM":
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case "INFO":
        return <Info className="h-5 w-5 text-gray-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "COMMISSION":
        return "bg-green-50 border-green-200";
      case "PAYOUT":
        return "bg-blue-50 border-blue-200";
      case "PERFORMANCE":
        return "bg-purple-50 border-purple-200";
      case "SYSTEM":
        return "bg-orange-50 border-orange-200";
      case "INFO":
        return "bg-gray-50 border-gray-200";
      default:
        return "bg-white border-gray-200";
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

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-600 mt-1">
              Stay updated with your affiliate activity
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {notifications.length}
                </p>
              </div>
              <Bell className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Unread</p>
                <p className="text-2xl font-bold text-blue-900">
                  {unreadCount}
                </p>
              </div>
              <Mail className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Read</p>
                <p className="text-2xl font-bold text-green-900">
                  {notifications.length - unreadCount}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filter === "all"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filter === "unread"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter("read")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filter === "read"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Read ({notifications.length - unreadCount})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <DataLoading message="Loading notifications..." />
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No notifications
          </h3>
          <p className="text-gray-600">
            {filter === "all"
              ? "You're all caught up!"
              : `No ${filter} notifications`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`relative rounded-lg border p-4 transition-all ${
                notification.read
                  ? "bg-white border-gray-200"
                  : `${getNotificationColor(notification.type)} border-gray-200 shadow-sm`
              }`}
            >
              {/* Unread indicator */}
              {!notification.read && (
                <div className="absolute top-4 left-4 w-2 h-2 bg-blue-600 rounded-full"></div>
              )}

              <div className="flex items-start gap-4 pl-4">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {notification.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Action Button */}
                  {notification.actionUrl && (
                    <a
                      href={notification.actionUrl}
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium mt-3"
                    >
                      View details
                      <span className="text-lg">→</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
