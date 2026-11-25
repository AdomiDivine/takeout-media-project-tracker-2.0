import { redirect } from "next/navigation";
import ReportsView from "@/components/reports/ReportsView";
import { getCurrentRole, isAdminRole } from "@/lib/supabase/role";

// Admins get the full Reports page; members download their report from Settings.
export default async function ReportsPage() {
  if (!isAdminRole(await getCurrentRole())) redirect("/settings?tab=reports");
  return <ReportsView />;
}
