import express, { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import shopifyService from "../services/ShopifyService";

const router: Router = express.Router();
const prisma = new PrismaClient();

// PayPal API configuration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";
const PAYPAL_BASE_URL = process.env.PAYPAL_MODE === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

// PayPal API Response Types
interface PayPalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayPalOrderResponse {
  id: string;
  status: string;
  purchase_units: Array<{
    payments?: {
      captures: Array<{
        id: string;
        status: string;
        amount: {
          value: string;
          currency_code: string;
        };
      }>;
    };
  }>;
}

// Get PayPal access token
async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error("Failed to get PayPal access token");
  }

  const data = await response.json() as PayPalTokenResponse;
  return data.access_token;
}

// All routes require authentication
router.use(authenticateToken);

// Create PayPal order
router.post("/create-paypal-order", async (req: any, res) => {
  try {
    const userId = req.user.id;

    const schema = z.object({
      storeId: z.string(),
      lineItems: z.array(z.object({
        variant_id: z.number(),
        quantity: z.number().positive(),
        price: z.number().positive(),
        title: z.string(),
      })),
      currency: z.string().default("USD"),
      discountCode: z.string().optional(),
      shippingAddress: z.object({
        first_name: z.string(),
        last_name: z.string(),
        address1: z.string(),
        address2: z.string().optional(),
        city: z.string(),
        province: z.string(),
        zip: z.string(),
        country: z.string(),
        phone: z.string(),
      }),
      email: z.string().email(),
    });

    const data = schema.parse(req.body);

    // Get affiliate profile
    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    // Get store config
    const store = shopifyService.getStore(data.storeId);
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    // Calculate subtotal
    let subtotal = data.lineItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Apply discount if provided
    let discountAmount = 0;
    if (data.discountCode) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: data.discountCode,
          status: "ACTIVE",
        },
      });

      if (coupon && coupon.discount) {
        const discountPercent = parseFloat(coupon.discount) || 0;
        discountAmount = (subtotal * discountPercent) / 100;
        subtotal -= discountAmount;
      }
    }

    // Map currency code (PayPal uses uppercase)
    const currencyCode = data.currency.toUpperCase();

    // Prepare PayPal order payload
    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          description: `Order from ${store.name} - ${data.lineItems.length} item(s)`,
          amount: {
            currency_code: currencyCode,
            value: subtotal.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: currencyCode,
                value: (subtotal + discountAmount).toFixed(2),
              },
              discount: discountAmount > 0
                ? {
                    currency_code: currencyCode,
                    value: discountAmount.toFixed(2),
                  }
                : undefined,
            },
          },
          items: data.lineItems.map((item) => ({
            name: item.title,
            quantity: item.quantity.toString(),
            unit_amount: {
              currency_code: currencyCode,
              value: item.price.toFixed(2),
            },
          })),
          shipping: {
            name: {
              full_name: `${data.shippingAddress.first_name} ${data.shippingAddress.last_name}`,
            },
            address: {
              address_line_1: data.shippingAddress.address1,
              address_line_2: data.shippingAddress.address2 || undefined,
              admin_area_2: data.shippingAddress.city,
              admin_area_1: data.shippingAddress.province,
              postal_code: data.shippingAddress.zip,
              country_code: data.shippingAddress.country.length === 2 
                ? data.shippingAddress.country 
                : data.shippingAddress.country.substring(0, 2).toUpperCase(),
            },
          },
        },
      ],
      application_context: {
        brand_name: "TC Nutrition",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        return_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/checkout?success=true`,
        cancel_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/checkout?canceled=true`,
      },
      payer: {
        email_address: data.email,
        name: {
          given_name: data.shippingAddress.first_name,
          surname: data.shippingAddress.last_name,
        },
      },
    };

    // Remove undefined discount from breakdown
    if (!orderPayload.purchase_units[0].amount.breakdown.discount) {
      delete orderPayload.purchase_units[0].amount.breakdown.discount;
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Create PayPal order
    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("PayPal API error:", errorData);
      throw new Error(`Failed to create PayPal order: ${response.status}`);
    }

    const orderData = await response.json() as PayPalOrderResponse;

    // Store order details temporarily (you might want to use Redis or DB for this)
    // For now, we'll include affiliate info in metadata
    res.json({
      orderId: orderData.id,
      orderData: orderData,
      affiliateId: affiliate.id,
      storeId: data.storeId,
      lineItems: data.lineItems,
      shippingAddress: data.shippingAddress,
      email: data.email,
      discountCode: data.discountCode,
      subtotal: subtotal,
      discountAmount: discountAmount,
      currency: currencyCode,
    });
  } catch (error: any) {
    console.error("Error creating PayPal order:", error);
    res.status(500).json({
      error: "Failed to create PayPal order",
      details: error.message,
    });
  }
});

