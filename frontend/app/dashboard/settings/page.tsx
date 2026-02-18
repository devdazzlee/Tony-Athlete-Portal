"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  User,
  Shield,
  CreditCard,
  Key,
  Mail,
  Lock,
  Settings as SettingsIcon,
  ChevronRight,
  Globe,
} from "lucide-react";

const settingsItems = [
  {
    title: "Profile Settings",
    description: "Manage your personal information and profile details",
    icon: User,
    href: "/dashboard/settings/profile",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    title: "Security",
    description: "Password, two-factor authentication, and login history",
    icon: Shield,
    href: "/dashboard/settings/security",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
];

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <SettingsIcon className="h-8 w-8 text-gray-700" />
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
        </div>
        <p className="text-gray-600">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Settings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.href}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-2 border-gray-200 hover:border-blue-300 bg-white"
              onClick={() => router.push(item.href)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${item.bgColor}`}>
                      <Icon className={`h-6 w-6 ${item.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 mt-2" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

    </div>
  );
}
