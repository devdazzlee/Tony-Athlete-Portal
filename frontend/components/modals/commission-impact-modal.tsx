"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Users, TrendingUp, TrendingDown } from "lucide-react";
import { config } from "@/config/config";
import { getAuthHeaders } from "@/lib/getAuthHeaders";

interface AffiliateImpact {
  id: string;
  name: string;
  email: string;
  currentRate: number;
  newRate: number;
}

interface CommissionImpactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (updateAffiliates: boolean) => void;
  newDefaultRate: number;
  currentDefaultRate: number;
  isLoading?: boolean;
}

export default function CommissionImpactModal({
  isOpen,
  onClose,
  onConfirm,
  newDefaultRate,
  currentDefaultRate,
  isLoading = false,
}: CommissionImpactModalProps) {
  const [impactData, setImpactData] = useState<{
    affectedAffiliates: number;
    totalAffiliates: number;
    affectedAffiliateList: AffiliateImpact[];
  } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Fetch impact preview when modal opens
  const fetchImpactPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const response = await fetch(
        `${config.apiUrl}/system/settings/commission/preview`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ defaultRate: newDefaultRate }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setImpactData(data.preview);
      } else {
        console.error("Failed to fetch impact preview");
      }
    } catch (error) {
      console.error("Error fetching impact preview:", error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Fetch preview when modal opens
  useEffect(() => {
    if (isOpen && newDefaultRate !== currentDefaultRate) {
      fetchImpactPreview();
    }
  }, [isOpen, newDefaultRate, currentDefaultRate]);

  const rateChange = newDefaultRate - currentDefaultRate;
  const isIncrease = rateChange > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Commission Rate Change Impact
          </DialogTitle>
          <DialogDescription>
            Review the impact of changing the default commission rate from{" "}
            <span className="font-semibold">{currentDefaultRate}%</span> to{" "}
            <span className="font-semibold">{newDefaultRate}%</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Rate Change Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                {isIncrease ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
                Rate Change Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Current Rate</p>
                  <p className="text-2xl font-bold">{currentDefaultRate}%</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">New Rate</p>
                  <p className="text-2xl font-bold">{newDefaultRate}%</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Change</p>
                  <Badge
                    variant={isIncrease ? "default" : "destructive"}
                    className="text-lg px-3 py-1"
                  >
                    {isIncrease ? "+" : ""}
                    {rateChange}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Impact Preview */}
          {isLoadingPreview ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Analyzing impact...
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : impactData ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Affiliate Impact Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {impactData.affectedAffiliates}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Affiliates Affected
                    </p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-gray-600">
                      {impactData.totalAffiliates}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total Affiliates
                    </p>
                  </div>
                </div>

                {impactData.affectedAffiliates > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-2">
                        Affiliates Using Default Rate:
                      </h4>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {impactData.affectedAffiliateList.map((affiliate) => (
                          <div
                            key={affiliate.id}
                            className="flex items-center justify-between p-2 bg-muted rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-sm">
                                {affiliate.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {affiliate.email}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {affiliate.currentRate}% → {affiliate.newRate}%
                              </p>
                              <Badge
                                variant={isIncrease ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {isIncrease ? "+" : ""}
                                {affiliate.newRate - affiliate.currentRate}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {impactData.affectedAffiliates === 0 && (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">
                      No affiliates are currently using the default rate.
                      <br />
                      This change will only affect new affiliates.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Important Notice */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-800">
                    Important Notice
                  </h4>
                  <p className="text-sm text-amber-700 mt-1">
                    This change will only affect affiliates who are currently
                    using the default commission rate. Affiliates with custom
                    rates will not be affected.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => onConfirm(false)}
            disabled={isLoading}
          >
            Save Settings Only
          </Button>
          <Button
            onClick={() => onConfirm(true)}
            disabled={isLoading || impactData?.affectedAffiliates === 0}
            className={
              impactData?.affectedAffiliates === 0
                ? "opacity-50 cursor-not-allowed"
                : ""
            }
          >
            {isLoading ? "Saving..." : "Save & Update Affiliates"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
