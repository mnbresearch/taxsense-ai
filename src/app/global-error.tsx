"use client";

/** Last-resort boundary (errors in the root layout itself). Must render its own <html>. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#fafaf9", margin: 0 }}>
        <main style={{ maxWidth: 420, margin: "18vh auto", padding: "0 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: 22, color: "#1c1917" }}>TaxSense hit an unexpected error</h1>
          <p style={{ color: "#57534e", fontSize: 14 }}>Your data is safe. Please reload the page.</p>
          <button onClick={reset} style={{ marginTop: 16, background: "#0d5947", color: "#fff", border: 0, borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer" }}>
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
