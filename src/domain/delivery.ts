export const DELIVERY_PRICES = {
  BEIT_SHEMESH: 2000,
  OUTSIDE_BEIT_SHEMESH: 3500,
} as const;

const BEIT_SHEMESH_TERMS = [
  "בית שמש",
  "ביש",
  "beit shemesh",
  "bet shemesh",
  "beth shemesh",
];

export function normalizeAddress(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[״"'׳]/g, "")
    .replace(/[-־]/g, " ")
    .replace(/[.,!?;:()[\]{}]/g, " ")
    .replace(/\s+/g, " ");
}

export function isBeitShemeshAddress(address: string): boolean {
  const normalizedAddress = normalizeAddress(address);
  return BEIT_SHEMESH_TERMS.some((term) =>
    normalizedAddress.includes(normalizeAddress(term)),
  );
}

export function getDeliveryPrice(address: string): number {
  return isBeitShemeshAddress(address)
    ? DELIVERY_PRICES.BEIT_SHEMESH
    : DELIVERY_PRICES.OUTSIDE_BEIT_SHEMESH;
}
