"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, ArrowLeft, CheckCircle, Loader2, CreditCard, Lock } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { DashboardLoading } from "@/components/ui/loading";
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";

// PayPal Button Wrapper
function PayPalButtonWrapper({
  amount,
  currency,
  onSuccess,
  onError,
  isProcessing,
  orderData,
  setIsProcessing,
}: {
  amount: number;
  currency: string;
  onSuccess: () => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  orderData: any;
  setIsProcessing: (value: boolean) => void;
}) {
  const [{ isPending }] = usePayPalScriptReducer();

  const createOrder = useCallback(async () => {
    try {
      const response = await apiClient.post("/payment/create-paypal-order", orderData);
      // Store affiliate info in orderData for capture
      orderData.affiliateId = response.data.affiliateId;
      return response.data.orderId;
    } catch (error: any) {
      console.error("Error creating PayPal order:", error);
      onError(error.response?.data?.error || "Failed to create PayPal order");
      throw error;
    }
  }, [orderData, onError]);

  const onApprove = useCallback(async (data: any) => {
    try {
      setIsProcessing(true);
      
      // Get affiliate ID from the create response - we need to fetch it
      // For now, we'll get it from user context or pass it in orderData
      const captureResponse = await apiClient.post("/payment/capture-paypal-order", {
        orderId: data.orderID,
        affiliateId: orderData.affiliateId, // Should be set from create response
        storeId: orderData.storeId,
        email: orderData.email,
        lineItems: orderData.lineItems.map((item: any) => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
        })),
        shippingAddress: orderData.shippingAddress,
        note: orderData.note,
        discountCode: orderData.discountCode,
      });

      if (captureResponse.data.success) {
        onSuccess();
      } else {
        throw new Error(captureResponse.data.error || "Failed to process payment");
      }
    } catch (error: any) {
      console.error("Error capturing PayPal payment:", error);
      onError(error.response?.data?.error || "Payment processing failed");
      setIsProcessing(false);
    }
  }, [orderData, onSuccess, onError, setIsProcessing]);

  const onErrorHandler = useCallback((err: any) => {
    console.error("PayPal error:", err);
    onError(err.message || "Payment error occurred");
    setIsProcessing(false);
  }, [onError, setIsProcessing]);

  if (isPending) {
    return (
      <div className="py-8 text-center">
        <Loader2 className="h-8 w-8 mx-auto animate-spin text-orange-500 mb-4" />
        <p className="text-gray-600">Loading PayPal...</p>
      </div>
    );
  }

  return (
    <PayPalButtons
      createOrder={createOrder}
      onApprove={onApprove}
      onError={onErrorHandler}
      disabled={isProcessing}
      style={{
        layout: "vertical",
        color: "gold",
        shape: "rect",
        label: "paypal",
      }}
    />
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, getCartTotal, getCartCount, currency, storeName, storeId, clearCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [discountCodes, setDiscountCodes] = useState<string[]>([]);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [paypalClientId, setPaypalClientId] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    zip: "",
    country: "",
    phone: "",
    notes: "",
  });

  // Step state
  const [step, setStep] = useState<"shipping" | "payment">("shipping");
  const [orderDataForPayPal, setOrderDataForPayPal] = useState<any>(null);
  const [affiliateId, setAffiliateId] = useState<string>("");

  useEffect(() => {
    // Check for PayPal redirect
    const success = searchParams?.get("success");
    const canceled = searchParams?.get("canceled");

    if (success && orderDataForPayPal) {
      // Payment was successful, handle it
      handlePaymentSuccess();
    } else if (canceled) {
      toast.error("Payment was canceled");
      setStep("payment");
    }

    // Redirect if cart is empty
    if (items.length === 0 && !orderSuccess) {
      router.push("/dashboard/shop");
      return;
    }

    initializeCheckout();
  }, []);

  const initializeCheckout = async () => {
    try {
      // Fetch PayPal config
      const configResponse = await apiClient.get("/payment/config");
      if (configResponse.data.clientId) {
        setPaypalClientId(configResponse.data.clientId);
      }

      // Fetch discount codes
      const couponsResponse = await apiClient.get("/athlete/coupons");
      const codes = couponsResponse.data.coupons?.map((c: any) => c.code) || [];
      setDiscountCodes(codes);
    } catch (error) {
      console.error("Error initializing checkout:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = () => {
    const required = ["email", "firstName", "lastName", "address1", "city", "province", "zip", "country", "phone"];
    for (const field of required) {
      if (!formData[field as keyof typeof formData]) {
        toast.error(`Please fill in ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`);
        return false;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return false;
    }

    return true;
  };

  const proceedToPayment = async () => {
    if (!validateForm()) return;
    if (!storeId) {
      toast.error("Store information is missing");
      return;
    }

    // Prepare order data for PayPal
    const orderData = {
      storeId,
      email: formData.email,
      lineItems: items.map((item) => ({
        variant_id: item.variantId,
        quantity: item.quantity,
        price: item.price,
        title: item.title,
      })),
      shippingAddress: {
        first_name: formData.firstName,
        last_name: formData.lastName,
        address1: formData.address1,
        address2: formData.address2,
        city: formData.city,
        province: formData.province,
        zip: formData.zip,
        country: formData.country,
        phone: formData.phone,
      },
      note: formData.notes,
      discountCode: discountCodes[0],
      currency,
    };

    setOrderDataForPayPal(orderData);
    setStep("payment");
  };

  const handlePaymentSuccess = async () => {
    // This will be called after PayPal payment is captured
    try {
      const response = await apiClient.get(`/dashboard/orders?recent=1`);
      const recentOrder = response.data.orders?.[0];
      
      if (recentOrder) {
        setOrderSuccess(true);
        setOrderNumber(recentOrder.orderNumber || recentOrder.id);
        clearCart();
        toast.success("Order placed successfully!");
      } else {
        // Fallback: try to get order from orderData
        setOrderSuccess(true);
        setOrderNumber("Pending");
        clearCart();
        toast.success("Payment successful! Order is being processed.");
      }
    } catch (error: any) {
      console.error("Error confirming order:", error);
      toast.success("Payment successful! Your order is being processed.");
      setOrderSuccess(true);
      clearCart();
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentError = (error: string) => {
    toast.error(error);
    setIsProcessing(false);
  };

  const getCurrencySymbol = (curr: string) => {
    const symbols: Record<string, string> = {
      USD: "$",
      CAD: "CA$",
      EUR: "€",
      GBP: "£",
    };
    return symbols[curr] || curr;
  };

  if (orderSuccess) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <Card className="bg-white border-green-200">
          <CardContent className="p-12 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600 mb-6">
              Your order has been placed and paid for.
            </p>
            {orderNumber && (
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-1">Order Number</p>
                <p className="text-xl font-mono font-semibold text-gray-900">{orderNumber}</p>
              </div>
            )}
            <p className="text-sm text-gray-500 mb-8">
              You'll receive an email confirmation shortly at {formData.email}
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => router.push("/dashboard/orders")}
                className="bg-orange-600 hover:bg-orange-700"
              >
                View Orders
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/shop")}
              >
                Continue Shopping
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || items.length === 0) {
    return <DashboardLoading message="Loading checkout..." />;
  }

  const cartTotal = getCartTotal();
  const cartCount = getCartCount();

  return (
    <PayPalScriptProvider
      options={{
        clientId: paypalClientId,
        currency: currency.toUpperCase(),
        intent: "capture",
      }}
    >
      <div className="p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => step === "payment" ? setStep("shipping") : router.push("/dashboard/shop")}
            className="mb-4 text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === "payment" ? "Back to Shipping" : "Back to Shop"}
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {step === "shipping" ? "Checkout" : "Payment"}
          </h1>
          <p className="text-gray-600">
            {step === "shipping"
              ? `Complete your order from ${storeName}`
              : "Complete your payment with PayPal"}
          </p>

          {/* Progress Steps */}
          <div className="flex items-center gap-4 mt-4">
            <div className={`flex items-center gap-2 ${step === "shipping" ? "text-orange-600" : "text-green-600"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "shipping" ? "bg-orange-600 text-white" : "bg-green-600 text-white"}`}>
                {step === "payment" ? <CheckCircle className="h-5 w-5" /> : "1"}
              </div>
              <span className="font-medium">Shipping</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200">
              <div className={`h-full bg-orange-600 transition-all ${step === "payment" ? "w-full" : "w-0"}`} />
            </div>
            <div className={`flex items-center gap-2 ${step === "payment" ? "text-orange-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "payment" ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                2
              </div>
              <span className="font-medium">Payment</span>
            </div>
          </div>

          {discountCodes.length > 0 && (
            <div className="mt-4">
              <Badge className="bg-green-500/20 text-green-600 border-green-500">
                Your discount code {discountCodes[0]} will be applied
              </Badge>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            {step === "shipping" ? (
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle>Shipping Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Contact Information */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900">Contact</h3>
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="john.doe@example.com"
                          required
                        />
                      </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900">Shipping Address</h3>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name *</Label>
                          <Input
                            id="lastName"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="address1">Address Line 1 *</Label>
                        <Input
                          id="address1"
                          name="address1"
                          value={formData.address1}
                          onChange={handleInputChange}
                          placeholder="Street address"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="address2">Address Line 2</Label>
                        <Input
                          id="address2"
                          name="address2"
                          value={formData.address2}
                          onChange={handleInputChange}
                          placeholder="Apartment, suite, etc. (optional)"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="province">Province/State *</Label>
                          <Input
                            id="province"
                            name="province"
                            value={formData.province}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="zip">Postal/Zip Code *</Label>
                          <Input
                            id="zip"
                            name="zip"
                            value={formData.zip}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="country">Country *</Label>
                          <Input
                            id="country"
                            name="country"
                            value={formData.country}
                            onChange={handleInputChange}
                            placeholder="e.g., Canada, USA"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="+1 (555) 123-4567"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="notes">Order Notes (Optional)</Label>
                        <textarea
                          id="notes"
                          name="notes"
                          value={formData.notes}
                          onChange={handleInputChange}
                          className="w-full min-h-[80px] px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="Any special instructions?"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={proceedToPayment}
                      disabled={isProcessing}
                      className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-lg"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-5 w-5 mr-2" />
                          Continue to Payment
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment with PayPal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {orderDataForPayPal && paypalClientId ? (
                    <div className="space-y-4">
                      <PayPalButtonWrapper
                        amount={cartTotal}
                        currency={currency}
                        onSuccess={handlePaymentSuccess}
                        onError={handlePaymentError}
                        isProcessing={isProcessing}
                        orderData={orderDataForPayPal}
                        setIsProcessing={setIsProcessing}
                      />
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <Lock className="h-4 w-4" />
                        <span>Secured by PayPal. Your payment info is encrypted.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <Loader2 className="h-8 w-8 mx-auto animate-spin text-orange-500 mb-4" />
                      <p className="text-gray-600">Loading payment form...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="bg-white border-gray-200 sticky top-6">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.variantId}`} className="flex gap-3">
                      {item.image && (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.title}</p>
                        {item.variantTitle && item.variantTitle !== "Default Title" && (
                          <p className="text-xs text-gray-500">{item.variantTitle}</p>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {getCurrencySymbol(currency)}{(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal ({cartCount} items)</span>
                    <span className="font-semibold text-gray-900">
                      {getCurrencySymbol(currency)}{cartTotal.toFixed(2)}
                    </span>
                  </div>
                  {discountCodes.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount ({discountCodes[0]})</span>
                      <span className="text-green-600">Applied at checkout</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span className="text-gray-600">Calculated at checkout</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Taxes</span>
                    <span className="text-gray-600">Calculated at checkout</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold text-gray-900">Estimated Total</span>
                    <span className="font-bold text-orange-600 text-lg">
                      {getCurrencySymbol(currency)}{cartTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {step === "payment" && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <h4 className="font-medium text-gray-900 text-sm">Shipping To:</h4>
                    <p className="text-sm text-gray-600">
                      {formData.firstName} {formData.lastName}<br />
                      {formData.address1}<br />
                      {formData.address2 && <>{formData.address2}<br /></>}
                      {formData.city}, {formData.province} {formData.zip}<br />
                      {formData.country}
                    </p>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-4">
                  By placing your order, you agree to TC Nutrition's terms and conditions.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PayPalScriptProvider>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<DashboardLoading message="Loading checkout..." />}>
      <CheckoutContent />
    </Suspense>
  );
}
