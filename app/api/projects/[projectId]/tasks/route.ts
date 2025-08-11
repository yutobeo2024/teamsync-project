import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { getProjectsFromSheet, getOAuth2Client } from "@/lib/googleSheetsAuth";
import { google } from "googleapis";

interface Task {
  id: string;
  taskName: string;
  description: string;
  assigneeEmail: string;
  status: string;
  dueDate: string;
  startDate?: string;
  progress?: number;
  rowIndex: number;
}

export async function GET(req: NextRequest, { params }: { params: { projectId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify user has access to this project
    const projects = await getProjectsFromSheet();
    const project = projects.find(p => p.projectId === params.projectId);
    
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has access to this project (creator or admin)
    if (project.createdBy !== session.user.email && session.user.role !== "Admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get user's OAuth tokens from session
    const accessToken = session.accessToken;
    if (!accessToken) {
      return NextResponse.json({ error: "Google OAuth token not found. Please reconnect your Google account." }, { status: 401 });
    }

    // Read tasks from the linked Google Sheet
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: project.linkedSheetId,
      range: 'Tasks!A:H', // ID, TaskName, Description, AssigneeEmail, Status, DueDate, StartDate, Progress
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      return NextResponse.json({ tasks: [], columns: ['To Do', 'In Progress', 'Done'] });
    }

    // Skip header row and transform data
    const [header, ...taskRows] = rows;
    const tasks: Task[] = taskRows.map((row, index) => ({
      id: row[0] || `task-${index + 1}`,
      taskName: row[1] || '',
      description: row[2] || '',
      assigneeEmail: row[3] || '',
      status: row[4] || 'To Do',
      dueDate: row[5] || '',
      startDate: row[6] || '',
      progress: row[7] ? parseInt(row[7]) || 0 : 0,
      rowIndex: index + 2, // +2 because we skip header and arrays are 0-indexed
    }));

    // Extract unique status values for dynamic columns
    const statusValues = [...new Set(tasks.map(task => task.status).filter(Boolean))];
    const columns = statusValues.length > 0 ? statusValues : ['To Do', 'In Progress', 'Done'];

    return NextResponse.json({ tasks, columns });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { projectId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { taskId, newStatus } = await req.json();
    
    if (!taskId || !newStatus) {
      return NextResponse.json({ error: "Task ID and new status are required" }, { status: 400 });
    }

    // Verify user has access to this project
    const projects = await getProjectsFromSheet();
    const project = projects.find(p => p.projectId === params.projectId);
    
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has access to this project
    if (project.createdBy !== session.user.email && session.user.role !== "Admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get user's OAuth tokens from session
    const accessToken = session.accessToken;
    if (!accessToken) {
      return NextResponse.json({ error: "Google OAuth token not found. Please reconnect your Google account." }, { status: 401 });
    }

    // Update task status in Google Sheet
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    
    // First, find the task row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: project.linkedSheetId,
      range: 'Tasks!A:H',
    });

    const rows = response.data.values || [];
    const [header, ...taskRows] = rows;
    
    const taskRowIndex = taskRows.findIndex(row => row[0] === taskId);
    if (taskRowIndex === -1) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Update the status column (column E, index 4)
    const actualRowIndex = taskRowIndex + 2; // +2 for header and 0-indexing
    await sheets.spreadsheets.values.update({
      spreadsheetId: project.linkedSheetId,
      range: `Tasks!E${actualRowIndex}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[newStatus]],
      },
    });

    return NextResponse.json({ success: true, taskId, newStatus });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}