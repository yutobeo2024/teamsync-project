import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { addProjectToSheet, getUserProjects } from "@/lib/googleSheetsAuth";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projects = await getUserProjects(session.user.email);
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  if (session.user.role !== "Admin") {
    return NextResponse.json({ error: "Only admins can create projects" }, { status: 403 });
  }

  try {
    const { projectName, description, linkedSheetId } = await req.json();
    
    if (!projectName || !linkedSheetId) {
      return NextResponse.json({ error: "Project name and linked sheet ID are required" }, { status: 400 });
    }

    const projectId = uuidv4();
    await addProjectToSheet(
      projectId,
      projectName,
      description || "",
      linkedSheetId,
      session.user.email
    );

    return NextResponse.json({ 
      success: true, 
      project: {
        projectId,
        projectName,
        description,
        linkedSheetId,
        createdBy: session.user.email,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}