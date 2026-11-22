import type { Metadata } from "next";
import { Lockup } from "@/components/brand/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Team sign in", robots: { index: false } };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-space-5 px-space-3 py-space-6">
      <div className="flex flex-col items-center gap-space-3">
        <Lockup />
        <p className="label text-ink-muted">Team</p>
      </div>
      {error === "link" && (
        <p role="alert" className="text-body-s text-critical">
          That sign-in link has expired or was already used. Request a new one.
        </p>
      )}
      <LoginForm />
    </main>
  );
}
