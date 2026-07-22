import { OrderSession } from "../types";
import { calculateOrderTotal, formatAgorot } from "./pricing";

function subtotal(order: OrderSession): number {
  return order.items.reduce((total, item) => total + item.totalPriceAgorot, 0);
}

export function buildCartSummary(order: OrderSession): string {
  if (order.items.length === 0) {
    return "Your cart is empty.";
  }

  return order.items
    .map(
      (item, index) =>
        `${index + 1}. ${item.productName}\nQuantity: ${item.quantity}\nUnit price: ${formatAgorot(item.unitPriceAgorot)}\nTotal: ${formatAgorot(item.totalPriceAgorot)}`,
    )
    .join("\n\n");
}

export function buildOrderSummary(order: OrderSession): string {
  const deliveryPriceAgorot = order.deliveryPriceAgorot ?? 0;
  const productsSubtotalAgorot = subtotal(order);
  const finalTotalAgorot = calculateOrderTotal(order.items, deliveryPriceAgorot);

  return [
    "Order Summary:",
    "",
    buildCartSummary(order),
    "",
    `Products subtotal: ${formatAgorot(productsSubtotalAgorot)}`,
    `Delivery: ${formatAgorot(deliveryPriceAgorot)}`,
    "",
    `Final total: ${formatAgorot(finalTotalAgorot)}`,
  ].join("\n");
}

export function buildFinalOrderReport(order: OrderSession): string {
  return [
    "Order completed successfully ✅",
    "",
    "Customer details:",
    `Name: ${order.customerName ?? ""}`,
    `Phone: ${order.phone ?? ""}`,
    "",
    "Requested date and time:",
    order.requestedDate ?? "",
    "",
    "Delivery address:",
    order.address ?? "",
    "",
    "Products:",
    "",
    buildCartSummary(order),
    "",
    `Products subtotal: ${formatAgorot(subtotal(order))}`,
    `Delivery: ${formatAgorot(order.deliveryPriceAgorot ?? 0)}`,
    "",
    `Final total: ${formatAgorot(calculateOrderTotal(order.items, order.deliveryPriceAgorot ?? 0))}`,
    "",
    "Payment details:",
    `Card ending in ${order.cardLastFourDigits ?? ""}`,
  ].join("\n");
}
