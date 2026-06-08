"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { 
  User, 
  Lock, 
  Trash2, 
  Save, 
  Eye, 
  EyeOff, 
  // AlertTriangle, 
  FileText, 
  Bell, 
  Palette,
  Settings,
  ChevronRight,
  Plus,
  Edit,
  Copy,
  Tag,
  Clock
} from 'lucide-react';
import PromptCreationModal from '@/components/sessions/PromptCreationModal';
import { usePrompts } from '@/hooks/usePrompts';
// import { parseTagsString } from '@/lib/tagUtils';

// Tab configuration
const TABS = [
  { id: 'general', label: 'General', icon: User, description: 'Personal information and account details' },
  { id: 'prompts', label: 'Saved Prompts', icon: FileText, description: 'Manage your custom AI prompts and templates' },
  { id: 'security', label: 'Security', icon: Lock, description: 'Password and security settings' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Email and push notification preferences' },
  { id: 'preferences', label: 'Preferences', icon: Palette, description: 'App theme and display settings' },
  { id: 'account', label: 'Account', icon: Settings, description: 'Account management and danger zone' },
];

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  
  // Active tab state
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'general');
  
  // Personal Information State
  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    bio: '',
    organization: '',
    jobTitle: ''
  });

  // Password Change State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Prompts Management
  const { 
    prompts: savedPrompts, 
    loading: promptsLoading, 
    error: promptsError, 
    createPrompt, 
    updatePrompt, 
    deletePrompt,
    refetch: refetchPrompts 
  } = usePrompts({ includePublic: false });
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<any>(null);

  // Notification Settings State
  // const [, setNotifications] = useState({
  //   emailNotifications: true,
  //   sessionReminders: true,
  //   weeklyReports: false,
  //   marketingEmails: false,
  //   pushNotifications: true
  // });

  // Preferences State
  // const [, setPreferences] = useState({
  //   theme: 'light',
  //   language: 'en',
  //   timezone: 'UTC',
  //   dateFormat: 'MM/DD/YYYY'
  // });

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setPersonalInfo({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        username: user.username || '',
        bio: (user as any).bio || '',
        organization: (user as any).organization || '',
        jobTitle: (user as any).jobTitle || ''
      });
    }
  }, [user]);

  // Update URL when tab changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState({}, '', url);
  }, [activeTab]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setMessage(null); // Clear any existing messages
  };

  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPersonalInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // const handleNotificationChange = (key: string, value: boolean) => {
  //   setNotifications(prev => ({
  //     ...prev,
  //     [key]: value
  //   }));
  // };

  // const handlePreferenceChange = (key: string, value: string) => {
  //   setPreferences(prev => ({
  //     ...prev,
  //     [key]: value
  //   }));
  // };

  const handleDeletePrompt = async (id: string) => {
    try {
      await deletePrompt(id);
      setMessage({ type: 'success', text: 'Prompt deleted successfully!' });
    } catch (error) {
      console.error('Error deleting prompt:', error);
      setMessage({ type: 'error', text: 'Failed to delete prompt. Please try again.' });
    }
  };

  const handleSavePrompt = async (promptData: any) => {
    try {
      if (editingPrompt) {
        // Update existing prompt
        await updatePrompt(editingPrompt.id, promptData);
        setMessage({ type: 'success', text: 'Prompt updated successfully!' });
      } else {
        // Create new prompt
        await createPrompt(promptData);
        setMessage({ type: 'success', text: 'Prompt created successfully!' });
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      setMessage({ type: 'error', text: editingPrompt ? 'Failed to update prompt.' : 'Failed to create prompt.' });
    }
  };

  const handlePersonalInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      // Simulate API call - replace with actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage({ type: 'success', text: 'Personal information updated successfully!' });
    } catch (error) {
      console.error('Error updating personal information:', error);
      setMessage({ type: 'error', text: 'Failed to update personal information. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }

    setIsChangingPassword(true);
    setMessage(null);

    try {
      // Simulate API call - replace with actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: 'Failed to change password. Please check your current password.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    
    try {
      // Simulate API call - replace with actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      setMessage({ type: 'error', text: 'Failed to delete account. Please try again.' });
      setIsLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">General Information</h2>
              <form onSubmit={handlePersonalInfoSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={personalInfo.firstName}
                      onChange={handlePersonalInfoChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={personalInfo.lastName}
                      onChange={handlePersonalInfoChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={personalInfo.email}
                    onChange={handlePersonalInfoChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter your email address"
                  />
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={personalInfo.username}
                    onChange={handlePersonalInfoChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter your username"
                  />
                </div>

                {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Job Title
                    </label>
                    <input
                      type="text"
                      id="jobTitle"
                      name="jobTitle"
                      value={personalInfo.jobTitle}
                      onChange={handlePersonalInfoChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="e.g. Mathematics Teacher"
                    />
                  </div>
                  <div>
                    <label htmlFor="organization" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Organization
                    </label>
                    <input
                      type="text"
                      id="organization"
                      name="organization"
                      value={personalInfo.organization}
                      onChange={handlePersonalInfoChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="e.g. Springfield High School"
                    />
                  </div>
                </div> */}

                {/* <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={4}
                    value={personalInfo.bio}
                    onChange={handlePersonalInfoChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Tell us a bit about yourself..."
                  />
                </div> */}

                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        );

      case 'prompts':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Saved Prompts</h2>
                <p className="text-gray-600 dark:text-gray-400">Manage your custom AI prompts and templates</p>
              </div>
              <button 
                onClick={() => setShowPromptModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Prompt
              </button>
            </div>
            
            {/* Loading State */}
            {promptsLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading your prompts...</span>
              </div>
            )}

            {/* Error State */}
            {promptsError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-600">Error loading prompts: {promptsError}</p>
                <button 
                  onClick={refetchPrompts}
                  className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            )}

            {!promptsLoading && !promptsError && savedPrompts.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No saved prompts yet</p>
                <p className="text-gray-400 mb-4">Create your first custom AI prompt to get started</p>
                <button 
                  onClick={() => setShowPromptModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Create Your First Prompt
                </button>
              </div>
            ) : !promptsLoading && !promptsError && (
              <div className="grid gap-4">
                {savedPrompts.map((prompt) => (
                  <div key={prompt.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:shadow-md transition-all duration-200">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{prompt.name}</h3>
                          {prompt.isPublic && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              Public
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-3">{prompt.description}</p>
                        
                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {prompt.tags && prompt.tags.split(',').map(t => t.trim()).filter(t => t).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                            >
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(prompt.updatedAt).toLocaleDateString()}
                          </span>
                          <span>{prompt.usageCount} uses</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                            {prompt.category}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <button 
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(prompt.content);
                              setMessage({ type: 'success', text: 'Prompt copied to clipboard!' });
                            } catch (err) {
                              console.error('Error copying prompt:', err);
                              setMessage({ type: 'error', text: 'Failed to copy prompt' });
                            }
                          }}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Copy prompt"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingPrompt(prompt);
                            setShowPromptModal(true);
                          }}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit prompt"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeletePrompt(prompt.id)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete prompt"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Prompt Content Preview */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border-l-4 border-blue-500">
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                        {prompt.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Security Settings</h2>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter your current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      id="newPassword"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Password must be at least 8 characters long and contain a mix of letters, numbers, and symbols.
              </p>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isChangingPassword ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Changing Password...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Change Password
                  </>
                )}
              </button>
            </form>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notification Preferences</h2>
            <p>Coming soon</p>
            {/* <div className="space-y-4">
              {Object.entries(notifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {key === 'emailNotifications' && 'Receive email notifications for important updates'}
                      {key === 'sessionReminders' && 'Get reminders before scheduled teaching sessions'}
                      {key === 'weeklyReports' && 'Weekly summary of your teaching activities'}
                      {key === 'marketingEmails' && 'Product updates and promotional content'}
                      {key === 'pushNotifications' && 'Browser push notifications'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => handleNotificationChange(key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-gray-800 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div> */}
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">App Preferences</h2>
            <p>Coming soon</p>
            {/* <div className="space-y-6">
              <div>
                <label htmlFor="theme" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Theme
                </label>
                <select
                  id="theme"
                  value={preferences.theme}
                  onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Language
                </label>
                <select
                  id="language"
                  value={preferences.language}
                  onChange={(e) => handlePreferenceChange('language', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>

              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Timezone
                </label>
                <select
                  id="timezone"
                  value={preferences.timezone}
                  onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                </select>
              </div>

              <div>
                <label htmlFor="dateFormat" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Format
                </label>
                <select
                  id="dateFormat"
                  value={preferences.dateFormat}
                  onChange={(e) => handlePreferenceChange('dateFormat', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div> */}
          </div>
        );

      case 'account':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Account Management</h2>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Delete Account</h3>
              <p className="text-red-700 mb-4">
                This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
              </p>
              
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </button>
              ) : (
                <div className="space-y-4">
                  <p className="text-red-800 font-medium">Are you absolutely sure you want to delete your account?</p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isLoading}
                      className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Yes, Delete My Account
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="bg-gray-300 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Settings</h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">Manage your account and preferences</p>
          </div>

          <div className="flex gap-8">
            {/* Sidebar */}
            <div className="w-80 flex-shrink-0">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sticky top-8">
                <nav className="space-y-2">
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600 shadow-sm'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 hover:text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{tab.label}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{tab.description}</div>
                        </div>
                        {isActive && <ChevronRight className="w-4 h-4 text-blue-600" />}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Message */}
              {message && (
                <div className={`mb-6 p-4 rounded-lg ${
                  message.type === 'success' 
                    ? 'bg-green-50 border border-green-200 text-green-800' 
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  {message.text}
                </div>
              )}

              {/* Tab Content */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                {renderTabContent()}
              </div>
            </div>
          </div>
        </div>

        {/* Prompt Creation Modal */}
        {showPromptModal && (
          <PromptCreationModal
            prompt={editingPrompt}
            onSave={(promptData) => {
              handleSavePrompt(promptData);
              setShowPromptModal(false);
              setEditingPrompt(null);
            }}
            onClose={() => {
              setShowPromptModal(false);
              setEditingPrompt(null);
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
