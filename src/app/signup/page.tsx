import Link from "next/link";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl text-ink-navy">LedgerSense</h1>
          <p className="mt-1 text-sm text-ink-navy-soft">Create your workspace</p>
        </div>
        <div className="rounded-sm border border-hairline bg-paper-raised p-6">
          <SignupForm />
        </div>
        <p className="mt-6 text-center text-sm text-ink-navy-soft">
          Already have an account?{" "}
          <Link href="/login" className="text-trace hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
