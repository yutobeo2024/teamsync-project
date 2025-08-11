import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  try {
    // Get accessToken from query params for GET requests
    const { searchParams } = new URL(req.url);
    const accessToken = searchParams.get('accessToken');
    
    if (!accessToken) {
      return NextResponse.json({ error: "Google OAuth token is required. Please provide accessToken parameter." }, { status: 401 });
    }

    // Verify user has access to this project
    const projects = await getProjectsFromSheet();
    const project = projects.find(p => p.projectId === projectId);
    
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has access to this project (creator or admin)
    if (project.createdBy !== session.user.email && (session.user as any).role !== "Admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  try {
    const { taskId, newStatus, taskName, description, assigneeEmail, dueDate, startDate, progress, accessToken } = await req.json();
    
    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }
    
    if (!accessToken) {
      return NextResponse.json({ error: "Google OAuth token is required. Please provide accessToken in request body." }, { status: 401 });
    }
    
    // At least one field to update must be provided
    if (newStatus === undefined && 
        taskName === undefined && 
        description === undefined && 
        assigneeEmail === undefined && 
        dueDate === undefined && 
        startDate === undefined && 
        progress === undefined) {
      return NextResponse.json({ error: "At least one field to update must be provided" }, { status: 400 });
    }
    
    // Validate progress if provided
    if (progress !== undefined && (isNaN(progress) || progress < 0 || progress > 100)) {
      return NextResponse.json({ error: "Progress must be a number between 0 and 100" }, { status: 400 });
    }
    
    // Validate dates if provided
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return NextResponse.json({ error: "Due date must be in YYYY-MM-DD format" }, { status: 400 });
    }
    
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return NextResponse.json({ error: "Start date must be in YYYY-MM-DD format" }, { status: 400 });
    }

    // Verify user has access to this project
    const projects = await getProjectsFromSheet();
    const project = projects.find(p => p.projectId === projectId);
    
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has access to this project
    if (project.createdBy !== session.user.email && (session.user as any).role !== "Admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
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

    // Prepare updates for each field that was provided
    const actualRowIndex = taskRowIndex + 2; // +2 for header and 0-indexing
    const updates = [];
    
    // Map of field names to column letters
    const columnMap = {
      taskName: 'B',
      description: 'C',
      assigneeEmail: 'D',
      status: 'E',
      dueDate: 'F',
      startDate: 'G',
      progress: 'H'
    };
    
    // Add updates for each provided field
    if (taskName !== undefined) {
      updates.push({
        range: `Tasks!${columnMap.taskName}${actualRowIndex}`,
        values: [[taskName]]
      });
    }
    
    if (description !== undefined) {
      updates.push({
        range: `Tasks!${columnMap.description}${actualRowIndex}`,
        values: [[description]]
      });
    }
    
    if (assigneeEmail !== undefined) {
      updates.push({
        range: `Tasks!${columnMap.assigneeEmail}${actualRowIndex}`,
        values: [[assigneeEmail]]
      });
    }
    
    if (newStatus !== undefined) {
      updates.push({
        range: `Tasks!${columnMap.status}${actualRowIndex}`,
        values: [[newStatus]]
      });
    }
    
    if (dueDate !== undefined) {
      updates.push({
        range: `Tasks!${columnMap.dueDate}${actualRowIndex}`,
        values: [[dueDate]]
      });
    }
    
    if (startDate !== undefined) {
      updates.push({
        range: `Tasks!${columnMap.startDate}${actualRowIndex}`,
        values: [[startDate]]
      });
    }
    
    if (progress !== undefined) {
      updates.push({
        range: `Tasks!${columnMap.progress}${actualRowIndex}`,
        values: [[progress]]
      });
    }
    
    // Execute all updates in batch
    const batchUpdateRequests = updates.map(update => ({
      range: update.range,
      values: update.values
    }));
    
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: project.linkedSheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data: batchUpdateRequests
      }
    });

    // Fetch the updated task to return
    const updatedTaskResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: project.linkedSheetId,
      range: `Tasks!A${actualRowIndex}:H${actualRowIndex}`,
    });
    
    const updatedTaskRow = updatedTaskResponse.data.values?.[0] || [];
    const updatedTask = {
      id: updatedTaskRow[0] || '',
      taskName: updatedTaskRow[1] || '',
      description: updatedTaskRow[2] || '',
      assigneeEmail: updatedTaskRow[3] || '',
      status: updatedTaskRow[4] || '',
      dueDate: updatedTaskRow[5] || '',
      startDate: updatedTaskRow[6] || '',
      progress: updatedTaskRow[7] ? parseInt(updatedTaskRow[7]) || 0 : 0,
      rowIndex: actualRowIndex
    };

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}