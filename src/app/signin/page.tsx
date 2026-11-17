"use client";

/**
 * Full-page sign-in. The header "Sign in" is a link here, so it works even
 * before the app has hydrated, and /admin links here too.
 */
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SignInForm } from "../app/Account";

function safeNext(raw: string | null): string {
  // Same-origin paths only — never "//evil.com" or "https://…".
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/app";
}

function SignIn() {
  const next = safeNext(useSearchParams().get("next"));
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <Link href="/" className="text-lg font-bold text-brand-700">
        TaxSense <span className="font-normal text-stone-400">AI</span>
      </Link>
      <h1 className="mt-6 text-2xl font-bold text-stone-800">Sign in</h1>
      <p className="mt-1 text-sm text-stone-500">Enter your email and we&apos;ll send you a one-time code. It works on any device.</p>
      <SignInForm onSignedIn={() => window.location.assign(next)} />
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignIn />
    </Suspense>
  );
}