// Capture PayPal payment and create order
router.post("/capture-paypal-order", async (req: any, res) => {
  try {
    const userId = req.user.id;

    const schema = z.object({
      orderId: z.string(),
      affiliateId: z.string(),
      storeId: z.string(),
      email: z.string().email(),
      lineItems: z.array(z.object({
        variant_id: z.number(),
        quantity: z.number().positive(),
      })),
      shippingAddress: z.object({
        first_name: z.string(),
        last_name: z.string(),
        address1: z.string(),
        address2: z.string().optional(),
        city: z.string(),
        province: z.string(),
        zip: z.string(),
        country: z.string(),
        phone: z.string(),
      }),
      note: z.string().optional(),
      discountCode: z.string().optional(),
    });

    const data = schema.parse(req.body);

    // Get affiliate profile
    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId, id: data.affiliateId },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Capture the PayPal order
    const captureResponse = await fetch(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${data.orderId}/capture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!captureResponse.ok) {
      const errorData = await captureResponse.json();
      console.error("PayPal capture error:", errorData);
      throw new Error(`Failed to capture PayPal payment: ${captureResponse.status}`);
    }

    const captureData = await captureResponse.json() as PayPalOrderResponse;

    // Verify payment status
    if (captureData.status !== "COMPLETED") {
      return res.status(400).json({
        error: "Payment not completed",
        status: captureData.status,
      });
    }

    // Get payment amount from capture data
    const capture = captureData.purchase_units[0]?.payments?.captures?.[0];
    if (!capture?.amount?.value) {
      throw new Error("Invalid PayPal capture response structure");
    }
    
    const paymentAmount = parseFloat(capture.amount.value);
    const paypalTransactionId = capture.id;

    // Get store config
    const store = shopifyService.getStore(data.storeId);
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    // Prepare order data for Shopify
    const orderData: any = {
      email: data.email,
      line_items: data.lineItems,
      shipping_address: data.shippingAddress,
      billing_address: data.shippingAddress,
      financial_status: "paid", // Mark as paid since PayPal captured payment
      send_receipt: true,
      send_fulfillment_receipt: true,
      note:
        data.note ||
        `Order placed by affiliate: ${affiliate.id}. PayPal Transaction: ${paypalTransactionId}`,
      tags: `affiliate,${affiliate.id},paypal-payment`,
      transactions: [
        {
          kind: "sale",
          status: "success",
          amount: paymentAmount.toFixed(2),
          gateway: "paypal",
        },
      ],
    };

    // Add discount code if provided
    if (data.discountCode) {
      orderData.discount_codes = [
        { code: data.discountCode, amount: "0.00", type: "percentage" },
      ];
    }

    // Create order via Shopify API
    const shopifyOrder = await shopifyService.createOrder(data.storeId, orderData);

    if (!shopifyOrder || !shopifyOrder.id) {
      // Refund the payment if order creation fails
      const refundResponse = await fetch(
        `${PAYPAL_BASE_URL}/v2/payments/captures/${paypalTransactionId}/refund`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (refundResponse.ok) {
        throw new Error(
          "Failed to create order in Shopify - PayPal payment refunded"
        );
      } else {
        throw new Error(
          "Failed to create order in Shopify - Please contact support for refund"
        );
      }
    }

    // Calculate commission
    const commissionRate = affiliate.commissionRate || 10;
    const commissionAmount = (paymentAmount * commissionRate) / 100;

    // Create order record in database
    const affiliateOrder = await prisma.affiliateOrder.create({
      data: {
        affiliateId: affiliate.id,
        referralCode: data.discountCode || "DIRECT_ORDER",
        storeId: data.storeId,
        orderId: `shopify-${shopifyOrder.id}`,
        shopifyOrderId: shopifyOrder.id.toString(),
        shopifyOrderNumber: shopifyOrder.name || `#${shopifyOrder.order_number}`,
        orderValue: paymentAmount,
        subtotalPrice: parseFloat(shopifyOrder.subtotal_price || "0"),
        totalTax: parseFloat(shopifyOrder.total_tax || "0"),
        currency: store.currency,
        customerEmail: data.email,
        customerName: `${data.shippingAddress.first_name} ${data.shippingAddress.last_name}`,
        commissionAmount,
        commissionRate,
        status: "APPROVED", // Auto-approve since payment is confirmed
        financialStatus: "paid",
        fulfillmentStatus: shopifyOrder.fulfillment_status,
        items: shopifyOrder.line_items || [],
        shippingAddress: data.shippingAddress,
        discountCodes: shopifyOrder.discount_codes || [],
        note: `PayPal Transaction: ${paypalTransactionId}`,
        orderCreatedAt: shopifyOrder.created_at
          ? new Date(shopifyOrder.created_at)
          : new Date(),
      },
    });

    // Update affiliate stats
    await prisma.affiliateProfile.update({
      where: { id: affiliate.id },
      data: {
        totalConversions: { increment: 1 },
        totalEarnings: { increment: commissionAmount },
      },
    });

    res.json({
      success: true,
      message: "Order created successfully",
      orderId: affiliateOrder.id,
      orderNumber: shopifyOrder.name || `#${shopifyOrder.order_number}`,
      shopifyOrderId: shopifyOrder.id,
      commissionAmount,
      paymentStatus: "paid",
      paypalTransactionId,
    });
  } catch (error: any) {
    console.error("Error capturing PayPal order:", error);
    res.status(500).json({
      error: "Failed to process order",
      details: error.message,
    });
  }
});

// Get PayPal client ID for frontend
router.get("/config", async (req: any, res) => {
  res.json({
    clientId: PAYPAL_CLIENT_ID,
    mode: process.env.PAYPAL_MODE || "sandbox",
  });
});

export default router;
