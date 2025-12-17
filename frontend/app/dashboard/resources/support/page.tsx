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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  ExternalLink,
  Send,
  RefreshCw,
  Inbox,
} from "lucide-react";
import { SectionLoading } from "@/components/ui/loading";
import { toast } from "sonner";
import { config } from "@/config/config";
import { getAuthHeaders } from "@/lib/getAuthHeaders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
  lastResponse: string;
  messages: number;
}

interface TicketSummary {
  open: number;
  inProgress: number;
  resolved: number;
}

const supportChannels = [
  {
    id: 1,
    name: "Live Chat",
    description: "Get instant help from our support team",
    icon: MessageCircle,
    availability: "24/7",
    responseTime: "2-5 minutes",
    status: "online",
    color: "text-green-600",
  },
  {
    id: 2,
    name: "Email Support",
    description: "Send us a detailed message and we'll respond",
    icon: Mail,
    availability: "24/7",
    responseTime: "2-4 hours",
    status: "online",
    color: "text-blue-600",
  },
  {
    id: 3,
    name: "Phone Support",
    description: "Speak directly with our support team",
    icon: Phone,
    availability: "Mon-Fri 9AM-6PM EST",
    responseTime: "Immediate",
    status: "online",
    color: "text-purple-600",
  },
];

const supportCategories = [
  "Account Issues",
  "Payment Problems",
  "Technical Support",
  "Commission Questions",
  "Marketing Materials",
  "Program Terms",
  "Other",
];

const priorityLevels = [
  { value: "Low", label: "Low", description: "General questions" },
  {
    value: "Medium",
    label: "Medium",
    description: "Account or payment issues",
  },
  { value: "High", label: "High", description: "Urgent technical problems" },
  {
    value: "Critical",
    label: "Critical",
    description: "System outages or security issues",
  },
];

export default function ContactSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketSummary, setTicketSummary] = useState<TicketSummary | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null
  );

  const [formData, setFormData] = useState({
    subject: "",
    category: "",
    priority: "Medium",
    message: "",
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/support/tickets`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
        setTicketSummary(data.summary || null);
      } else {
        console.error("Failed to fetch tickets:", response.status);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTickets();
    setIsRefreshing(false);
    toast.success("Tickets refreshed");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject || !formData.category || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${config.apiUrl}/support/tickets`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || "Ticket created successfully");
        setFormData({
          subject: "",
          category: "",
          priority: "Medium",
          message: "",
        });
        fetchTickets(); // Refresh tickets list
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create ticket");
      }
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error("Failed to create support ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      Open: "default",
      "In Progress": "secondary",
      Resolved: "outline",
    } as const;

    const icons = {
      Open: Clock,
      "In Progress": AlertCircle,
      Resolved: CheckCircle,
    };

    const Icon = icons[status as keyof typeof icons];

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {Icon && <Icon className="w-3 h-3 mr-1" />}
        {status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      Low: "bg-gray-100 text-gray-800",
      Medium: "bg-blue-100 text-blue-800",
      High: "bg-orange-100 text-orange-800",
      Critical: "bg-red-100 text-red-800",
    };

    return (
      <Badge className={colors[priority as keyof typeof colors]}>
        {priority}
      </Badge>
    );
  };

  const handleViewTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setShowTicketDialog(true);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Contact Support</h1>
          <p className="text-muted-foreground">
            Get help from our support team
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

      {/* Ticket Summary */}
      {ticketSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Open Tickets
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ticketSummary.open}</div>
              <p className="text-xs text-muted-foreground">Awaiting response</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {ticketSummary.inProgress}
              </div>
              <p className="text-xs text-muted-foreground">Being handled</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ticketSummary.resolved}</div>
              <p className="text-xs text-muted-foreground">
                Successfully closed
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create Ticket</TabsTrigger>
          <TabsTrigger value="myTickets">My Tickets</TabsTrigger>
        </TabsList>

        {/* Create Ticket Tab */}
        <TabsContent value="create" className="space-y-6">
          {/* Support Channels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {supportChannels.map((channel) => (
              <Card
                key={channel.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center`}
                    >
                      <channel.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{channel.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {channel.description}
                      </p>
                      <div className="flex flex-col space-y-1 text-xs">
                        <div className="flex items-center justify-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{channel.availability}</span>
                        </div>
                        <div className="text-muted-foreground">
                          Response: {channel.responseTime}
                        </div>
                      </div>
                    </div>
                    <Badge
                      className={
                        channel.status === "online"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }
                    >
                      {channel.status === "online" ? "Online" : "Offline"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>Submit a Support Ticket</CardTitle>
              <CardDescription>
                Fill out the form below and we'll get back to you soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      placeholder="Brief description of your issue"
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData({ ...formData, subject: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {supportCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority Level *</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <div>
                            <div className="font-medium">{level.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {level.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    placeholder="Describe your issue in detail..."
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    rows={6}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full md:w-auto"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Submitting..." : "Submit Ticket"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Tickets Tab */}
        <TabsContent value="myTickets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Support Tickets</CardTitle>
              <CardDescription>
                View and manage your support tickets
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <SectionLoading message="Loading tickets..." size="lg" />
              ) : tickets.length === 0 ? (
                <div className="text-center py-8">
                  <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Tickets Found
                  </h3>
                  <p className="text-muted-foreground">
                    You haven't created any support tickets yet
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold">{ticket.subject}</h3>
                            {getStatusBadge(ticket.status)}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{ticket.category}</Badge>
                            {getPriorityBadge(ticket.priority)}
                            <Badge variant="outline">
                              {ticket.messages} messages
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewTicket(ticket)}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>

                      <div className="flex items-center justify-between text-sm text-muted-foreground pt-3 border-t">
                        <div>
                          Created:{" "}
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </div>
                        <div>Last response: {ticket.lastResponse}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedTicket ? selectedTicket.subject : "Ticket details"}
            </DialogTitle>
            <DialogDescription>
              Review full information about your support ticket.
            </DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {getStatusBadge(selectedTicket.status)}
                {getPriorityBadge(selectedTicket.priority)}
                <Badge variant="outline">{selectedTicket.category}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">
                    Ticket ID
                  </span>
                  <p>{selectedTicket.id}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">
                    Messages
                  </span>
                  <p>{selectedTicket.messages}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">
                    Created
                  </span>
                  <p>{new Date(selectedTicket.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">
                    Updated
                  </span>
                  <p>{new Date(selectedTicket.updatedAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="rounded-md border p-3 bg-muted/50 text-sm">
                <span className="font-medium text-muted-foreground">
                  Last response
                </span>
                <p className="mt-1">{selectedTicket.lastResponse}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTicketDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
