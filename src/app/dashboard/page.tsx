import { requireDashboardAuth } from "@/lib/dashboardAuth";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  await requireDashboardAuth();
  return <DashboardClient />;
}
