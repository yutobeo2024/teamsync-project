import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getUserGoogleSheets } from "@/lib/googleSheetsAuth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { accessToken } = await req.json();
    
    if (!accessToken) {
      return NextResponse.json({ error: "Access token is required" }, { status: 400 });
    }

    const sheets = await getUserGoogleSheets(accessToken);
    
    return NextResponse.json({ sheets });
  } catch (error) {
    console.error("Error fetching user sheets:", error);
    return NextResponse.json({ error: "Failed to fetch Google Sheets" }, { status: 500 });
  }
}