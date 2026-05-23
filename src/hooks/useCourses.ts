import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';

export interface CourseDetails {
  id?: string;
  course_id: string;
  user_id?: string;
  username?: string;
  name?: string;
  code?: string;
  section?: string;
  description?: string;
  department?: string;
  semester?: string;
  year?: number;
  syllabus_details?: any;
  is_active?: boolean;
  is_deleted?: boolean;
  is_public?: boolean;
  created_at: string;
  updated_at: string;
  // Computed fields that might be added by backend
  owner_name?: string;
  enrollment_count?: number;
  session_count?: number;
}

export interface CourseStudent {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  enrollment_date: string;
}

export interface CourseSessionSummary {
  sessionId: string;
  class_name: string;
  session_number?: number;
  session_date?: string;
  description?: string;
  duration: number;
  total_slides: number;
  created_at: string;
  run_count: number;
}

interface UseCoursesReturn {
  courses: CourseDetails[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createCourse: (courseData: Partial<CourseDetails>) => Promise<CourseDetails>;
  updateCourse: (courseId: string, courseData: Partial<CourseDetails>) => Promise<CourseDetails>;
  deleteCourse: (courseId: string) => Promise<void>;
  enrollStudent: (courseId: string, studentEmail: string) => Promise<void>;
  getCourseStudents: (courseId: string) => Promise<CourseStudent[]>;
  getCourseSessions: (courseId: string) => Promise<CourseSessionSummary[]>;
  removeStudent: (courseId: string, studentId: string) => Promise<void>;
}

export function useCourses(): UseCoursesReturn {
  const { token,  } = useAuth();
  const [courses, setCourses] = useState<CourseDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    if (!token) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(config.getApiUrl('/api/courses'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch courses`);
      }

      const data = await response.json();
      setCourses(data);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch courses');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const createCourse = useCallback(async (courseData: Partial<CourseDetails>): Promise<CourseDetails> => {
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(config.getApiUrl('/api/courses'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(courseData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create course');
    }

    const newCourse = await response.json();
    setCourses(prev => [...prev, newCourse]);
    return newCourse;
  }, [token]);

  const updateCourse = useCallback(async (courseId: string, courseData: Partial<CourseDetails>): Promise<CourseDetails> => {
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(config.getApiUrl(`/api/courses/${courseId}`), {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(courseData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to update course');
    }

    const updatedCourse = await response.json();
    setCourses(prev => prev.map(course => 
      course.course_id === courseId ? updatedCourse : course
    ));
    return updatedCourse;
  }, [token]);

  const deleteCourse = useCallback(async (courseId: string): Promise<void> => {
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(config.getApiUrl(`/api/courses/${courseId}`), {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to delete course');
    }

    setCourses(prev => prev.filter(course => course.course_id !== courseId));
  }, [token]);

  const enrollStudent = useCallback(async (courseId: string, studentEmail: string): Promise<void> => {
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(config.getApiUrl(`/api/courses/${courseId}/enroll`), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ student_email: studentEmail }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to enroll student');
    }
  }, [token]);

  const getCourseStudents = useCallback(async (courseId: string): Promise<CourseStudent[]> => {
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(config.getApiUrl(`/api/courses/${courseId}/students`), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch course students');
    }

    return await response.json();
  }, [token]);

  const getCourseSessions = useCallback(async (courseId: string): Promise<CourseSessionSummary[]> => {
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(config.getApiUrl(`/api/courses/${courseId}/sessions`), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch course sessions');
    }

    return await response.json();
  }, [token]);

  const removeStudent = useCallback(async (courseId: string, studentId: string): Promise<void> => {
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(config.getApiUrl(`/api/courses/${courseId}/students/${studentId}`), {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to remove student');
    }
  }, [token]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const refetch = useCallback(() => {
    fetchCourses();
  }, [fetchCourses]);

  return {
    courses,
    loading,
    error,
    refetch,
    createCourse,
    updateCourse,
    deleteCourse,
    enrollStudent,
    getCourseStudents,
    getCourseSessions,
    removeStudent,
  };
} 