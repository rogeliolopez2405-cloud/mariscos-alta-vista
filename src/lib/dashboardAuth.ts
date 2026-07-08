import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function requireDashboardAuth() {
  const cookieStore = await cookies();
  const isAuthed = cookieStore.get("dashboard_auth")?.value === "1";
  if (!isAuthed) {
    redirect("/dashboard/login");
  }
}
