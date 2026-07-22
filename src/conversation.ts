import {
  BotButton,
  BotResponse,
  ConversationStep,
  IncomingMessage,
  OrderSession,
} from "./types";
import { getDeliveryPrice, isBeitShemeshAddress } from "./domain/delivery";
import { calculateItemTotal, formatAgorot, getSuggestedQuantities, validateQuantity } from "./domain/pricing";
import { findProductById, searchProducts } from "./domain/products";
import { buildCartSummary, buildFinalOrderReport, buildOrderSummary } from "./domain/summary";
import { cleanFreeText } from "./domain/text";
import { normalizeCardNumber, validateCardNumber, validateCvv, validateExpiry } from "./domain/payment";

export const START_ORDER = "START_ORDER";
export const ADD_PRODUCT = "ADD_PRODUCT";
export const VIEW_CART = "VIEW_CART";
export const FINISH_PRODUCTS = "FINISH_PRODUCTS";
export const REMOVE_PRODUCT = "REMOVE_PRODUCT";
export const CHANGE_QUANTITY = "CHANGE_QUANTITY";
export const CONTINUE_ORDER = "CONTINUE_ORDER";
export const EDIT_ORDER = "EDIT_ORDER";
export const CANCEL_ORDER = "CANCEL_ORDER";
export const USE_THIS_PHONE = "USE_THIS_PHONE";
export const ENTER_OTHER_PHONE = "ENTER_OTHER_PHONE";

export const activeOrders = new Map<string, OrderSession>();

const welcomeResponse = (): BotResponse => ({
  type: "buttons",
  text: "Welcome to Kleins Bakery 🍞\nYou can place an order quickly through the WhatsApp bot.",
  buttons: [{ id: START_ORDER, title: "Start Order" }],
});

function textResponse(text: string): BotResponse {
  return { type: "text", text };
}

function buttonsResponse(text: string, buttons: BotButton[]): BotResponse {
  return { type: "buttons", text, buttons };
}

function getInput(message: IncomingMessage): string {
  return cleanFreeText(message.interactiveId ?? message.text ?? "");
}

function isAction(input: string, action: string, label: string): boolean {
  return input.toUpperCase() === action || input.toLowerCase() === label.toLowerCase();
}

function pushStep(session: OrderSession, step: ConversationStep): void {
  if (session.step !== step) {
    session.stepHistory.push(session.step);
    session.step = step;
  }
}

function promptForProduct(): BotResponse {
  return buttonsResponse("Which product would you like to order?\nStart typing the product name.", [
    { id: VIEW_CART, title: "View Cart" },
    { id: CANCEL_ORDER, title: "Cancel" },
  ]);
}

function cartActions(text: string): BotResponse {
  return buttonsResponse(text, [
    { id: ADD_PRODUCT, title: "Add Another Product" },
    { id: VIEW_CART, title: "View Cart" },
    { id: FINISH_PRODUCTS, title: "Finish Product Selection" },
    { id: REMOVE_PRODUCT, title: "Remove Product" },
    { id: CHANGE_QUANTITY, title: "Change Quantity" },
  ]);
}

function orderConfirmation(order: OrderSession): BotResponse {
  return buttonsResponse(buildOrderSummary(order), [
    { id: CONTINUE_ORDER, title: "Continue" },
    { id: EDIT_ORDER, title: "Edit Order" },
    { id: CANCEL_ORDER, title: "Cancel Order" },
  ]);
}

export function startNewOrder(phoneNumber: string): void {
  activeOrders.set(phoneNumber, {
    step: "WAITING_FOR_NAME",
    items: [],
    stepHistory: ["WAITING_FOR_START_BUTTON"],
  });
}

export function resetOrder(phoneNumber: string): void {
  activeOrders.delete(phoneNumber);
}

function getOrWelcome(phoneNumber: string): OrderSession | undefined {
  const session = activeOrders.get(phoneNumber);
  if (session) {
    return session;
  }
  activeOrders.set(phoneNumber, {
    step: "WAITING_FOR_START_BUTTON",
    items: [],
    stepHistory: [],
  });
  return activeOrders.get(phoneNumber);
}

function removeSensitiveCardFields(session: OrderSession): void {
  delete session.cardNumber;
  delete session.cardExpiry;
  delete session.cardCvv;
}

function handleBack(session: OrderSession): BotResponse {
  const previousStep = session.stepHistory.pop();
  if (!previousStep) {
    return textResponse("There is no previous step to return to.");
  }

  session.step = previousStep;
  return textResponse(`Returned to previous step: ${previousStep}.`);
}

