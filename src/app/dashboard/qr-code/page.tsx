import { requireDashboardAuth } from "@/lib/dashboardAuth";
import QrCodeClient from "./QrCodeClient";

export default async function QrCodePage() {
  await requireDashboardAuth();
  return <QrCodeClient />;
}
