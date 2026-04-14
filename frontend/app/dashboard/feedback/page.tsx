"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { config } from "@/config/config";
import { getAuthHeaders } from "@/lib/getAuthHeaders";

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const uploadPhoto = async () => {
    if (!photoFile) return null;
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", photoFile);
      const response = await fetch(`${config.apiUrl}/upload/deliverable`, {
        method: "POST",
        headers: getAuthHeaders({ contentType: null }),
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Failed to upload feedback photo");
      }
      const data = await response.json();
      return data.url as string;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const photoUrl = await uploadPhoto();
      await apiClient.post("/athlete/feedback", { 
        feedback,
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        photoUrl: photoUrl || undefined,
      });
      toast.success("Feedback submitted successfully!");
      setFeedback("");
      setName("");
      setEmail("");
      setPhotoFile(null);
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 pt-8 sm:pt-12 flex items-center justify-center w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-2xl px-2 sm:px-0">
        <div className="mb-6 sm:mb-8 text-left">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            General Feedback
          </h1>
          <p className="text-base text-gray-600 leading-relaxed">
            This form is for general feedback and can be submitted anonymously or with your details. For any additional concerns, please contact your Athlete Manager.
          </p>
        </div>

        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-gray-900">Share Your Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700">
                    Name <span className="text-gray-500 text-sm">(Optional)</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">
                    Email <span className="text-gray-500 text-sm">(Optional)</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback" className="text-gray-700">
                  Feedback
                </Label>
                <Textarea
                  id="feedback"
                  placeholder="Type your feedback here..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="min-h-[200px] bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 text-base"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="photo" className="text-gray-700">
                  Photo <span className="text-gray-500 text-sm">(Optional)</span>
                </Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting || isUploadingPhoto || !feedback.trim()}
                className="w-full bg-gray-900 text-white hover:bg-gray-800 text-base font-medium py-6"
              >
                {isSubmitting || isUploadingPhoto ? "Submitting..." : "Submit Feedback"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

