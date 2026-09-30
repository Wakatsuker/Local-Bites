"use strict";

const browserConfig = require("../js/supabase-config.js");

const port = Number(process.env.PORT || 3000);
const supabaseUrl = process.env.SUPABASE_URL || browserConfig.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  browserConfig.SUPABASE_ANON_KEY;

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port number.");
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase configuration. Set SUPABASE_URL and " +
      "SUPABASE_PUBLISHABLE_KEY in .env.",
  );
}

module.exports = {
  port,
  supabaseKey,
  supabaseUrl: supabaseUrl.replace(/\/$/, ""),
};
