import "dotenv/config";
import express from "express";
import { handleIncomingMessage } from "./conversation";
import { parseWhatsAppMessage, sendWhatsAppResponses } from "./whatsapp";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).send("Klein's Bakery ordering bot is running");
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "kleins-bakery-ordering-bot",
  });
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
  console.log("POST /webhook received", {
    object: req.body?.object,
    hasEntry: Boolean(req.body?.entry?.length),
  });

  try {
    const parsed = parseWhatsAppMessage(req.body);

    console.log("Webhook parse result", {
      parsed: Boolean(parsed),
      phoneNumber: parsed?.phoneNumber,
      messageType: parsed?.message.type,
    });

    if (parsed) {
      const responses = await handleIncomingMessage(
        parsed.phoneNumber,
        parsed.message
      );

      console.log("Bot responses generated", {
        count: responses.length,
        types: responses.map((response) => response.type),
      });

      await sendWhatsAppResponses(
        parsed.phoneNumber,
        responses
      );
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("עיבוד ה-Webhook נכשל", error);
    res.sendStatus(500);
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`הבוט של מאפיית קליינס מאזין בפורט ${port}`);
});
