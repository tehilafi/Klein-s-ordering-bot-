"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCartSummary = buildCartSummary;
exports.buildOrderSummary = buildOrderSummary;
exports.buildFinalOrderReport = buildFinalOrderReport;
const pricing_1 = require("./pricing");
function subtotal(order) {
    return order.items.reduce((total, item) => total + item.totalPriceAgorot, 0);
}
function buildCartSummary(order) {
    if (order.items.length === 0) {
        return "Your cart is empty.";
    }
    return order.items
        .map((item, index) => `${index + 1}. ${item.productName}\nQuantity: ${item.quantity}\nUnit price: ${(0, pricing_1.formatAgorot)(item.unitPriceAgorot)}\nTotal: ${(0, pricing_1.formatAgorot)(item.totalPriceAgorot)}`)
        .join("\n\n");
}
function buildOrderSummary(order) {
    const deliveryPriceAgorot = order.deliveryPriceAgorot ?? 0;
    const productsSubtotalAgorot = subtotal(order);
    const finalTotalAgorot = (0, pricing_1.calculateOrderTotal)(order.items, deliveryPriceAgorot);
    return [
        "Order Summary:",
        "",
        buildCartSummary(order),
        "",
        `Products subtotal: ${(0, pricing_1.formatAgorot)(productsSubtotalAgorot)}`,
        `Delivery: ${(0, pricing_1.formatAgorot)(deliveryPriceAgorot)}`,
        "",
        `Final total: ${(0, pricing_1.formatAgorot)(finalTotalAgorot)}`,
    ].join("\n");
}
function buildFinalOrderReport(order) {
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
        `Products subtotal: ${(0, pricing_1.formatAgorot)(subtotal(order))}`,
        `Delivery: ${(0, pricing_1.formatAgorot)(order.deliveryPriceAgorot ?? 0)}`,
        "",
        `Final total: ${(0, pricing_1.formatAgorot)((0, pricing_1.calculateOrderTotal)(order.items, order.deliveryPriceAgorot ?? 0))}`,
        "",
        "Payment details:",
        `Card ending in ${order.cardLastFourDigits ?? ""}`,
    ].join("\n");
}
