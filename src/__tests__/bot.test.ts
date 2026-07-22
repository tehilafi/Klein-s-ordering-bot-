import { activeOrders, CONTINUE_ORDER, FINISH_PRODUCTS, handleIncomingMessage, START_ORDER } from "../conversation";
import { getDeliveryPrice, isBeitShemeshAddress } from "../domain/delivery";
import { validateCardNumber, validateCvv, validateExpiry } from "../domain/payment";
import { calculateItemTotal, calculateOrderTotal, getSuggestedQuantities, validateQuantity } from "../domain/pricing";
import { searchProducts } from "../domain/products";
import { products } from "../data/products";
import { OrderItem } from "../types";

const phoneNumber = "972501234567";

beforeEach(() => {
  activeOrders.clear();
});

describe("conversation start", () => {
  test("starts an order by pressing the START_ORDER button", async () => {
    const responses = await handleIncomingMessage(phoneNumber, {
      type: "button",
      interactiveId: START_ORDER,
    });

    expect(activeOrders.get(phoneNumber)?.step).toBe("WAITING_FOR_NAME");
    expect(responses[0].text).toContain("על שם מי");
  });

  test("random first message does not skip the start button", async () => {
    const responses = await handleIncomingMessage(phoneNumber, {
      type: "text",
      text: "hello",
    });

    expect(activeOrders.get(phoneNumber)?.step).toBe("WAITING_FOR_START_BUTTON");
    expect(responses[0].buttons?.[0].id).toBe(START_ORDER);
  });
});

describe("product search and pricing", () => {
  test("searches for a product by partial name", () => {
    expect(searchProducts("גמדי").map((product) => product.id)).toContain("white-dwarf-roll");
  });

  test("searches for a product using an alias", () => {
    expect(searchProducts("פרנות").map((product) => product.id)).toContain("pair-of-frenas");
  });

  test("product selection response does not duplicate product rows in the message text", async () => {
    await handleIncomingMessage(phoneNumber, { type: "button", interactiveId: START_ORDER });
    await handleIncomingMessage(phoneNumber, { type: "text", text: "ישראל ישראלי" });
    await handleIncomingMessage(phoneNumber, { type: "text", text: "25/07/2026 בשעה 10:00" });
    await handleIncomingMessage(phoneNumber, { type: "text", text: "בית שמש, נהר הירדן 15" });
    const responses = await handleIncomingMessage(phoneNumber, { type: "text", text: "בורגר" });

    expect(responses[0].text).toBe("בחרי את המוצר הרצוי.");
    expect(responses[0].options?.length).toBe(3);
  });

  test("cart action buttons are ordered for editing first", async () => {
    await handleIncomingMessage(phoneNumber, { type: "button", interactiveId: START_ORDER });
    await handleIncomingMessage(phoneNumber, { type: "text", text: "ישראל ישראלי" });
    await handleIncomingMessage(phoneNumber, { type: "text", text: "25/07/2026 בשעה 10:00" });
    await handleIncomingMessage(phoneNumber, { type: "text", text: "בית שמש, נהר הירדן 15" });
    await handleIncomingMessage(phoneNumber, { type: "text", text: "בורגר" });
    await handleIncomingMessage(phoneNumber, { type: "text", text: "3" });
    const responses = await handleIncomingMessage(phoneNumber, { type: "text", text: "80" });

    expect(responses[0].buttons?.map((button) => button.title)).toEqual([
      "שינוי כמות",
      "הסרת מוצר",
      "הוספת מוצר",
      "צפייה בסל",
      "סיום בחירת מוצרים",
    ]);
  });

  test("validates carton quantities", () => {
    const product = products.find((item) => item.id === "white-dwarf-roll");
    expect(product).toBeDefined();
    expect(validateQuantity(product!, 50)).toBe(true);
    expect(validateQuantity(product!, 30)).toBe(false);
  });

  test("allows unrestricted product quantities", () => {
    const product = products.find((item) => item.id === "pair-of-frenas");
    expect(product).toBeDefined();
    expect(validateQuantity(product!, 3)).toBe(true);
  });

  test("calculates product line price", () => {
    const product = products.find((item) => item.id === "white-dwarf-roll");
    expect(calculateItemTotal(product!, 50)).toBe(11000);
  });

  test("calculates full order total", () => {
    const items: OrderItem[] = [
      {
        productId: "white-dwarf-roll",
        productName: "לחמניה גמדי לבן",
        quantity: 50,
        unitPriceAgorot: 220,
        totalPriceAgorot: 11000,
      },
      {
        productId: "sweet-challah",
        productName: "חלה מתוקה",
        quantity: 6,
        unitPriceAgorot: 1500,
        totalPriceAgorot: 9000,
      },
    ];

    expect(calculateOrderTotal(items, 2000)).toBe(22000);
  });

  test("suggests nearby valid quantities", () => {
    expect(getSuggestedQuantities(25, 30)).toEqual([25, 50]);
  });
});

