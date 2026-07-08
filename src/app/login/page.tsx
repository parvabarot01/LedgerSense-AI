import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl text-ink-navy">LedgerSense</h1>
          <p className="mt-1 text-sm text-ink-navy-soft">Sign in to your workspace</p>
        </div>
        <div className="rounded-sm border border-hairline bg-paper-raised p-6">
          <LoginForm next={next} />
        </div>
        <p className="mt-6 text-center text-sm text-ink-navy-soft">
          No account yet?{" "}
          <Link href="/signup" className="text-trace hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
