import { requireDashboardAuth } from "@/lib/dashboardAuth";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage() {
  await requireDashboardAuth();
  return <ReportsClient />;
}
