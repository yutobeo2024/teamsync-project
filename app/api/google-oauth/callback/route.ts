import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { getOAuth2Tokens } from "@/lib/googleSheetsAuth";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { code } = await req.json();
    
    if (!code) {
      return NextResponse.json({ error: "Authorization code is required" }, { status: 400 });
    }

    const tokens = await getOAuth2Tokens(code);
    
    return NextResponse.json({ 
      success: true,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token
    });
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    return NextResponse.json({ error: "Failed to exchange authorization code" }, { status: 500 });
  }
}