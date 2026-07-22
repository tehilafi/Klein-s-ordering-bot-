# Kleins Bakery WhatsApp Ordering Bot

A simple Node.js, TypeScript, Express, and Jest ordering bot for Kleins Bakery.

The bot stores active conversations only in memory with a `Map`, uses a local TypeScript product catalog, calculates delivery from the entered address, and clears sessions when orders are cancelled or completed.

## Setup

```bash
npm install
cp .env.example .env
npm test
```

## Local CLI Mode

```bash
npm run dev:cli
```

The CLI uses the same conversation service as the WhatsApp webhook. Enter `1` at the welcome screen to simulate the `START_ORDER` button.

## Express Webhook

```bash
npm run dev
```

Configure WhatsApp Cloud API webhook verification with:

- `GET /webhook`
- verify token from `WHATSAPP_VERIFY_TOKEN`

Incoming messages should be sent to:

- `POST /webhook`

The webhook parses text messages, button replies, and list replies, then routes them through `handleIncomingMessage`.

To send real WhatsApp responses, set:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`

When these values are omitted, responses are printed to the server console without card details.
