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
  text: "ברוכה הבאה למאפיית קליינס 🍞\nאפשר לבצע הזמנה במהירות דרך בוט הוואטסאפ.",
  buttons: [{ id: START_ORDER, title: "התחלת הזמנה" }],
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

function isAnyAction(input: string, action: string, labels: string[]): boolean {
  return input.toUpperCase() === action || labels.some((label) => input.toLowerCase() === label.toLowerCase());
}

function pushStep(session: OrderSession, step: ConversationStep): void {
  if (session.step !== step) {
    session.stepHistory.push(session.step);
    session.step = step;
  }
}

function promptForProduct(): BotResponse {
  return buttonsResponse("איזה מוצר תרצי להזמין?\nהתחילי להקליד את שם המוצר.", [
    { id: VIEW_CART, title: "צפייה בסל" },
    { id: CANCEL_ORDER, title: "ביטול" },
  ]);
}

function cartActions(text: string): BotResponse {
  return buttonsResponse(text, [
    { id: CHANGE_QUANTITY, title: "שינוי כמות" },
    { id: REMOVE_PRODUCT, title: "הסרת מוצר" },
    { id: ADD_PRODUCT, title: "הוספת מוצר" },
    { id: VIEW_CART, title: "צפייה בסל" },
    { id: FINISH_PRODUCTS, title: "סיום בחירת מוצרים" },
  ]);
}

function orderConfirmation(order: OrderSession): BotResponse {
  return buttonsResponse(buildOrderSummary(order), [
    { id: CONTINUE_ORDER, title: "המשך" },
    { id: EDIT_ORDER, title: "עריכת הזמנה" },
    { id: CANCEL_ORDER, title: "ביטול הזמנה" },
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
    return textResponse("אין שלב קודם לחזור אליו.");
  }

  session.step = previousStep;
  return textResponse("חזרנו לשלב הקודם.");
}

function handleGlobalAction(phoneNumber: string, input: string, session: OrderSession): BotResponse[] | undefined {
  if (isAnyAction(input, CANCEL_ORDER, ["cancel", "cancel order", "ביטול", "בטל", "ביטול הזמנה"])) {
    resetOrder(phoneNumber);
    return [buttonsResponse("ההזמנה בוטלה.", [{ id: START_ORDER, title: "התחלת הזמנה" }])];
  }

  if (isAnyAction(input, VIEW_CART, ["cart", "view cart", "סל", "צפייה בסל", "הצג סל"])) {
    return [textResponse(buildCartSummary(session))];
  }

  if (["back", "חזרה", "אחורה"].includes(input.toLowerCase())) {
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
    return textResponse(`הכמות הכוללת תהיה ${mergedQuantity}, והיא אינה תקינה עבור ${product.name}. נא להזין כמות אחרת.`);
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
    "המוצר נוסף להזמנה.",
    "",
    product.name,
    `כמות: ${existingItem?.quantity ?? quantity}`,
    `מחיר יחידה: ${formatAgorot(product.priceAgorot)}`,
    `סה"כ לשורה: ${formatAgorot(lineTotal)}`,
  ].join("\n"));
}