function handleGlobalAction(phoneNumber: string, input: string, session: OrderSession): BotResponse[] | undefined {
  if (isAction(input, CANCEL_ORDER, "cancel") || input.toLowerCase() === "cancel order") {
    resetOrder(phoneNumber);
    return [buttonsResponse("Your order was cancelled.", [{ id: START_ORDER, title: "Start Order" }])];
  }

  if (input.toLowerCase() === "cart" || isAction(input, VIEW_CART, "view cart")) {
    return [textResponse(buildCartSummary(session))];
  }

  if (input.toLowerCase() === "back") {
    return [handleBack(session)];
  }

  return undefined;
}

function addOrMergeItem(session: OrderSession, quantity: number): BotResponse {
  const product = session.selectedProduct;
  if (!product) {
    pushStep(session, "WAITING_FOR_PRODUCT_SEARCH");
    return promptForProduct();
  }

  const existingItem = session.items.find((item) => item.productId === product.id);
  const mergedQuantity = (existingItem?.quantity ?? 0) + quantity;
  if (!validateQuantity(product, mergedQuantity)) {
    return textResponse(`The merged quantity would be ${mergedQuantity}, which is not valid for ${product.name}. Please enter another quantity.`);
  }

  const totalPriceAgorot = calculateItemTotal(product, mergedQuantity);
  if (existingItem) {
    existingItem.quantity = mergedQuantity;
    existingItem.totalPriceAgorot = totalPriceAgorot;
  } else {
    session.items.push({
      productId: product.id,
      productName: product.name,
      quantity,
      unitPriceAgorot: product.priceAgorot,
      totalPriceAgorot: calculateItemTotal(product, quantity),
    });
  }

  delete session.selectedProduct;
  delete session.searchResults;
  pushStep(session, "WAITING_FOR_CART_ACTION");

  const lineTotal = existingItem?.totalPriceAgorot ?? calculateItemTotal(product, quantity);
  return cartActions([
    "The product was added to the order.",
    "",
    product.name,
    `Quantity: ${existingItem?.quantity ?? quantity}`,
    `Unit price: ${formatAgorot(product.priceAgorot)}`,
    `Line total: ${formatAgorot(lineTotal)}`,
  ].join("\n"));
}

