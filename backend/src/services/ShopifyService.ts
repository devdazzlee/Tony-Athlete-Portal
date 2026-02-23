/**
 * ShopifyService - Core Shopify API Integration
 * 
 * This service handles all Shopify API interactions for multi-store setup.
 * Supports both TC Nutrition USA (tc-nutrition.com) and Canada (ca.tc-nutrition.com)
 */

import crypto from 'crypto';
import config from '../config/config';

// Store configuration interface
export interface ShopifyStoreConfig {
  id: string;
  name: string;
  domain: string;
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  currency: string;
  country: string;
}

// Shopify Order interface
export interface ShopifyOrder {
  id: number;
  order_number: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  discount_codes: Array<{
    code: string;
    amount: string;
    type: string;
  }>;
  line_items: Array<{
    id: number;
    title: string;
    quantity: number;
    price: string;
    variant_title: string;
    sku: string;
    product_id: number;
  }>;
  shipping_address?: {
    first_name: string;
    last_name: string;
    address1: string;
    address2: string;
    city: string;
    province: string;
    country: string;
    zip: string;
  };
  billing_address?: {
    first_name: string;
    last_name: string;
    address1: string;
    address2: string;
    city: string;
    province: string;
    country: string;
    zip: string;
  };
  customer?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  shipping_lines?: Array<{
    id: number;
    title: string;
    price: string;
    code?: string;
  }>;
  total_shipping_price_set?: {
    shop_money?: {
      amount: string;
    };
  };
  current_subtotal_price?: string;
  current_subtotal_price_set?: {
    shop_money?: {
      amount: string;
    };
  };
  current_total_price?: string;
  current_total_tax?: string;
  total_duties?: string;
  total_tip_received?: string;
  note?: string;
  tags?: string;
  referring_site?: string;
}

// Shopify Price Rule interface (for discount codes)
export interface ShopifyPriceRule {
  id: number;
  title: string;
  value_type: 'percentage' | 'fixed_amount';
  value: string;
  customer_selection: string;
  target_type: string;
  target_selection: string;
  allocation_method: string;
  starts_at: string;
  ends_at: string | null;
  usage_limit: number | null;
  once_per_customer: boolean;
}

// Shopify Discount Code interface
export interface ShopifyDiscountCode {
  id: number;
  price_rule_id: number;
  code: string;
  usage_count: number;
  created_at: string;
}

// Store configurations - loaded from config (which reads from .env)
const STORE_CONFIGS: ShopifyStoreConfig[] = [
  {
    id: 'store-usa',
    name: 'TC Nutrition USA',
    domain: config.shopify.usa.domain,
    apiKey: config.shopify.usa.apiKey,
    apiSecret: config.shopify.usa.apiSecret,
    accessToken: config.shopify.usa.accessToken,
    currency: 'USD',
    country: 'US',
  },
  {
    id: 'store-canada',
    name: 'TC Nutrition Canada',
    domain: config.shopify.canada.domain,
    apiKey: config.shopify.canada.apiKey,
    apiSecret: config.shopify.canada.apiSecret,
    accessToken: config.shopify.canada.accessToken,
    currency: 'CAD',
    country: 'CA',
  },
];

class ShopifyService {
  private stores: Map<string, ShopifyStoreConfig>;
  private apiVersion: string = config.shopify.apiVersion;

  constructor() {
    this.stores = new Map();
    STORE_CONFIGS.forEach(store => {
      this.stores.set(store.id, store);
    });
  }

  private getCommissionableValue(order: ShopifyOrder): number {
    const subtotal = Number.parseFloat(order.subtotal_price);
    if (!Number.isNaN(subtotal)) return subtotal;
    const total = Number.parseFloat(order.total_price);
    return Number.isNaN(total) ? 0 : total;
  }

  /**
   * Get all configured stores
   */
  getAllStores(): ShopifyStoreConfig[] {
    return Array.from(this.stores.values());
  }

  /**
   * Get store by ID
   */
  getStore(storeId: string): ShopifyStoreConfig | undefined {
    return this.stores.get(storeId);
  }

  /**
   * Get store by domain
   */
  getStoreByDomain(domain: string): ShopifyStoreConfig | undefined {
    return Array.from(this.stores.values()).find(
      store => store.domain === domain || store.domain.includes(domain)
    );
  }

