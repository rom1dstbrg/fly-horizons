"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorisé");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Non autorisé");
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ChatSession {
  id: string;
  last_message_at: string;
  messages: ChatMessage[];
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  await checkAdmin();
  const supabase = createAdminClient();
  await supabase.from("chat_messages").delete().eq("session_id", sessionId);
  await supabase.from("chat_sessions").delete().eq("id", sessionId);
}

export async function getChatSessions(): Promise<ChatSession[]> {
  await checkAdmin();
  const supabase = createAdminClient();

  const { data: sessionsRaw } = await supabase
    .from("chat_sessions")
    .select("id, last_message_at")
    .order("last_message_at", { ascending: false })
    .limit(200);

  if (!sessionsRaw || sessionsRaw.length === 0) return [];

  const ids = sessionsRaw.map((s) => s.id);
  const { data: messagesRaw } = await supabase
    .from("chat_messages")
    .select("id, session_id, role, content, created_at")
    .in("session_id", ids)
    .order("created_at", { ascending: true });

  const msgBySession: Record<string, ChatMessage[]> = {};
  for (const m of messagesRaw ?? []) {
    if (!msgBySession[m.session_id]) msgBySession[m.session_id] = [];
    msgBySession[m.session_id].push(m as ChatMessage);
  }

  return sessionsRaw
    .map((s) => ({
      id: s.id,
      last_message_at: s.last_message_at,
      messages: msgBySession[s.id] ?? [],
    }))
    .filter((s) => s.messages.length > 0);
}
