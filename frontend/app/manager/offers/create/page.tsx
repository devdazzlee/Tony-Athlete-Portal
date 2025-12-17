"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { config } from "@/config/config";
import { getAuthHeaders } from "@/lib/getAuthHeaders";
import { ManagerLoading, AuthRequired } from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";

interface Affiliate {
  id: string;
  name: string;
  email: string;
}

export default function CreateOfferPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newOffer, setNewOffer] = useState({
    name: "",
    description: "",
    commissionRate: 10,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    affiliateId: "",
  });

  useEffect(() => {
    if (user) {
      fetchAffiliates();
    }
  }, [user]);

  const fetchAffiliates = async () => {
    try {
      const response = await fetch(
        `${config.apiUrl}/admin/affiliates?limit=500`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAffiliates(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching affiliates:", error);
    }
  };

  const handleCreateOffer = async () => {
    if (!newOffer.name || !newOffer.description || !newOffer.affiliateId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`${config.apiUrl}/admin/offers`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(newOffer),
      });

      if (response.ok) {
        toast.success("Offer created successfully");
        setNewOffer({
          name: "",
          description: "",
          commissionRate: 10,
          startDate: new Date().toISOString().split("T")[0],
          endDate: "",
          affiliateId: "",
        });
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to create offer");
      }
    } catch (error) {
      console.error("Error creating offer:", error);
      toast.error("Failed to create offer");
    } finally {
      setIsCreating(false);
    }
  };

  if (authLoading) {
    return <ManagerLoading message="Loading..." />;
  }

  if (!user) {
    return (
      <AuthRequired
        message="Manager Access Required"
        actionText="Go to Login"
        actionUrl="/auth/login"
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create Offer</h1>
        <p className="mt-2 text-gray-600">
          Create a new promotional offer for affiliates
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Offer Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Offer Name *</Label>
            <Input
              id="name"
              placeholder="Premium Plan Promotion"
              value={newOffer.name}
              onChange={(e) => setNewOffer({ ...newOffer, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="30% commission on all premium plan sales..."
              value={newOffer.description}
              onChange={(e) =>
                setNewOffer({ ...newOffer, description: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="affiliate">Select Affiliate *</Label>
            <Select
              value={newOffer.affiliateId}
              onValueChange={(value) =>
                setNewOffer({ ...newOffer, affiliateId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose an affiliate" />
              </SelectTrigger>
              <SelectContent>
                {affiliates.map((affiliate) => (
                  <SelectItem key={affiliate.id} value={affiliate.id}>
                    {affiliate.name} ({affiliate.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commissionRate">Commission Rate (%) *</Label>
              <Input
                id="commissionRate"
                type="number"
                min="0"
                max="100"
                value={newOffer.commissionRate}
                onChange={(e) =>
                  setNewOffer({
                    ...newOffer,
                    commissionRate: parseFloat(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={newOffer.startDate}
                onChange={(e) =>
                  setNewOffer({ ...newOffer, startDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date (Optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={newOffer.endDate}
                onChange={(e) =>
                  setNewOffer({ ...newOffer, endDate: e.target.value })
                }
              />
            </div>
          </div>

          <Button onClick={handleCreateOffer} disabled={isCreating} className="w-full">
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Offer
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}






