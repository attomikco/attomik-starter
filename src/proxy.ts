import type { NextRequest } from "next/server"
import { updateSession } from "@/core/supabase/proxy"

/**
 * Next.js 16 proxy (successor to middleware.ts). Kept thin: all Supabase
 * session-refresh logic lives in src/core/supabase/proxy.ts.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * All request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico and common static assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
