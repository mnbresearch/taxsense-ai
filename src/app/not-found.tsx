import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl font-bold text-brand-700">404</div>
      <h1 className="mt-3 text-2xl font-bold">This page got the wrong ITR form.</h1>
      <p className="mt-2 max-w-md text-sm text-stone-600">
        The page you&apos;re looking for doesn&apos;t exist — but your tax computation is only one conversation away.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/app" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          Open the app
        </Link>
        <Link href="/" className="rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:border-brand-600">
          Go home
        </Link>
      </div>
      <p className="mt-8 text-xs text-stone-400">TaxSense AI · an MNB Research product</p>
    </main>
  );
}
