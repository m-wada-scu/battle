import { createClient } from '@supabase/supabase-js'
import type { Post, Thread } from '../../api/lib/types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  )
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder',
)

export type { Post, Thread }

export async function fetchActiveThread(): Promise<Thread | null> {
  const { data, error } = await supabase
    .from('threads')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function fetchPosts(threadId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('thread_id', threadId)
    .order('post_number', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export function subscribeToPosts(
  threadId: string,
  onInsert: (post: Post) => void,
): () => void {
  const channel = supabase
    .channel(`posts:${threadId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: `thread_id=eq.${threadId}`,
      },
      (payload) => {
        onInsert(payload.new as Post)
      },
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
