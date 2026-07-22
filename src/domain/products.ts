import { products } from "../data/products";
import { Product } from "../types";
import { normalizeText } from "./text";

export function searchProducts(query: string): Product[] {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return [];
  }

  return products
    .filter((product) => {
      const searchable = normalizeText([product.name, ...product.aliases].join(" "));
      return searchable.includes(normalizedQuery);
    })
    .slice(0, 10);
}

export function findProductById(productId: string): Product | undefined {
  return products.find((product) => product.id === productId);
}
