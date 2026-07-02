"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useCourses } from '@/hooks/useCourses';
import { ArrowLeft, BookOpen, Users, Globe, Lock } from 'lucide-react';

export default function CreateCoursePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { createCourse } = useCourses();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    section: '',
    description: '',
    department: '',
    semester: '',
    year: new Date().getFullYear().toString(),
    is_public: false,
    allow_subscriber_sessions: false,
    enable_math_autograder: false,
    max_students: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const courseData = {
        ...formData,
        syllabus_details: formData.enable_math_autograder ? { feature: "math_autograder" } : {},
        max_students: formData.max_students ? parseInt(formData.max_students) : undefined,
        year: parseInt(formData.year),
        user_id: user.id,
      };

      const newCourse = await createCourse(courseData);
      router.push(`/courses/${newCourse.course_id}`);
    } catch (error) {
      console.error('Failed to create course:', error);
      // You might want to show an error toast here
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear + i - 1);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 dark:from-gray-900 dark:to-gray-800 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Create New Course</h1>
              <p className="text-xl text-gray-600 dark:text-gray-400">Set up your course and start building amazing learning experiences</p>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Basic Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Course Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Introduction to Computer Science"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:border-emerald-500 dark:border-emerald-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Course Code *
                    </label>
                    <input
                      type="text"
                      id="code"
                      name="code"
                      required
                      value={formData.code}
                      onChange={handleInputChange}
                      placeholder="e.g., CS101"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:border-emerald-500 dark:border-emerald-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="section" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Section
                    </label>
                    <input
                      type="text"
                      id="section"
                      name="section"
                      value={formData.section}
                      onChange={handleInputChange}
                      placeholder="e.g., A, 001, Morning"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:border-emerald-500 dark:border-emerald-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Department
                    </label>
                    <input
                      type="text"
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      placeholder="e.g., Computer Science"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:border-emerald-500 dark:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
                
                <div className="mt-6">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Course Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe what students will learn in this course..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:border-emerald-500 dark:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* Schedule Information */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Schedule Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="semester" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Semester/Term
                    </label>
                    <select
                      id="semester"
                      name="semester"
                      value={formData.semester}
                      onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:border-emerald-500 dark:border-emerald-500 transition-colors"
                    >
                      <option value="">Select semester</option>
                      <option value="Spring">Spring</option>
                      <option value="Summer">Summer</option>
                      <option value="Fall">Fall</option>
                      <option value="Winter">Winter</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="year" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Year
                    </label>
                    <select
                      id="year"
                      name="year"
                      value={formData.year}
                      onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:border-emerald-500 dark:border-emerald-500 transition-colors"
                    >
                      {years.map(year => (
                        <option key={year} value={year.toString()}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Access & Settings */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Access & Settings
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="max_students" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Maximum Students
                    </label>
                    <input
                      type="number"
                      id="max_students"
                      name="max_students"
                      min="1"
                      value={formData.max_students}
                      onChange={handleInputChange}
                      placeholder="e.g., 30"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:border-emerald-500 dark:border-emerald-500 transition-colors"
                    />
                  </div>
                  
                  <div className="flex items-center mt-8">
                    <input
                      type="checkbox"
                      id="is_public"
                      name="is_public"
                      checked={formData.is_public}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-emerald-700 dark:text-emerald-400 border-gray-300 rounded focus:ring-emerald-500 dark:focus:ring-emerald-500"
                    />
                    <label htmlFor="is_public" className="ml-3 flex items-center gap-2">
                      {formData.is_public ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Make course publicly discoverable
                      </span>
                    </label>
                  </div>

                  <div className="flex items-start mt-4">
                    <input
                      type="checkbox"
                      id="allow_subscriber_sessions"
                      name="allow_subscriber_sessions"
                      checked={formData.allow_subscriber_sessions}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                    />
                    <label htmlFor="allow_subscriber_sessions" className="ml-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Allow enrolled subscribers to start AI sessions
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Subscribers can run your published sessions using their credit balance. You can change this later in course settings.
                      </p>
                    </label>
                  </div>
                </div>

                <div className="flex items-start mt-4">
                  <input
                    type="checkbox"
                    id="enable_math_autograder"
                    name="enable_math_autograder"
                    checked={formData.enable_math_autograder}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                  />

                  <label htmlFor="enable_math_autograder" className="ml-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enable Math AutoGrader
                    </span>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Shows placement test submission and grading features for this course.
                    </p>
                  </label>
                </div>

                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong className="text-gray-900 dark:text-gray-200">Public courses:</strong> Can be discovered and enrolled in by any student.<br />
                    <strong className="text-gray-900 dark:text-gray-200">Private courses:</strong> Students need an enrollment code to join.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.name.trim() || !formData.code.trim()}
                  aria-busy={loading}
                  className="flex items-center gap-2 px-8 py-3 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Creating...
                    </>
                  ) : (
                    'Create Course'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 