import { requireDashboardAuth } from "@/lib/dashboardAuth";
import PromoClient from "./PromoClient";

export default async function PromoPage() {
  await requireDashboardAuth();
  return <PromoClient />;
}
