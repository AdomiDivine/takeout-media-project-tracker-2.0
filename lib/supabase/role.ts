import { createClient } from "@/lib/supabase/server";

// The signed-in user's role, read on the server. null when not signed in.
export async function getCurrentRole(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
  return data?.role ?? null;
}

export function isAdminRole(role: string | null) {
  return role === "admin" || role === "super_admin";
}
