"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { DashboardLoading } from "@/components/ui/loading";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DateRangePicker } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function SocialsPage() {
  const [followers, setFollowers] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("chart");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to?: Date | undefined } | undefined>(undefined);
  const [showRangePicker, setShowRangePicker] = useState(false);

  useEffect(() => {
    fetchSocials();
  }, [dateRange]);

  const fetchSocials = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange?.from) {
        params.append("from", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        params.append("to", dateRange.to.toISOString());
      }
      const response = await apiClient.get(`/athlete/socials?${params.toString()}`);
      setFollowers(response.data);
    } catch (error: any) {
      console.error("Error fetching social stats:", error);
      toast.error("Failed to load social media stats");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardLoading message="Loading social media analytics..." />;
  }

  if (!followers) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-8">
          <p className="text-gray-600">No social media data available</p>
        </div>
      </div>
    );
  }

  // Format follower count with commas
  const formatCount = (count: string | number) => {
    const num = typeof count === "string" ? parseInt(count.replace(/,/g, "")) : count;
    return num.toLocaleString();
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      const day = date.getDate();
      const suffix = day === 1 || day === 21 || day === 31 ? "st" : day === 2 || day === 22 ? "nd" : day === 3 || day === 23 ? "rd" : "th";
      return `${day}${suffix} ${date.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`;
    } catch {
      return dateStr;
    }
  };

  // Get chart data from API
  const instagramChartData = followers.instagram?.history || [];
  const tiktokChartData = followers.tiktok?.history || [];

  const handleRangeChange = (range: { from: Date | undefined; to?: Date | undefined } | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      setShowRangePicker(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
      <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Socials</h1>
          <p className="text-gray-600">
            {followers.description || "Latest followers with change vs previous snapshot and vs 7 days prior."}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={viewMode === "chart" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("chart")}
            className={
              viewMode === "chart"
                ? "bg-gray-900 text-white hover:bg-gray-800"
                : "bg-transparent border-gray-300 text-gray-600 hover:bg-gray-100"
            }
          >
            Chart
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
            className={
              viewMode === "table"
                ? "bg-gray-900 text-white hover:bg-gray-800"
                : "bg-transparent border-gray-300 text-gray-600 hover:bg-gray-100"
            }
          >
            Table
          </Button>
          <Popover open={showRangePicker} onOpenChange={setShowRangePicker}>
            <PopoverTrigger asChild>
              <Button
                variant={viewMode === "range" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setViewMode("range");
                  setShowRangePicker(true);
                }}
                className={
                  viewMode === "range" || dateRange?.from
                    ? "bg-gray-900 text-white hover:bg-gray-800"
                    : "bg-transparent border-gray-300 text-gray-600 hover:bg-gray-100"
                }
              >
                Range
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <DateRangePicker
                value={dateRange}
                onChange={handleRangeChange}
                placeholder="Pick a date range"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Followers (Last 30 days) Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Instagram */}
        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <div className="space-y-4">
            <div>
                <div className="text-lg font-medium text-gray-900 mb-1">Instagram</div>
                <div className="text-xl font-semibold text-gray-900 mb-1">
                  {followers.instagram?.username || "Not set"}
                </div>
                <div className="text-sm text-gray-600">
                  As of {formatDate(followers.instagram?.date || "")}
                </div>
            </div>
            <div>
                <div className="text-5xl font-bold text-gray-900">
                  {formatCount(followers.instagram?.count || "0")}
              </div>
              </div>
              <div className="space-y-1">
                <div className={`text-sm ${
                  parseInt(followers.instagram?.changeVsPrevious || "0") >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}>
                  Change vs previous snapshot ({formatDate(followers.instagram?.previousDate || "")}): {parseInt(followers.instagram?.changeVsPrevious || "0") >= 0 ? "+" : ""}{followers.instagram?.changeVsPrevious || "0"}
            </div>
                <div className={`text-sm ${
                  parseInt(followers.instagram?.changeVs7Days || "0") >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}>
                  Change vs 7 days earlier ({formatDate(followers.instagram?.sevenDaysAgoDate || "")}): {parseInt(followers.instagram?.changeVs7Days || "0") >= 0 ? "+" : ""}{followers.instagram?.changeVs7Days || "0"}
              </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TikTok */}
        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <div className="space-y-4">
            <div>
                <div className="text-lg font-medium text-gray-900 mb-1">Tik Tok</div>
                <div className="text-xl font-semibold text-gray-900 mb-1">
                  {followers.tiktok?.username || "Not set"}
                </div>
                <div className="text-sm text-gray-600">
                  As of {formatDate(followers.tiktok?.date || "")}
                </div>
            </div>
            <div>
                <div className="text-5xl font-bold text-gray-900">
                  {formatCount(followers.tiktok?.count || "0")}
              </div>
              </div>
              <div className="space-y-1">
                <div className={`text-sm ${
                  parseInt(followers.tiktok?.changeVsPrevious || "0") >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}>
                  Change vs previous snapshot ({formatDate(followers.tiktok?.previousDate || "")}): {parseInt(followers.tiktok?.changeVsPrevious || "0") >= 0 ? "+" : ""}{followers.tiktok?.changeVsPrevious || "0"}
            </div>
                <div className={`text-sm ${
                  parseInt(followers.tiktok?.changeVs7Days || "0") >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}>
                  Change vs 7 days earlier ({formatDate(followers.tiktok?.sevenDaysAgoDate || "")}): {parseInt(followers.tiktok?.changeVs7Days || "0") >= 0 ? "+" : ""}{followers.tiktok?.changeVs7Days || "0"}
              </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Section - Two Charts Side by Side */}
      {viewMode === "chart" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Instagram History */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={instagramChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis
                      dataKey="date"
                      stroke="#9ca3af"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      fontSize={12}
                      tickFormatter={(value) => {
                        if (value >= 1000) return `${value / 1000}K`;
                        return value.toString();
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "6px",
                        color: "#fff",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="followers"
                      stroke="#ec4899"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* TikTok History */}
          <Card className="bg-white border-gray-200">
        <CardHeader>
              <CardTitle className="text-gray-900">History</CardTitle>
        </CardHeader>
        <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tiktokChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis
                      dataKey="date"
                      stroke="#9ca3af"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      fontSize={12}
                      tickFormatter={(value) => {
                        if (value >= 1000) return `${value / 1000}K`;
                        return value.toString();
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "6px",
                        color: "#fff",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="followers"
                      stroke="#14b8a6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
          </div>
            </CardContent>
          </Card>
          </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">History Table</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-gray-600">
              Table view will be implemented here
          </div>
        </CardContent>
      </Card>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>Last updated: {followers.lastUpdated || "N/A"}</div>
        <div>FYI: Tik Tok sometimes rounds follower numbers (100s or 1,000s).</div>
      </div>
    </div>
  );
}
