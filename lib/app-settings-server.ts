import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_SETTINGS, parseSettings, type AppSettings } from "@/lib/app-settings";

/** Réglages courants (table `crm_settings`, quelques lignes). En cas d'erreur de lecture : les défauts. */
export async function getAppSettings(): Promise<AppSettings> {
  try {
    const { data, error } = await createAdminClient().from("crm_settings").select("key, value");
    if (error) return DEFAULT_SETTINGS;
    return parseSettings(data as { key: string; value: string }[]);
  } catch {
    return DEFAULT_SETTINGS;
  }
}
