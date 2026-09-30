"use strict";

const http = require("node:http");
const { port } = require("./config.js");
const { ApiError, authenticate, supabaseRequest } = require("./supabase.js");
const { validateProduct } = require("./validation.js");

const PRODUCT_SELECT = [
  "id",
  "farm_id",
  "name",
  "description",
  "category",
  "price",
  "unit",
  "available_quantity",
  "image_url",
  "is_active",
  "created_at",
  "updated_at",
  "farms(farm_name,location)",
].join(",");

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body, null, 2));
}

function sendEmpty(response, status = 204) {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  });
  response.end();
}

async function readJson(request) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > 1_000_000) {
      throw new ApiError(413, "Request body exceeds the 1 MB limit.");
    }
    chunks.push(chunk);
  }

  if (!chunks.length) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError(400, "Request body must contain valid JSON.");
  }
}

function productIdFromPath(pathname) {
  const match = pathname.match(
    /^\/api\/products\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i,
  );
  return match?.[1] || null;
}

function productPath(parameters) {
  return `rest/v1/products?${parameters.toString()}`;
}

async function login(request, response) {
  const body = await readJson(request);
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    throw new ApiError(400, "email and password are required.");
  }

  const session = await supabaseRequest(
    "auth/v1/token?grant_type=password",
    {
      method: "POST",
      body: { email, password },
    },
  );

  sendJson(response, 200, {
    message: "Login successful.",
    access_token: session.access_token,
    token_type: session.token_type,
    expires_in: session.expires_in,
    refresh_token: session.refresh_token,
    user: session.user,
  });
}

async function listProducts(url, response) {
  const parameters = new URLSearchParams({
    select: PRODUCT_SELECT,
    is_active: `eq.${url.searchParams.get("active") !== "false"}`,
    order: "created_at.desc",
  });

  const category = url.searchParams.get("category")?.trim();
  const search = url.searchParams.get("search")?.trim();
  const requestedLimit = Number(url.searchParams.get("limit") || 50);
  const requestedOffset = Number(url.searchParams.get("offset") || 0);
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 100)
    : 50;
  const offset = Number.isInteger(requestedOffset)
    ? Math.max(requestedOffset, 0)
    : 0;

  parameters.set("limit", String(limit));
  parameters.set("offset", String(offset));
  if (category) parameters.set("category", `eq.${category}`);
  if (search) parameters.set("name", `ilike.*${search}*`);

  const products = await supabaseRequest(productPath(parameters));
  sendJson(response, 200, {
    data: products,
    count: products.length,
    limit,
    offset,
  });
}

async function getProduct(productId, response) {
  const parameters = new URLSearchParams({
    select: PRODUCT_SELECT,
    id: `eq.${productId}`,
    limit: "1",
  });
  const products = await supabaseRequest(productPath(parameters));

  if (!products.length) {
    throw new ApiError(404, "Product not found.");
  }

  sendJson(response, 200, { data: products[0] });
}

async function findSellerFarm(userId, accessToken) {
  const parameters = new URLSearchParams({
    select: "id,farm_name",
    seller_id: `eq.${userId}`,
    limit: "1",
  });
  const farms = await supabaseRequest(`rest/v1/farms?${parameters}`, {
    accessToken,
  });

  if (!farms.length) {
    throw new ApiError(
      409,
      "This account has no farm. Open the Seller portal once to create it.",
    );
  }

  return farms[0];
}

async function createProduct(request, response) {
  const { accessToken, user } = await authenticate(request);
  const validation = validateProduct(await readJson(request));

  if (validation.error) throw new ApiError(400, validation.error);

  const farm = await findSellerFarm(user.id, accessToken);
  const products = await supabaseRequest("rest/v1/products", {
    method: "POST",
    accessToken,
    headers: { Prefer: "return=representation" },
    body: {
      ...validation.product,
      farm_id: farm.id,
    },
  });

  sendJson(response, 201, {
    message: "Product created successfully.",
    data: products[0],
  });
}

async function updateProduct(request, response, productId) {
  const { accessToken } = await authenticate(request);
  const validation = validateProduct(await readJson(request), true);

  if (validation.error) throw new ApiError(400, validation.error);

  const parameters = new URLSearchParams({ id: `eq.${productId}` });
  const products = await supabaseRequest(productPath(parameters), {
    method: "PATCH",
    accessToken,
    headers: { Prefer: "return=representation" },
    body: {
      ...validation.product,
      updated_at: new Date().toISOString(),
    },
  });

  if (!products.length) {
    throw new ApiError(404, "Product not found or not owned by this seller.");
  }

  sendJson(response, 200, {
    message: "Product updated successfully.",
    data: products[0],
  });
}

async function deleteProduct(request, response, productId) {
  const { accessToken } = await authenticate(request);
  const parameters = new URLSearchParams({ id: `eq.${productId}` });
  const products = await supabaseRequest(productPath(parameters), {
    method: "DELETE",
    accessToken,
    headers: { Prefer: "return=representation" },
  });

  if (!products.length) {
    throw new ApiError(404, "Product not found or not owned by this seller.");
  }

  sendJson(response, 200, {
    message: "Product deleted successfully.",
    data: products[0],
  });
}

async function handleRequest(request, response) {
  if (request.method === "OPTIONS") {
    sendEmpty(response);
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host}`);
  const productId = productIdFromPath(url.pathname);

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, {
      status: "ok",
      service: "LocalBites API",
      database: "Supabase",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    await login(request, response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/products") {
    await listProducts(url, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/products") {
    await createProduct(request, response);
    return;
  }

  if (request.method === "GET" && productId) {
    await getProduct(productId, response);
    return;
  }

  if (["PATCH", "PUT"].includes(request.method) && productId) {
    await updateProduct(request, response, productId);
    return;
  }

  if (request.method === "DELETE" && productId) {
    await deleteProduct(request, response, productId);
    return;
  }

  throw new ApiError(404, "API route not found.");
}

const server = http.createServer(async (request, response) => {
  try {
    await handleRequest(request, response);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    sendJson(response, status, {
      error: error.message || "Unexpected server error.",
      ...(error.details ? { details: error.details } : {}),
    });
  }
});

server.listen(port, () => {
  console.log(`LocalBites API running at http://localhost:${port}`);
});
