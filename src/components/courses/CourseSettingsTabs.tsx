"use client";

import React, { useState } from 'react';
import { Settings, BookOpen, Users, Shield } from 'lucide-react';
import CourseMaterials from './CourseMaterials';

interface CourseSettingsTabsProps {
  courseId: string;
  course: any; // Your existing course type
  onCourseUpdate: (field: string, value: any) => void;
  hasChanges: boolean;
  onSave: () => void;
  saving: boolean;
}

type TabId = 'general' | 'materials' | 'students' | 'privacy';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const TABS: Tab[] = [
  { 
    id: 'general', 
    label: 'General', 
    icon: Settings, 
    description: 'Basic course information and settings' 
  },
  { 
    id: 'materials', 
    label: 'Materials', 
    icon: BookOpen, 
    description: 'Manage course books, articles, and resources' 
  },
  { 
    id: 'students', 
    label: 'Students', 
    icon: Users, 
    description: 'Manage student enrollment and access' 
  },
  { 
    id: 'privacy', 
    label: 'Privacy', 
    icon: Shield, 
    description: 'Course visibility and access settings' 
  }
];

export default function CourseSettingsTabs({ 
  courseId, 
  course, 
  onCourseUpdate, 
  hasChanges, 
  onSave, 
  saving 
}: CourseSettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general');

  const renderGeneralSettings = () => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Course Name *
              </label>
              <input
                type="text"
                value={course.name}
                onChange={(e) => onCourseUpdate('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Introduction to Computer Science"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Course Code *
              </label>
              <input
                type="text"
                value={course.code || ''}
                required
                onChange={(e) => onCourseUpdate('code', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="CS101"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Section
              </label>
              <input
                type="text"
                value={course.section || ''}
                onChange={(e) => onCourseUpdate('section', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Department
              </label>
              <input
                type="text"
                value={course.department || ''}
                onChange={(e) => onCourseUpdate('department', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Computer Science"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Semester
              </label>
              <select
                value={course.semester || ''}
                onChange={(e) => onCourseUpdate('semester', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select semester</option>
                <option value="fall">Fall</option>
                <option value="spring">Spring</option>
                <option value="summer">Summer</option>
                <option value="winter">Winter</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Year
              </label>
              <select
                value={course.year || currentYear}
                onChange={(e) => onCourseUpdate('year', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={course.description || ''}
            onChange={(e) => onCourseUpdate('description', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe your course objectives, topics, and expectations..."
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Course Status</h3>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={course.is_active}
              onChange={(e) => onCourseUpdate('is_active', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-3 block text-sm text-gray-900 dark:text-gray-100">
              Active course
            </label>
          </div>
        </div>
      </div>
    );
  };

  const renderStudentsSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Student Management</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Control how students can access and enroll in your course.</p>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="allow_self_enrollment"
              checked={course.allow_self_enrollment || false}
              onChange={(e) => onCourseUpdate('allow_self_enrollment', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="allow_self_enrollment" className="ml-3 block text-sm text-gray-900 dark:text-gray-100">
              Allow self-enrollment
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Maximum Enrollment
            </label>
            <input
              type="number"
              min="1"
              value={course.max_enrollment || ''}
              onChange={(e) => onCourseUpdate('max_enrollment', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="No limit"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Leave empty for no enrollment limit</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Privacy & Visibility</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Control who can see and access your course.</p>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_public"
              checked={course.is_public}
              onChange={(e) => onCourseUpdate('is_public', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_public" className="ml-3 block text-sm text-gray-900 dark:text-gray-100">
              Public course
            </label>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 ml-7">
            Public courses can be discovered and viewed by other users
          </p>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralSettings();
      case 'materials':
        return <CourseMaterials courseId={courseId} />;
      case 'students':
        return renderStudentsSettings();
      case 'privacy':
        return renderPrivacySettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-8 overflow-x-auto whitespace-nowrap" aria-label="Tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex-shrink-0 ${
                    isActive
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {TABS.find(tab => tab.id === activeTab)?.label}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              {TABS.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>

          {renderTabContent()}
        </div>
      </div>

      {/* Save Button - Only show for tabs that modify course data */}
      {hasChanges && activeTab !== 'materials' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">You have unsaved changes</p>
            </div>
            <button
              onClick={onSave}
              disabled={saving}
              aria-busy={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Settings className="w-5 h-5" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
