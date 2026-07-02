"use client";

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useCourses, CourseDetails } from '@/hooks/useCourses';
import { Plus, BookOpen, AlertCircle } from 'lucide-react';

interface CourseSelectorProps {
  selectedCourseId: string;
  onCourseSelect: (courseId: string, course?: CourseDetails) => void;
  required?: boolean;
  disabled?: boolean;
  showCreateNew?: boolean;
}

export default function CourseSelector({ 
  selectedCourseId, 
  onCourseSelect, 
  required = true,
  disabled = false,
  showCreateNew = true 
}: CourseSelectorProps) {
  const { courses, loading, error, createCourse } = useCourses();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newCourse, setNewCourse] = useState({
    name: '',
    code: '',
    section: '',
    description: '',
    department: '',
    semester: '',
    year: new Date().getFullYear(),
    is_public: false
  });

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCourse.name.trim()) {
      setCreateError('Course name is required');
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      const createdCourse = await createCourse({
        name: newCourse.name,
        code: newCourse.code || undefined,
        section: newCourse.section || undefined,
        description: newCourse.description || undefined,
        department: newCourse.department || undefined,
        semester: newCourse.semester || undefined,
        year: newCourse.year || undefined,
        is_public: newCourse.is_public
      });

      // Auto-select the newly created course
      onCourseSelect(createdCourse.course_id, createdCourse);
      
      // Reset form and close
      setNewCourse({
        name: '',
        code: '',
        section: '',
        description: '',
        department: '',
        semester: '',
        year: new Date().getFullYear(),
        is_public: false
      });
      setShowCreateForm(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create course');
    } finally {
      setCreateLoading(false);
    }
  };

  const selectedCourse = courses.find(course => course.course_id === selectedCourseId);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
        <div className="h-10 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Course {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span className="text-sm text-red-600">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="course-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Course {required && <span className="text-red-500">*</span>}
        </label>
        
        <div className="flex gap-2">
          <select
            id="course-select"
            value={selectedCourseId}
            onChange={(e) => {
              const courseId = e.target.value;
              const course = courses.find(c => c.course_id === courseId);
              onCourseSelect(courseId, course);
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:border-emerald-500 dark:border-emerald-500 transition-colors"
            required={required}
            disabled={disabled}
          >
            <option value="">Select a course...</option>
            {courses.map(course => (
              <option key={course.course_id} value={course.course_id}>
                {course.code ? `${course.code}` : course.name}
                {course.section && ` - ${course.section}`}
                {' - ' + course.name}
              </option>
            ))}
          </select>

          {showCreateNew && !disabled && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:border-emerald-500 dark:border-emerald-500 transition-colors"
              title="Create new course"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {selectedCourse && (
          <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg">
            <div className="flex items-start gap-2">
              <BookOpen className="w-4 h-4 text-emerald-700 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-emerald-950 dark:text-emerald-100">
                  {selectedCourse.name}
                </div>
                {selectedCourse.description && (
                  <div className="text-emerald-800 dark:text-emerald-300 mt-1">{selectedCourse.description}</div>
                )}
                <div className="text-emerald-700 dark:text-emerald-400 mt-1 space-x-4">
                  {selectedCourse.code && <span>Code: {selectedCourse.code}</span>}
                  {selectedCourse.department && <span>Dept: {selectedCourse.department}</span>}
                  {selectedCourse.semester && selectedCourse.year && (
                    <span>{selectedCourse.semester} {selectedCourse.year}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Course Modal - Using Portal to avoid nested forms */}
      {showCreateForm && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Create New Course</h3>
            
            <form onSubmit={handleCreateCourse} className="space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{createError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Course Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:border-emerald-500 dark:border-emerald-500"
                  placeholder="Introduction to Computer Science"
                  required
                  disabled={createLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Code</label>
                  <input
                    type="text"
                    value={newCourse.code}
                    onChange={(e) => setNewCourse({...newCourse, code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:border-emerald-500 dark:border-emerald-500"
                    placeholder="CS101"
                    disabled={createLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Section</label>
                  <input
                    type="text"
                    value={newCourse.section}
                    onChange={(e) => setNewCourse({...newCourse, section: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:border-emerald-500 dark:border-emerald-500"
                    placeholder="A"
                    disabled={createLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:border-emerald-500 dark:border-emerald-500"
                  rows={3}
                  placeholder="Course description..."
                  disabled={createLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                  <input
                    type="text"
                    value={newCourse.department}
                    onChange={(e) => setNewCourse({...newCourse, department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:border-emerald-500 dark:border-emerald-500"
                    placeholder="Computer Science"
                    disabled={createLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                  <input
                    type="number"
                    value={newCourse.year}
                    onChange={(e) => setNewCourse({...newCourse, year: parseInt(e.target.value) || new Date().getFullYear()})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:border-emerald-500 dark:border-emerald-500"
                    disabled={createLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semester</label>
                <select
                  value={newCourse.semester}
                  onChange={(e) => setNewCourse({...newCourse, semester: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:border-emerald-500 dark:border-emerald-500"
                  disabled={createLoading}
                >
                  <option value="">Select semester...</option>
                  <option value="Spring">Spring</option>
                  <option value="Summer">Summer</option>
                  <option value="Fall">Fall</option>
                  <option value="Winter">Winter</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={newCourse.is_public}
                  onChange={(e) => setNewCourse({...newCourse, is_public: e.target.checked})}
                  className="h-4 w-4 text-emerald-700 dark:text-emerald-400 focus:ring-emerald-500 dark:focus:ring-emerald-500 border-gray-300 rounded"
                  disabled={createLoading}
                />
                <label htmlFor="is_public" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Make course publicly accessible
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 transition-colors"
                  disabled={createLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 transition-colors disabled:opacity-50"
                  disabled={createLoading}
                >
                  {createLoading ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
} 