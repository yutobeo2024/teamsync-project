"use client";
import React, { useMemo } from "react";
import { Gantt, Task as GanttTask, ViewMode } from "@wamra/gantt-task-react";
import "@wamra/gantt-task-react/dist/style.css";

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

interface GanttChartProps {
  tasks: Task[];
  onTaskChange?: (task: GanttTask) => void;
  onProgressChange?: (task: GanttTask) => void;
  onDateChange?: (task: GanttTask) => void;
  onTaskClick?: (task: Task) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  onTaskChange,
  onProgressChange,
  onDateChange,
  onTaskClick,
}) => {
  const ganttTasks: GanttTask[] = useMemo(() => {
    return tasks.map((task) => {
      // Parse dates with fallbacks
      const startDate = task.startDate 
        ? new Date(task.startDate) 
        : new Date(); // Default to today if no start date
      
      const endDate = task.dueDate 
        ? new Date(task.dueDate) 
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default to 7 days from start
      
      // Ensure end date is after start date
      if (endDate <= startDate) {
        endDate.setTime(startDate.getTime() + 24 * 60 * 60 * 1000); // Add 1 day
      }

      return {
        start: startDate,
        end: endDate,
        name: task.taskName || 'Untitled Task',
        id: task.id,
        type: 'task' as const,
        progress: Math.min(Math.max(task.progress || 0, 0), 100), // Ensure progress is between 0-100
        isDisabled: false,
        styles: {
          barProgressColor: getProgressColor(task.status),
          barProgressSelectedColor: getProgressSelectedColor(task.status),
          barBackgroundColor: getBackgroundColor(task.status),
          barBackgroundSelectedColor: getBackgroundSelectedColor(task.status),
        },
      };
    });
  }, [tasks]);

  const getProgressColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'done':
      case 'completed':
        return '#28a745';
      case 'in progress':
      case 'in-progress':
        return '#007bff';
      case 'to do':
      case 'todo':
        return '#6c757d';
      default:
        return '#ffc107';
    }
  };

  const getProgressSelectedColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'done':
      case 'completed':
        return '#1e7e34';
      case 'in progress':
      case 'in-progress':
        return '#0056b3';
      case 'to do':
      case 'todo':
        return '#545b62';
      default:
        return '#e0a800';
    }
  };

  const getBackgroundColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'done':
      case 'completed':
        return '#d4edda';
      case 'in progress':
      case 'in-progress':
        return '#cce7ff';
      case 'to do':
      case 'todo':
        return '#e9ecef';
      default:
        return '#fff3cd';
    }
  };

  const getBackgroundSelectedColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'done':
      case 'completed':
        return '#c3e6cb';
      case 'in progress':
      case 'in-progress':
        return '#b3d7ff';
      case 'to do':
      case 'todo':
        return '#dee2e6';
      default:
        return '#ffeaa7';
    }
  };

  const handleTaskChange = (task: GanttTask) => {
    if (onTaskChange) {
      onTaskChange(task);
    }
  };

  const handleProgressChange = (task: GanttTask) => {
    if (onProgressChange) {
      onProgressChange(task);
    }
  };

  const handleDateChange = (task: GanttTask) => {
    if (onDateChange) {
      onDateChange(task);
    }
  };

  if (ganttTasks.length === 0) {
    return (
      <div style={{ 
        padding: 40, 
        textAlign: 'center', 
        border: '2px dashed #dee2e6', 
        borderRadius: 8,
        backgroundColor: '#f8f9fa'
      }}>
        <h3 style={{ color: '#6c757d', marginBottom: 16 }}>No Tasks Found</h3>
        <p style={{ color: '#6c757d', marginBottom: 24 }}>Add tasks to your Google Sheet to see them in the Gantt chart.</p>
        <div style={{ 
          backgroundColor: 'white', 
          padding: 16, 
          borderRadius: 4, 
          border: '1px solid #dee2e6',
          textAlign: 'left',
          maxWidth: 600,
          margin: '0 auto'
        }}>
          <h4 style={{ marginTop: 0, marginBottom: 12 }}>Expected Google Sheet Structure:</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: 8, border: '1px solid #dee2e6', textAlign: 'left' }}>Column</th>
                <th style={{ padding: 8, border: '1px solid #dee2e6', textAlign: 'left' }}>Header</th>
                <th style={{ padding: 8, border: '1px solid #dee2e6', textAlign: 'left' }}>Example</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}>A</td>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}>ID</td>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}>TASK-001</td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}>B</td>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}>TaskName</td>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}>Design Homepage</td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}>C</td>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}>Description</td>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}>Create wireframes and mockups</td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}>D</td>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}>AssigneeEmail</td>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}>john@example.com</td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}>E</td>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}>Status</td>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}>In Progress</td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}>F</td>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}>DueDate</td>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}>2024-12-31</td>
              </tr>
              <tr style={{ backgroundColor: '#e8f5e8' }}>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}>G</td>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}><strong>StartDate</strong></td>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}><strong>2024-12-01</strong></td>
              </tr>
              <tr style={{ backgroundColor: '#e8f5e8' }}>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}>H</td>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}><strong>Progress</strong></td>
                <td style={{ padding: 8, border: '1px solid #dee2e6' }}><strong>75</strong></td>
              </tr>
            </tbody>
          </table>
          <p style={{ marginTop: 12, marginBottom: 0, fontSize: 12, color: '#6c757d' }}>
            <strong>New columns highlighted in green:</strong> StartDate (YYYY-MM-DD format) and Progress (0-100)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      width: '100%', 
      height: '600px',
      border: '1px solid #dee2e6',
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: 'white'
    }}>
      <Gantt
        tasks={ganttTasks}
        viewMode={ViewMode.Day}
        onDateChange={handleDateChange}
        onProgressChange={handleProgressChange}
        onDoubleClick={(ganttTask) => {
          handleTaskChange(ganttTask);
          if (onTaskClick) {
            const originalTask = tasks.find(t => t.id === ganttTask.id);
            if (originalTask) onTaskClick(originalTask);
          }
        }}
        columnWidth={60}
        listCellWidth="200px"
        rowHeight={50}
        ganttHeight={550}
        barCornerRadius={3}
        barFill={60}
        fontSize="14px"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      />
    </div>
  );
};

export default GanttChart;
styles: {
  barProgressColor: getProgressColor(task.status),
  barProgressSelectedColor: getProgressSelectedColor(task.status),
  barBackgroundColor: getBackgroundColor(task.status),
  barBackgroundSelectedColor: getBackgroundSelectedColor(task.status),
},