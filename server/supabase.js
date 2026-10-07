"use strict";

const { supabaseKey, supabaseUrl } = require("./config.js");

class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function supabaseRequest(path, options = {}) {
  const headers = {
    apikey: supabaseKey,
    Accept: "application/json",
    ...options.headers,
  };

  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${supabaseUrl}/${path.replace(/^\//, "")}`, {
    method: options.method || "GET",
    headers,
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const responseText = await response.text();
  let responseBody = null;

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }
  }

  if (!response.ok) {
    const message =
      responseBody?.message ||
      responseBody?.error_description ||
      responseBody?.error ||
      `Supabase request failed with status ${response.status}.`;
    throw new ApiError(response.status, message, responseBody);
  }

  return responseBody;
}

function getBearerToken(request) {
  const authorization = request.headers.authorization || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw new ApiError(
      401,
      "Missing access token. Use Authorization: Bearer <access_token>.",
    );
  }

  return match[1].trim();
}

async function authenticate(request) {
  const accessToken = getBearerToken(request);
  const user = await supabaseRequest("auth/v1/user", { accessToken });
  return { accessToken, user };
}

module.exports = {
  ApiError,
  authenticate,
  supabaseRequest,
};
