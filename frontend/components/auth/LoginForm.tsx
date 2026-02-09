"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Eye,
  EyeOff,
  AlertCircle,
  Mail,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { StandardPageLoading } from "@/components/ui/loading";

interface LoginFormProps {
  showBackButton?: boolean;
  showFooter?: boolean;
  showSeparator?: boolean;
  onSuccess?: () => void;
  verified?: string | null;
}

export function LoginForm({
  showBackButton = false,
  showFooter = true,
  showSeparator = true,
  onSuccess,
  verified = null,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  const { login, isAuthenticated, user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  // Show success message if email was verified
  useEffect(() => {
    if (verified === "true") {
      toast.success("Email verified successfully! You can now log in.");
    }
  }, [verified]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Role-based redirects after login
      if (user.role === "ADMIN") {
        router.push("/admin");
      } else if (user.role === "MANAGER") {
        router.push("/manager");
      } else {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await login(email, password, rememberMe);
      toast.success("Login successful! Welcome back.");
      setIsRedirecting(true);
      
      if (onSuccess) {
        onSuccess();
      } else {
        // Default redirect behavior
        if (response.user?.role === "ADMIN") router.replace("/admin");
        else if (response.user?.role === "MANAGER") router.replace("/manager");
        else router.replace("/dashboard");
      }
    } catch (error: any) {
      setError(error.message || "Login failed. Please try again.");
      toast.error(error.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isRedirecting) {
    return <StandardPageLoading message="Signing you in..." showBackground={true} />;
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Back Button - Optional */}
          {showBackButton && (
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </div>
      )}

      {/* Login Card */}
      <Card className="shadow-xl border-0 bg-white border-gray-200">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto mb-4">
            <Image 
              src="/logo.png" 
              alt="TC Nutrition" 
              width={200} 
              height={60}
              className="h-auto w-auto max-w-[200px]"
              priority
            />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Login</CardTitle>
          <CardDescription className="text-gray-600">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
              {error.toLowerCase().includes("verify") && (
                <Link
                  href="/auth/resend-verification"
                  className="text-sm text-blue-600 hover:underline flex items-center mt-2"
                >
                  <Mail className="h-3 w-3 mr-1" />
                  Resend verification email
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white"
                  disabled={isLoading}
                />
                <Label htmlFor="remember" className="text-sm text-gray-600">
                  Remember me
                </Label>
              </div>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className={`w-full h-11 font-medium shadow-md transition-all duration-200 disabled:opacity-50 ${
                theme === "dark"
                  ? "bg-white hover:bg-gray-100 text-black"
                  : "bg-black hover:bg-gray-900 text-white"
              }`}
              disabled={isLoading || !email || !password}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {showSeparator && <Separator className="my-6 bg-gray-200" />}

          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                href="/auth/register"
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer - Optional */}
      {showFooter && (
        <div className="text-center text-xs text-gray-600">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="text-blue-600 hover:text-blue-700">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-blue-600 hover:text-blue-700">
            Privacy Policy
          </Link>
        </div>
      )}
    </div>
  );
}

