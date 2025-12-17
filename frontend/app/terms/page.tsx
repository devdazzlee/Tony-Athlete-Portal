"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/">
          <Button
            variant="ghost"
            className="mb-6 text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Terms of Service
          </h1>
          <p className="text-sm text-gray-600 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-700 mb-4">
                By accessing and using the TC Nutrition Athlete Portal, you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. Use License
              </h2>
              <p className="text-gray-700 mb-4">
                Permission is granted to temporarily access the materials on TC Nutrition Athlete Portal for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to reverse engineer any software contained on the portal</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. Affiliate Program Terms
              </h2>
              <p className="text-gray-700 mb-4">
                As an affiliate, you agree to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Promote TC Nutrition products in an honest and ethical manner</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Not engage in any fraudulent or deceptive practices</li>
                <li>Maintain the confidentiality of your account credentials</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. Commission and Payouts
              </h2>
              <p className="text-gray-700 mb-4">
                Commissions are calculated based on completed sales and are subject to our commission structure. Payouts are processed according to our payment schedule. Returns and refunds may affect commission calculations.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. Account Termination
              </h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to terminate or suspend your account at any time for violation of these terms or for any other reason we deem necessary.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                6. Limitation of Liability
              </h2>
              <p className="text-gray-700 mb-4">
                In no event shall TC Nutrition or its suppliers be liable for any damages arising out of the use or inability to use the materials on the portal.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                7. Contact Information
              </h2>
              <p className="text-gray-700">
                If you have any questions about these Terms of Service, please contact us through the support portal.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

