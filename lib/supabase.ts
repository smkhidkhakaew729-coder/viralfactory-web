import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = 'https://nlnmrbcqxzwklwjqfajr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sbm1yYmNxeHp3a2x3anFmYWpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NDE0NDMsImV4cCI6MjA5ODIxNzQ0M30.isruXjjuYIzE2YIv0mxtkclvLLQnyA_yHMVghQuJ6bg'

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
