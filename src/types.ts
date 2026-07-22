export type PricingUnit = "unit" | "pair" | "six_pack" | "kilogram" | "cake";

export interface Product {
  id: string;
  name: string;
  aliases: string[];
  priceAgorot: number;
  pricingUnit: PricingUnit;
  packageSize: number;
  soldInMultiples: boolean;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceAgorot: number;
  totalPriceAgorot: number;
}

export type ConversationStep =
  | "WAITING_FOR_START_BUTTON"
  | "WAITING_FOR_NAME"
  | "WAITING_FOR_DATE"
  | "WAITING_FOR_ADDRESS"
  | "WAITING_FOR_PRODUCT_SEARCH"
  | "WAITING_FOR_PRODUCT_SELECTION"
  | "WAITING_FOR_QUANTITY"
  | "WAITING_FOR_CART_ACTION"
  | "WAITING_FOR_ORDER_CONFIRMATION"
  | "WAITING_FOR_CARD_NUMBER"
  | "WAITING_FOR_CARD_EXPIRY"
  | "WAITING_FOR_CARD_CVV"
  | "WAITING_FOR_PHONE_CONFIRMATION"
  | "WAITING_FOR_ALTERNATIVE_PHONE";

export interface OrderSession {
  step: ConversationStep;
  customerName?: string;
  requestedDate?: string;
  address?: string;
  isBeitShemesh?: boolean;
  deliveryPriceAgorot?: number;
  items: OrderItem[];
  searchResults?: Product[];
  selectedProduct?: Product;
  phone?: string;
  cardLastFourDigits?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  stepHistory: ConversationStep[];
}

export interface IncomingMessage {
  type: "text" | "button" | "list_reply";
  text?: string;
  interactiveId?: string;
}

export interface BotButton {
  id: string;
  title: string;
}

export interface BotListOption {
  id: string;
  title: string;
  description?: string;
}

export interface BotResponse {
  type: "text" | "buttons" | "list";
  text: string;
  buttons?: BotButton[];
  options?: BotListOption[];
}
