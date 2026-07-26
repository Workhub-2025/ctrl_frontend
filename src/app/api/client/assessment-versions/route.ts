import { NextResponse } from "next/server";

import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import {
  FIREBASE_ASSESSMENT_SLUGS,
  loadFirebaseAssessmentVersionCatalog,
} from "@/lib/firebase-assessment-catalogue-api";

export async function GET() {
  try {
    const auth = await requireFirebaseSession("client");
    const data = await loadFirebaseAssessmentVersionCatalog(
      auth.domainApi,
      auth.firebaseSessionCookie,
      FIREBASE_ASSESSMENT_SLUGS,
    );
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(
      error,
      "Assessment versions could not be loaded",
    );
  }
}
