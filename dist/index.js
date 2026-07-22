"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const conversation_1 = require("./conversation");
const whatsapp_1 = require("./whatsapp");
const app = (0, express_1.default)();
const port = Number(process.env.PORT ?? 3000);
app.use(express_1.default.json());
app.get("/health", (_req, res) => {
    res.json({ ok: true });
});
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        res.status(200).send(challenge);
        return;
    }
    res.sendStatus(403);
});
app.post("/webhook", async (req, res) => {
    try {
        const parsed = (0, whatsapp_1.parseWhatsAppMessage)(req.body);
        if (parsed) {
            const responses = await (0, conversation_1.handleIncomingMessage)(parsed.phoneNumber, parsed.message);
            await (0, whatsapp_1.sendWhatsAppResponses)(parsed.phoneNumber, responses);
        }
        res.sendStatus(200);
    }
    catch (error) {
        console.error("Webhook processing failed", error);
        res.sendStatus(500);
    }
});
app.listen(port, () => {
    console.log(`Kleins Bakery bot listening on port ${port}`);
});
