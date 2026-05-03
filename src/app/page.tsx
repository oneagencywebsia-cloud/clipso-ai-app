import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) redirect("/dashboard");
    redirect("/login");
  } catch (error) {
    console.error("Root page error:", error);
    redirect("/login");
  }
}
