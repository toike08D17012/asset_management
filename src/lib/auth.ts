// ============================================================
// Authentication Middleware
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "./session";
import { unlockWithPassphrase, getEncryptionService } from "./service-container";

/**
 * Require authentication for API routes
 */
export function requireAuth(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const sessionToken = request.cookies.get("session")?.value;

    // Check session validity
    const passphrase = validateSession(sessionToken);
    if (!passphrase) {
      return NextResponse.json(
        { error: "Unauthorized. Please unlock with passphrase." },
        { status: 401 }
      );
    }

    // Ensure encryption service is available
    // If not, restore from session passphrase
    const encResult = getEncryptionService();
    if (!encResult.ok) {
      // Re-initialize encryption service
      const unlockResult = unlockWithPassphrase(passphrase);
      if (!unlockResult.ok) {
        return NextResponse.json(
          { error: "Failed to restore encryption service." },
          { status: 500 }
        );
      }
    }

    // Call the actual handler
    return handler(request, context);
  };
}
