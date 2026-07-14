import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Post, Thread } from './types'

export type Database = {
  public: {
    Tables: {
      threads: {
        Row: Thread
        Insert: Omit<Thread, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Thread>
      }
      posts: {
        Row: Post
        Insert: Omit<Post, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Post>
      }
    }
  }
}

export function createServiceClient(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function createAnonClient(): SupabaseClient<Database> {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required')
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
