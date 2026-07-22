"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELIVERY_PRICES = void 0;
exports.normalizeAddress = normalizeAddress;
exports.isBeitShemeshAddress = isBeitShemeshAddress;
exports.getDeliveryPrice = getDeliveryPrice;
exports.DELIVERY_PRICES = {
    BEIT_SHEMESH: 2000,
    OUTSIDE_BEIT_SHEMESH: 3500,
};
const BEIT_SHEMESH_TERMS = [
    "בית שמש",
    "ביש",
    "beit shemesh",
    "bet shemesh",
    "beth shemesh",
];
function normalizeAddress(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[״"'׳]/g, "")
        .replace(/[-־]/g, " ")
        .replace(/[.,!?;:()[\]{}]/g, " ")
        .replace(/\s+/g, " ");
}
function isBeitShemeshAddress(address) {
    const normalizedAddress = normalizeAddress(address);
    return BEIT_SHEMESH_TERMS.some((term) => normalizedAddress.includes(normalizeAddress(term)));
}
function getDeliveryPrice(address) {
    return isBeitShemeshAddress(address)
        ? exports.DELIVERY_PRICES.BEIT_SHEMESH
        : exports.DELIVERY_PRICES.OUTSIDE_BEIT_SHEMESH;
}
