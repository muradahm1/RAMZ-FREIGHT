// assets/supabaseClient.js

// Production configuration - use environment variables
const supabaseUrl = window.location.hostname === 'localhost' 
  ? 'https://sgmcuwmqmgchvnncbarb.supabase.co'
  : 'https://sgmcuwmqmgchvnncbarb.supabase.co'; // Replace with your production URL

const supabaseAnonKey = window.location.hostname === 'localhost'
  ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnbWN1d21xbWdjaHZubmNiYXJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODk5ODYsImV4cCI6MjA3NDk2NTk4Nn0.zytOCIukl2NJCq2ZSXeCo_XCOpSxH6bqV3wk9iLXqM0'
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnbWN1d21xbWdjaHZubmNiYXJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODk5ODYsImV4cCI6MjA3NDk2NTk4Nn0.zytOCIukl2NJCq2ZSXeCo_XCOpSxH6bqV3wk9iLXqM0'; // Same for now

// The CDN script creates a global 'supabase' object. We can access the createClient function from it.
// Export a mutable binding for the Supabase client and a promise that resolves
// when the client is ready. This allows pages to await initialization while
// still supporting the common pattern of including the CDN in the HTML head.
export let supabase = null;

async function loadSupabaseCdnIfNeeded() {
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    // Load the UMD bundle from CDN so window.supabase becomes available
    const src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    console.info('Supabase not present, loading CDN:', src);
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = (e) => reject(new Error('Failed to load Supabase CDN: ' + src));
      document.head.appendChild(s);
    });
  }

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    throw new Error('Supabase JS is not available after attempting to load CDN.');
  }

  const { createClient } = window.supabase;
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  return supabase;
}

// Consumers can await this promise to make sure `supabase` is initialized.
export const supabaseReady = loadSupabaseCdnIfNeeded();

// The backend URL - environment based
export const backendUrl = window.location.hostname === 'localhost'
  ? 'http://localhost:4000'
  : 'https://ramz-freight.onrender.com';