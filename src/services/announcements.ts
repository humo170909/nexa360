import { supabase } from "../lib/supabaseClient";
import type { Announcement } from "../types/announcement";

export interface AnnouncementInput {
  title: string;
  body?: string | null;
  published_at: string;
}

export async function listAnnouncements(companyId: string): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("company_id", companyId)
    .order("published_at", { ascending: false });
  if (error || !data) return [];
  return data as Announcement[];
}

export async function createAnnouncement(companyId: string, input: AnnouncementInput) {
  const { data, error } = await supabase
    .from("announcements")
    .insert({ company_id: companyId, ...input })
    .select()
    .single();
  return { data: data as Announcement | null, error: error?.message ?? null };
}

export async function updateAnnouncement(id: string, input: AnnouncementInput) {
  const { data, error } = await supabase
    .from("announcements")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  return { data: data as Announcement | null, error: error?.message ?? null };
}

export async function deleteAnnouncement(id: string) {
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  return { error: error?.message ?? null };
}
