"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';
import { BookOpen, Search, Users, Plus, GraduationCap } from 'lucide-react';

export default function UnifiedDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { courses, loading, error, refetch } = useCourses();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCourses = courses.filter(course =>
    course.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCourseClick = (courseId: string) => {
    router.push(`/courses/${courseId}`);
  };

  const handleCreateCourse = () => {
    router.push('/courses/create');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isProfessor = user?.role === 'professor' || user?.role !== 'student'; // Default to professor for backward compatibility

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-xl text-gray-600">
            {isProfessor 
              ? 'Manage your courses and create amazing AI-powered teaching sessions.'
              : 'Access your enrolled courses and join interactive learning sessions.'
            }
          </p>
        </div>

        {/* Search and Create Section */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
          
          {isProfessor && (
            <button
              onClick={handleCreateCourse}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Course
            </button>
          )}
        </div>

        {/* Courses Grid */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isProfessor ? 'Your Courses' : 'Enrolled Courses'}
            </h2>
            <span className="text-sm text-gray-500">
              {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse p-6 border border-gray-200 rounded-xl">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-10 h-10 text-red-600" />
              </div>
              <p className="text-red-600 text-lg mb-2">Failed to load courses</p>
              <p className="text-gray-500 text-sm mb-4">{error}</p>
              <button
                onClick={refetch}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-600 text-lg">
                {searchQuery 
                  ? 'No courses match your search' 
                  : isProfessor 
                    ? 'No courses created yet'
                    : 'No courses enrolled yet'
                }
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : isProfessor
                    ? 'Create your first course to get started!'
                    : 'Contact your instructor to get enrolled in courses!'
                }
              </p>
              {isProfessor && !searchQuery && (
                <button
                  onClick={handleCreateCourse}
                  className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Create Your First Course
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <div
                  key={course.course_id}
                  className="p-6 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all duration-200 group"
                  onClick={() => handleCourseClick(course.course_id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-lg truncate group-hover:text-blue-700">
                        {course.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        {course.code && <span className="font-medium">{course.code}</span>}
                        {course.section && <span>• Section {course.section}</span>}
                      </div>
                                             {!isProfessor && (
                         <p className="text-xs text-gray-500 mt-1">
                           by {course.owner_name || course.username || 'Unknown'}
                         </p>
                       )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {course.is_public && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" title="Public course"></div>
                      )}
                      <GraduationCap className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                    </div>
                  </div>
                  
                  {course.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {course.description}
                    </p>
                  )}
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <BookOpen className="w-4 h-4" />
                        <span>{course.session_count || 0} sessions</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{course.enrollment_count || 0} students</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex flex-col">
                        {course.department && (
                          <span className="text-xs text-gray-500">{course.department}</span>
                        )}
                        {course.semester && course.year && (
                          <span className="text-xs text-gray-500">{course.semester} {course.year}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        Created {formatDate(course.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Getting Started Section */}
        {!loading && !error && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mt-8">
                         <h2 className="text-2xl font-bold text-gray-900 mb-6">
               {isProfessor ? 'Teaching with ProfSidekick' : 'Learning with ProfSidekick'}
             </h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {isProfessor ? (
                <>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-blue-600">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Create Your Course</h3>
                      <p className="text-gray-600 text-sm">Set up your course with details, enroll students, and organize content.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-blue-600">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Build Teaching Sessions</h3>
                      <p className="text-gray-600 text-sm">Upload presentations and configure AI assistants for interactive lessons.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-blue-600">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Teach Interactively</h3>
                      <p className="text-gray-600 text-sm">Deliver engaging AI-powered lessons with real-time interaction.</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-green-600">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Access Your Courses</h3>
                      <p className="text-gray-600 text-sm">Browse your enrolled courses and view available learning sessions.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-green-600">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Join Sessions</h3>
                      <p className="text-gray-600 text-sm">Participate in interactive AI-powered learning experiences.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-green-600">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Learn & Engage</h3>
                      <p className="text-gray-600 text-sm">Ask questions and interact with AI tutors during lessons.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 