import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://hmggrhmebfkhdnrrasub.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtZ2dyaG1lYmZraGRucnJhc3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NzYyODYsImV4cCI6MjEwNTA1MjI4Nn0.r6vvwH2V1n3wkkRJLzpdtNW-mP4igzNK4bSExTlG81g';
export const PRODUCT_IMAGE_BUCKET = 'product-images';
export const EMPTY_IMAGE = 'https://placehold.co/500x500/e8f5eb/056532?text=Fresh+Produce';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function safeImageUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : EMPTY_IMAGE;
  } catch {
    return EMPTY_IMAGE;
  }
}

export function formatMoney(value) {
  return `PHP ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
