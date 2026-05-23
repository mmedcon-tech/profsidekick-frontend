"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, Search, MoreVertical, CheckCircle, XCircle, Clock, Trash2, X } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';

interface Student {
  id: string;
  email: string;
  full_name?: string;
  username?: string;
  enrolled_at: string;
  status: 'active' | 'inactive' | 'pending';
  last_activity?: string;
  session_participation?: number;
}

// Backend student structure
interface BackendStudent {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  enrollment_date: string;
}

interface CourseBasic {
  id: string;
  name: string;
  code?: string;
}

interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
}

export default function ManageStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const courseId = params.courseId as string;

  // State
  const [course, setCourse] = useState<CourseBasic | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrollingStudent, setEnrollingStudent] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  
  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Toast functions
  const addToast = (type: 'success' | 'error', message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { id, type, message };
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        setError(null);

        // Fetch course details
        const courseResponse = await fetch(config.getApiUrl(`/api/courses/${courseId}`), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!courseResponse.ok) {
          throw new Error('Failed to fetch course details');
        }

        const courseData = await courseResponse.json();
        setCourse({
          id: courseData.id,
          name: courseData.name,
          code: courseData.code
        });

        // Fetch students
        const studentsResponse = await fetch(config.getApiUrl(`/api/courses/${courseId}/students`), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!studentsResponse.ok) {
          throw new Error('Failed to fetch students');
        }

        const studentsData: BackendStudent[] = await studentsResponse.json();
        // Transform backend data to match frontend interface
        const transformedStudents: Student[] = Array.isArray(studentsData) ? studentsData.map((student: BackendStudent) => ({
          id: student.id,
          email: student.email,
          full_name: student.firstName && student.lastName ? `${student.firstName} ${student.lastName}` : undefined,
          username: student.username,
          enrolled_at: student.enrollment_date,
          status: 'active' as const, // Default to active since backend doesn't provide status
          last_activity: undefined, // Backend doesn't provide this
          session_participation: undefined // Backend doesn't provide this
        })) : [];
        setStudents(transformedStudents);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, token]);

  // Filter students based on search
  const filteredStudents = students.filter(student => 
    student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.full_name && student.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (student.username && student.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle student enrollment
  const handleEnrollStudent = async () => {
    if (!enrollEmail.trim()) {
      addToast('error', 'Please enter an email address');
      return;
    }

    setEnrollingStudent(true);
    
    try {
      const response = await fetch(config.getApiUrl(`/api/courses/${courseId}/enroll`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: enrollEmail.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to enroll student');
      }

      // Refresh students list
      const studentsResponse = await fetch(config.getApiUrl(`/api/courses/${courseId}/students`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (studentsResponse.ok) {
        const studentsData: BackendStudent[] = await studentsResponse.json();
        // Transform backend data to match frontend interface
        const transformedStudents: Student[] = Array.isArray(studentsData) ? studentsData.map((student: BackendStudent) => ({
          id: student.id,
          email: student.email,
          full_name: student.firstName && student.lastName ? `${student.firstName} ${student.lastName}` : undefined,
          username: student.username,
          enrolled_at: student.enrollment_date,
          status: 'active' as const,
          last_activity: undefined,
          session_participation: undefined
        })) : [];
        setStudents(transformedStudents);
      }

      // Show success message and reset form
      addToast('success', `Successfully enrolled ${enrollEmail.trim()}!`);
      setEnrollEmail('');
      setShowEnrollModal(false);

    } catch (err) {
      addToast('error', (err as Error).message || 'Failed to enroll student');
      console.error('Error enrolling student:', err);
    } finally {
      setEnrollingStudent(false);
    }
  };

  // Handle remove student
  const handleRemoveStudent = async () => {
    if (!selectedStudent) return;

    try {
      const response = await fetch(config.getApiUrl(`/api/courses/${courseId}/students/${selectedStudent.id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove student');
      }

      // Remove from local state
      setStudents(prev => prev.filter(s => s.id !== selectedStudent.id));
      addToast('success', `Successfully removed ${selectedStudent.full_name || selectedStudent.email} from the course`);
      setShowRemoveConfirm(false);
      setSelectedStudent(null);

    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to remove student');
      console.error('Error removing student:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'inactive':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
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

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-8 text-center max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Students</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => router.push(`/courses/${courseId}`)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Back to Course
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Toast Notifications */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center justify-between p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 ease-in-out ${
                toast.type === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                {toast.type === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-3 p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push(`/courses/${courseId}`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Course
            </button>

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Students</h1>
                  <p className="text-gray-600">
                    {course?.name} {course?.code && `(${course.code})`}
                  </p>
                </div>
                <button
                  onClick={() => setShowEnrollModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  <UserPlus className="w-5 h-5" />
                  Enroll Student
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Students List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Enrolled Students</h2>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <span className="text-sm text-gray-500">
                      {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {filteredStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">
                      {searchTerm ? 'No students match your search' : 'No students enrolled yet'}
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      {searchTerm ? 'Try adjusting your search terms' : 'Invite students to get started!'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-700 font-medium text-sm">
                              {student.full_name ? student.full_name.charAt(0).toUpperCase() : student.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900">
                                {student.full_name || student.username || 'Unknown'}
                              </h3>
                              {getStatusIcon(student.status)}
                            </div>
                            <p className="text-sm text-gray-600">{student.email}</p>
                            <p className="text-xs text-gray-500">
                              Enrolled {formatDate(student.enrolled_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {student.session_participation !== undefined && (
                            <div className="text-center px-3 py-1 bg-blue-50 rounded-lg">
                              <div className="text-xs text-blue-600 font-medium">Sessions</div>
                              <div className="text-sm font-bold text-blue-800">{student.session_participation}</div>
                            </div>
                          )}
                          
                          <div className="relative">
                            <button
                              onClick={() => setSelectedStudent(student)}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar - Quick Stats */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Students</span>
                    <span className="font-semibold">{students.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Active Students</span>
                    <span className="font-semibold">{students.filter(s => s.status === 'active').length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Recent Enrollments</span>
                    <span className="font-semibold">
                      {students.filter(s => {
                        const enrollDate = new Date(s.enrolled_at);
                        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                        return enrollDate > weekAgo;
                      }).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Enroll Student</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Email Address
                </label>
                <input
                  type="email"
                  value={enrollEmail}
                  onChange={(e) => setEnrollEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && !enrollingStudent && handleEnrollStudent()}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the email address of the student you want to enroll
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  setEnrollEmail('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEnrollStudent}
                disabled={enrollingStudent || !enrollEmail.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {enrollingStudent ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Enroll Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Student Confirmation */}
      {showRemoveConfirm && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Remove Student</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove <strong>{selectedStudent.full_name || selectedStudent.email}</strong> from this course? 
              This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRemoveConfirm(false);
                  setSelectedStudent(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveStudent}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Remove Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Actions Menu */}
      {selectedStudent && !showRemoveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedStudent.full_name || selectedStudent.email}
            </h3>
            
            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowRemoveConfirm(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Remove from Course
              </button>
            </div>
            
            <button
              onClick={() => setSelectedStudent(null)}
              className="w-full mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
} 