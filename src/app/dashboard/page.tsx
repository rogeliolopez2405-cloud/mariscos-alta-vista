import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const isAuthed = cookieStore.get("dashboard_auth")?.value === "1";

  if (!isAuthed) {
    redirect("/dashboard/login");
  }

  return <DashboardClient />;
}
