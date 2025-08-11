"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface GoogleSheet {
  id: string;
  name: string;
  createdTime: string;
}

interface CreateSheetResponse {
  id: string;
  name: string;
}

export default function CreateProjectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSheetId, setSelectedSheetId] = useState("");
  const [googleSheets, setGoogleSheets] = useState<GoogleSheet[]>([]);
  const [accessToken, setAccessToken] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [validationStatus, setValidationStatus] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const handleGoogleAuth = async () => {
    try {
      const response = await fetch("/api/google-oauth/auth");
      const data = await response.json();
      
      if (data.authUrl) {
        window.open(data.authUrl, "google-auth", "width=500,height=600");
        
        // Listen for the auth callback
        window.addEventListener("message", handleAuthCallback);
      }
    } catch (error) {
      setError("Failed to initiate Google authentication");
    }
  };

  const handleAuthCallback = async (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    
    if (event.data.type === "GOOGLE_AUTH_SUCCESS") {
      const { code } = event.data;
      
      try {
        const response = await fetch("/api/google-oauth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        
        const data = await response.json();
        
        if (data.success) {
          setAccessToken(data.accessToken);
          setIsAuthenticated(true);
          await fetchGoogleSheets(data.accessToken);
        } else {
          setError("Failed to authenticate with Google");
        }
      } catch (error) {
        setError("Failed to process authentication");
      }
      
      window.removeEventListener("message", handleAuthCallback);
    }
  };

  const fetchGoogleSheets = async (token: string) => {
    try {
      const response = await fetch("/api/google-sheets/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token }),
      });
      
      const data = await response.json();
      
      if (data.sheets) {
        setGoogleSheets(data.sheets);
      }
    } catch (error) {
      setError("Failed to fetch Google Sheets");
    }
  };

  const validateSheet = async (sheetId: string) => {
    try {
      const response = await fetch("/api/google-sheets/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetId, accessToken }),
      });
      
      const data = await response.json();
      
      setValidationStatus(prev => ({
        ...prev,
        [sheetId]: data.isValid
      }));
      
      return data.isValid;
    } catch (error) {
      setValidationStatus(prev => ({
        ...prev,
        [sheetId]: false
      }));
      return false;
    }
  };

  const createNewSheet = async () => {
    if (!projectName.trim()) {
      setError("Please enter a project name first");
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch("/api/google-sheets/create-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, accessToken }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const newSheet: GoogleSheet = {
          id: data.sheet.id,
          name: data.sheet.name,
          createdTime: new Date().toISOString()
        };
        
        setGoogleSheets(prev => [newSheet, ...prev]);
        setSelectedSheetId(data.sheet.id);
        setValidationStatus(prev => ({
          ...prev,
          [data.sheet.id]: true
        }));
        setSuccess("New sheet created successfully!");
      } else {
        setError("Failed to create new sheet");
      }
    } catch (error) {
      setError("Failed to create new sheet");
    } finally {
      setLoading(false);
    }
  };

  const handleSheetSelection = async (sheetId: string) => {
    setSelectedSheetId(sheetId);
    if (sheetId && !(sheetId in validationStatus)) {
      await validateSheet(sheetId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!projectName.trim() || !selectedSheetId) {
      setError("Please fill in all required fields");
      return;
    }
    
    if (validationStatus[selectedSheetId] === false) {
      setError("Selected sheet does not have the required structure");
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          description,
          linkedSheetId: selectedSheetId,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess("Project created successfully!");
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        setError(data.error || "Failed to create project");
      }
    } catch (error) {
      setError("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return <div style={{ padding: 32 }}>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  if (!(session.user as any)?.role || (session.user as any).role !== "Admin") {
    return (
      <div style={{ maxWidth: 600, margin: "auto", padding: 32 }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to create projects.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "auto", padding: 32 }}>
      <h2>Create New Project</h2>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8 }}>Project Name *</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
            style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
          />
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8 }}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
          />
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8 }}>Google Sheet *</label>
          
          {!isAuthenticated ? (
            <div>
              <p>Connect your Google account to access your sheets:</p>
              <button
                type="button"
                onClick={handleGoogleAuth}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#4285f4",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer"
                }}
              >
                Connect Google Account
              </button>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={createNewSheet}
                  disabled={loading || !projectName.trim()}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#34a853",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    marginRight: 8
                  }}
                >
                  {loading ? "Creating..." : "Create New Sheet"}
                </button>
                <span style={{ fontSize: 14, color: "#666" }}>or select an existing sheet below</span>
              </div>
              
              <select
                value={selectedSheetId}
                onChange={(e) => handleSheetSelection(e.target.value)}
                style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
              >
                <option value="">Select a Google Sheet</option>
                {googleSheets.map((sheet) => (
                  <option key={sheet.id} value={sheet.id}>
                    {sheet.name}
                    {validationStatus[sheet.id] === true && " ✓"}
                    {validationStatus[sheet.id] === false && " ✗"}
                  </option>
                ))}
              </select>
              
              {selectedSheetId && validationStatus[selectedSheetId] === false && (
                <div style={{ color: "red", fontSize: 14, marginTop: 8 }}>
                  This sheet doesn't have the required structure. Required headers: ID, TaskName, Description, AssigneeEmail, Status, DueDate
                </div>
              )}
              
              {selectedSheetId && validationStatus[selectedSheetId] === true && (
                <div style={{ color: "green", fontSize: 14, marginTop: 8 }}>
                  ✓ Sheet structure is valid
                </div>
              )}
            </div>
          )}
        </div>
        
        {error && (
          <div style={{ color: "red", marginBottom: 16 }}>{error}</div>
        )}
        
        {success && (
          <div style={{ color: "green", marginBottom: 16 }}>{success}</div>
        )}
        
        <div>
          <button
            type="submit"
            disabled={loading || !projectName.trim() || !selectedSheetId || validationStatus[selectedSheetId] === false}
            style={{
              padding: "12px 24px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              marginRight: 8
            }}
          >
            {loading ? "Creating Project..." : "Create Project"}
          </button>
          
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            style={{
              padding: "12px 24px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
        </div>
      </form>
      
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('message', function(event) {
              if (event.origin !== window.location.origin) return;
              if (event.data.type === 'GOOGLE_AUTH_CODE') {
                window.postMessage({
                  type: 'GOOGLE_AUTH_SUCCESS',
                  code: event.data.code
                }, window.location.origin);
              }
            });
          `
        }}
      />
    </div>
  );
}