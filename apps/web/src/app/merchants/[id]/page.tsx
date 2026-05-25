import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** Vendor profile UI lives on `/merchants` (expand row). Deep-link with `?open=<uuid>&edit=1`. */
export default async function MerchantDetailRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const editParam = sp.edit;
  const editStr = Array.isArray(editParam) ? editParam[0] : editParam;
  const withEdit = editStr === '1' || editStr === 'true';
  const q = new URLSearchParams();
  q.set('open', id);
  if (withEdit) q.set('edit', '1');
  redirect(`/merchants?${q.toString()}`);
}
