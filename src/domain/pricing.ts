import { OrderItem, Product } from "../types";

export function validateQuantity(product: Product, quantity: number): boolean {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return false;
  }

  return !product.soldInMultiples || quantity % product.packageSize === 0;
}

export function getSuggestedQuantities(packageSize: number, quantity: number): number[] {
  if (packageSize <= 0) {
    return [];
  }

  const lower = Math.floor(quantity / packageSize) * packageSize;
  const upper = Math.ceil(quantity / packageSize) * packageSize;
  return Array.from(new Set([lower, upper].filter((value) => value > 0 && value !== quantity)));
}

export function calculateItemTotal(product: Product, quantity: number): number {
  return product.priceAgorot * quantity;
}

export function calculateOrderTotal(items: OrderItem[], deliveryPriceAgorot: number): number {
  const productsSubtotalAgorot = items.reduce(
    (total, item) => total + item.totalPriceAgorot,
    0,
  );
  return productsSubtotalAgorot + deliveryPriceAgorot;
}

export function formatAgorot(amount: number): string {
  return `${(amount / 100).toFixed(2)} ILS`;
}
