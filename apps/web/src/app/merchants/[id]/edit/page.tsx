import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** Old standalone edit URL — keeps bookmarks working while the UI is merged on the main profile. */
export default async function MerchantEditRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/merchants?open=${encodeURIComponent(id)}&edit=1`);
}
