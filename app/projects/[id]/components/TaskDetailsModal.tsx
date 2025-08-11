'use client';
import React, { useState, useEffect } from 'react';

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

interface TaskDetailsModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTask: Task) => Promise<void>;
  availableStatuses: string[];
}

export default function TaskDetailsModal({ 
  task, 
  isOpen, 
  onClose, 
  onSave,
  availableStatuses 
}: TaskDetailsModalProps) {
  const [formData, setFormData] = useState<Task | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Initialize form data when task changes
  useEffect(() => {
    if (task) {
      setFormData({ ...task });
      setHasChanges(false);
      setErrors({});
      setSaveError('');
    } else {
      setFormData(null);
    }
  }, [task]);

  if (!isOpen || !formData) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let newValue: string | number = value;
    
    // Handle progress as a number
    if (name === 'progress' && value !== '') {
      newValue = parseInt(value, 10);
    }

    setFormData(prev => {
      if (!prev) return null;
      return { ...prev, [name]: newValue };
    });
    
    // Clear error for this field when user makes a change
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    setHasChanges(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Required fields
    if (!formData.taskName.trim()) {
      newErrors.taskName = 'Task name is required';
    }
    
    // Date validation
    if (formData.dueDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.dueDate)) {
        newErrors.dueDate = 'Due date must be in YYYY-MM-DD format';
      }
    }
    
    if (formData.startDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.startDate)) {
        newErrors.startDate = 'Start date must be in YYYY-MM-DD format';
      }
      
      // Check if start date is before due date
      if (formData.dueDate && !newErrors.dueDate && !newErrors.startDate) {
        const startDate = new Date(formData.startDate);
        const dueDate = new Date(formData.dueDate);
        if (startDate > dueDate) {
          newErrors.startDate = 'Start date must be before due date';
        }
      }
    }
    
    // Progress validation
    if (formData.progress !== undefined) {
      if (isNaN(formData.progress) || formData.progress < 0 || formData.progress > 100) {
        newErrors.progress = 'Progress must be a number between 0 and 100';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    setSaveError('');
    
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save task');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return dateString;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Task Details</h2>
          <button 
            onClick={handleCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6c757d',
            }}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {saveError && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '16px',
          }}>
            <strong>Error:</strong> {saveError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <label htmlFor="taskId" style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Task ID</label>
              <input
                type="text"
                id="taskId"
                value={formData.id}
                disabled
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  backgroundColor: '#e9ecef',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="taskName" style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
                Task Name *
              </label>
              <input
                type="text"
                id="taskName"
                name="taskName"
                value={formData.taskName}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: errors.taskName ? '1px solid #dc3545' : '1px solid #ced4da',
                  borderRadius: '4px',
                }}
                aria-invalid={!!errors.taskName}
                aria-describedby={errors.taskName ? 'taskName-error' : undefined}
              />
              {errors.taskName && (
                <div id="taskName-error" style={{ color: '#dc3545', fontSize: '14px', marginTop: '4px' }}>
                  {errors.taskName}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="description" style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="assigneeEmail" style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
                Assignee Email
              </label>
              <input
                type="email"
                id="assigneeEmail"
                name="assigneeEmail"
                value={formData.assigneeEmail}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="status" style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                }}
              >
                {availableStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="startDate" style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formatDateForInput(formData.startDate)}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: errors.startDate ? '1px solid #dc3545' : '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                  aria-invalid={!!errors.startDate}
                  aria-describedby={errors.startDate ? 'startDate-error' : undefined}
                />
                {errors.startDate && (
                  <div id="startDate-error" style={{ color: '#dc3545', fontSize: '14px', marginTop: '4px' }}>
                    {errors.startDate}
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <label htmlFor="dueDate" style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
                  Due Date
                </label>
                <input
                  type="date"
                  id="dueDate"
                  name="dueDate"
                  value={formatDateForInput(formData.dueDate)}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: errors.dueDate ? '1px solid #dc3545' : '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                  aria-invalid={!!errors.dueDate}
                  aria-describedby={errors.dueDate ? 'dueDate-error' : undefined}
                />
                {errors.dueDate && (
                  <div id="dueDate-error" style={{ color: '#dc3545', fontSize: '14px', marginTop: '4px' }}>
                    {errors.dueDate}
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="progress" style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
                Progress (%)
              </label>
              <input
                type="number"
                id="progress"
                name="progress"
                min="0"
                max="100"
                value={formData.progress !== undefined ? formData.progress : ''}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: errors.progress ? '1px solid #dc3545' : '1px solid #ced4da',
                  borderRadius: '4px',
                }}
                aria-invalid={!!errors.progress}
                aria-describedby={errors.progress ? 'progress-error' : undefined}
              />
              {errors.progress && (
                <div id="progress-error" style={{ color: '#dc3545', fontSize: '14px', marginTop: '4px' }}>
                  {errors.progress}
                </div>
              )}
              {formData.progress !== undefined && (
                <div style={{ 
                  marginTop: '8px', 
                  height: '8px', 
                  backgroundColor: '#e9ecef', 
                  borderRadius: '4px', 
                  overflow: 'hidden' 
                }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${formData.progress}%`, 
                    backgroundColor: '#007bff', 
                    borderRadius: '4px' 
                  }} />
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              style={{
                padding: '8px 16px',
                backgroundColor: 'white',
                color: '#6c757d',
                border: '1px solid #6c757d',
                borderRadius: '4px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !hasChanges}
              style={{
                padding: '8px 16px',
                backgroundColor: isSaving || !hasChanges ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isSaving || !hasChanges ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {isSaving && (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid white',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
              )}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}