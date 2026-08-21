import { requireRole } from "@/lib/auth";
import { DirectorNavTabs } from "@/components/director/nav-tabs";

export default async function DirectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard the entire director sub-routes
  await requireRole(["OPERATIONS_DIRECTOR", "FLIGHT_DISPATCHER", "GROUND_CREW_LEAD"]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 min-h-screen bg-slate-950 text-slate-100">
      <DirectorNavTabs />
      <div>
        {children}
      </div>
    </div>
  );
}
