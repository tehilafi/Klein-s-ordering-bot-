"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const conversation_1 = require("../conversation");
const delivery_1 = require("../domain/delivery");
const payment_1 = require("../domain/payment");
const pricing_1 = require("../domain/pricing");
const products_1 = require("../domain/products");
const products_2 = require("../data/products");
const phoneNumber = "972501234567";
beforeEach(() => {
    conversation_1.activeOrders.clear();
});
describe("conversation start", () => {
    test("starts an order by pressing the START_ORDER button", async () => {
        const responses = await (0, conversation_1.handleIncomingMessage)(phoneNumber, {
            type: "button",
            interactiveId: conversation_1.START_ORDER,
        });
        expect(conversation_1.activeOrders.get(phoneNumber)?.step).toBe("WAITING_FOR_NAME");
        expect(responses[0].text).toContain("What name");
    });
    test("random first message does not skip the start button", async () => {
        const responses = await (0, conversation_1.handleIncomingMessage)(phoneNumber, {
            type: "text",
            text: "hello",
        });
        expect(conversation_1.activeOrders.get(phoneNumber)?.step).toBe("WAITING_FOR_START_BUTTON");
        expect(responses[0].buttons?.[0].id).toBe(conversation_1.START_ORDER);
    });
});
describe("product search and pricing", () => {
    test("searches for a product by partial name", () => {
        expect((0, products_1.searchProducts)("גמדי").map((product) => product.id)).toContain("white-dwarf-roll");
    });
    test("searches for a product using an alias", () => {
        expect((0, products_1.searchProducts)("פרנות").map((product) => product.id)).toContain("pair-of-frenas");
    });
    test("validates carton quantities", () => {
        const product = products_2.products.find((item) => item.id === "white-dwarf-roll");
        expect(product).toBeDefined();
        expect((0, pricing_1.validateQuantity)(product, 50)).toBe(true);
        expect((0, pricing_1.validateQuantity)(product, 30)).toBe(false);
    });
    test("allows unrestricted product quantities", () => {
        const product = products_2.products.find((item) => item.id === "pair-of-frenas");
        expect(product).toBeDefined();
        expect((0, pricing_1.validateQuantity)(product, 3)).toBe(true);
    });
    test("calculates product line price", () => {
        const product = products_2.products.find((item) => item.id === "white-dwarf-roll");
        expect((0, pricing_1.calculateItemTotal)(product, 50)).toBe(11000);
    });
    test("calculates full order total", () => {
        const items = [
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
        expect((0, pricing_1.calculateOrderTotal)(items, 2000)).toBe(22000);
    });
    test("suggests nearby valid quantities", () => {
        expect((0, pricing_1.getSuggestedQuantities)(25, 30)).toEqual([25, 50]);
    });
});
describe("delivery detection", () => {
    test("detects Hebrew Beit Shemesh", () => {
        expect((0, delivery_1.isBeitShemeshAddress)("בית שמש, נהר הירדן 15")).toBe(true);
    });
    test("detects hyphenated Hebrew Beit Shemesh", () => {
        expect((0, delivery_1.isBeitShemeshAddress)("רחוב רבינא 8, בית-שמש")).toBe(true);
    });
    test("detects abbreviated Hebrew Beit Shemesh", () => {
        expect((0, delivery_1.isBeitShemeshAddress)('בי"ש, נחל קישון 4')).toBe(true);
    });
    test("detects English Beit Shemesh", () => {
        expect((0, delivery_1.isBeitShemeshAddress)("Beit Shemesh, Nahar Hayarden 15")).toBe(true);
    });
    test("detects addresses outside Beit Shemesh", () => {
        expect((0, delivery_1.isBeitShemeshAddress)("Jerusalem, Jaffa Street 25")).toBe(false);
    });
    test("charges 20 ILS for Beit Shemesh", () => {
        expect((0, delivery_1.getDeliveryPrice)("בית שמש, נהר הירדן 15")).toBe(2000);
    });
    test("charges 35 ILS outside Beit Shemesh", () => {
        expect((0, delivery_1.getDeliveryPrice)("ירושלים, יפו 25")).toBe(3500);
    });
});
describe("payment validation", () => {
    test("validates card numbers with Luhn", () => {
        expect((0, payment_1.validateCardNumber)("4242 4242 4242 4242")).toBe(true);
        expect((0, payment_1.validateCardNumber)("4242 4242 4242 4241")).toBe(false);
    });
    test("validates expiry", () => {
        expect((0, payment_1.validateExpiry)("12/99")).toBe(true);
        expect((0, payment_1.validateExpiry)("13/99")).toBe(false);
        expect((0, payment_1.validateExpiry)("01/20")).toBe(false);
    });
    test("validates CVV", () => {
        expect((0, payment_1.validateCvv)("123")).toBe(true);
        expect((0, payment_1.validateCvv)("1234")).toBe(true);
        expect((0, payment_1.validateCvv)("12a")).toBe(false);
    });
});
describe("order completion", () => {
    test("removes active session and sensitive card details after completion", async () => {
        await (0, conversation_1.handleIncomingMessage)(phoneNumber, { type: "button", interactiveId: conversation_1.START_ORDER });
        await (0, conversation_1.handleIncomingMessage)(phoneNumber, { type: "text", text: " Israel   Israeli " });
        await (0, conversation_1.handleIncomingMessage)(phoneNumber, { type: "text", text: "25/07/2026 at 10:00" });
        await (0, conversation_1.handleIncomingMessage)(phoneNumber, { type: "text", text: "בית שמש, נהר הירדן 15" });
        await (0, conversation_1.handleIncomingMessage)(phoneNumber, { type: "text", text: "גמדי לבן" });
        await (0, conversation_1.handleIncomingMessage)(phoneNumber, { type: "text", text: "1" });
        await (0, conversation_1.handleIncomingMessage)(phoneNumber, { type: "text", text: "50" });
        await (0, conversation_1.handleIncomingMessage)(phoneNumber, { type: "button", interactiveId: conversation_1.FINISH_PRODUCTS });
        await (0, conversation_1.handleIncomingMessage)(phoneNumber, { type: "button", interactiveId: conversation_1.CONTINUE_ORDER });
        await (0, conversation_1.handleIncomingMessage)(phoneNumber, { type: "text", text: "4242 4242 4242 4242" });
        await (0, conversation_1.handleIncomingMessage)(phoneNumber, { type: "text", text: "12/99" });
        await (0, conversation_1.handleIncomingMessage)(phoneNumber, { type: "text", text: "123" });
        const responses = await (0, conversation_1.handleIncomingMessage)(phoneNumber, { type: "button", interactiveId: conversation_1.USE_THIS_PHONE });
        expect(conversation_1.activeOrders.has(phoneNumber)).toBe(false);
        expect(responses[0].text).toContain("Card ending in 4242");
        expect(responses[0].text).not.toContain("4242 4242 4242 4242");
        expect(responses[0].text).not.toContain("123");
    });
});
