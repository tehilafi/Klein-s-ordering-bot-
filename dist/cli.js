"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("node:readline/promises"));
const node_process_1 = require("node:process");
const conversation_1 = require("./conversation");
const phoneNumber = "0501234567";
function printResponse(response) {
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
function toMessage(value, lastResponses) {
    const trimmed = value.trim();
    if (trimmed === "1" && lastResponses.some((response) => response.buttons?.some((button) => button.id === conversation_1.START_ORDER))) {
        return { type: "button", interactiveId: conversation_1.START_ORDER };
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
async function main() {
    const rl = promises_1.default.createInterface({ input: node_process_1.stdin, output: node_process_1.stdout });
    let responses = await (0, conversation_1.handleIncomingMessage)(phoneNumber, { type: "text", text: "hello" });
    responses.forEach(printResponse);
    while (true) {
        const value = await rl.question("\n> ");
        if (value.trim().toLowerCase() === "exit") {
            rl.close();
            return;
        }
        responses = await (0, conversation_1.handleIncomingMessage)(phoneNumber, toMessage(value, responses));
        responses.forEach(printResponse);
    }
}
void main();
