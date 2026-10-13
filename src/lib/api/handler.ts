/** Wrap a /api/v1 handler: request id, key auth + scope, uniform 500s. */
import type { NextResponse } from "next/server";
import { authenticate, type ApiContext } from "./auth";
import type { Scope } from "./keys";
import { fail, requestId } from "./respond";

export function apiRoute<P = Record<string, string>>(
  scope: Scope | null,
  handler: (req: Request, ctx: ApiContext, rid: string, params: P) => Promise<NextResponse>
) {
  return async (req: Request, routeCtx?: { params?: Promise<P> }): Promise<NextResponse> => {
    const rid = requestId();
    const a = await authenticate(req, scope, rid);
    if (!a.ok) return a.res;
    try {
      const params = (routeCtx?.params ? await routeCtx.params : ({} as P));
      return await handler(req, a.ctx, rid, params);
    } catch (e) {
      console.error(`[api v1 ${rid}]`, (e as Error)?.message);
      return fail("internal_error", "Something went wrong on our side.", rid, 500);
    }
  };
}
