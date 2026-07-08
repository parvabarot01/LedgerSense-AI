import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserOrganizations } from "@/lib/org";
import { CreateOrgForm } from "@/components/auth/CreateOrgForm";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const memberships = await getUserOrganizations(supabase, user.id);
  if (memberships.length > 0) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl text-ink-navy">Set up your workspace</h1>
          <p className="mt-1 text-sm text-ink-navy-soft">
            You&apos;ll be the owner and can invite your team afterward.
          </p>
        </div>
        <div className="rounded-sm border border-hairline bg-paper-raised p-6">
          <CreateOrgForm />
        </div>
      </div>
    </main>
  );
}
