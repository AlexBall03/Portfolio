import { notFound } from 'next/navigation';
import { requireAdmin } from '@/server/auth/admin';

/** Unknown console URLs: the admin's own 404 (only the admin ever gets this far). */
export default async function AdminCatchAll() {
  await requireAdmin();
  notFound();
}
