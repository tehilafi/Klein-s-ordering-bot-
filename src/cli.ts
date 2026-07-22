import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { handleIncomingMessage, START_ORDER } from "./conversation";
import { BotResponse, IncomingMessage } from "./types";

const phoneNumber = "0501234567";

function printResponse(response: BotResponse): void {
  console.log(`\n${response.text}`);
  if (response.buttons?.length) {
    response.buttons.forEach((button, index) => {
      console.log(`[${index + 1}] ${button.title}`);
    });
  }
  if (response.options?.length) {
    response.options.forEach((option, index) => {
      console.log(`[${index + 1}] ${option.title}${option.description ? ` - ${option.description}` : ""}`);
    });
  }
}

function toMessage(value: string, lastResponses: BotResponse[]): IncomingMessage {
  const trimmed = value.trim();
  if (trimmed === "1" && lastResponses.some((response) => response.buttons?.some((button) => button.id === START_ORDER))) {
    return { type: "button", interactiveId: START_ORDER };
  }

  const buttonResponse = lastResponses.find((response) => response.buttons?.[Number(trimmed) - 1]);
  const button = buttonResponse?.buttons?.[Number(trimmed) - 1];
  if (button) {
    return { type: "button", interactiveId: button.id, text: button.title };
  }

  const listResponse = lastResponses.find((response) => response.options?.[Number(trimmed) - 1]);
  const option = listResponse?.options?.[Number(trimmed) - 1];
  if (option) {
    return { type: "list_reply", interactiveId: option.id, text: option.title };
  }

  return { type: "text", text: trimmed };
}

async function main(): Promise<void> {
  const rl = readline.createInterface({ input, output });
  let responses = await handleIncomingMessage(phoneNumber, { type: "text", text: "hello" });
  responses.forEach(printResponse);

  while (true) {
    const value = await rl.question("\n> ");
    if (value.trim().toLowerCase() === "exit") {
      rl.close();
      return;
    }
    responses = await handleIncomingMessage(phoneNumber, toMessage(value, responses));
    responses.forEach(printResponse);
  }
}

void main();
