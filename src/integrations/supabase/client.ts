import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://emrkfmafsyoaodgvyjch.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcmtmbWFmc3lvYW9kZ3Z5amNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzMTU0NzYsImV4cCI6MjA1NTg5MTQ3Nn0.eVCJ0RV5AvvXyHHO1cwr_TR2mKwRhwkwsBLflXWDrMU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    // Increase timeout values
    fetch: (url, options) => {
      return fetch(url, {
        ...options,
        // Increase timeout by adding AbortController with generous timeout
        signal: AbortSignal.timeout(30000) // 30 seconds timeout
      });
    }
  },
  realtime: {
    // More reliable connection parameters
    timeout: 60000, // 60 seconds
    heartbeatIntervalMs: 15000
  },
  // Automatically handle DB errors with debug logging
  db: {
    schema: 'public'
  }
});
