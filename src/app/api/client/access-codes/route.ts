import { NextResponse } from "next/server";
import {
  generateHiringManagerAccessCode,
  getClientAccessCodes,
} from "@/services/client-portal.service";

export async function GET() {
  try {
    const codes = await getClientAccessCodes();
    return NextResponse.json({ data: codes });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Access codes could not be loaded",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const code = await generateHiringManagerAccessCode();
    return NextResponse.json({ data: code }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Access code could not be generated",
      },
      { status: 500 }
    );
  }
}
