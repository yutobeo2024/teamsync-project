"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import KanbanBoard from "../[projectId]/components/KanbanBoard";
import GanttChart from "../[projectId]/components/GanttChart";
import TaskDetailsModal from "./components/TaskDetailsModal";

interface Project {
  id: string;
  projectName: string;
  description: string;
  linkedSheetId: string;
  createdAt: string;
  createdBy: string;
}

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

export default function ProjectDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [error, setError] = useState("");
  const [tasksError, setTasksError] = useState("");
  const [showProjectInfo, setShowProjectInfo] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'gantt'>('kanban');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Simple notification system
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showSuccess = (message: string) => {
    setNotification({ type: 'success', message });
    setTimeout(() => setNotification(null), 4000);
  };
  const showError = (message: string) => {
    setNotification({ type: 'error', message });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && params.id) {
      fetchProject();
    }
  }, [status, router, params.id]);

  const fetchProject = async () => {
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();
      
      if (data.projects) {
        const foundProject = data.projects.find((p: any) => p.projectId === params.id);
        if (foundProject) {
          setProject({
            id: foundProject.projectId,
            projectName: foundProject.projectName,
            description: foundProject.description,
            linkedSheetId: foundProject.linkedSheetId,
            createdAt: foundProject.createdAt,
            createdBy: foundProject.createdBy
          });
          // Fetch tasks after project is loaded
          await fetchTasks();
        } else {
          setError("Project not found");
        }
      } else {
        setError("Failed to load project");
      }
    } catch (error) {
      setError("Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    setTasksLoading(true);
    setTasksError("");
    try {
      const response = await fetch(`/api/projects/${params.id}/tasks`);
      const data = await response.json();
      
      if (response.ok) {
        setTasks(data.tasks || []);
        setColumns(data.columns || ['To Do', 'In Progress', 'Done']);
      } else {
        setTasksError(data.error || "Failed to load tasks");
      }
    } catch (error) {
      setTasksError("Failed to load tasks");
    } finally {
      setTasksLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return <div style={{ padding: 32 }}>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  if (error) {
    return (
      <div style={{ maxWidth: 800, margin: "auto", padding: 32 }}>
        <div style={{ color: "red", marginBottom: 16 }}>{error}</div>
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            padding: "8px 16px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer"
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ maxWidth: 800, margin: "auto", padding: 32 }}>
        <div>Project not found</div>
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            padding: "8px 16px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            marginTop: 16
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Helper to merge updated task into list
  const mergeUpdatedTask = (list: Task[], updated: Task) =>
    list.map((t) => (t.id === updated.id ? { ...t, ...updated } : t));

  return (
    <div style={{ maxWidth: "100%", margin: "auto", padding: 32 }}>
      {/* Notification Toast */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 2000,
            padding: "12px 16px",
            borderRadius: 8,
            border: `1px solid ${notification.type === 'error' ? '#f5c6cb' : '#c3e6cb'}`,
            backgroundColor: notification.type === 'error' ? '#f8d7da' : '#d4edda',
            color: notification.type === 'error' ? '#721c24' : '#155724',
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            maxWidth: 360
          }}
        >
          {notification.message}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: 8 }}>{project.projectName}</h1>
          <p style={{ margin: 0, color: "#6c757d", fontSize: 14 }}>
            {tasks.length} tasks • Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          {/* View Mode Toggle */}
          <div style={{ display: "flex", border: "1px solid #dee2e6", borderRadius: 4, overflow: "hidden" }}>
            <button
              onClick={() => setViewMode('kanban')}
              style={{
                padding: "8px 16px",
                backgroundColor: viewMode === 'kanban' ? "#007bff" : "white",
                color: viewMode === 'kanban' ? "white" : "#007bff",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                borderRight: "1px solid #dee2e6"
              }}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              style={{
                padding: "8px 16px",
                backgroundColor: viewMode === 'gantt' ? "#007bff" : "white",
                color: viewMode === 'gantt' ? "white" : "#007bff",
                border: "none",
                cursor: "pointer",
                fontSize: 14
              }}
            >
              Gantt
            </button>
          </div>
          
          <button
            onClick={() => setShowProjectInfo(!showProjectInfo)}
            style={{
              padding: "8px 16px",
              backgroundColor: showProjectInfo ? "#007bff" : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 14
            }}
          >
            {showProjectInfo ? "Hide" : "Show"} Project Info
          </button>
          <button
            onClick={fetchTasks}
            disabled={tasksLoading}
            style={{
              padding: "8px 16px",
              backgroundColor: tasksLoading ? "#6c757d" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: tasksLoading ? "not-allowed" : "pointer",
              fontSize: 14
            }}
          >
            {tasksLoading ? "Refreshing..." : "Refresh Tasks"}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              padding: "8px 16px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 14
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
      
      {showProjectInfo && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ 
            backgroundColor: "white", 
            padding: 24, 
            borderRadius: 8, 
            border: "1px solid #dee2e6",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            marginBottom: 24
          }}>
            <h2 style={{ marginTop: 0 }}>Project Information</h2>
            
            <div style={{ marginBottom: 16 }}>
              <strong>Project ID:</strong>
              <div style={{ marginTop: 4, fontFamily: "monospace", backgroundColor: "#f8f9fa", padding: 8, borderRadius: 4 }}>
                {project.id}
              </div>
            </div>
            
            {project.description && (
              <div style={{ marginBottom: 16 }}>
                <strong>Description:</strong>
                <div style={{ marginTop: 4 }}>{project.description}</div>
              </div>
            )}
            
            <div style={{ marginBottom: 16 }}>
              <strong>Created:</strong>
              <div style={{ marginTop: 4 }}>
                {new Date(project.createdAt).toLocaleString()}
              </div>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <strong>Created By:</strong>
              <div style={{ marginTop: 4 }}>{project.createdBy}</div>
            </div>
          </div>
          
          <div style={{ 
            backgroundColor: "white", 
            padding: 24, 
            borderRadius: 8, 
            border: "1px solid #dee2e6",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}>
            <h2 style={{ marginTop: 0 }}>Google Sheet Integration</h2>
            
            <div style={{ marginBottom: 16 }}>
              <strong>Linked Sheet ID:</strong>
              <div style={{ marginTop: 4, fontFamily: "monospace", backgroundColor: "#f8f9fa", padding: 8, borderRadius: 4 }}>
                {project.linkedSheetId}
              </div>
            </div>
            
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${project.linkedSheetId}`, "_blank")}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer"
                }}
              >
                Open Google Sheet
              </button>
              
              <button
                onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${project.linkedSheetId}/edit`, "_blank")}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer"
                }}
              >
                Edit Google Sheet
              </button>
            </div>
            
            <div style={{ marginTop: 16, padding: 16, backgroundColor: "#e7f3ff", borderRadius: 4, border: "1px solid #b3d9ff" }}>
              <h4 style={{ margin: "0 0 8px 0", color: "#0066cc" }}>Sheet Structure</h4>
              <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "#0066cc" }}>
                This sheet should contain the following columns:
              </p>
              <div style={{ fontSize: 13, color: "#0066cc", fontFamily: "monospace" }}>
                <div><strong>Required:</strong> ID, TaskName, Description, AssigneeEmail, Status, DueDate</div>
                <div style={{ marginTop: 4 }}><strong>For Gantt Chart:</strong> StartDate (YYYY-MM-DD), Progress (0-100)</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Kanban Board Section */}
      <div style={{ 
        backgroundColor: "white", 
        padding: 24, 
        borderRadius: 8, 
        border: "1px solid #dee2e6",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{ marginTop: 0, marginBottom: 24 }}>
          {viewMode === 'kanban' ? 'Task Board' : 'Project Timeline'}
        </h2>
        
        {tasksError && (
          <div style={{
            backgroundColor: "#f8d7da",
            color: "#721c24",
            padding: "12px 16px",
            borderRadius: "8px",
            border: "1px solid #f5c6cb",
            marginBottom: "24px"
          }}>
            <strong>Error loading tasks:</strong> {tasksError}
          </div>
        )}
        
        {tasksLoading ? (
          <div style={{ textAlign: "center", padding: "64px 32px" }}>
            <div style={{ fontSize: "24px", marginBottom: "16px" }}>⏳</div>
            <p style={{ color: "#6c757d" }}>Loading tasks from Google Sheet...</p>
          </div>
        ) : (
          <>
            {viewMode === 'kanban' ? (
              <KanbanBoard 
                projectId={project.id}
                initialTasks={tasks}
                initialColumns={columns}
                onTaskClick={(task) => {
                  setSelectedTask(task);
                  setIsTaskModalOpen(true);
                }}
              />
            ) : (
              <GanttChart 
                tasks={tasks}
                onTaskChange={(task) => {
                  console.log('Task changed:', task);
                }}
                onProgressChange={(task) => {
                  console.log('Progress changed:', task);
                }}
                onDateChange={(task) => {
                  console.log('Date changed:', task);
                }}
                onTaskClick={(task) => {
                  setSelectedTask(task);
                  setIsTaskModalOpen(true);
                }}
              />
            )}
          </>
        )}
      </div>

      <TaskDetailsModal
        task={selectedTask}
        isOpen={isTaskModalOpen}
        availableStatuses={columns}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        onSave={async (updatedTask) => {
          // Optimistic update: close quickly via immediate resolve; background sync + rollback on error
          const prevTasks = tasks;
          const optimisticTasks = mergeUpdatedTask(tasks, updatedTask);
          setTasks(optimisticTasks);

          // Build payload
          const payload: any = {
            taskId: updatedTask.id,
            taskName: updatedTask.taskName,
            description: updatedTask.description,
            assigneeEmail: updatedTask.assigneeEmail,
            newStatus: updatedTask.status,
            dueDate: updatedTask.dueDate,
          };
          if (updatedTask.startDate) payload.startDate = updatedTask.startDate;
          if (typeof updatedTask.progress === 'number') payload.progress = updatedTask.progress;

          // Background API call
          (async () => {
            try {
              const res = await fetch(`/api/projects/${project.id}/tasks`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              const data = await res.json();
              if (!res.ok) {
                throw new Error(data.error || 'Failed to update task');
              }
              // Reconcile with server response
              const serverTask = data.task as Task;
              setTasks((current) => mergeUpdatedTask(current, serverTask));
              showSuccess('Task saved');
            } catch (e: any) {
              // Rollback on failure
              setTasks(prevTasks);
              showError(e?.message || 'Failed to save task');
            }
          })();

          // Resolve immediately so modal can close optimistically
          return;
        }}
      />
    </div>
  );
}