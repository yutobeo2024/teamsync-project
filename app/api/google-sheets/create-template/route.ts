import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { createTasksSheetTemplate } from "@/lib/googleSheetsAuth";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, accessToken } = await req.json();
    
    if (!name || !accessToken) {
      return NextResponse.json({ error: "Sheet name and access token are required" }, { status: 400 });
    }

    const sheet = await createTasksSheetTemplate(name, accessToken);
    
    return NextResponse.json({ 
      success: true,
      sheet
    });
  } catch (error) {
    console.error("Error creating sheet template:", error);
    return NextResponse.json({ error: "Failed to create sheet template" }, { status: 500 });
  }
}