describe("delivery detection", () => {
  test("detects Hebrew Beit Shemesh", () => {
    expect(isBeitShemeshAddress("בית שמש, נהר הירדן 15")).toBe(true);
  });

  test("detects hyphenated Hebrew Beit Shemesh", () => {
    expect(isBeitShemeshAddress("רחוב רבינא 8, בית-שמש")).toBe(true);
  });

  test("detects abbreviated Hebrew Beit Shemesh", () => {
    expect(isBeitShemeshAddress('בי"ש, נחל קישון 4')).toBe(true);
  });

  test("detects English Beit Shemesh", () => {
    expect(isBeitShemeshAddress("Beit Shemesh, Nahar Hayarden 15")).toBe(true);
  });

  test("detects addresses outside Beit Shemesh", () => {
    expect(isBeitShemeshAddress("Jerusalem, Jaffa Street 25")).toBe(false);
  });

  test("charges 20 ILS for Beit Shemesh", () => {
    expect(getDeliveryPrice("בית שמש, נהר הירדן 15")).toBe(2000);
  });

  test("charges 35 ILS outside Beit Shemesh", () => {
    expect(getDeliveryPrice("ירושלים, יפו 25")).toBe(3500);
  });
});

describe("payment validation", () => {
  test("validates card numbers with Luhn", () => {
    expect(validateCardNumber("4242 4242 4242 4242")).toBe(true);
  });

  test("rejects card numbers that fail Luhn", () => {
    expect(validateCardNumber("4242 4242 4242 4241")).toBe(false);
  });

  test("accepts future expiry", () => {
    expect(validateExpiry("12/99")).toBe(true);
  });

  test("rejects invalid or past expiry", () => {
    expect(validateExpiry("13/99")).toBe(false);
    expect(validateExpiry("01/20")).toBe(false);
  });

  test("validates CVV", () => {
    expect(validateCvv("123")).toBe(true);
    expect(validateCvv("1234")).toBe(true);
    expect(validateCvv("12a")).toBe(false);
  });
});

describe("order completion", () => {
  test("removes active session and sensitive card details after completion", async () => {
    await handleIncomingMessage(phoneNumber, { type: "button", interactiveId: START_ORDER });
    await handleIncomingMessage(phoneNumber, { type: "text", text: " Israel   Israeli " });
    await handleIncomingMessage(phoneNumber, { type: "text", text: "25/07/2026 at 10:00" });
    await handleIncomingMessage(phoneNumber, { type: "text", text: "בית שמש, נהר הירדן 15" });
    await handleIncomingMessage(phoneNumber, { type: "text", text: "גמדי לבן" });
    await handleIncomingMessage(phoneNumber, { type: "text", text: "1" });
    await handleIncomingMessage(phoneNumber, { type: "text", text: "50" });
    await handleIncomingMessage(phoneNumber, { type: "button", interactiveId: FINISH_PRODUCTS });
    await handleIncomingMessage(phoneNumber, { type: "button", interactiveId: CONTINUE_ORDER });
    await handleIncomingMessage(phoneNumber, { type: "text", text: "4242 4242 4242 4242" });
    await handleIncomingMessage(phoneNumber, { type: "text", text: "12/99" });
    await handleIncomingMessage(phoneNumber, { type: "text", text: "999" });
    const responses = await handleIncomingMessage(phoneNumber, { type: "text", text: "050-1234567" });

    expect(activeOrders.has(phoneNumber)).toBe(false);
    expect(responses[0].text).toContain("כרטיס המסתיים ב-4242");
    expect(responses[0].text).not.toContain("4242 4242 4242 4242");
    expect(responses[0].text).not.toContain("999");
  });
});