export async function handleIncomingMessage(
  phoneNumber: string,
  message: IncomingMessage,
): Promise<BotResponse[]> {
  const input = getInput(message);

  if (message.interactiveId === START_ORDER) {
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
      const name = cleanFreeText(input);
      if (name.length < 2) {
        return [textResponse("Please enter a name with at least two characters.")];
      }
      session.customerName = name;
      pushStep(session, "WAITING_FOR_DATE");
      return [textResponse("For what date and time is the order needed?")];
    }
    case "WAITING_FOR_DATE": {
      const requestedDate = cleanFreeText(input);
      if (!requestedDate) {
        return [textResponse("Please enter the requested date and time.")];
      }
      session.requestedDate = requestedDate;
      pushStep(session, "WAITING_FOR_ADDRESS");
      return [textResponse("Please enter the delivery city, street, and building number.")];
    }
    case "WAITING_FOR_ADDRESS": {
      const address = cleanFreeText(input);
      if (!address) {
        return [textResponse("Please enter the delivery city, street, and building number.")];
      }
      session.address = address;
      session.isBeitShemesh = isBeitShemeshAddress(address);
      session.deliveryPriceAgorot = getDeliveryPrice(address);
      pushStep(session, "WAITING_FOR_PRODUCT_SEARCH");
      return [
        textResponse(
          `The address was identified as being ${session.isBeitShemesh ? "in Beit Shemesh" : "outside Beit Shemesh"}.\nDelivery price: ${formatAgorot(session.deliveryPriceAgorot)}`,
        ),
        promptForProduct(),
      ];
    }
    case "WAITING_FOR_PRODUCT_SEARCH": {
      const results = searchProducts(input);
      if (results.length === 0) {
        return [textResponse("No matching products were found. Please try another product name.")];
      }
      session.searchResults = results;
      pushStep(session, "WAITING_FOR_PRODUCT_SELECTION");
      return [{
        type: "list",
        text: `Matching products:\n\n${results
          .map((product, index) => `${index + 1}. ${product.name} - ${formatAgorot(product.priceAgorot)} per ${product.pricingUnit}${product.soldInMultiples ? ` - sold in multiples of ${product.packageSize}` : ""}`)
          .join("\n")}\n\nSelect the required product.`,
        options: results.map((product, index) => ({
          id: product.id,
          title: `${index + 1}. ${product.name}`,
          description: `${formatAgorot(product.priceAgorot)} per ${product.pricingUnit}`,
        })),
      }];
    }
    case "WAITING_FOR_PRODUCT_SELECTION": {
      const selected =
        findProductById(input) ??
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
      if (!validateQuantity(product, quantity)) {
        const suggestions = getSuggestedQuantities(product.packageSize, quantity);
        return [textResponse(`${quantity} units cannot be ordered for ${product.name}.\n\nThis product is sold only in multiples of ${product.packageSize}.\n\nNearby valid quantities:\n${suggestions.map((value) => `${value} units`).join("\n")}\n\nPlease enter another quantity.`)];
      }
      return [addOrMergeItem(session, quantity)];
    }
    case "WAITING_FOR_CART_ACTION": {
      if (isAction(input, ADD_PRODUCT, "add another product")) {
        pushStep(session, "WAITING_FOR_PRODUCT_SEARCH");
        return [promptForProduct()];
      }
      if (isAction(input, FINISH_PRODUCTS, "finish product selection")) {
        if (session.items.length === 0) {
          return [textResponse("Please add at least one product before continuing.")];
        }
        pushStep(session, "WAITING_FOR_ORDER_CONFIRMATION");
        return [orderConfirmation(session)];
      }
      if (isAction(input, REMOVE_PRODUCT, "remove product")) {
        const removed = session.items.pop();
        return [cartActions(removed ? `Removed ${removed.productName}.` : "Your cart is already empty.")];
      }
      if (isAction(input, CHANGE_QUANTITY, "change quantity")) {
        session.items.pop();
        pushStep(session, "WAITING_FOR_PRODUCT_SEARCH");
        return [promptForProduct()];
      }
      return [cartActions("Please choose an order action.")];
    }
    case "WAITING_FOR_ORDER_CONFIRMATION": {
      if (isAction(input, CONTINUE_ORDER, "continue")) {
        pushStep(session, "WAITING_FOR_CARD_NUMBER");
        return [textResponse("Please enter the credit card number.")];
      }
      if (isAction(input, EDIT_ORDER, "edit order")) {
        pushStep(session, "WAITING_FOR_PRODUCT_SEARCH");
        return [promptForProduct()];
      }
      return [orderConfirmation(session)];
    }
    case "WAITING_FOR_CARD_NUMBER": {
      if (!validateCardNumber(input)) {
        return [textResponse("Please enter a valid credit card number.")];
      }
      const normalizedCard = normalizeCardNumber(input);
      session.cardNumber = normalizedCard;
      session.cardLastFourDigits = normalizedCard.slice(-4);
      pushStep(session, "WAITING_FOR_CARD_EXPIRY");
      return [textResponse("Please enter the card expiry in MM/YY format.")];
    }
    case "WAITING_FOR_CARD_EXPIRY": {
      if (!validateExpiry(input)) {
        return [textResponse("Please enter a valid future expiry in MM/YY format.")];
      }
      session.cardExpiry = input;
      pushStep(session, "WAITING_FOR_CARD_CVV");
      return [textResponse("Please enter the three digits from the back of the card.")];
    }
    case "WAITING_FOR_CARD_CVV": {
      if (!validateCvv(input)) {
        return [textResponse("Please enter a valid 3 or 4 digit CVV.")];
      }
      session.cardCvv = input;
      pushStep(session, "WAITING_FOR_PHONE_CONFIRMATION");
      return [buttonsResponse("Should we use your WhatsApp number as the contact number?", [
        { id: USE_THIS_PHONE, title: "Use This Number" },
        { id: ENTER_OTHER_PHONE, title: "Enter Another Number" },
      ])];
    }
    case "WAITING_FOR_PHONE_CONFIRMATION": {
      if (isAction(input, USE_THIS_PHONE, "use this number")) {
        session.phone = phoneNumber;
        const report = buildFinalOrderReport(session);
        removeSensitiveCardFields(session);
        resetOrder(phoneNumber);
        return [textResponse(report), welcomeResponse()];
      }
      if (isAction(input, ENTER_OTHER_PHONE, "enter another number")) {
        pushStep(session, "WAITING_FOR_ALTERNATIVE_PHONE");
        return [textResponse("Please enter the contact phone number.")];
      }
      return [buttonsResponse("Should we use your WhatsApp number as the contact number?", [
        { id: USE_THIS_PHONE, title: "Use This Number" },
        { id: ENTER_OTHER_PHONE, title: "Enter Another Number" },
      ])];
    }
    case "WAITING_FOR_ALTERNATIVE_PHONE": {
      const digits = input.replace(/\D/g, "");
      if (digits.length < 7 || digits.length > 15) {
        return [textResponse("Please enter a valid phone number.")];
      }
      session.phone = input;
      const report = buildFinalOrderReport(session);
      removeSensitiveCardFields(session);
      resetOrder(phoneNumber);
      return [textResponse(report), welcomeResponse()];
    }
    default:
      return [welcomeResponse()];
  }
}
