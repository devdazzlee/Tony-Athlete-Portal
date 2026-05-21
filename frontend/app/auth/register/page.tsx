"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StandardPageLoading } from "@/components/ui/loading";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, ArrowLeft, Check, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getPostAuthRedirectPath } from "@/lib/affiliate-status";
import { toast } from "sonner";

function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registrationEmail, setRegistrationEmail] = useState("");

  const { register, isAuthenticated, user } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Role-based redirects after registration
      router.push(getPostAuthRedirectPath(user));
    }
  }, [isAuthenticated, user, router]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      setError("First name is required");
      return false;
    }
    if (!formData.lastName.trim()) {
      setError("Last name is required");
      return false;
    }
    if (!formData.email.trim()) {
      setError("Email is required");
      return false;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (!agreedToTerms) {
      setError("You must agree to the terms and conditions");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: "AFFILIATE",
      });
      
      // Show success message instead of logging in
      setRegistrationSuccess(true);
      setRegistrationEmail(formData.email);
      toast.success("Application submitted! We'll email you once your account is approved.");
    } catch (error: any) {
      setError(error.message || "Registration failed. Please try again.");
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Back Button */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </div>

        {/* Registration Card */}
        <Card className="shadow-xl border-0 bg-white border-gray-200">
          {registrationSuccess ? (
            <>
              <CardHeader className="space-y-2 text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Application Submitted
                </CardTitle>
                <CardDescription className="text-gray-600">
                  We&apos;ve sent a confirmation to{" "}
                  <strong className="text-gray-900">{registrationEmail}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">
                    <strong>What happens next:</strong>
                  </p>
                  <ol className="mt-2 text-sm text-blue-600 list-decimal list-inside space-y-1">
                    <li>Our team reviews your application</li>
                    <li>You&apos;ll receive an email when you&apos;re approved</li>
                    <li>Log in to complete your setup and start earning</li>
                  </ol>
                </div>
                
                <p className="text-xs text-center text-gray-600">
                  Didn&apos;t receive the email? Check your spam folder.
                </p>
                
                <Button
                  onClick={() => router.push("/auth/login")}
                  className="w-full font-medium shadow-md transition-all duration-200 bg-black hover:bg-gray-900 text-white"
                >
                  Go to Login
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-2 text-center">
                <div className="mx-auto mb-4">
                  <Image 
                    src="/logo.png" 
                    alt="TC Nutrition" 
                    width={200} 
                    height={60}
                    className="h-auto w-[200px] max-h-12 object-contain"
                    priority
                  />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Join Our Affiliate Program
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Start earning commissions by promoting our products
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-600">{error}</span>
                  </div>
                )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-gray-700">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) =>
                      handleInputChange("firstName", e.target.value)
                    }
                    required
                    className="h-11 !bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-gray-700">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={(e) =>
                      handleInputChange("lastName", e.target.value)
                    }
                    required
                    className="h-11 !bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                    className="h-11 !bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    required
                    className="h-11 pr-10 !bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-11 px-3 py-2 hover:bg-transparent text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                    required
                    className="h-11 pr-10 !bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-11 px-3 py-2 hover:bg-transparent text-gray-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) =>
                    setAgreedToTerms(checked as boolean)
                  }
                  className="mt-1"
                />
                <Label
                  htmlFor="terms"
                  className="text-sm text-gray-600 leading-relaxed"
                >
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-medium shadow-md transition-all duration-200 disabled:opacity-50 bg-black hover:bg-gray-900 text-white"
                disabled={isLoading || !agreedToTerms}
              >
                {isLoading ? "Creating Account..." : "Create Affiliate Account"}
              </Button>
            </form>

            <Separator className="my-6 bg-gray-200" />

            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  href="/auth/login"
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={<StandardPageLoading message="Loading registration page..." showBackground={true} />}
    >
      <RegisterForm />
    </Suspense>
  );
}
