"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCardNumber = normalizeCardNumber;
exports.validateCardNumber = validateCardNumber;
exports.validateExpiry = validateExpiry;
exports.validateCvv = validateCvv;
function normalizeCardNumber(cardNumber) {
    return cardNumber.replace(/[\s-]/g, "");
}
function validateCardNumber(cardNumber) {
    const digits = normalizeCardNumber(cardNumber);
    if (!/^\d{13,19}$/.test(digits)) {
        return false;
    }
    let sum = 0;
    let shouldDouble = false;
    for (let index = digits.length - 1; index >= 0; index -= 1) {
        let digit = Number(digits[index]);
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
}
function validateExpiry(expiry) {
    const match = expiry.trim().match(/^(\d{2})\/(\d{2})$/);
    if (!match) {
        return false;
    }
    const month = Number(match[1]);
    const year = 2000 + Number(match[2]);
    if (month < 1 || month > 12) {
        return false;
    }
    const now = new Date();
    const expiryEnd = new Date(year, month, 0, 23, 59, 59, 999);
    return expiryEnd >= now;
}
function validateCvv(cvv) {
    return /^\d{3,4}$/.test(cvv.trim());
}
