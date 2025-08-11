import React from 'react';
import { Draggable } from '@hello-pangea/dnd';

interface Task {
  id: string;
  taskName: string;
  description: string;
  assigneeEmail: string;
  status: string;
  dueDate: string;
  rowIndex: number;
}

interface TaskCardProps {
  task: Task;
  index: number;
  onTaskClick?: (task: Task) => void;
}

export default function TaskCard({ task, index, onTaskClick }: TaskCardProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const isOverdue = (dateString: string) => {
    if (!dateString) return false;
    try {
      const dueDate = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate < today;
    } catch {
      return false;
    }
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            backgroundColor: snapshot.isDragging ? '#f8f9fa' : 'white',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '12px',
            boxShadow: snapshot.isDragging 
              ? '0 8px 16px rgba(0,0,0,0.15)' 
              : '0 2px 4px rgba(0,0,0,0.1)',
            cursor: 'grab',
            transition: snapshot.isDragging ? 'none' : 'box-shadow 0.2s ease',
            position: 'relative',
          }}
          onClick={(e) => {
            // Prevent click from interfering with drag operations
            if (!snapshot.isDragging && onTaskClick) {
              // Stop propagation to prevent drag start
              e.stopPropagation();
              onTaskClick(task);
            }
          }}
        >
          <div style={{ marginBottom: '8px' }}>
            <h4 style={{ 
              margin: 0, 
              fontSize: '16px', 
              fontWeight: '600',
              color: '#212529',
              lineHeight: '1.4'
            }}>
              {task.taskName || 'Untitled Task'}
            </h4>
          </div>
          
          {task.description && (
            <div style={{ 
              marginBottom: '12px',
              fontSize: '14px',
              color: '#6c757d',
              lineHeight: '1.4'
            }}>
              {task.description}
            </div>
          )}
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px',
            fontSize: '12px'
          }}>
            {task.assigneeEmail && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ 
                  backgroundColor: '#e9ecef',
                  padding: '2px 6px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#495057'
                }}>
                  👤 {task.assigneeEmail}
                </span>
              </div>
            )}
            
            {task.dueDate && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ 
                  backgroundColor: isOverdue(task.dueDate) ? '#f8d7da' : '#d1ecf1',
                  color: isOverdue(task.dueDate) ? '#721c24' : '#0c5460',
                  padding: '2px 6px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '500'
                }}>
                  📅 {formatDate(task.dueDate)}
                  {isOverdue(task.dueDate) && ' (Overdue)'}
                </span>
              </div>
            )}
            
            <div style={{ 
              fontSize: '10px',
              color: '#adb5bd',
              marginTop: '4px'
            }}>
              ID: {task.id}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}