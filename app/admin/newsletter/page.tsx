import { getNewsletterStats, getNewsletterTemplates } from "@/lib/actions/newsletter";
import { NewsletterClient } from "@/components/admin/NewsletterClient";

export const metadata = { title: "Newsletter — Admin" };

export default async function NewsletterPage() {
  const [{ total, active, subscribers }, templates] = await Promise.all([
    getNewsletterStats(),
    getNewsletterTemplates(),
  ]);
  return (
    <NewsletterClient
      total={total}
      active={active}
      subscribers={subscribers}
      templates={templates}
    />
  );
}
