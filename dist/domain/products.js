"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchProducts = searchProducts;
exports.findProductById = findProductById;
const products_1 = require("../data/products");
const text_1 = require("./text");
function searchProducts(query) {
    const normalizedQuery = (0, text_1.normalizeText)(query);
    if (!normalizedQuery) {
        return [];
    }
    return products_1.products
        .filter((product) => {
        const searchable = (0, text_1.normalizeText)([product.name, ...product.aliases].join(" "));
        return searchable.includes(normalizedQuery);
    })
        .slice(0, 10);
}
function findProductById(productId) {
    return products_1.products.find((product) => product.id === productId);
}