  /**
   * Make authenticated API request to Shopify
   */
  private async makeRequest<T>(
    storeId: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    const store = this.stores.get(storeId);
    if (!store) {
      throw new Error(`Store not found: ${storeId}`);
    }

    // Determine the myshopify domain from the custom domain
    const myshopifyDomain = this.getMyshopifyDomain(store.domain);
    const url = `https://${myshopifyDomain}/admin/api/${this.apiVersion}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': store.accessToken,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Shopify API Error [${store.name}]:`, response.status, errorText);
        throw new Error(`Shopify API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error(`Shopify API Request Failed [${store.name}]:`, error);
      throw error;
    }
  }

  /**
   * Make authenticated GraphQL API request to Shopify
   */
  private async makeGraphQLRequest<T = any>(
    storeId: string,
    query: string,
    variables?: Record<string, any>
  ): Promise<T> {
    const store = this.stores.get(storeId);
    if (!store) {
      throw new Error(`Store not found: ${storeId}`);
    }

    const myshopifyDomain = this.getMyshopifyDomain(store.domain);
    const url = `https://${myshopifyDomain}/admin/api/${this.apiVersion}/graphql.json`;

    const body: any = { query };
    if (variables) {
      body.variables = variables;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': store.accessToken,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Shopify GraphQL Error [${store.name}]:`, response.status, errorText);
        throw new Error(`Shopify GraphQL Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any;
      if (data.errors) {
        console.error(`Shopify GraphQL Errors [${store.name}]:`, JSON.stringify(data.errors));
        throw new Error(`Shopify GraphQL Error: ${JSON.stringify(data.errors)}`);
      }

      return data as T;
    } catch (error) {
      console.error(`Shopify GraphQL Request Failed [${store.name}]:`, error);
      throw error;
    }
  }

  /**
   * Update discount combination settings via GraphQL API
   * 
   * The REST Price Rules API does NOT support combines_with — only the GraphQL API does.
   * Call this AFTER creating the price rule + discount code via REST.
   */
  async updateDiscountCombinations(
    storeId: string,
    discountCode: string,
    combinesWith: {
      orderDiscounts?: boolean;
      productDiscounts?: boolean;
      shippingDiscounts?: boolean;
    }
  ): Promise<void> {
    try {
      // Step 1: Find the discount by code using GraphQL
      const findQuery = `
        query findDiscount($query: String!) {
          codeDiscountNodes(first: 1, query: $query) {
            nodes {
              id
              codeDiscount {
                ... on DiscountCodeBasic {
                  __typename
                }
                ... on DiscountCodeFreeShipping {
                  __typename
                }
              }
            }
          }
        }
      `;

      const findResult = await this.makeGraphQLRequest(storeId, findQuery, {
        query: `code:${discountCode}`,
      });

      const nodes = findResult?.data?.codeDiscountNodes?.nodes;
      if (!nodes || nodes.length === 0) {
        console.warn(`⚠️ Could not find discount "${discountCode}" via GraphQL for combination update`);
        return;
      }

      const node = nodes[0];
      const discountType = node.codeDiscount?.__typename;
      const discountId = node.id;

      const combinesWithInput = {
        orderDiscounts: combinesWith.orderDiscounts ?? false,
        productDiscounts: combinesWith.productDiscounts ?? false,
        shippingDiscounts: combinesWith.shippingDiscounts ?? false,
      };

      // Step 2: Update combination settings based on discount type
      if (discountType === 'DiscountCodeBasic') {
        const mutation = `
          mutation updateBasicDiscount($id: ID!, $discount: DiscountCodeBasicInput!) {
            discountCodeBasicUpdate(id: $id, basicCodeDiscount: $discount) {
              codeDiscountNode {
                id
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const result = await this.makeGraphQLRequest(storeId, mutation, {
          id: discountId,
          discount: { combinesWith: combinesWithInput },
        });

        const userErrors = result?.data?.discountCodeBasicUpdate?.userErrors;
        if (userErrors?.length > 0) {
          console.error(`❌ GraphQL userErrors updating "${discountCode}" combinations:`, userErrors);
        } else {
          console.log(`✅ Updated combinations for "${discountCode}" (basic discount)`);
        }
      } else if (discountType === 'DiscountCodeFreeShipping') {
        const mutation = `
          mutation updateFreeShippingDiscount($id: ID!, $discount: DiscountCodeFreeShippingInput!) {
            discountCodeFreeShippingUpdate(id: $id, freeShippingCodeDiscount: $discount) {
              codeDiscountNode {
                id
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const result = await this.makeGraphQLRequest(storeId, mutation, {
          id: discountId,
          discount: { combinesWith: combinesWithInput },
        });

        const userErrors = result?.data?.discountCodeFreeShippingUpdate?.userErrors;
        if (userErrors?.length > 0) {
          console.error(`❌ GraphQL userErrors updating "${discountCode}" combinations:`, userErrors);
        } else {
          console.log(`✅ Updated combinations for "${discountCode}" (free shipping discount)`);
        }
      } else {
        console.warn(`⚠️ Unknown discount type "${discountType}" for "${discountCode}", skipping combination update`);
      }
    } catch (error: any) {
      // Don't throw — combination update is best-effort, the discount was already created
      console.error(`⚠️ Failed to update combinations for "${discountCode}":`, error.message);
    }
  }

  /**
   * Convert custom domain to myshopify domain
   */
  private getMyshopifyDomain(domain: string): string {
    // Map custom domains to myshopify domains
    const domainMap: Record<string, string> = {
      'tc-nutrition.com': 'tc-nutra.myshopify.com',
      'ca.tc-nutrition.com': 'tc-nutrition-canada.myshopify.com',
    };

    // If already a myshopify domain, return as is
    if (domain.includes('.myshopify.com')) {
      return domain;
    }

    // Try to find in map, otherwise construct from domain
    return domainMap[domain] || `${domain.replace(/\./g, '-')}.myshopify.com`;
  }

  /**
   * Verify Shopify webhook signature
   */
  verifyWebhookSignature(body: string, signature: string, storeId: string): boolean {
    const store = this.stores.get(storeId);
    if (!store) {
      return false;
    }

    const hmac = crypto
      .createHmac('sha256', store.apiSecret)
      .update(body, 'utf8')
      .digest('base64');

    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  }

  /**
   * Get shop information
   */
  async getShopInfo(storeId: string): Promise<any> {
    const response = await this.makeRequest<{ shop: any }>(storeId, '/shop.json');
    return response.shop;
  }

  /**
   * Test connection to store
   */
  async testConnection(storeId: string): Promise<{ success: boolean; shop?: any; error?: string }> {
    try {
      const shop = await this.getShopInfo(storeId);
      return { success: true, shop };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==================== ORDER METHODS ====================

  /**
   * Get orders from a specific store
   */
  async getOrders(
    storeId: string,
    options: {
      limit?: number;
      status?: string;
      created_at_min?: string;
      created_at_max?: string;
      since_id?: number;
      fields?: string[];
    } = {}
  ): Promise<ShopifyOrder[]> {
    const params = new URLSearchParams();
    
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.status) params.append('status', options.status);
    if (options.created_at_min) params.append('created_at_min', options.created_at_min);
    if (options.created_at_max) params.append('created_at_max', options.created_at_max);
    if (options.since_id) params.append('since_id', options.since_id.toString());
    if (options.fields) params.append('fields', options.fields.join(','));

    const endpoint = `/orders.json${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.makeRequest<{ orders: ShopifyOrder[] }>(storeId, endpoint);
    return response.orders;
  }

  /**
   * Get orders from ALL stores
   */
  async getAllStoreOrders(
    options: {
      limit?: number;
      status?: string;
      created_at_min?: string;
      created_at_max?: string;
    } = {}
  ): Promise<Array<ShopifyOrder & { storeId: string; storeName: string }>> {
    const allOrders: Array<ShopifyOrder & { storeId: string; storeName: string }> = [];

    for (const store of this.stores.values()) {
      try {
        const orders = await this.getOrders(store.id, options);
        orders.forEach(order => {
          allOrders.push({
            ...order,
            storeId: store.id,
            storeName: store.name,
          });
        });
      } catch (error) {
        console.error(`Failed to fetch orders from ${store.name}:`, error);
      }
    }

    // Sort by created_at descending
    allOrders.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return allOrders;
  }

  /**
   * Get single order by ID
   */
  async getOrder(storeId: string, orderId: number): Promise<ShopifyOrder> {
    const response = await this.makeRequest<{ order: ShopifyOrder }>(
      storeId,
      `/orders/${orderId}.json`
    );
    return response.order;
  }

  /**
   * Get orders by discount code
   */
  async getOrdersByDiscountCode(
    storeId: string,
    discountCode: string,
    options: {
      limit?: number;
      created_at_min?: string;
      created_at_max?: string;
    } = {}
  ): Promise<ShopifyOrder[]> {
    // Shopify doesn't have direct filter by discount code, so we fetch and filter
    const allOrders = await this.getOrders(storeId, {
      ...options,
      limit: options.limit || 250,
    });

    return allOrders.filter(order =>
      order.discount_codes?.some(
        dc => dc.code.toUpperCase() === discountCode.toUpperCase()
      )
    );
  }

  /**
   * Get orders by discount codes from ALL stores
   */
  async getOrdersByDiscountCodesAllStores(
    discountCodes: string[],
    options: {
      limit?: number;
      created_at_min?: string;
      created_at_max?: string;
      testMode?: boolean; // If true, return ALL orders (for testing)
    } = {}
  ): Promise<Array<ShopifyOrder & { storeId: string; storeName: string; matchedCode: string }>> {
    const allOrders: Array<ShopifyOrder & { storeId: string; storeName: string; matchedCode: string }> = [];
    const upperCodes = discountCodes.map(c => c.toUpperCase());

    for (const store of this.stores.values()) {
      try {
        const orders = await this.getOrders(store.id, {
          ...options,
          limit: options.limit || 250,
        });

        orders.forEach(order => {
          // TEST MODE: Return all orders without filtering
          if (options.testMode) {
            const firstDiscount = order.discount_codes?.[0];
            allOrders.push({
              ...order,
              storeId: store.id,
              storeName: store.name,
              matchedCode: firstDiscount?.code || 'NO_CODE',
            });
            return;
          }

          // Normal mode: Filter by discount codes
          const matchedDiscount = order.discount_codes?.find(
            dc => upperCodes.includes(dc.code.toUpperCase())
          );

          if (matchedDiscount) {
            allOrders.push({
              ...order,
              storeId: store.id,
              storeName: store.name,
              matchedCode: matchedDiscount.code,
            });
          }
        });
      } catch (error) {
        console.error(`Failed to fetch orders from ${store.name}:`, error);
      }
    }

    // Sort by created_at descending
    allOrders.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return allOrders;
  }

  // ==================== DISCOUNT CODE METHODS ====================

  /**
   * Create a price rule (required before creating discount code)
   * 
   * For free shipping: set targetType to 'shipping_line', valueType to 'percentage', value to -100
   * For product discounts: targetType defaults to 'line_item'
   */
  async createPriceRule(
    storeId: string,
    options: {
      title: string;
      valueType: 'percentage' | 'fixed_amount';
      value: number; // negative for discounts (e.g., -10 for 10% off)
      startsAt?: string;
      endsAt?: string | null; // null = no expiry
      usageLimit?: number;
      oncePerCustomer?: boolean;
      targetType?: 'line_item' | 'shipping_line'; // 'shipping_line' for free shipping
    }
  ): Promise<ShopifyPriceRule> {
    const isShippingDiscount = options.targetType === 'shipping_line';

    const priceRule = {
      price_rule: {
        title: options.title,
        target_type: options.targetType || 'line_item',
        target_selection: 'all',
        allocation_method: isShippingDiscount ? 'each' : 'across',
        value_type: isShippingDiscount ? 'percentage' : options.valueType,
        value: isShippingDiscount ? '-100.0' : options.value.toString(),
        customer_selection: 'all',
        starts_at: options.startsAt || new Date().toISOString(),
        ends_at: options.endsAt === undefined ? null : options.endsAt,
        usage_limit: options.usageLimit || null,
        once_per_customer: options.oncePerCustomer || false,
      },
    };

    // NOTE: Combination settings (combinesWith) are NOT supported by the REST Price Rules API.
    // Use updateDiscountCombinations() via GraphQL AFTER creating the discount code.

    const response = await this.makeRequest<{ price_rule: ShopifyPriceRule }>(
      storeId,
      '/price_rules.json',
      'POST',
      priceRule
    );
    return response.price_rule;
  }

  /**
   * Create a discount code for a price rule
   */
  async createDiscountCode(
    storeId: string,
    priceRuleId: number,
    code: string
  ): Promise<ShopifyDiscountCode> {
    const discountCode = {
      discount_code: {
        code: code,
      },
    };

    const response = await this.makeRequest<{ discount_code: ShopifyDiscountCode }>(
      storeId,
      `/price_rules/${priceRuleId}/discount_codes.json`,
      'POST',
      discountCode
    );
    return response.discount_code;
  }

  /**
   * Create discount code in ALL stores
   */
  async createDiscountCodeAllStores(
    options: {
      code: string;
      discountPercent: number;
      startsAt?: string;
      endsAt?: string;
      usageLimit?: number;
    }
  ): Promise<Array<{ storeId: string; storeName: string; priceRuleId: number; discountCodeId: number; success: boolean; error?: string }>> {
    const results: Array<{ storeId: string; storeName: string; priceRuleId: number; discountCodeId: number; success: boolean; error?: string }> = [];

    for (const store of this.stores.values()) {
      try {
        // Create price rule first
        const priceRule = await this.createPriceRule(store.id, {
          title: `Affiliate Code: ${options.code}`,
          valueType: 'percentage',
          value: -options.discountPercent, // Negative for discount
          startsAt: options.startsAt,
          endsAt: options.endsAt,
          usageLimit: options.usageLimit,
        });

        // Create discount code
        const discountCode = await this.createDiscountCode(
          store.id,
          priceRule.id,
          options.code
        );

        results.push({
          storeId: store.id,
          storeName: store.name,
          priceRuleId: priceRule.id,
          discountCodeId: discountCode.id,
          success: true,
        });
      } catch (error: any) {
        results.push({
          storeId: store.id,
          storeName: store.name,
          priceRuleId: 0,
          discountCodeId: 0,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get discount code usage
   */
  async getDiscountCodeUsage(
    storeId: string,
    priceRuleId: number,
    discountCodeId: number
  ): Promise<ShopifyDiscountCode> {
    const response = await this.makeRequest<{ discount_code: ShopifyDiscountCode }>(
      storeId,
      `/price_rules/${priceRuleId}/discount_codes/${discountCodeId}.json`
    );
    return response.discount_code;
  }

  /**
   * Delete a price rule (and its discount codes)
   */
  async deletePriceRule(storeId: string, priceRuleId: number): Promise<void> {
    await this.makeRequest(storeId, `/price_rules/${priceRuleId}.json`, 'DELETE');
  }

  // ==================== GRAPHQL DISCOUNT CREATION ====================

  /**
   * Create a basic discount code (percentage or fixed amount) entirely via GraphQL.
   * This is the ONLY way to set combinesWith properly — the REST API ignores it,
   * and GraphQL cannot modify discounts created via REST.
   */
  async createDiscountCodeGraphQL(
    storeId: string,
    options: {
      title: string;
      code: string;
      valueType: 'percentage' | 'fixed_amount';
      value: number; // positive value: 10 = 10% or $10
      startsAt?: string;
      endsAt?: string | null;
      usageLimit?: number;
      oncePerCustomer?: boolean;
      combinesWith?: {
        orderDiscounts?: boolean;
        productDiscounts?: boolean;
        shippingDiscounts?: boolean;
      };
    }
  ): Promise<{ graphqlId: string; code: string }> {
    const mutation = `
      mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
          codeDiscountNode {
            id
            codeDiscount {
              ... on DiscountCodeBasic {
                title
                startsAt
                endsAt
                combinesWith {
                  orderDiscounts
                  productDiscounts
                  shippingDiscounts
                }
              }
            }
          }
          userErrors {
            field
            code
            message
          }
        }
      }
    `;

    // Build customerGets based on value type
    let customerGetsValue: any;
    if (options.valueType === 'percentage') {
      customerGetsValue = {
        percentage: options.value / 100, // Shopify expects 0.10 for 10%
      };
    } else {
      customerGetsValue = {
        discountAmount: {
          amount: options.value.toString(),
          appliesOnEachItem: false,
        },
      };
    }

    const variables: any = {
      basicCodeDiscount: {
        title: options.title,
        code: options.code,
        startsAt: options.startsAt || new Date().toISOString(),
        customerGets: {
          value: customerGetsValue,
          items: { all: true },
        },
        customerSelection: { all: true },
        combinesWith: {
          orderDiscounts: options.combinesWith?.orderDiscounts ?? false,
          productDiscounts: options.combinesWith?.productDiscounts ?? false,
          shippingDiscounts: options.combinesWith?.shippingDiscounts ?? false,
        },
        appliesOncePerCustomer: options.oncePerCustomer ?? false,
      },
    };

    // Only set endsAt if explicitly provided (null = no expiry)
    if (options.endsAt !== undefined && options.endsAt !== null) {
      variables.basicCodeDiscount.endsAt = options.endsAt;
    }

    // Usage limit
    if (options.usageLimit) {
      variables.basicCodeDiscount.usageLimit = options.usageLimit;
    }

    const result = await this.makeGraphQLRequest(storeId, mutation, variables);

    const userErrors = result?.data?.discountCodeBasicCreate?.userErrors;
    if (userErrors?.length > 0) {
      const errorMsg = userErrors.map((e: any) => `${e.field?.join('.')}: ${e.message}`).join('; ');
      throw new Error(`Shopify GraphQL Error creating discount: ${errorMsg}`);
    }

    const node = result?.data?.discountCodeBasicCreate?.codeDiscountNode;
    if (!node?.id) {
      throw new Error('Shopify GraphQL returned no discount node after creation');
    }

    console.log(`✅ [GraphQL] Created basic discount "${options.code}" on ${storeId} (combines: ${JSON.stringify(options.combinesWith || {})})`);

    return {
      graphqlId: node.id,
      code: options.code,
    };
  }

  /**
   * Create a free shipping discount code entirely via GraphQL.
   * This correctly sets combinesWith during creation.
   */
  async createFreeShippingCodeGraphQL(
    storeId: string,
    options: {
      title: string;
      code: string;
      startsAt?: string;
      endsAt?: string | null;
      usageLimit?: number;
      oncePerCustomer?: boolean;
      combinesWith?: {
        orderDiscounts?: boolean;
        productDiscounts?: boolean;
        shippingDiscounts?: boolean;
      };
    }
  ): Promise<{ graphqlId: string; code: string }> {
    const mutation = `
      mutation discountCodeFreeShippingCreate($freeShippingCodeDiscount: DiscountCodeFreeShippingInput!) {
        discountCodeFreeShippingCreate(freeShippingCodeDiscount: $freeShippingCodeDiscount) {
          codeDiscountNode {
            id
            codeDiscount {
              ... on DiscountCodeFreeShipping {
                title
                startsAt
                endsAt
                combinesWith {
                  orderDiscounts
                  productDiscounts
                  shippingDiscounts
                }
              }
            }
          }
          userErrors {
            field
            code
            message
          }
        }
      }
    `;

    const variables: any = {
      freeShippingCodeDiscount: {
        title: options.title,
        code: options.code,
        startsAt: options.startsAt || new Date().toISOString(),
        destination: { all: true },
        customerSelection: { all: true },
        combinesWith: {
          orderDiscounts: options.combinesWith?.orderDiscounts ?? false,
          productDiscounts: options.combinesWith?.productDiscounts ?? false,
          shippingDiscounts: options.combinesWith?.shippingDiscounts ?? false,
        },
        appliesOncePerCustomer: options.oncePerCustomer ?? false,
      },
    };

    // Only set endsAt if explicitly provided
    if (options.endsAt !== undefined && options.endsAt !== null) {
      variables.freeShippingCodeDiscount.endsAt = options.endsAt;
    }

    // Usage limit
    if (options.usageLimit) {
      variables.freeShippingCodeDiscount.usageLimit = options.usageLimit;
    }

    const result = await this.makeGraphQLRequest(storeId, mutation, variables);

    const userErrors = result?.data?.discountCodeFreeShippingCreate?.userErrors;
    if (userErrors?.length > 0) {
      const errorMsg = userErrors.map((e: any) => `${e.field?.join('.')}: ${e.message}`).join('; ');
      throw new Error(`Shopify GraphQL Error creating free shipping discount: ${errorMsg}`);
    }

    const node = result?.data?.discountCodeFreeShippingCreate?.codeDiscountNode;
    if (!node?.id) {
      throw new Error('Shopify GraphQL returned no discount node after free shipping creation');
    }

    console.log(`✅ [GraphQL] Created free shipping discount "${options.code}" on ${storeId} (combines: ${JSON.stringify(options.combinesWith || {})})`);

    return {
      graphqlId: node.id,
      code: options.code,
    };
  }

  /**
   * Delete a discount code via GraphQL (by node ID).
   * Uses Shopify's generic discountCodeDelete mutation.
   */
  async deleteDiscountGraphQL(storeId: string, graphqlId: string): Promise<void> {
    const mutation = `
      mutation deleteDiscount($id: ID!) {
        discountCodeDelete(id: $id) {
          deletedCodeDiscountId
          userErrors { field message }
        }
      }
    `;

    const result = await this.makeGraphQLRequest(storeId, mutation, { id: graphqlId });
    const errors = result?.data?.discountCodeDelete?.userErrors;
    if (errors?.length > 0) {
      throw new Error(`Failed to delete discount: ${errors.map((e: any) => e.message).join('; ')}`);
    }

    console.log(`✅ [GraphQL] Deleted discount ${graphqlId} from ${storeId}`);
  }

  /**
   * Smart delete: handles both GraphQL IDs (string starting with "gid://") 
   * and REST price rule IDs (numbers) for backward compatibility.
   */
  async deleteDiscountSmart(storeId: string, idOrPriceRuleId: string | number): Promise<void> {
    if (typeof idOrPriceRuleId === 'string' && idOrPriceRuleId.startsWith('gid://')) {
      await this.deleteDiscountGraphQL(storeId, idOrPriceRuleId);
    } else {
      await this.deletePriceRule(storeId, Number(idOrPriceRuleId));
    }
  }

  // ==================== WEBHOOK METHODS ====================

  /**
   * Get all webhooks for a store
   */
  async getWebhooks(storeId: string): Promise<any[]> {
    const response = await this.makeRequest<{ webhooks: any[] }>(storeId, '/webhooks.json');
    return response.webhooks;
  }

  /**
   * Create a webhook for a store
   */
  async createWebhook(
    storeId: string,
    topic: string,
    address: string
  ): Promise<any> {
    const webhook = {
      webhook: {
        topic,
        address,
        format: 'json',
      },
    };
    const response = await this.makeRequest<{ webhook: any }>(
      storeId,
      '/webhooks.json',
      'POST',
      webhook
    );
    return response.webhook;
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(storeId: string, webhookId: number): Promise<void> {
    await this.makeRequest(storeId, `/webhooks/${webhookId}.json`, 'DELETE');
  }

  /**
   * Register all required webhooks for a store
   */
  async registerWebhooks(storeId: string, baseUrl: string): Promise<{
    success: boolean;
    registered: string[];
    errors: string[];
  }> {
    const webhookTopics = [
      'orders/create',
      'orders/updated',
      'orders/paid',
      'orders/cancelled',
      'refunds/create',
    ];

    const webhookAddress = `${baseUrl}/api/shopify/webhooks/orders`;
    const registered: string[] = [];
    const errors: string[] = [];

    // Get existing webhooks
    const existingWebhooks = await this.getWebhooks(storeId);
    const existingTopics = existingWebhooks.map((w) => w.topic);

    for (const topic of webhookTopics) {
      if (existingTopics.includes(topic)) {
        registered.push(`${topic} (already exists)`);
        continue;
      }

      try {
        await this.createWebhook(storeId, topic, webhookAddress);
        registered.push(topic);
      } catch (error: any) {
        errors.push(`${topic}: ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      registered,
      errors,
    };
  }

  // ==================== PRODUCT METHODS ====================

  /**
   * Get products from a store
   */
  async getProducts(
    storeId: string,
    options: {
      limit?: number;
      collection_id?: number;
      product_type?: string;
    } = {}
  ): Promise<any[]> {
    const params = new URLSearchParams();
    
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.collection_id) params.append('collection_id', options.collection_id.toString());
    if (options.product_type) params.append('product_type', options.product_type);

    const endpoint = `/products.json${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.makeRequest<{ products: any[] }>(storeId, endpoint);
    return response.products;
  }

  // ==================== ANALYTICS METHODS ====================

  /**
   * Calculate affiliate statistics from orders
   */
  calculateAffiliateStats(
    orders: ShopifyOrder[],
    commissionRate: number = 0.10
  ): {
    totalOrders: number;
    totalRevenue: number;
    totalCommission: number;
    totalUnits: number;
    averageOrderValue: number;
  } {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (sum, order) => sum + this.getCommissionableValue(order),
      0
    );
    const totalCommission = totalRevenue * commissionRate;
    const totalUnits = orders.reduce(
      (sum, order) => sum + order.line_items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    );
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalOrders,
      totalRevenue,
      totalCommission,
      totalUnits,
      averageOrderValue,
    };
  }

  /**
   * Group orders by month for commission summary
   */
  groupOrdersByMonth(
    orders: ShopifyOrder[],
    commissionRate: number = 0.10
  ): Array<{
    month: string;
    year: number;
    monthKey: string;
    totalOrders: number;
    totalRevenue: number;
    totalCommission: number;
    totalUnits: number;
    orders: ShopifyOrder[];
  }> {
    const grouped = new Map<string, ShopifyOrder[]>();

    orders.forEach(order => {
      const date = new Date(order.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!grouped.has(monthKey)) {
        grouped.set(monthKey, []);
      }
      grouped.get(monthKey)!.push(order);
    });

    const result = Array.from(grouped.entries()).map(([monthKey, monthOrders]) => {
      const [year, month] = monthKey.split('-').map(Number);
      const date = new Date(year, month - 1);
      const stats = this.calculateAffiliateStats(monthOrders, commissionRate);

      return {
        month: date.toLocaleDateString('en-GB', { month: 'long' }),
        year,
        monthKey,
        totalOrders: stats.totalOrders,
        totalRevenue: stats.totalRevenue,
        totalCommission: stats.totalCommission,
        totalUnits: stats.totalUnits,
        orders: monthOrders,
      };
    });

    // Sort by date descending
    result.sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    return result;
  }

  /**
   * Get performance data for date range
   */
  getPerformanceByDateRange(
    orders: ShopifyOrder[],
    startDate: Date,
    endDate: Date,
    commissionRate: number = 0.10
  ): {
    current: { totalOrders: number; totalRevenue: number; totalCommission: number };
    chartData: Array<{ name: string; conversions: number; commission: number }>;
  } {
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= startDate && orderDate <= endDate;
    });

    const stats = this.calculateAffiliateStats(filteredOrders, commissionRate);

    // Group by day/week/month depending on range
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let chartData: Array<{ name: string; conversions: number; commission: number }> = [];

    if (daysDiff <= 7) {
      // Group by day
      const grouped = new Map<string, ShopifyOrder[]>();
      filteredOrders.forEach(order => {
        const date = new Date(order.created_at);
        const key = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(order);
      });

      chartData = Array.from(grouped.entries()).map(([name, dayOrders]) => ({
        name,
        conversions: dayOrders.length,
        commission: dayOrders.reduce((sum, o) => sum + this.getCommissionableValue(o) * commissionRate, 0),
      }));
    } else if (daysDiff <= 60) {
      // Group by week
      const grouped = new Map<string, ShopifyOrder[]>();
      filteredOrders.forEach(order => {
        const date = new Date(order.created_at);
        const weekNum = Math.ceil(((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) / 7);
        const key = `Week ${weekNum}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(order);
      });

      chartData = Array.from(grouped.entries()).map(([name, weekOrders]) => ({
        name,
        conversions: weekOrders.length,
        commission: weekOrders.reduce((sum, o) => sum + this.getCommissionableValue(o) * commissionRate, 0),
      }));
    } else {
      // Group by month
      const grouped = new Map<string, ShopifyOrder[]>();
      filteredOrders.forEach(order => {
        const date = new Date(order.created_at);
        const key = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(order);
      });

      chartData = Array.from(grouped.entries()).map(([name, monthOrders]) => ({
        name,
        conversions: monthOrders.length,
        commission: monthOrders.reduce((sum, o) => sum + this.getCommissionableValue(o) * commissionRate, 0),
      }));
    }

    return {
      current: {
        totalOrders: stats.totalOrders,
        totalRevenue: stats.totalRevenue,
        totalCommission: stats.totalCommission,
      },
      chartData,
    };
  }

  /**
   * Create an order in Shopify
   */
  async createOrder(storeId: string, orderData: any): Promise<ShopifyOrder | null> {
    const store = this.stores.get(storeId);
    if (!store) {
      throw new Error(`Store not found: ${storeId}`);
    }

    const myshopifyDomain = this.getMyshopifyDomain(store.domain);

    try {
      const response = await fetch(
        `https://${myshopifyDomain}/admin/api/${this.apiVersion}/orders.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': store.accessToken,
          },
          body: JSON.stringify({ order: orderData }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Shopify API error (${response.status}):`, errorText);
        throw new Error(`Failed to create order: ${response.status} ${errorText}`);
      }

      const data = await response.json() as { order: ShopifyOrder };
      return data.order;
    } catch (error) {
      console.error('Error creating order in Shopify:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const shopifyService = new ShopifyService();
export default shopifyService;
