import { redirect } from "next/navigation";

export default async function VoucherSlugRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/vols/${slug}`);
}
