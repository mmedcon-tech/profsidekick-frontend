"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses, CourseDetails, CourseSessionSummary } from '@/hooks/useCourses';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Play,
  Calendar,
  User,
  GraduationCap,
  Plus,
  Settings,
  UserPlus,
  Globe,
  Lock,
  Users
} from 'lucide-react';
import AccessCodePanel from '@/components/courses/AccessCodePanel';

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, token } = useAuth();
  const { courses, getCourseSessions } = useCourses();
  
  const courseId = params.courseId as string;
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [sessions, setSessions] = useState<CourseSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourseDetails = async () => {
      if (!courseId || !token) {
        if (!token) {
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Find course in the courses list
        const foundCourse = courses.find(c => c.course_id === courseId);
        if (foundCourse) {
          setCourse(foundCourse);
        }

        // Fetch course sessions only if we have a token
        const courseSessions = await getCourseSessions(courseId);
        setSessions(courseSessions);
      } catch (err) {
        console.error('Error fetching course details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load course details');
      } finally {
        setLoading(false);
      }
    };

    fetchCourseDetails();
  }, [courseId, courses, getCourseSessions, token]);

  const handleJoinSession = (sessionId: string) => {
    router.push(`/courses/${courseId}/sessions/${sessionId}`);
  };

  const handleSubmitPlacementTest = () => {
    router.push(`/autograder/submit?courseId=${courseId}`);
  };

  const handleViewPlacementResults = () => {
    window.open("/autograder/result", "_blank");
  };

  const handleViewMyFeedback = async () => {
    const response = await fetch(
      "http://localhost:8000/api/autograder/submissions/me/latest",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      alert("No placement test feedback found yet.");
      return;
    }

    const data = await response.json();
    window.open(`/autograder/result/${data.id}`, "_blank");
  };

  const handleCreateSession = () => {
    // Navigate to session creation with courseId pre-filled
    router.push(`/create?courseId=${courseId}`);
  };

  const handleManageStudents = () => {
    router.push(`/courses/${courseId}/students`);
  };

  const handleCourseSettings = () => {
    router.push(`/courses/${courseId}/settings`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Error Loading Course</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!course) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center max-w-md">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Course Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">The course you are looking for does not exist or you do not have access to it.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const isOwner = course.user_id === user?.id;
  const isMathAutograderCourse = course?.syllabus_details?.feature === "math_autograder";
  // const isProfessor = user?.role === 'professor' || user?.role !== 'student';

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:text-gray-200 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Courses
            </button>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{course.name}</h1>
                      {course.is_public ? (
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          <Globe className="w-3 h-3" />
                          Public
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs">
                          <Lock className="w-3 h-3" />
                          Private
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {course.code && <span className="font-medium">{course.code}</span>}
                      {course.section && <span>Section {course.section}</span>}
                      {course.department && <span>{course.department}</span>}
                      {course.semester && course.year && <span>{course.semester} {course.year}</span>}
                    </div>
                    {course.description && (
                      <p className="text-gray-700 dark:text-gray-300 mb-4">{course.description}</p>
                    )}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {isOwner ? 'You' : `Instructor: ${course.owner_name || course.username || 'Unknown'}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">{course.enrollment_count || 0} student{course.enrollment_count !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons for Course Owner */}
                {isOwner && (
                  <div className="flex flex-col gap-2 ml-6">
                    <button
                      onClick={handleCreateSession}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create Session
                    </button>
                    <button
                      onClick={handleManageStudents}
                      className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      Manage Students
                    </button>
                    <button
                      onClick={handleCourseSettings}
                      className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Course Settings
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {isMathAutograderCourse && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Placement Test
              </h2>

              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {isOwner
                  ? "View submitted placement test solutions and AI-generated grading feedback."
                  : "Submit your handwritten placement test answers or view your existing feedback."}
              </p>

              {isOwner ? (
                <button
                  onClick={handleViewPlacementResults}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                >
                  View Student Results
                </button>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleSubmitPlacementTest}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium"
                  >
                    Submit Placement Test
                  </button>

                  <button
                    onClick={handleViewMyFeedback}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                  >
                    View My Feedback
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Sessions List */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Course Sessions</h2>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {sessions.length} session{sessions.length !== 1 ? 's' : ''} available
                </span>
                {isOwner && sessions.length > 0 && (
                  <button
                    onClick={handleCreateSession}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Session
                  </button>
                )}
                {!isOwner && course.allow_subscriber_sessions && (
                  <button
                    onClick={handleCreateSession}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Session
                  </button>
                )}
              </div>
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  {isOwner ? 'No sessions created yet' : 'No sessions available yet'}
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 mb-6">
                  {isOwner 
                    ? 'Create your first teaching session to get started!' 
                    : 'Check back later for new sessions from your instructor!'
                  }
                </p>
                {(isOwner || course.allow_subscriber_sessions) && (
                  <button
                    onClick={handleCreateSession}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Create Your First Session
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session, index) => (
                  <div
                    key={session.sessionId}
                    className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all duration-200 group"
                    onClick={() => handleJoinSession(session.sessionId)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold group-hover:bg-blue-200">
                            {session.session_number || index + 1}
                          </span>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-700">
                            {session.class_name}
                          </h3>
                        </div>
                        
                        {session.description && (
                          <p className="text-gray-600 dark:text-gray-400 mb-3 ml-11">{session.description}</p>
                        )}
                        
                        <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400 ml-11">
                          {session.session_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(session.session_date)}</span>
                              <span>at {formatTime(session.session_date)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>Created {formatDate(session.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                          <div>{isOwner ? 'Manage' : 'Join Session'}</div>
                        </div>
                        <Play className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Access Code Management (for course owners) */}
          {isOwner && <AccessCodePanel courseId={courseId} />}

          {/* Course Statistics (for course owners) */}
          {isOwner && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mt-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Course Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-blue-50 rounded-xl">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{sessions.length}</h3>
                  <p className="text-gray-600 dark:text-gray-400">Teaching Sessions</p>
                </div>
                
                <div className="text-center p-6 bg-green-50 rounded-xl">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{course.enrollment_count || 0}</h3>
                  <p className="text-gray-600 dark:text-gray-400">Enrolled Students</p>
                </div>
                
                <div className="text-center p-6 bg-purple-50 rounded-xl">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Play className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {sessions.reduce((total, session) => total + (session.run_count || 0), 0)}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">Total Session Runs</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
} 