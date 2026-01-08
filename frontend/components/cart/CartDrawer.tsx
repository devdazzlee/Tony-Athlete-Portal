"use client";

import { useCart } from "@/contexts/CartContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Minus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

export function CartDrawer() {
  const { items, removeItem, updateQuantity, getCartTotal, getCartCount, currency, storeName } = useCart();
  const router = useRouter();
  const cartCount = getCartCount();
  const cartTotal = getCartTotal();

  const getCurrencySymbol = (curr: string) => {
    const symbols: Record<string, string> = {
      USD: "$",
      CAD: "CA$",
      EUR: "€",
      GBP: "£",
    };
    return symbols[curr] || curr;
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-orange-600 border-0">
              {cartCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold">Shopping Cart</SheetTitle>
          {storeName && (
            <p className="text-sm text-gray-500">Ordering from {storeName}</p>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-4 mx-3">
          {items.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingCart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 mb-2">Your cart is empty</p>
              <p className="text-sm text-gray-500">Add products from the shop to get started</p>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-3">
                {items.map((item) => (
                  <Card key={`${item.productId}-${item.variantId}`} className="bg-white">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {item.image && (
                          <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">
                                {item.title}
                              </h3>
                              {item.variantTitle && item.variantTitle !== "Default Title" && (
                                <p className="text-xs text-gray-500">{item.variantTitle}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-gray-400 hover:text-red-600"
                              onClick={() => removeItem(item.productId, item.variantId)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-medium text-gray-900">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                                disabled={item.inventoryQuantity !== undefined && item.quantity >= item.inventoryQuantity}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            {/* Price */}
                            <div className="text-right">
                              <p className="font-bold text-orange-600">
                                {getCurrencySymbol(currency)}{(item.price * item.quantity).toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {getCurrencySymbol(currency)}{item.price.toFixed(2)} each
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Cart Summary */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Subtotal ({cartCount} items)</span>
                  <span className="font-semibold text-gray-900">
                    {getCurrencySymbol(currency)}{cartTotal.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Shipping, taxes, and discounts calculated at checkout
                </p>
                
                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    onClick={() => router.push("/dashboard/checkout")}
                  >
                    Proceed to Checkout
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/dashboard/shop")}
                  >
                    Continue Shopping
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

