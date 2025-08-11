import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { validateSheetStructure } from "@/lib/googleSheetsAuth";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sheetId, accessToken } = await req.json();
    
    if (!sheetId || !accessToken) {
      return NextResponse.json({ error: "Sheet ID and access token are required" }, { status: 400 });
    }

    const isValid = await validateSheetStructure(sheetId, accessToken);
    
    return NextResponse.json({ 
      isValid,
      requiredHeaders: ['ID', 'TaskName', 'Description', 'AssigneeEmail', 'Status', 'DueDate']
    });
  } catch (error) {
    console.error("Error validating sheet structure:", error);
    return NextResponse.json({ error: "Failed to validate sheet structure" }, { status: 500 });
  }
}