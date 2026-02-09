"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  BookOpen,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { DashboardLoading } from "@/components/ui/loading";

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  helpful: number;
  notHelpful: number;
  createdAt: Date;
}

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [votedItems, setVotedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchFAQs();
  }, [selectedCategory, searchQuery]);

  const fetchFAQs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") {
        params.append("category", selectedCategory);
      }
      if (searchQuery) {
        params.append("search", searchQuery);
      }

      const response = await apiClient.get(`/support/faq?${params.toString()}`);
      const data = response.data;
      setFaqs(data.faqs || []);
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Error fetching FAQs:", error);
      toast.error(
        (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.message ||
          "Failed to load FAQ items"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (faqId: string, helpful: boolean) => {
    if (votedItems.has(faqId)) {
      toast.info("You've already voted on this item");
      return;
    }

    try {
      await apiClient.post(`/support/faq/${faqId}/helpful`, { helpful });
      toast.success(helpful ? "Marked as helpful" : "Feedback recorded");
      setVotedItems((prev) => new Set(prev).add(faqId));
      fetchFAQs(); // Refresh to get updated counts
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchFAQs();
    setIsRefreshing(false);
    toast.success("FAQ data refreshed");
  };

  if (isLoading) {
    return <DashboardLoading message="Loading FAQ..." />;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            FAQ & Knowledge Base
          </h1>
          <p className="text-muted-foreground">
            Find answers to common questions
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="w-full sm:w-auto"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search FAQ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Items */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>{faqs.length} questions found</CardDescription>
        </CardHeader>
        <CardContent>
          {faqs.length === 0 ? (
            <div className="text-center py-8">
              <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No FAQs Found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or category filter
              </p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id}>
                  <AccordionTrigger className="text-left">
                    <div className="flex items-start space-x-3">
                      <Badge variant="outline" className="mt-1">
                        {faq.category}
                      </Badge>
                      <span className="font-medium">{faq.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <p className="text-muted-foreground">{faq.answer}</p>
                      <div className="flex items-center justify-between pt-3 border-t">
                        <span className="text-sm text-muted-foreground">
                          Was this helpful?
                        </span>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVote(faq.id, true)}
                            disabled={votedItems.has(faq.id)}
                            className="flex items-center space-x-1"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            <span>{faq.helpful}</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVote(faq.id, false)}
                            disabled={votedItems.has(faq.id)}
                            className="flex items-center space-x-1"
                          >
                            <ThumbsDown className="w-4 h-4" />
                            <span>{faq.notHelpful}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Still Need Help?</h3>
              <p className="text-muted-foreground mb-4">
                Can't find what you're looking for? Contact our support team for
                personalized assistance.
              </p>
              <Button>Contact Support</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
