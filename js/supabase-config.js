// Add these values later from Supabase Project Settings > API.
// Use the anon/publishable key in the browser. Never expose the service_role key.
const SUPABASE_URL = 'https://hmggrhmebfkhdnrrasub.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtZ2dyaG1lYmZraGRucnJhc3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NzYyODYsImV4cCI6MjEwNTA1MjI4Nn0.r6vvwH2V1n3wkkRJLzpdtNW-mP4igzNK4bSExTlG81g';
var SUPABASE_FARM_ID = '';

// Allow the local Node API to reuse the same public Supabase configuration.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SUPABASE_URL, SUPABASE_ANON_KEY };
}


