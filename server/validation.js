"use strict";

const PRODUCT_UNITS = new Set(["kg", "item"]);

function requireObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function validateProduct(input, partial = false) {
  if (!requireObject(input)) {
    return { error: "Request body must be a JSON object." };
  }

  const product = {};
  const errors = [];

  if (!partial || Object.hasOwn(input, "name")) {
    const name =
      typeof input.name === "string"
        ? input.name.trim().replace(/\s+/g, " ")
        : "";
    if (!name) errors.push("name is required");
    else product.name = name;
  }

  if (!partial || Object.hasOwn(input, "category")) {
    const category =
      typeof input.category === "string" ? input.category.trim() : "";
    if (!category) errors.push("category is required");
    else product.category = category;
  }

  if (!partial || Object.hasOwn(input, "price")) {
    const price = Number(input.price);
    if (!Number.isFinite(price) || price < 0) {
      errors.push("price must be a number greater than or equal to 0");
    } else {
      product.price = price;
    }
  }

  if (!partial || Object.hasOwn(input, "unit")) {
    if (!PRODUCT_UNITS.has(input.unit)) {
      errors.push('unit must be either "kg" or "item"');
    } else {
      product.unit = input.unit;
    }
  }

  if (!partial || Object.hasOwn(input, "available_quantity")) {
    const quantity = Number(input.available_quantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      errors.push(
        "available_quantity must be a number greater than or equal to 0",
      );
    } else if (!Number.isInteger(quantity)) {
      errors.push("available_quantity must be a whole number (no decimals)");
    } else {
      product.available_quantity = quantity;
    }
  }

  if (Object.hasOwn(input, "description")) {
    product.description =
      typeof input.description === "string" ? input.description.trim() : null;
  }

  if (Object.hasOwn(input, "image_url")) {
    if (input.image_url === null || input.image_url === "") {
      product.image_url = null;
    } else {
      try {
        const imageUrl = new URL(input.image_url);
        if (!["http:", "https:"].includes(imageUrl.protocol)) throw new Error();
        product.image_url = imageUrl.href;
      } catch {
        errors.push("image_url must be a valid HTTP or HTTPS URL");
      }
    }
  }

  if (Object.hasOwn(input, "is_active")) {
    if (typeof input.is_active !== "boolean") {
      errors.push("is_active must be true or false");
    } else {
      product.is_active = input.is_active;
    }
  }

  if (partial && !Object.keys(product).length && !errors.length) {
    errors.push("provide at least one product field to update");
  }

  return errors.length ? { error: errors.join("; ") } : { product };
}

module.exports = { validateProduct };
