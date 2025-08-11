'use client';
import React, { useState, useEffect } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import KanbanColumn from './KanbanColumn';

interface Task {
  id: string;
  taskName: string;
  description: string;
  assigneeEmail: string;
  status: string;
  dueDate: string;
  rowIndex: number;
}

interface KanbanBoardProps {
  projectId: string;
  initialTasks: Task[];
  initialColumns: string[];
  onTaskClick?: (task: Task) => void;
  accessToken: string;
}

export default function KanbanBoard({ projectId, initialTasks, initialColumns, onTaskClick, accessToken }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [columns, setColumns] = useState<string[]>(initialColumns);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update tasks when props change
  useEffect(() => {
    setTasks(initialTasks);
    setColumns(initialColumns);
  }, [initialTasks, initialColumns]);

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId, newStatus, accessToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update task');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // If dropped outside a droppable area
    if (!destination) {
      return;
    }

    // If dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId;
    const taskId = draggableId;

    // Optimistic update
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    );
    setTasks(updatedTasks);
    setLoading(true);
    setError('');

    try {
      await updateTaskStatus(taskId, newStatus);
    } catch (error) {
      // Revert optimistic update on error
      setTasks(tasks);
      setError(error instanceof Error ? error.message : 'Failed to update task status');
    } finally {
      setLoading(false);
    }
  };

  const getTasksForColumn = (columnId: string) => {
    return tasks.filter(task => task.status === columnId);
  };

  if (tasks.length === 0 && columns.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '64px 32px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        border: '2px dashed #dee2e6'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
        <h3 style={{ color: '#6c757d', marginBottom: '8px' }}>No Tasks Found</h3>
        <p style={{ color: '#6c757d', margin: 0 }}>
          This project doesn't have any tasks yet. Add some tasks to your Google Sheet to see them here.
        </p>
        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#e7f3ff',
          borderRadius: '8px',
          border: '1px solid #b3d9ff'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#0066cc' }}>Expected Sheet Structure</h4>
          <p style={{ margin: 0, fontSize: '14px', color: '#0066cc' }}>
            Your Google Sheet should have columns: ID, TaskName, Description, AssigneeEmail, Status, DueDate
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #f5c6cb',
          marginBottom: '24px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {loading && (
        <div style={{
          backgroundColor: '#d1ecf1',
          color: '#0c5460',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #bee5eb',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid #0c5460',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          Updating task status...
        </div>
      )}
      
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{
          display: 'flex',
          gap: '24px',
          overflowX: 'auto',
          padding: '16px 0',
          minHeight: '500px'
        }}>
          {columns.map(columnId => (
            <KanbanColumn
              key={columnId}
              columnId={columnId}
              title={columnId}
              tasks={getTasksForColumn(columnId)}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      </DragDropContext>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}