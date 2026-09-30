import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();

  if (session?.role === "owner") {
    redirect("/dashboard");
  } else if (session?.role === "customer") {
    redirect("/portal");
  } else {
    redirect("/login");
  }
}
