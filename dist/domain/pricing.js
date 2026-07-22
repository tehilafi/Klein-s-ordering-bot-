"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuantity = validateQuantity;
exports.getSuggestedQuantities = getSuggestedQuantities;
exports.calculateItemTotal = calculateItemTotal;
exports.calculateOrderTotal = calculateOrderTotal;
exports.formatAgorot = formatAgorot;
function validateQuantity(product, quantity) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
        return false;
    }
    return !product.soldInMultiples || quantity % product.packageSize === 0;
}
function getSuggestedQuantities(packageSize, quantity) {
    if (packageSize <= 0) {
        return [];
    }
    const lower = Math.floor(quantity / packageSize) * packageSize;
    const upper = Math.ceil(quantity / packageSize) * packageSize;
    return Array.from(new Set([lower, upper].filter((value) => value > 0 && value !== quantity)));
}
function calculateItemTotal(product, quantity) {
    return product.priceAgorot * quantity;
}
function calculateOrderTotal(items, deliveryPriceAgorot) {
    const productsSubtotalAgorot = items.reduce((total, item) => total + item.totalPriceAgorot, 0);
    return productsSubtotalAgorot + deliveryPriceAgorot;
}
function formatAgorot(amount) {
    return `${(amount / 100).toFixed(2)} ILS`;
}
