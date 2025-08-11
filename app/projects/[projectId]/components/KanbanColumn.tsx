import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';

interface Task {
  id: string;
  taskName: string;
  description: string;
  assigneeEmail: string;
  status: string;
  dueDate: string;
  rowIndex: number;
}

interface KanbanColumnProps {
  columnId: string;
  title: string;
  tasks: Task[];
}

export default function KanbanColumn({ columnId, title, tasks }: KanbanColumnProps) {
  const getColumnColor = (title: string) => {
    const colors: { [key: string]: { bg: string; border: string; header: string } } = {
      'To Do': { bg: '#fff3cd', border: '#ffeaa7', header: '#856404' },
      'In Progress': { bg: '#d1ecf1', border: '#bee5eb', header: '#0c5460' },
      'Done': { bg: '#d4edda', border: '#c3e6cb', header: '#155724' },
      'Review': { bg: '#e2e3e5', border: '#d6d8db', header: '#383d41' },
      'Testing': { bg: '#f8d7da', border: '#f5c6cb', header: '#721c24' },
    };
    
    return colors[title] || { bg: '#f8f9fa', border: '#e9ecef', header: '#495057' };
  };

  const columnColors = getColumnColor(title);

  return (
    <div style={{
      backgroundColor: columnColors.bg,
      border: `2px solid ${columnColors.border}`,
      borderRadius: '12px',
      padding: '16px',
      minWidth: '300px',
      maxWidth: '350px',
      height: 'fit-content',
      minHeight: '400px'
    }}>
      <div style={{
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: `2px solid ${columnColors.border}`
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: '600',
          color: columnColors.header,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {title}
          <span style={{
            backgroundColor: columnColors.header,
            color: 'white',
            borderRadius: '12px',
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: '500',
            minWidth: '24px',
            textAlign: 'center'
          }}>
            {tasks.length}
          </span>
        </h3>
      </div>
      
      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              minHeight: '300px',
              backgroundColor: snapshot.isDraggingOver 
                ? 'rgba(255, 255, 255, 0.8)' 
                : 'transparent',
              borderRadius: '8px',
              padding: snapshot.isDraggingOver ? '8px' : '0',
              transition: 'all 0.2s ease',
              border: snapshot.isDraggingOver 
                ? `2px dashed ${columnColors.header}` 
                : '2px dashed transparent'
            }}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div style={{
                textAlign: 'center',
                color: '#6c757d',
                fontSize: '14px',
                fontStyle: 'italic',
                padding: '32px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                borderRadius: '8px',
                border: '1px dashed #dee2e6'
              }}>
                No tasks in {title.toLowerCase()}
              </div>
            )}
            
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}