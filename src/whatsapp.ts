import { BotResponse, IncomingMessage } from "./types";

export function parseWhatsAppMessage(body: unknown): { phoneNumber: string; message: IncomingMessage } | undefined {
  const entry = (body as any)?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const incoming = value?.messages?.[0];
  if (!incoming?.from) {
    return undefined;
  }

  if (incoming.type === "interactive") {
    const buttonId = incoming.interactive?.button_reply?.id;
    const listId = incoming.interactive?.list_reply?.id;
    return {
      phoneNumber: incoming.from,
      message: {
        type: buttonId ? "button" : "list_reply",
        interactiveId: buttonId ?? listId,
        text: incoming.interactive?.button_reply?.title ?? incoming.interactive?.list_reply?.title,
      },
    };
  }

  return {
    phoneNumber: incoming.from,
    message: { type: "text", text: incoming.text?.body ?? "" },
  };
}

export async function sendWhatsAppResponses(phoneNumber: string, responses: BotResponse[]): Promise<void> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.log(`Responses for ${phoneNumber}:`, JSON.stringify(responses, null, 2));
    return;
  }

  for (const response of responses) {
    await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(toWhatsAppPayload(phoneNumber, response)),
    });
  }
}

function toWhatsAppPayload(phoneNumber: string, response: BotResponse): Record<string, unknown> {
  if (response.type === "buttons" && response.buttons?.length) {
    return {
      messaging_product: "whatsapp",
      to: phoneNumber,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: response.text },
        action: {
          buttons: response.buttons.slice(0, 3).map((button) => ({
            type: "reply",
            reply: { id: button.id, title: button.title.slice(0, 20) },
          })),
        },
      },
    };
  }

  if (response.type === "list" && response.options?.length) {
    return {
      messaging_product: "whatsapp",
      to: phoneNumber,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: response.text },
        action: {
          button: "Select",
          sections: [
            {
              title: "Products",
              rows: response.options.slice(0, 10).map((option) => ({
                id: option.id,
                title: option.title.slice(0, 24),
                description: option.description?.slice(0, 72),
              })),
            },
          ],
        },
      },
    };
  }

  return {
    messaging_product: "whatsapp",
    to: phoneNumber,
    type: "text",
    text: { body: response.text },
  };
}
