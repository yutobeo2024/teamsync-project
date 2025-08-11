import { google } from "googleapis";
import bcrypt from "bcryptjs";
import path from "path";
import { promises as fs } from "fs";
import { OAuth2Client } from "google-auth-library";
import { JWT } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const OAUTH_SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.readonly"];
const USERS_SHEET_ID = process.env.GOOGLE_SHEET_ID; // <-- match .env.local
const USERS_SHEET_NAME = process.env.GOOGLE_SHEET_NAME_USERS || "Users"; // <-- match .env.local
const PROJECTS_SHEET_NAME = process.env.GOOGLE_SHEET_NAME_PROJECTS || "Projects"; // <-- match .env.local

if (!USERS_SHEET_ID) {
  throw new Error("GOOGLE_SHEET_ID environment variable is not set.");
}

async function getGoogleAuth() {
  const envCreds = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  let credentials: any;
  if (envCreds) {
    try {
      credentials = JSON.parse(envCreds);
    } catch (e) {
      throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON. Must be valid JSON string.");
    }
  } else {
    const credentialsPath = path.join(process.cwd(), "credentials.json");
    const content = await fs.readFile(credentialsPath, "utf8");
    credentials = JSON.parse(content);
  }
  const jwtClient = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: SCOPES,
  });
  return jwtClient;
}

export async function getUsersFromSheet() {
  const auth = await getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: USERS_SHEET_ID,
    range: `${USERS_SHEET_NAME}!A1:C`,
  });
  const rows = res.data.values || [];
  // Expect header: Email | HashedPassword | Role
  const [header, ...users] = rows;
  return users.map(([email, hashedPassword, role]) => ({ email, hashedPassword, role }));
}

export async function authorizeUserWithGoogleSheet(email: string, password: string) {
  const users = await getUsersFromSheet();
  const user = users.find((u) => u.email === email);
  if (!user) return null;
  const isValid = await bcrypt.compare(password, user.hashedPassword);
  if (!isValid) return null;
  return { email: user.email, role: user.role };
}

export async function addUserToSheet(email: string, hashedPassword: string, role: string = "Member") {
  const auth = await getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: USERS_SHEET_ID,
    range: `${USERS_SHEET_NAME}!A1:C1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[email, hashedPassword, role]],
    },
  });
}

// OAuth2 functions for user-specific Google Sheets access
export function getOAuth2Client(redirectUri?: string): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri || process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(redirectUri?: string) {
  const oauth2Client = getOAuth2Client(redirectUri);
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: OAUTH_SCOPES,
  });
}

export async function getOAuth2Tokens(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function getUserGoogleSheets(accessToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  const response = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.spreadsheet'",
    fields: 'files(id, name, createdTime)',
    orderBy: 'modifiedTime desc',
  });
  
  return response.data.files || [];
}

export async function validateSheetStructure(sheetId: string, accessToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'A1:F1', // First row to check headers
    });
    
    const headers = response.data.values?.[0] || [];
    const requiredHeaders = ['ID', 'TaskName', 'Description', 'AssigneeEmail', 'Status', 'DueDate'];
    
    return requiredHeaders.every(header => headers.includes(header));
  } catch (error) {
    return false;
  }
}

export async function createTasksSheetTemplate(name: string, accessToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
  
  // Create new spreadsheet
  const createResponse = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: `${name} - Tasks`,
      },
      sheets: [{
        properties: {
          title: 'Tasks',
        },
      }],
    },
  });
  
  const spreadsheetId = createResponse.data.spreadsheetId!;
  
  // Add headers
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Tasks!A1:F1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [['ID', 'TaskName', 'Description', 'AssigneeEmail', 'Status', 'DueDate']],
    },
  });
  
  return {
    id: spreadsheetId,
    name: `${name} - Tasks`,
  };
}

// Helper function to ensure Projects sheet exists
export async function ensureProjectsSheetExists() {
  const auth = await getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });
  
  try {
    // Try to get the spreadsheet metadata to check if Projects sheet exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: USERS_SHEET_ID,
    });
    
    const projectsSheetExists = spreadsheet.data.sheets?.some(
      sheet => sheet.properties?.title === PROJECTS_SHEET_NAME
    );
    
    if (!projectsSheetExists) {
      // Create the Projects sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: USERS_SHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: PROJECTS_SHEET_NAME,
              },
            },
          }],
        },
      });
      
      // Add header row
      await sheets.spreadsheets.values.update({
        spreadsheetId: USERS_SHEET_ID,
        range: `${PROJECTS_SHEET_NAME}!A1:F1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [["ProjectID", "ProjectName", "Description", "LinkedSheetID", "CreatedBy", "CreatedAt"]],
        },
      });
    }
  } catch (error) {
    console.error("Error ensuring Projects sheet exists:", error);
    throw error;
  }
}

// Project management functions
export async function getProjectsFromSheet() {
  await ensureProjectsSheetExists();
  
  const auth = await getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth: auth as OAuth2Client });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: USERS_SHEET_ID,
    range: `${PROJECTS_SHEET_NAME}!A1:F`,
  });
  const rows = res.data.values || [];
  // Expect header: ProjectID | ProjectName | Description | LinkedSheetID | CreatedBy | CreatedAt
  const [header, ...projects] = rows;
  return projects.map(([projectId, projectName, description, linkedSheetId, createdBy, createdAt]) => ({
    projectId,
    projectName,
    description,
    linkedSheetId,
    createdBy,
    createdAt,
  }));
}

export async function addProjectToSheet(
  projectId: string,
  projectName: string,
  description: string,
  linkedSheetId: string,
  createdBy: string
) {
  await ensureProjectsSheetExists();
  
  const auth = await getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const createdAt = new Date().toISOString();
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: USERS_SHEET_ID,
    range: `${PROJECTS_SHEET_NAME}!A1:F1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[projectId, projectName, description, linkedSheetId, createdBy, createdAt]],
    },
  });
}

export async function getUserProjects(userEmail: string) {
  const projects = await getProjectsFromSheet();
  return projects.filter(project => project.createdBy === userEmail);
}