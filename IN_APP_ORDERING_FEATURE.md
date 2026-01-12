# In-App Ordering Feature

## Overview
Affiliates can now place orders directly within the app without being redirected to external Shopify websites. This provides a seamless ordering experience and keeps affiliates within the portal ecosystem.

## Features Implemented

### 1. Shopping Cart System
- **Location**: `frontend/contexts/CartContext.tsx`
- **Features**:
  - Add products to cart with quantity
  - Update item quantities
  - Remove items from cart
  - View cart total and item count
  - Cart persists across sessions (localStorage)
  - Single-store restriction (can only order from one store at a time)
  - Auto-applies affiliate discount codes at checkout

### 2. Cart UI Component
- **Location**: `frontend/components/cart/CartDrawer.tsx`
- **Features**:
  - Slide-out drawer accessible from header
  - Visual cart count badge
  - Inline quantity controls (+/-)
  - Remove item button
  - Cart summary with totals
  - "Proceed to Checkout" button
  - "Continue Shopping" button

### 3. Checkout Page
- **Location**: `frontend/app/dashboard/checkout/page.tsx`
- **Features**:
  - Complete shipping information form
  - Order summary with product images
  - Auto-applied discount codes
  - Form validation
  - Order confirmation screen
  - Integration with Shopify API to create orders
  - Email confirmation

### 4. Backend API
- **Location**: `backend/src/routes/athlete.ts`
- **Endpoint**: `POST /api/athlete/orders/create`
- **Features**:
  - Creates orders in Shopify via API
  - Calculates affiliate commission
  - Records order in database
  - Updates affiliate statistics
  - Applies affiliate discount codes automatically

### 5. Shopify Service Enhancement
- **Location**: `backend/src/services/ShopifyService.ts`
- **Method**: `createOrder()`
- **Features**:
  - Direct integration with Shopify Orders API
  - Handles multi-store setup
  - Creates orders with full customer details
  - Applies discount codes

### 6. Updated Shop Page
- **Location**: `frontend/app/dashboard/shop/page.tsx`
- **Changes**:
  - "Order Now" button changed to "Add to Cart"
  - Products are added to cart instead of external redirect
  - Discount code message updated to "applied at checkout"

## User Flow

```
1. Affiliate browses products in Shop page
   ↓
2. Clicks "Add to Cart" on desired products
   ↓
3. Cart icon in header shows item count
   ↓
4. Click cart icon to view/manage cart
   ↓
5. Click "Proceed to Checkout"
   ↓
6. Fill in shipping information
   ↓
7. Review order summary
   ↓
8. Click "Place Order"
   ↓
9. Order created in Shopify
   ↓
10. Order recorded in database
   ↓
11. Affiliate commission calculated
   ↓
12. Success screen with order number
   ↓
13. Email confirmation sent
```

## Technical Implementation

### Frontend Components
1. **CartContext**: Global state management for shopping cart
2. **CartDrawer**: UI component for cart visualization
3. **CheckoutPage**: Full checkout form and process
4. **CartProvider**: Wrapper in dashboard layout

### Backend Endpoints
1. **POST /api/athlete/orders/create**: Creates order in Shopify and records in database

### Database Changes
- Uses existing `AffiliateOrder` model
- No schema changes required
- Orders are linked to affiliate and store

## Benefits

1. **Better UX**: Affiliates stay within the portal
2. **Streamlined Process**: No need to leave app to place orders
3. **Commission Tracking**: Orders are automatically tracked for commission
4. **Discount Auto-Apply**: Affiliate discount codes applied automatically
5. **Order History**: All orders visible in Orders page
6. **Multi-Product Orders**: Can order multiple products at once

## Configuration

### Environment Variables
No new environment variables required. Uses existing:
- `NEXT_PUBLIC_API_URL`: Backend API URL
- Shopify store credentials (already configured)

### Permissions Required
- Shopify API access token with `write_orders` permission
- Affiliate must have active discount codes

## Testing Checklist

- [x] Add product to cart
- [x] Update quantity in cart
- [x] Remove product from cart
- [x] Cart persists after page refresh
- [x] Cannot mix products from different stores
- [x] Checkout form validation
- [x] Order creation in Shopify
- [x] Order recorded in database
- [x] Commission calculated correctly
- [x] Affiliate stats updated
- [x] Success screen displays
- [x] Order appears in Orders page
- [ ] Email confirmation sent (requires Shopify email setup)

## Known Limitations

1. **Payment Processing**: Orders are created with "pending" status. Payment must be processed through Shopify admin or customer must complete payment via email link.
2. **Shipping Calculation**: Shipping costs calculated by Shopify after order creation
3. **Tax Calculation**: Taxes calculated by Shopify based on shipping address
4. **Inventory Check**: Real-time inventory not validated before order creation
5. **Single Store**: Can only order from one store at a time (by design)

## Future Enhancements

1. **Payment Integration**: Add payment gateway (Stripe/PayPal) for immediate payment
2. **Inventory Validation**: Check product availability before adding to cart
3. **Shipping Options**: Let users choose shipping method
4. **Tax Preview**: Show estimated taxes before order creation
5. **Order Tracking**: Real-time order status updates
6. **Wishlist**: Save products for later
7. **Product Variants**: Select size/color/etc. before adding to cart
8. **Bulk Ordering**: Quick add multiple products

## Migration Notes

### For Existing Users
- No data migration required
- Feature is immediately available
- Existing orders in database remain unchanged
- Old flow (external redirect) completely replaced

### For New Users
- Full in-app ordering from day one
- No external Shopify interaction needed for ordering

## API Documentation

### Create Order Endpoint

**Endpoint**: `POST /api/athlete/orders/create`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "storeId": "store-canada",
  "email": "customer@example.com",
  "lineItems": [
    {
      "variant_id": 12345678,
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "first_name": "John",
    "last_name": "Doe",
    "address1": "123 Main St",
    "address2": "Apt 4",
    "city": "Toronto",
    "province": "ON",
    "zip": "M1M 1M1",
    "country": "Canada",
    "phone": "+1234567890"
  },
  "note": "Please leave at door",
  "discountCode": "AFFILIATE10"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Order created successfully",
  "orderId": "clxxx123",
  "orderNumber": "#1234",
  "shopifyOrderId": "5678901234",
  "commissionAmount": 10.50
}
```

**Error Response** (400/500):
```json
{
  "error": "Failed to create order",
  "details": "Error message"
}
```

## Support

For issues or questions:
1. Check Shopify API status
2. Verify store credentials
3. Check affiliate has active discount codes
4. Review server logs for detailed errors
5. Test with Shopify API directly if issues persist


