// ============================================================
// Authentication Middleware
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "./session";
import { unlockWithPassphrase, getEncryptionService } from "./service-container";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function withNoStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  const host = request.headers.get("host");
  if (!host) {
    return false;
  }

  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}

/**
 * Require authentication for API routes
 */
export function requireAuth<TContext>(
  handler: (request: NextRequest, context: TContext) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: TContext): Promise<NextResponse> => {
    if (MUTATING_METHODS.has(request.method.toUpperCase()) && !isSameOriginRequest(request)) {
      return withNoStore(
        NextResponse.json(
          { error: "Invalid request origin." },
          { status: 403 }
        )
      );
    }

    const sessionToken = request.cookies.get("session")?.value;

    // Check session validity
    const passphrase = validateSession(sessionToken);
    if (!passphrase) {
      return withNoStore(
        NextResponse.json(
          { error: "Unauthorized. Please unlock with passphrase." },
          { status: 401 }
        )
      );
    }

    // Ensure encryption service is available
    // If not, restore from session passphrase
    const encResult = getEncryptionService();
    if (!encResult.ok) {
      // Re-initialize encryption service
      const unlockResult = unlockWithPassphrase(passphrase);
      if (!unlockResult.ok) {
        return withNoStore(
          NextResponse.json(
            { error: "Failed to restore encryption service." },
            { status: 500 }
          )
        );
      }
    }

    // Call the actual handler
    const response = await handler(request, context);
    return withNoStore(response);
  };
}
