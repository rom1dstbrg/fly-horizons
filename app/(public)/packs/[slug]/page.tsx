import { permanentRedirect } from "next/navigation";

export default async function PackSlugRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  permanentRedirect(`/vols/${slug}`);
}
