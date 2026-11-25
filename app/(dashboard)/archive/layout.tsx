import { redirect } from "next/navigation";
import { getCurrentRole, isAdminRole } from "@/lib/supabase/role";

// The archive is for admins only
export default async function ArchiveLayout({ children }: { children: React.ReactNode }) {
  if (!isAdminRole(await getCurrentRole())) redirect("/dashboard");
  return <>{children}</>;
}