export async function handleIncomingMessage(
  phoneNumber: string,
  message: IncomingMessage,
): Promise<BotResponse[]> {
  const input = getInput(message);

  if (message.interactiveId === START_ORDER) {
    startNewOrder(phoneNumber);
    return [textResponse("על שם מי לרשום את ההזמנה?")];
  }

  const session = getOrWelcome(phoneNumber);
  if (!session) {
    return [welcomeResponse()];
  }

  if (session.step === "WAITING_FOR_START_BUTTON") {
    if (input === "1") {
      startNewOrder(phoneNumber);
      return [textResponse("על שם מי לרשום את ההזמנה?")];
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
        return [textResponse("נא להזין שם באורך של לפחות שני תווים.")];
      }
      session.customerName = name;
      pushStep(session, "WAITING_FOR_DATE");
      return [textResponse("לאיזה תאריך ושעה ההזמנה דרושה?")];
    }
    case "WAITING_FOR_DATE": {
      const requestedDate = cleanFreeText(input);
      if (!requestedDate) {
        return [textResponse("נא להזין תאריך ושעה מבוקשים.")];
      }
      session.requestedDate = requestedDate;
      pushStep(session, "WAITING_FOR_ADDRESS");
      return [textResponse("נא להזין עיר, רחוב ומספר בניין למשלוח.")];
    }
    case "WAITING_FOR_ADDRESS": {
      const address = cleanFreeText(input);
      if (!address) {
        return [textResponse("נא להזין עיר, רחוב ומספר בניין למשלוח.")];
      }
      session.address = address;
      session.isBeitShemesh = isBeitShemeshAddress(address);
      session.deliveryPriceAgorot = getDeliveryPrice(address);
      pushStep(session, "WAITING_FOR_PRODUCT_SEARCH");
      return [
        textResponse(
          `הכתובת זוהתה כ${session.isBeitShemesh ? "כתובת בבית שמש" : "כתובת מחוץ לבית שמש"}.\nמחיר משלוח: ${formatAgorot(session.deliveryPriceAgorot)}`,
        ),
        promptForProduct(),
      ];
    }
    case "WAITING_FOR_PRODUCT_SEARCH": {
      const results = searchProducts(input);
      if (results.length === 0) {
        return [textResponse("לא נמצאו מוצרים מתאימים. נסי שם מוצר אחר.")];
      }
      session.searchResults = results;
      pushStep(session, "WAITING_FOR_PRODUCT_SELECTION");
      return [{
        type: "list",
        text: "בחרי את המוצר הרצוי.",
        options: results.map((product, index) => ({
          id: product.id,
          title: `${index + 1}. ${product.name}`,
          description: `${formatAgorot(product.priceAgorot)}`,
        })),
      }];
    }
    case "WAITING_FOR_PRODUCT_SELECTION": {
      const selected =
        findProductById(input) ??
        session.searchResults?.[Number(input) - 1];
      if (!selected) {
        return [textResponse("נא לבחור אחד מהמוצרים המתאימים לפי מספר.")];
      }
      session.selectedProduct = selected;
      pushStep(session, "WAITING_FOR_QUANTITY");
      return [textResponse(`כמה יחידות של ${selected.name} תרצי להזמין?`)];
    }
    case "WAITING_FOR_QUANTITY": {
      const quantity = Number(input);
      const product = session.selectedProduct;
      if (!product || !Number.isInteger(quantity) || quantity <= 0) {
        return [textResponse("נא להזין כמות חיובית במספר שלם.")];
      }
      if (!validateQuantity(product, quantity)) {
        const suggestions = getSuggestedQuantities(product.packageSize, quantity);
        return [textResponse(`לא ניתן להזמין ${quantity} יחידות של ${product.name}.\n\nהמוצר נמכר רק בכפולות של ${product.packageSize}.\n\nכמויות תקינות קרובות:\n${suggestions.map((value) => `${value} יחידות`).join("\n")}\n\nנא להזין כמות אחרת.`)];
      }
      return [addOrMergeItem(session, quantity)];
    }
    case "WAITING_FOR_CART_ACTION": {
      if (isAnyAction(input, ADD_PRODUCT, ["add another product", "הוספת מוצר", "הוסף מוצר", "עוד מוצר"])) {
        pushStep(session, "WAITING_FOR_PRODUCT_SEARCH");
        return [promptForProduct()];
      }
      if (isAnyAction(input, FINISH_PRODUCTS, ["finish product selection", "סיום בחירת מוצרים", "סיום", "סיימתי"])) {
        if (session.items.length === 0) {
          return [textResponse("נא להוסיף לפחות מוצר אחד לפני שממשיכים.")];
        }
        pushStep(session, "WAITING_FOR_ORDER_CONFIRMATION");
        return [orderConfirmation(session)];
      }
      if (isAnyAction(input, REMOVE_PRODUCT, ["remove product", "הסרת מוצר", "הסר מוצר"])) {
        const removed = session.items.pop();
        return [cartActions(removed ? `${removed.productName} הוסר מהסל.` : "הסל שלך כבר ריק.")];
      }
      if (isAnyAction(input, CHANGE_QUANTITY, ["change quantity", "שינוי כמות", "שנה כמות"])) {
        session.items.pop();
        pushStep(session, "WAITING_FOR_PRODUCT_SEARCH");
        return [promptForProduct()];
      }
      return [cartActions("נא לבחור פעולה להזמנה.")];
    }
    case "WAITING_FOR_ORDER_CONFIRMATION": {
      if (isAnyAction(input, CONTINUE_ORDER, ["continue", "המשך", "להמשיך"])) {
        pushStep(session, "WAITING_FOR_CARD_NUMBER");
        return [textResponse("נא להזין מספר כרטיס אשראי.")];
      }
      if (isAnyAction(input, EDIT_ORDER, ["edit order", "עריכת הזמנה", "עריכה"])) {
        pushStep(session, "WAITING_FOR_PRODUCT_SEARCH");
        return [promptForProduct()];
      }
      return [orderConfirmation(session)];
    }
    case "WAITING_FOR_CARD_NUMBER": {
      if (!validateCardNumber(input)) {
        return [textResponse("נא להזין מספר כרטיס אשראי תקין.")];
      }
      const normalizedCard = normalizeCardNumber(input);
      session.cardNumber = normalizedCard;
      session.cardLastFourDigits = normalizedCard.slice(-4);
      pushStep(session, "WAITING_FOR_CARD_EXPIRY");
      return [textResponse("נא להזין תוקף כרטיס בפורמט MM/YY.")];
    }
    case "WAITING_FOR_CARD_EXPIRY": {
      if (!validateExpiry(input)) {
        return [textResponse("נא להזין תוקף עתידי תקין בפורמט MM/YY.")];
      }
      session.cardExpiry = input;
      pushStep(session, "WAITING_FOR_CARD_CVV");
      return [textResponse("נא להזין את שלוש הספרות בגב הכרטיס.")];
    }
    case "WAITING_FOR_CARD_CVV": {
      if (!validateCvv(input)) {
        return [textResponse("נא להזין קוד CVV תקין בן 3 או 4 ספרות.")];
      }
      session.cardCvv = input;
      pushStep(session, "WAITING_FOR_ALTERNATIVE_PHONE");
      return [textResponse("מספר טלפון ליצירת קשר:")];
    }
    case "WAITING_FOR_PHONE_CONFIRMATION": {
      if (isAnyAction(input, USE_THIS_PHONE, ["use this number", "שימוש במספר הזה", "כן"])) {
        session.phone = phoneNumber;
        const report = buildFinalOrderReport(session);
        removeSensitiveCardFields(session);
        resetOrder(phoneNumber);
        return [textResponse(report), welcomeResponse()];
      }
      if (isAnyAction(input, ENTER_OTHER_PHONE, ["enter another number", "הזנת מספר אחר", "מספר אחר"])) {
        pushStep(session, "WAITING_FOR_ALTERNATIVE_PHONE");
        return [textResponse("מספר טלפון ליצירת קשר:")];
      }
      return [buttonsResponse("האם להשתמש במספר הוואטסאפ שלך כמספר ליצירת קשר?", [
        { id: USE_THIS_PHONE, title: "שימוש במספר הזה" },
        { id: ENTER_OTHER_PHONE, title: "הזנת מספר אחר" },
      ])];
    }
    case "WAITING_FOR_ALTERNATIVE_PHONE": {
      const digits = input.replace(/\D/g, "");
      if (digits.length < 7 || digits.length > 15) {
        return [textResponse("נא להזין מספר טלפון תקין.")];
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
