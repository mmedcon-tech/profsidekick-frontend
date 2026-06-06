"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Settings } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';
import CourseSettingsTabs from '@/components/courses/CourseSettingsTabs';
import { toast } from 'sonner';

interface CourseSettings {
  id: string;
  name: string;
  code?: string;
  section?: string;
  description?: string;
  department?: string;
  semester?: string;
  year?: number;
  is_public: boolean;
  is_active: boolean;
  allow_self_enrollment: boolean;
  max_enrollment?: number;
}

export default function CourseSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const courseId = params.courseId as string;

  // State
  const [course, setCourse] = useState<CourseSettings | null>(null);
  const [originalCourse, setOriginalCourse] = useState<CourseSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch course settings
  useEffect(() => {
    const fetchCourse = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(config.getApiUrl(`/api/courses/${courseId}`), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch course details');
        }

        const courseData = await response.json();
        const settings: CourseSettings = {
          id: courseData.id,
          name: courseData.name || '',
          code: courseData.code || '',
          section: courseData.section || '',
          description: courseData.description || '',
          department: courseData.department || '',
          semester: courseData.semester || '',
          year: courseData.year || new Date().getFullYear(),
          is_public: courseData.is_public || false,
          is_active: courseData.is_active !== false, // Default to true
          allow_self_enrollment: courseData.allow_self_enrollment || false,
          max_enrollment: courseData.max_enrollment || undefined,
        };
        
        setCourse(settings);
        setOriginalCourse({ ...settings });

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching course:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, token]);

  // Check for changes
  useEffect(() => {
    if (course && originalCourse) {
      const changed = JSON.stringify(course) !== JSON.stringify(originalCourse);
      setHasChanges(changed);
    }
  }, [course, originalCourse]);

  // Handle input changes
  const handleInputChange = (field: string, value: string | number | boolean) => {
    if (!course) return;
    
    setCourse(prev => prev ? {
      ...prev,
      [field]: value
    } : null);
  };

  // Save changes
  const handleSave = async () => {
    if (!course || !hasChanges) return;

    setSaving(true);
    
    try {
      const response = await fetch(config.getApiUrl(`/api/courses/${courseId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(course),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update course');
      }

      setOriginalCourse({ ...course });
      setHasChanges(false);
      toast.success('Course settings updated successfully!');

    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update course');
      console.error('Error updating course:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !course) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Error Loading Course</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'Course not found'}</p>
            <Link
              href={`/courses/${courseId}`}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-block"
            >
              Back to Course
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-8">
            <Link
              href={`/courses/${courseId}`}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors mb-4 w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Course
            </Link>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Course Settings</h1>
                    <p className="text-gray-600 dark:text-gray-400">{course.name}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabbed interface */}
          <CourseSettingsTabs
            courseId={courseId}
            course={course}
            onCourseUpdate={handleInputChange}
            hasChanges={hasChanges}
            onSave={handleSave}
            saving={saving}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
