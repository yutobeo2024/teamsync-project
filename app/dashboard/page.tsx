"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Project {
  id: string;
  projectName: string;
  description: string;
  linkedSheetId: string;
  createdAt: string;
  createdBy: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchProjects();
    }
  }, [status, router]);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();
      
      if (data.success) {
        setProjects(data.projects);
      } else {
        setError("Failed to load projects");
      }
    } catch (error) {
      setError("Failed to load projects");
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

  return (
    <div style={{ maxWidth: 1000, margin: "auto", padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <h1>Dashboard</h1>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          style={{
            padding: "8px 16px",
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer"
          }}
        >
          Sign Out
        </button>
      </div>
      
      <div style={{ marginBottom: 32 }}>
        <p>Welcome, {session.user?.name || session.user?.email}!</p>
        <p>Role: {session.user?.role}</p>
      </div>
      
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2>Projects</h2>
          {session.user?.role === "Admin" && (
            <button
              onClick={() => router.push("/projects/create")}
              style={{
                padding: "8px 16px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer"
              }}
            >
              Create New Project
            </button>
          )}
        </div>
        
        {loading ? (
          <div>Loading projects...</div>
        ) : error ? (
          <div style={{ color: "red" }}>{error}</div>
        ) : projects.length === 0 ? (
          <div style={{ 
            padding: 32, 
            textAlign: "center", 
            backgroundColor: "#f8f9fa", 
            borderRadius: 8,
            border: "1px solid #dee2e6"
          }}>
            <h3>No Projects Yet</h3>
            <p>Get started by creating your first project.</p>
            {session.user?.role === "Admin" && (
              <button
                onClick={() => router.push("/projects/create")}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  marginTop: 16
                }}
              >
                Create Your First Project
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {projects.map((project) => (
              <div
                key={project.id}
                style={{
                  padding: 24,
                  border: "1px solid #dee2e6",
                  borderRadius: 8,
                  backgroundColor: "white",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                  <h3 style={{ margin: 0, color: "#007bff" }}>{project.projectName}</h3>
                  <span style={{ fontSize: 12, color: "#6c757d" }}>
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                {project.description && (
                  <p style={{ margin: "0 0 12px 0", color: "#6c757d" }}>{project.description}</p>
                )}
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 14, color: "#6c757d" }}>
                    <span>Sheet ID: {project.linkedSheetId}</span>
                  </div>
                  
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${project.linkedSheetId}`, "_blank")}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: 12
                      }}
                    >
                      Open Sheet
                    </button>
                    
                    <button
                      onClick={() => router.push(`/projects/${project.id}`)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: 12
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}