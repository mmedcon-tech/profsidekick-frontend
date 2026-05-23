"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';
import { BookOpen, Search, Users, GraduationCap } from 'lucide-react';

export default function StudentDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  // const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  
  // Fetch enrolled courses
  const { courses, loading, error, refetch,  } = useCourses();

  // Filter courses based on search query
  const filteredCourses = useMemo(() => {
    if (!searchQuery) return courses;
    return courses.filter(course =>
      course.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.department?.toLowerCase().includes(searchQuery.toLowerCase())
    //   course.owner_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [courses, searchQuery]);

  const handleViewCourse = (courseId: string) => {
    router.push(`/courses/${courseId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome, {user?.firstName}!
          </h1>
          <p className="text-xl text-gray-600">
            Ready to join your next interactive learning session?
          </p>
        </div>

        {/* Search Section */}
        <div className="mb-8">
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search courses, professors, or sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Enrolled Courses */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">My Courses</h3>
            <span className="text-sm text-gray-500">
              {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} found
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
                {searchQuery ? 'No courses match your search' : 'No courses enrolled'}
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {searchQuery ? 'Try adjusting your search terms' : 'Contact your instructor to get enrolled in courses!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <div
                  key={course.course_id}
                  className="p-6 border border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 cursor-pointer transition-all duration-200 group"
                  onClick={() => handleViewCourse(course.course_id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-lg truncate group-hover:text-green-700">
                        {course.name}
                      </h4>
                      <p className="text-sm text-gray-600 truncate">
                        {course.code && `${course.code}${course.section ? ` - ${course.section}` : ''}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        by {course.owner_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {course.is_public && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" title="Public course"></div>
                      )}
                      <GraduationCap className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors flex-shrink-0" />
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

        {/* Getting Started Guide for Students */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How to Access Course Sessions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-green-600">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Select Your Course</h3>
                <p className="text-gray-600 text-sm">Click on any course card to view available sessions.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-green-600">2</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Browse Sessions</h3>
                <p className="text-gray-600 text-sm">View all teaching sessions created by your instructor.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-green-600">3</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Join & Learn</h3>
                <p className="text-gray-600 text-sm">Start an interactive AI-powered learning session!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 