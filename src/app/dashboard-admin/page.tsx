import { redirect } from 'next/navigation';

export default function DashboardAdminRootPage() {
  redirect('/dashboard-admin/dashboard');
}