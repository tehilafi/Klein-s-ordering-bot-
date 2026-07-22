import { OrderSession } from "../types";
import { calculateOrderTotal, formatAgorot } from "./pricing";

function subtotal(order: OrderSession): number {
  return order.items.reduce((total, item) => total + item.totalPriceAgorot, 0);
}

export function buildCartSummary(order: OrderSession): string {
  if (order.items.length === 0) {
    return "הסל שלך ריק.";
  }

  return order.items
    .map(
      (item, index) =>
        `${index + 1}. ${item.productName}\nכמות: ${item.quantity}\nמחיר יחידה: ${formatAgorot(item.unitPriceAgorot)}\nסה"כ: ${formatAgorot(item.totalPriceAgorot)}`,
    )
    .join("\n\n");
}

export function buildOrderSummary(order: OrderSession): string {
  const deliveryPriceAgorot = order.deliveryPriceAgorot ?? 0;
  const productsSubtotalAgorot = subtotal(order);
  const finalTotalAgorot = calculateOrderTotal(order.items, deliveryPriceAgorot);

  return [
    "סיכום הזמנה:",
    "",
    buildCartSummary(order),
    "",
    `סכום ביניים למוצרים: ${formatAgorot(productsSubtotalAgorot)}`,
    `משלוח: ${formatAgorot(deliveryPriceAgorot)}`,
    "",
    `סה"כ לתשלום: ${formatAgorot(finalTotalAgorot)}`,
  ].join("\n");
}

export function buildFinalOrderReport(order: OrderSession): string {
  return [
    "ההזמנה הושלמה בהצלחה ✅",
    "",
    "פרטי לקוח:",
    `שם: ${order.customerName ?? ""}`,
    `טלפון: ${order.phone ?? ""}`,
    "",
    "תאריך ושעה מבוקשים:",
    order.requestedDate ?? "",
    "",
    "כתובת משלוח:",
    order.address ?? "",
    "",
    "מוצרים:",
    "",
    buildCartSummary(order),
    "",
    `סכום ביניים למוצרים: ${formatAgorot(subtotal(order))}`,
    `משלוח: ${formatAgorot(order.deliveryPriceAgorot ?? 0)}`,
    "",
    `סה"כ לתשלום: ${formatAgorot(calculateOrderTotal(order.items, order.deliveryPriceAgorot ?? 0))}`,
    "",
    "פרטי תשלום:",
    `כרטיס המסתיים ב-${order.cardLastFourDigits ?? ""}`,
  ].join("\n");
}
