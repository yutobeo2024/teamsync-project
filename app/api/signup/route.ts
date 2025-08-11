import { NextRequest, NextResponse } from "next/server";
import { getUsersFromSheet, addUserToSheet } from "@/lib/googleSheetsAuth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  // Check if user already exists
  const users = await getUsersFromSheet();
  if (users.find((u) => u.email === email)) {
    return NextResponse.json({ error: "User already exists." }, { status: 400 });
  }
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  // Add user to sheet
  await addUserToSheet(email, hashedPassword, "Member");
  return NextResponse.json({ success: true });
}