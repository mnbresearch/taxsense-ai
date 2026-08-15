import { ImageResponse } from "next/og";

/** Batch 59 — branded link-preview card for the Professional Suite. */
export const runtime = "edge";
export const alt = "TaxSense AI Professional Suite — tools for lawyers, CAs and law students";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", background: "#083c30", padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#ffffff" }}>
            TaxSense <span style={{ color: "#8fd0b6", fontWeight: 400, marginLeft: 10 }}>AI</span>
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#8fd0b6" }}>an MNB Research product</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, color: "#ffffff", lineHeight: 1.1 }}>
            The Professional Suite
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "#d6ede1", marginTop: 22, lineHeight: 1.4 }}>
            s.234 interest · 26AS reconciliation · notice playbooks · regime breakevens · client workbook
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 28, color: "#8fd0b6" }}>
            For lawyers, CAs & law students — FY 2025-26
          </div>
          <div
            style={{
              display: "flex", background: "#ffffff", color: "#083c30", fontSize: 26,
              fontWeight: 700, padding: "14px 28px", borderRadius: 999,
            }}
          >
            taxsense.mnbresearch.com/professional
          </div>
        </div>
      </div>
    ),
    size
  );
}
