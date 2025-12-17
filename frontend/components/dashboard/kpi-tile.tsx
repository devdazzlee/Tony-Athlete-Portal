"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPITileProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease";
    period: string;
  };
  icon: LucideIcon;
  iconColor?: string;
  description?: string;
  className?: string;
  formatAsCurrency?: boolean;
}

export function KPITile({
  title,
  value,
  change,
  icon: Icon,
  iconColor = "text-blue-600",
  description,
  className,
  formatAsCurrency = true,
}: KPITileProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === "number") {
      if (formatAsCurrency) {
        // Format as currency
        if (val >= 1000000) {
          return `$${(val / 1000000).toFixed(1)}M`;
        } else if (val >= 1000) {
          return `$${(val / 1000).toFixed(1)}K`;
        }
        return `$${val.toLocaleString()}`;
      } else {
        // Format as number (no currency symbol)
        if (val >= 1000000) {
          return `${(val / 1000000).toFixed(1)}M`;
        } else if (val >= 1000) {
          return `${(val / 1000).toFixed(1)}K`;
        }
        return val.toLocaleString();
      }
    }
    return val;
  };

  return (
    <Card className={cn("hover:shadow-md transition-shadow bg-white border-gray-200", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">
          {formatValue(value)}
        </div>
        {change && (
          <div className="flex items-center space-x-1 mt-1">
            {change.type === "increase" ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <Badge
              variant={change.type === "increase" ? "default" : "destructive"}
              className="text-xs"
            >
              {change.type === "increase" ? "+" : "-"}
              {Math.abs(change.value)}%
            </Badge>
            <span className="text-xs text-gray-500">vs {change.period}</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
