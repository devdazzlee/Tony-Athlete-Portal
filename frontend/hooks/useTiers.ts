import { useState, useEffect } from "react";
import apiClient from "@/lib/api-client";

export interface Tier {
  id: string;
  name: string;
  description: string;
  level: number;
  commissionRate: number;
  requirements: {
    minimumClicks: number;
    minimumConversions: number;
    minimumEarnings: number;
    minimumReferrals: number;
    timePeriod: number;
    otherRequirements: string[];
  };
  benefits: {
    commissionRate: number;
    bonusRate: number;
    prioritySupport: boolean;
    customFeatures: string[];
    exclusiveOffers: boolean;
    higherPayouts: boolean;
    marketingMaterials: boolean;
    dedicatedManager: boolean;
  };
  status: string;
}

export function useTiers() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTiers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get("/admin/tiers");
      setTiers(response.data?.tiers || []);
    } catch (err) {
      console.error("Error fetching tiers:", err);
      setError("Failed to load tiers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTiers();
  }, []);

  // Get tier by name (case-insensitive)
  const getTierByName = (name: string): Tier | undefined => {
    return tiers.find(
      (tier) => tier.name.toLowerCase() === name.toLowerCase()
    );
  };

  // Get tier badge color class
  const getTierBadgeColor = (tierName: string): string => {
    const tier = getTierByName(tierName);
    if (!tier) return "bg-gray-100 text-gray-800";
    
    // Default colors based on level (can be customized)
    const colors = [
      "bg-orange-100 text-orange-800", // Level 1
      "bg-gray-200 text-gray-800",     // Level 2
      "bg-yellow-100 text-yellow-800",  // Level 3
      "bg-purple-100 text-purple-800",  // Level 4
      "bg-blue-100 text-blue-800",      // Level 5+
    ];
    
    return colors[tier.level - 1] || colors[0];
  };

  return {
    tiers,
    isLoading,
    error,
    refetch: fetchTiers,
    getTierByName,
    getTierBadgeColor,
  };
}
