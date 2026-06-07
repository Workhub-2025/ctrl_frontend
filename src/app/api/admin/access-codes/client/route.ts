import { NextResponse } from "next/server";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";

type GenerateClientCodeResponse = {
  data?: {
    documentId: string;
    code: string;
    expiresAt: string;
    status: string;
    targetRole: string;
  };
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!body?.clientDocumentId || typeof body.clientDocumentId !== "string") {
      return NextResponse.json({ error: "clientDocumentId is required" }, { status: 400 });
    }

    const result = await strapiRequest<GenerateClientCodeResponse>(
      "/access-codes/generate-client",
      {
        method: "POST",
        body: JSON.stringify({ clientDocumentId: body.clientDocumentId }),
      }
    );

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Client access code could not be generated",
      },
      { status: 500 }
    );
  }
}
