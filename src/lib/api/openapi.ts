/** OpenAPI 3.1 description of /api/v1 — served at /api/v1/openapi.json. */
import { SCOPES } from "./keys";
import { WEBHOOK_EVENTS } from "./webhooks";

const err = { $ref: "#/components/responses/Error" };
const std = { "401": err, "403": err, "429": err, "500": err };
const json = (schema: object) => ({ content: { "application/json": { schema } } });
const data = (schema: object) => json({ type: "object", required: ["data"], properties: { data: schema } });
const idParam = { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } };
const sec = (scope: string) => [{ apiKey: [scope] }];

export function openApiSpec(baseUrl = "https://taxsense.mnbresearch.com") {
  return {
    openapi: "3.1.0",
    info: {
      title: "TaxSense AI API",
      version: "1.0.0",
      description:
        "Indian income-tax computation (FY 2025-26 / AY 2026-27), Form 16/AIS parsing, deadlines, saved profiles and signed webhooks. " +
        "Authenticate with `Authorization: Bearer tsk_…`. Keys are created at /developers. Responses are `{ data }` or `{ error: { code, message }, requestId }`. " +
        "Computations are informational, not tax advice.",
      contact: { email: "contact@mnbresearch.com" },
    },
    servers: [{ url: `${baseUrl}/api/v1` }],
    components: {
      securitySchemes: {
        apiKey: { type: "http", scheme: "bearer", bearerFormat: "tsk_<16 hex>_<43 base64url>", description: `Scopes: ${Object.entries(SCOPES).map(([k, v]) => `\`${k}\` — ${v}`).join("; ")}` },
      },
      responses: {
        Error: { description: "Error", ...json({ $ref: "#/components/schemas/Error" }) },
      },
      schemas: {
        Error: {
          type: "object", required: ["error", "requestId"],
          properties: {
            error: { type: "object", required: ["code", "message"], properties: {
              code: { type: "string", enum: ["unauthorized", "forbidden", "not_found", "invalid_request", "payload_too_large", "rate_limited", "conflict", "payment_required", "internal_error", "unavailable"] },
              message: { type: "string" }, details: {} } },
            requestId: { type: "string" },
          },
        },
        TaxProfile: {
          type: "object", additionalProperties: true,
          description: "Tax profile. Unknown fields are ignored; amounts in ₹. Example: { age: 32, residentialStatus: 'resident', houseProperties: [], salary: { grossSalary: 1800000, basicPlusDA: 900000, hraReceived: 360000, rentPaid: 420000, isMetroCity: true, professionalTax: 2500 }, deductions: { section80C: 150000, section80D_selfFamily: 25000 }, taxesPaid: 0 }",
        },
        Regime: { type: "object", properties: {
          grossTotalIncome: { type: "number" }, deductionsAllowed: { type: "object", additionalProperties: { type: "number" } }, totalDeductions: { type: "number" },
          taxableIncome: { type: "number" }, taxBeforeRebate: { type: "number" }, rebate87A: { type: "number" }, surcharge: { type: "number" }, cess: { type: "number" },
          totalTax: { type: "number" }, taxesPaid: { type: "number" }, netPayable: { type: "number", description: "+ve payable, -ve refund" }, effectiveRatePct: { type: "number" } } },
        Computation: { type: "object", properties: {
          financialYear: { type: "string" }, assessmentYear: { type: "string" }, recommendedRegime: { type: "string", enum: ["old", "new"] },
          savingsVsOtherRegime: { type: "number" }, regimes: { type: "object", properties: { old: { $ref: "#/components/schemas/Regime" }, new: { $ref: "#/components/schemas/Regime" } } },
          itr: { type: "object", properties: { form: { type: "string" }, name: { type: "string" }, reasons: { type: "array", items: { type: "string" } }, cautions: { type: "array", items: { type: "string" } } } },
          suggestions: { type: "array", items: { type: "object", properties: { id: { type: "string" }, label: { type: "string" }, cashOutlay: { type: "number" }, taxSaved: { type: "number" } } } },
          disclaimer: { type: "string" } } },
        ProfileSummary: { type: "object", properties: {
          id: { type: "string", format: "uuid" }, label: { type: "string" }, financialYear: { type: "string" }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" },
          summary: { type: ["object", "null"], properties: { recommendedRegime: { type: "string" }, totalTaxOld: { type: "number" }, totalTaxNew: { type: "number" }, savingsVsOtherRegime: { type: "number" } } } } },
        Webhook: { type: "object", properties: { id: { type: "string", format: "uuid" }, url: { type: "string" }, events: { type: "array", items: { type: "string", enum: Object.keys(WEBHOOK_EVENTS) } }, active: { type: "boolean" }, createdAt: { type: "string" } } },
      },
    },
    paths: {
      "/health": { get: { summary: "Health check (no auth)", security: [], responses: { "200": { description: "OK" }, "503": { description: "Degraded" } } } },
      "/me": { get: { summary: "Describe the calling key", security: [{ apiKey: [] }], responses: { "200": { description: "Key info", ...data({ type: "object" }) }, ...std } } },
      "/compute": { post: {
        summary: "Compute tax under both regimes", security: sec("compute"),
        requestBody: { required: true, ...json({ type: "object", required: ["profile"], properties: { profile: { $ref: "#/components/schemas/TaxProfile" } } }) },
        responses: { "200": { description: "Computation", ...data({ $ref: "#/components/schemas/Computation" }) }, "400": err, "413": err, ...std } } },
      "/documents/parse": { post: {
        summary: "Parse Form 16 (Part B) or AIS/TIS text — deterministic, nothing stored", security: sec("documents:parse"),
        requestBody: { required: true, ...json({ type: "object", required: ["text"], properties: { text: { type: "string", maxLength: 200000 }, kind: { type: "string", enum: ["form16", "ais"] } } }) },
        responses: { "200": { description: "Parsed amounts", ...data({ type: "object" }) }, "400": err, "413": err, ...std } } },
      "/deadlines": { get: {
        summary: "Income-tax deadline calendar", security: sec("deadlines:read"),
        parameters: [{ name: "from", in: "query", schema: { type: "string", format: "date" } }, { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: 10 } }],
        responses: { "200": { description: "Deadlines", ...data({ type: "object" }) }, "400": err, ...std } } },
      "/profiles": {
        get: { summary: "List your saved profiles (cursor pagination)", security: sec("profiles:read"),
          parameters: [{ name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }, { name: "cursor", in: "query", schema: { type: "string" } }],
          responses: { "200": { description: "Page", ...data({ type: "object", properties: { items: { type: "array", items: { $ref: "#/components/schemas/ProfileSummary" } }, nextCursor: { type: ["string", "null"] } } }) }, "400": err, ...std } },
        post: { summary: "Create or update a profile by label (idempotent per label)", security: sec("profiles:write"),
          requestBody: { required: true, ...json({ type: "object", required: ["profile"], properties: { label: { type: "string", maxLength: 120, default: "My profile" }, profile: { $ref: "#/components/schemas/TaxProfile" } } }) },
          responses: { "200": { description: "Updated" }, "201": { description: "Created" }, "400": err, "402": err, "413": err, ...std } },
      },
      "/profiles/{id}": {
        get: { summary: "Get a saved profile", security: sec("profiles:read"), parameters: [idParam], responses: { "200": { description: "Profile" }, "404": err, ...std } },
        delete: { summary: "Delete a saved profile", security: sec("profiles:write"), parameters: [idParam], responses: { "200": { description: "Deleted" }, "404": err, ...std } },
      },
      "/webhooks": {
        get: { summary: "List webhook endpoints", security: sec("webhooks:manage"), responses: { "200": { description: "Endpoints" }, ...std } },
        post: { summary: "Register an https endpoint (signing secret returned once)", security: sec("webhooks:manage"),
          requestBody: { required: true, ...json({ type: "object", required: ["url", "events"], properties: { url: { type: "string", format: "uri" }, events: { type: "array", items: { type: "string", enum: Object.keys(WEBHOOK_EVENTS) } } } }) },
          responses: { "201": { description: "Created", ...data({ allOf: [{ $ref: "#/components/schemas/Webhook" }, { type: "object", properties: { signingSecret: { type: "string" } } }] }) }, "400": err, "409": err, "503": err, ...std } },
      },
      "/webhooks/{id}": {
        get: { summary: "Endpoint + recent deliveries", security: sec("webhooks:manage"), parameters: [idParam], responses: { "200": { description: "Endpoint" }, "404": err, ...std } },
        delete: { summary: "Delete an endpoint", security: sec("webhooks:manage"), parameters: [idParam], responses: { "200": { description: "Deleted" }, "404": err, ...std } },
      },
      "/webhooks/{id}/test": { post: { summary: "Send a signed webhook.test event now", security: sec("webhooks:manage"), parameters: [idParam], responses: { "200": { description: "Outcome" }, "404": err, ...std } } },
      "/webhooks/{id}/rotate": { post: { summary: "Rotate the signing secret", security: sec("webhooks:manage"), parameters: [idParam], responses: { "200": { description: "New secret (once)" }, "404": err, ...std } } },
    },
    "x-webhooks": {
      signature: "Header `TaxSense-Signature: t=<unix>,v1=<hex HMAC-SHA256(secret, t + '.' + rawBody)>`. Reject if |now - t| > 300 s. Also sent: TaxSense-Event, TaxSense-Delivery (use as idempotency key).",
      events: WEBHOOK_EVENTS,
      retries: "Up to 3 immediate attempts (0s, 2s, 8s) on network errors, 408, 429 and 5xx; one more pass daily for 24 h. Redirects are not followed.",
    },
  };
}
