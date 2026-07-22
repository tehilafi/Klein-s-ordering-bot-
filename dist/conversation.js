"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activeOrders = exports.ENTER_OTHER_PHONE = exports.USE_THIS_PHONE = exports.CANCEL_ORDER = exports.EDIT_ORDER = exports.CONTINUE_ORDER = exports.CHANGE_QUANTITY = exports.REMOVE_PRODUCT = exports.FINISH_PRODUCTS = exports.VIEW_CART = exports.ADD_PRODUCT = exports.START_ORDER = void 0;
exports.startNewOrder = startNewOrder;
exports.resetOrder = resetOrder;
exports.handleIncomingMessage = handleIncomingMessage;
const delivery_1 = require("./domain/delivery");
const pricing_1 = require("./domain/pricing");
const products_1 = require("./domain/products");
const summary_1 = require("./domain/summary");
const text_1 = require("./domain/text");
const payment_1 = require("./domain/payment");
exports.START_ORDER = "START_ORDER";
exports.ADD_PRODUCT = "ADD_PRODUCT";
exports.VIEW_CART = "VIEW_CART";
exports.FINISH_PRODUCTS = "FINISH_PRODUCTS";
exports.REMOVE_PRODUCT = "REMOVE_PRODUCT";
exports.CHANGE_QUANTITY = "CHANGE_QUANTITY";
exports.CONTINUE_ORDER = "CONTINUE_ORDER";
exports.EDIT_ORDER = "EDIT_ORDER";
exports.CANCEL_ORDER = "CANCEL_ORDER";
exports.USE_THIS_PHONE = "USE_THIS_PHONE";
exports.ENTER_OTHER_PHONE = "ENTER_OTHER_PHONE";
exports.activeOrders = new Map();
const welcomeResponse = () => ({
    type: "buttons",
    text: "Welcome to Kleins Bakery 🍞\nYou can place an order quickly through the WhatsApp bot.",
    buttons: [{ id: exports.START_ORDER, title: "Start Order" }],
});
function textResponse(text) {
    return { type: "text", text };
}
function buttonsResponse(text, buttons) {
    return { type: "buttons", text, buttons };
}
function getInput(message) {
    return (0, text_1.cleanFreeText)(message.interactiveId ?? message.text ?? "");
}
function isAction(input, action, label) {
    return input.toUpperCase() === action || input.toLowerCase() === label.toLowerCase();
}
function pushStep(session, step) {
    if (session.step !== step) {
        session.stepHistory.push(session.step);
        session.step = step;
    }
}
function promptForProduct() {
    return buttonsResponse("Which product would you like to order?\nStart typing the product name.", [
        { id: exports.VIEW_CART, title: "View Cart" },
        { id: exports.CANCEL_ORDER, title: "Cancel" },
    ]);
}
function cartActions(text) {
    return buttonsResponse(text, [
        { id: exports.ADD_PRODUCT, title: "Add Another Product" },
        { id: exports.VIEW_CART, title: "View Cart" },
        { id: exports.FINISH_PRODUCTS, title: "Finish Product Selection" },
        { id: exports.REMOVE_PRODUCT, title: "Remove Product" },
        { id: exports.CHANGE_QUANTITY, title: "Change Quantity" },
    ]);
}
function orderConfirmation(order) {
    return buttonsResponse((0, summary_1.buildOrderSummary)(order), [
        { id: exports.CONTINUE_ORDER, title: "Continue" },
        { id: exports.EDIT_ORDER, title: "Edit Order" },
        { id: exports.CANCEL_ORDER, title: "Cancel Order" },
    ]);
}
function startNewOrder(phoneNumber) {
    exports.activeOrders.set(phoneNumber, {
        step: "WAITING_FOR_NAME",
        items: [],
        stepHistory: ["WAITING_FOR_START_BUTTON"],
    });
}
function resetOrder(phoneNumber) {
    exports.activeOrders.delete(phoneNumber);
}
function getOrWelcome(phoneNumber) {
    const session = exports.activeOrders.get(phoneNumber);
    if (session) {
        return session;
    }
    exports.activeOrders.set(phoneNumber, {
        step: "WAITING_FOR_START_BUTTON",
        items: [],
        stepHistory: [],
    });
    return exports.activeOrders.get(phoneNumber);
}
function removeSensitiveCardFields(session) {
    delete session.cardNumber;
    delete session.cardExpiry;
    delete session.cardCvv;
}
function handleBack(session) {
    const previousStep = session.stepHistory.pop();
    if (!previousStep) {
        return textResponse("There is no previous step to return to.");
    }
    session.step = previousStep;
    return textResponse(`Returned to previous step: ${previousStep}.`);
}
function handleGlobalAction(phoneNumber, input, session) {
    if (isAction(input, exports.CANCEL_ORDER, "cancel") || input.toLowerCase() === "cancel order") {
        resetOrder(phoneNumber);
        return [buttonsResponse("Your order was cancelled.", [{ id: exports.START_ORDER, title: "Start Order" }])];
    }
    if (input.toLowerCase() === "cart" || isAction(input, exports.VIEW_CART, "view cart")) {
        return [textResponse((0, summary_1.buildCartSummary)(session))];
    }
    if (input.toLowerCase() === "back") {
        return [handleBack(session)];
    }
    return undefined;
}
function addOrMergeItem(session, quantity) {
    const product = session.selectedProduct;
    if (!product) {
        pushStep(session, "WAITING_FOR_PRODUCT_SEARCH");
        return promptForProduct();
    }
    const existingItem = session.items.find((item) => item.productId === product.id);
    const mergedQuantity = (existingItem?.quantity ?? 0) + quantity;
    if (!(0, pricing_1.validateQuantity)(product, mergedQuantity)) {
        return textResponse(`The merged quantity would be ${mergedQuantity}, which is not valid for ${product.name}. Please enter another quantity.`);
    }
    const totalPriceAgorot = (0, pricing_1.calculateItemTotal)(product, mergedQuantity);
    if (existingItem) {
        existingItem.quantity = mergedQuantity;
        existingItem.totalPriceAgorot = totalPriceAgorot;
    }
    else {
        session.items.push({
            productId: product.id,
            productName: product.name,
            quantity,
            unitPriceAgorot: product.priceAgorot,
            totalPriceAgorot: (0, pricing_1.calculateItemTotal)(product, quantity),
        });
    }
    delete session.selectedProduct;
    delete session.searchResults;
    pushStep(session, "WAITING_FOR_CART_ACTION");
    const lineTotal = existingItem?.totalPriceAgorot ?? (0, pricing_1.calculateItemTotal)(product, quantity);
    return cartActions([
        "The product was added to the order.",
        "",
        product.name,
        `Quantity: ${existingItem?.quantity ?? quantity}`,
        `Unit price: ${(0, pricing_1.formatAgorot)(product.priceAgorot)}`,
        `Line total: ${(0, pricing_1.formatAgorot)(lineTotal)}`,
    ].join("\n"));
}
async function handleIncomingMessage(phoneNumber, message) {
    const input = getInput(message);
    if (message.interactiveId === exports.START_ORDER) {
        startNewOrder(phoneNumber);
        return [textResponse("What name should be used for the order?")];
    }
    const session = getOrWelcome(phoneNumber);
    if (!session) {
        return [welcomeResponse()];
    }
    if (session.step === "WAITING_FOR_START_BUTTON") {
        if (input === "1") {
            startNewOrder(phoneNumber);
            return [textResponse("What name should be used for the order?")];
        }
        return [welcomeResponse()];
    }
    const globalResponse = handleGlobalAction(phoneNumber, input, session);
    if (globalResponse) {
        return globalResponse;
    }
    switch (session.step) {
        case "WAITING_FOR_NAME": {
            const name = (0, text_1.cleanFreeText)(input);
            if (name.length < 2) {
                return [textResponse("Please enter a name with at least two characters.")];
            }
            session.customerName = name;
            pushStep(session, "WAITING_FOR_DATE");
            return [textResponse("For what date and time is the order needed?")];
        }
        case "WAITING_FOR_DATE": {
            const requestedDate = (0, text_1.cleanFreeText)(input);
            if (!requestedDate) {
                return [textResponse("Please enter the requested date and time.")];
            }
            session.requestedDate = requestedDate;
            pushStep(session, "WAITING_FOR_ADDRESS");
            return [textResponse("Please enter the delivery city, street, and building number.")];
        }
        case "WAITING_FOR_ADDRESS": {
            const address = (0, text_1.cleanFreeText)(input);
            if (!address) {
                return [textResponse("Please enter the delivery city, street, and building number.")];
            }
            session.address = address;
            session.isBeitShemesh = (0, delivery_1.isBeitShemeshAddress)(address);
            session.deliveryPriceAgorot = (0, delivery_1.getDeliveryPrice)(address);
            pushStep(session, "WAITING_FOR_PRODUCT_SEARCH");
            return [
                textResponse(`The address was identified as being ${session.isBeitShemesh ? "in Beit Shemesh" : "outside Beit Shemesh"}.\nDelivery price: ${(0, pricing_1.formatAgorot)(session.deliveryPriceAgorot)}`),
                promptForProduct(),
            ];
        }
        case "WAITING_FOR_PRODUCT_SEARCH": {
            const results = (0, products_1.searchProducts)(input);
            if (results.length === 0) {
                return [textResponse("No matching products were found. Please try another product name.")];
            }
            session.searchResults = results;
            pushStep(session, "WAITING_FOR_PRODUCT_SELECTION");
            return [{
                    type: "list",
                    text: `Matching products:\n\n${results
                        .map((product, index) => `${index + 1}. ${product.name} - ${(0, pricing_1.formatAgorot)(product.priceAgorot)} per ${product.pricingUnit}${product.soldInMultiples ? ` - sold in multiples of ${product.packageSize}` : ""}`)
                        .join("\n")}\n\nSelect the required product.`,
                    options: results.map((product, index) => ({
                        id: product.id,
                        title: `${index + 1}. ${product.name}`,
                        description: `${(0, pricing_1.formatAgorot)(product.priceAgorot)} per ${product.pricingUnit}`,
                    })),
                }];
        }
        case "WAITING_FOR_PRODUCT_SELECTION": {
            const selected = (0, products_1.findProductById)(input) ??
                session.searchResults?.[Number(input) - 1];
            if (!selected) {
                return [textResponse("Please select one of the matching products by number.")];
            }
            session.selectedProduct = selected;
            pushStep(session, "WAITING_FOR_QUANTITY");
            return [textResponse(`How many units of ${selected.name} would you like to order?`)];
        }
        case "WAITING_FOR_QUANTITY": {
            const quantity = Number(input);
            const product = session.selectedProduct;
            if (!product || !Number.isInteger(quantity) || quantity <= 0) {
                return [textResponse("Please enter a positive whole-number quantity.")];
            }
            if (!(0, pricing_1.validateQuantity)(product, quantity)) {
                const suggestions = (0, pricing_1.getSuggestedQuantities)(product.packageSize, quantity);
                return [textResponse(`${quantity} units cannot be ordered for ${product.name}.\n\nThis product is sold only in multiples of ${product.packageSize}.\n\nNearby valid quantities:\n${suggestions.map((value) => `${value} units`).join("\n")}\n\nPlease enter another quantity.`)];
            }
            return [addOrMergeItem(session, quantity)];
        }
        case "WAITING_FOR_CART_ACTION": {
            if (isAction(input, exports.ADD_PRODUCT, "add another product")) {
                pushStep(session, "WAITING_FOR_PRODUCT_SEARCH");
                return [promptForProduct()];
            }
            if (isAction(input, exports.FINISH_PRODUCTS, "finish product selection")) {
                if (session.items.length === 0) {
                    return [textResponse("Please add at least one product before continuing.")];
                }
                pushStep(session, "WAITING_FOR_ORDER_CONFIRMATION");
                return [orderConfirmation(session)];
            }
            if (isAction(input, exports.REMOVE_PRODUCT, "remove product")) {
                const removed = session.items.pop();
                return [cartActions(removed ? `Removed ${removed.productName}.` : "Your cart is already empty.")];
            }
            if (isAction(input, exports.CHANGE_QUANTITY, "change quantity")) {
                session.items.pop();
                pushStep(session, "WAITING_FOR_PRODUCT_SEARCH");
                return [promptForProduct()];
            }
            return [cartActions("Please choose an order action.")];
        }
        case "WAITING_FOR_ORDER_CONFIRMATION": {
            if (isAction(input, exports.CONTINUE_ORDER, "continue")) {
                pushStep(session, "WAITING_FOR_CARD_NUMBER");
                return [textResponse("Please enter the credit card number.")];
            }
            if (isAction(input, exports.EDIT_ORDER, "edit order")) {
                pushStep(session, "WAITING_FOR_PRODUCT_SEARCH");
                return [promptForProduct()];
            }
            return [orderConfirmation(session)];
        }
        case "WAITING_FOR_CARD_NUMBER": {
            if (!(0, payment_1.validateCardNumber)(input)) {
                return [textResponse("Please enter a valid credit card number.")];
            }
            const normalizedCard = (0, payment_1.normalizeCardNumber)(input);
            session.cardNumber = normalizedCard;
            session.cardLastFourDigits = normalizedCard.slice(-4);
            pushStep(session, "WAITING_FOR_CARD_EXPIRY");
            return [textResponse("Please enter the card expiry in MM/YY format.")];
        }
        case "WAITING_FOR_CARD_EXPIRY": {
            if (!(0, payment_1.validateExpiry)(input)) {
                return [textResponse("Please enter a valid future expiry in MM/YY format.")];
            }
            session.cardExpiry = input;
            pushStep(session, "WAITING_FOR_CARD_CVV");
            return [textResponse("Please enter the three digits from the back of the card.")];
        }
        case "WAITING_FOR_CARD_CVV": {
            if (!(0, payment_1.validateCvv)(input)) {
                return [textResponse("Please enter a valid 3 or 4 digit CVV.")];
            }
            session.cardCvv = input;
            pushStep(session, "WAITING_FOR_PHONE_CONFIRMATION");
            return [buttonsResponse("Should we use your WhatsApp number as the contact number?", [
                    { id: exports.USE_THIS_PHONE, title: "Use This Number" },
                    { id: exports.ENTER_OTHER_PHONE, title: "Enter Another Number" },
                ])];
        }
        case "WAITING_FOR_PHONE_CONFIRMATION": {
            if (isAction(input, exports.USE_THIS_PHONE, "use this number")) {
                session.phone = phoneNumber;
                const report = (0, summary_1.buildFinalOrderReport)(session);
                removeSensitiveCardFields(session);
                resetOrder(phoneNumber);
                return [textResponse(report), welcomeResponse()];
            }
            if (isAction(input, exports.ENTER_OTHER_PHONE, "enter another number")) {
                pushStep(session, "WAITING_FOR_ALTERNATIVE_PHONE");
                return [textResponse("Please enter the contact phone number.")];
            }
            return [buttonsResponse("Should we use your WhatsApp number as the contact number?", [
                    { id: exports.USE_THIS_PHONE, title: "Use This Number" },
                    { id: exports.ENTER_OTHER_PHONE, title: "Enter Another Number" },
                ])];
        }
        case "WAITING_FOR_ALTERNATIVE_PHONE": {
            const digits = input.replace(/\D/g, "");
            if (digits.length < 7 || digits.length > 15) {
                return [textResponse("Please enter a valid phone number.")];
            }
            session.phone = input;
            const report = (0, summary_1.buildFinalOrderReport)(session);
            removeSensitiveCardFields(session);
            resetOrder(phoneNumber);
            return [textResponse(report), welcomeResponse()];
        }
        default:
            return [welcomeResponse()];
    }
}
