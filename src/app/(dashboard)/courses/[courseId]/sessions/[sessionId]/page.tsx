"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Play, Clock, Copy, Check, Calendar, Presentation, Settings2, Share2 } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import SessionRuns from '@/components/sessions/SessionRuns';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AISettings from '@/components/sessions/AISettings';
import SlidesPreview from '@/components/sessions/SlidesPreview';
import SessionMaterials from '@/components/sessions/SessionMaterials';
import SubscriberRuntimeSelector from '@/components/courses/SubscriberRuntimeSelector';
import { subscriptionApi } from '@/lib/avatarApi';
// import { config } from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';

interface SessionDetails {
  sessionId: string;
  classDetails: {
    className: string;
    courseName: string;
    courseCode: string;
    description?: string;
    duration: number;
  };
  status: string;
  totalSlides: number;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  runCount: number;
  lastRunAt?: string;
  presentationDetails?: {
    filename: string;
    filePath: string;
    fileSize: number;
    fileType: string;
  };
  slidesDetails?: any[];
  assistantParameters?: any;
  subscriberRuntimeMode?: string;
  avatarId?: string;
}

export default function SessionDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.courseId as string;
  const sessionId = params.sessionId as string;
  const isSharedLink = searchParams.get('shared') === 'true';
  const router = useRouter();
  const { token } = useAuth();
  const [copiedId, setCopiedId] = useState(false);
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAISettings, setShowAISettings] = useState(false);
  const [startingTeaching, setStartingTeaching] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showRuntimeSelector, setShowRuntimeSelector] = useState(false);
  const { user } = useAuth();

  // Fetch session details from backend
  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (!token && !isSharedLink) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/sessions/${sessionId}`, {
          headers,
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch session details');
        }
        
        const data = await response.json();
        console.log('Raw session data:', data);
        
        // Transform the data to match our expected interface
        const transformedData = {
          sessionId: data.sessionId || sessionId,
          classDetails: {
            className: data.className || 'Teaching Session',
            courseName: data.courseName || '',
            courseCode: data.courseCode || '',
            description: data.description || '',
            duration: data.duration || 0,
          },
          status: data.status || 'active',
          totalSlides: data.slidesDetails ? data.slidesDetails.length : 0,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          lastAccessedAt: data.lastAccessedAt,
          runCount: data.runCount || 0,
          lastRunAt: data.lastRunAt,
          // Store additional data that might be useful
          presentationDetails: data.presentationDetails,
          slidesDetails: data.slidesDetails,
          assistantParameters: data.assistantParameters,
          subscriberRuntimeMode: data.subscriberRuntimeMode || 'avatar',
          avatarId: data.avatarId || null,
        };
        
        console.log('Transformed session data:', transformedData);
        setSessionDetails(transformedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching session details:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSessionDetails();
  }, [sessionId, token]);

  const copySessionId = async () => {
    try {
      await navigator.clipboard.writeText(sessionId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch (err) {
      console.error('Failed to copy session ID:', err);
    }
  };

  const handleStartTeaching = () => {
    const isPublisher = user?.role === 'publisher' || user?.role === 'admin';
    if (isPublisher) {
      router.push(`/publisher/sessions/${sessionId}/chat`);
      return;
    }

    // Subscriber flow: branch on subscriberRuntimeMode
    const runtimeMode = sessionDetails?.subscriberRuntimeMode || 'avatar';
    if (runtimeMode === 'choice') {
      setShowRuntimeSelector(true);
    } else {
      startSubscriberRun(runtimeMode as 'avatar' | 'chat');
    }
  };

  const startSubscriberRun = async (chosenMode: 'avatar' | 'chat') => {
    if (startingTeaching) return;
    setShowRuntimeSelector(false);
    try {
      setStartingTeaching(true);

      // Subscription gate: if this session has an avatar, subscriber must be subscribed
      const avatarId = sessionDetails?.avatarId;
      if (avatarId && token && !isSharedLink) {
        const status = await subscriptionApi.status(avatarId).catch(() => ({ subscribed: true, subscription: null }));
        if (!status.subscribed) {
          router.push(`/subscriber/marketplace/${avatarId}`);
          return;
        }
      }
      const endpoint = isSharedLink
        ? `/api/sessions/${sessionId}/run/start/guest`
        : `/api/sessions/${sessionId}/run/start`;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token && !isSharedLink) headers['Authorization'] = `Bearer ${token}`;
      const body: Record<string, any> = {
        assistant_parameters: sessionDetails?.assistantParameters || {},
      };
      if (sessionDetails?.subscriberRuntimeMode === 'choice') {
        body.chosen_mode = chosenMode;
      }
      const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.detail || result.message || result.error || 'Failed to start session');
      }
      if (result.sessionRunId) {
        const runUrl = isSharedLink
          ? `/courses/${courseId}/sessions/${sessionId}/run/${result.sessionRunId}?shared=true`
          : `/courses/${courseId}/sessions/${sessionId}/run/${result.sessionRunId}`;
        router.push(runUrl);
      }
    } catch (error) {
      console.error('Error starting session:', error);
      alert((error as Error).message || 'Failed to start session. Please try again.');
    } finally {
      setStartingTeaching(false);
    }
  };

  const handleBackToCourse = () => {
    router.push(`/courses/${courseId}`);
  };

  const handleCopySessionLink = async () => {
    const currentUrl = window.location.origin;
    const shareableUrl = `${currentUrl}/courses/${courseId}/sessions/${sessionId}?shared=true`;
    
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000); // Reset after 2 seconds
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareableUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  return (
    <ProtectedRoute requireAuth={!isSharedLink}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              {!isSharedLink && (
                <button
                  onClick={handleBackToCourse}
                  className="p-2 hover:bg-white dark:bg-gray-800/50 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </button>
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Session Details</h1>
                <p className="text-gray-600 dark:text-gray-400">Course: {sessionDetails?.classDetails.courseName || 'Loading...'}</p>
                {isSharedLink && (
                  <p className="text-sm text-blue-600 mt-1">
                    👋 You are viewing a shared session. Start learning with AI!
                  </p>
                )}
              </div>
            </div>
            
            <button
              onClick={handleStartTeaching}
              disabled={startingTeaching}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {startingTeaching ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  {(user?.role === 'publisher' || user?.role === 'admin') && (
                    <span>Start Teaching</span>
                  )}
                  {user?.role === 'subscriber' && (
                    <span>Start Learning with AI</span>
                  )}
                  {isSharedLink && (
                    <span>Start Learning with AI</span>
                  )}
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {loading ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm">
                  <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ) : error ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm">
                  <div className="text-center text-red-600">
                    Error: {error}
                  </div>
                </div>
              ) : sessionDetails ? (
                <>
                  {/* Session Overview */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                          {sessionDetails.classDetails.className}
                        </h2>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Created {new Date(sessionDetails.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{sessionDetails.classDetails.duration} minutes</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Presentation className="w-4 h-4" />
                            <span>{sessionDetails.totalSlides} slides</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Play className="w-4 h-4" />
                            <span>{sessionDetails.runCount} runs</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          {sessionDetails.status}
                        </span>
                      </div>
                    </div>
                    
                    {sessionDetails.classDetails.description && (
                      <p className="text-gray-700 dark:text-gray-300 mb-4">{sessionDetails.classDetails.description}</p>
                    )}
                    
                    {/* Session ID */}
                    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Session ID:</span>
                      <code className="flex-1 text-sm font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded border">
                        {sessionId}
                      </code>
                      <button
                        onClick={copySessionId}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Copy Session ID"
                      >
                        {copiedId ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Slides Preview */}
                  {sessionDetails.slidesDetails && (user?.role === 'publisher' || user?.role === 'admin') && (
                    <SlidesPreview 
                      slides={sessionDetails.slidesDetails} 
                      sessionId={sessionId}
                    //   presentationDetails={sessionDetails.presentationDetails}
                    />
                  )}

                  {/* Session Materials */}
                  {user?.role === 'publisher' || user?.role === 'admin' && !isSharedLink && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                      <SessionMaterials 
                        sessionId={sessionId} 
                        courseId={courseId}
                      />
                    </div>
                  )}

                  {/* Session Runs */}
                  {user?.role === 'publisher' || user?.role === 'admin' && !isSharedLink && (
                  <SessionRuns 
                    sessionId={sessionId} 
                    courseId={courseId}
                    onRunClick={(runId) => router.push(`/courses/${courseId}/sessions/${sessionId}/run/${runId}`)}
                  />
                  )}
                </>
              ) : null}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={handleStartTeaching}
                    disabled={startingTeaching}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" />
                    {(user?.role === 'publisher' || user?.role === 'admin') && (
                      <span>Start New Run</span>
                    )}
                    {user?.role === 'subscriber' && (
                      <span>Start Learning with AI</span>
                    )}
                    {isSharedLink && (
                      <span>Start Learning with AI</span>
                    )}
                  </button>
                  {/* AI Settings */}
                  {(user?.role === 'publisher' || user?.role === 'admin') && (
                  <button
                    onClick={() => setShowAISettings(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors"
                  >
                    <Settings2 className="w-4 h-4" />
                    AI Settings
                  </button>
                  )}
                  {/* Copy Session Link */}
                  {(user?.role === 'publisher' || user?.role === 'admin') && (
                  <button
                    onClick={handleCopySessionLink}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors"
                  >
                    {linkCopied ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        Copy Session Link
                      </>
                    )}
                  </button>
                  )}
                </div>
              </div>

              {/* Session Stats */}
              {sessionDetails && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Session Statistics</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Total Runs</span>
                      <span className="font-semibold">{sessionDetails.runCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Total Slides</span>
                      <span className="font-semibold">{sessionDetails.totalSlides}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Duration</span>
                      <span className="font-semibold">{sessionDetails.classDetails.duration} min</span>
                    </div>
                    {sessionDetails.lastRunAt && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Last Run</span>
                        <span className="font-semibold text-sm">
                          {new Date(sessionDetails.lastRunAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subscriber Runtime Selector Modal */}
      {showRuntimeSelector && (
        <SubscriberRuntimeSelector
          loading={startingTeaching}
          onSelect={(mode) => startSubscriberRun(mode)}
          onClose={() => setShowRuntimeSelector(false)}
        />
      )}

      {/* AI Settings Modal */}
      {showAISettings && sessionDetails && (
        <AISettings
          sessionId={sessionId}
        //   initialSettings={sessionDetails.assistantParameters || {}}
          onClose={() => setShowAISettings(false)}
        //   onSave={(settings) => {
        //     // Update session details with new settings
        //     setSessionDetails({
        //       ...sessionDetails,
        //       assistantParameters: settings
        //     });
        //     setShowAISettings(false);
        //   }}
        />
      )}
    </ProtectedRoute>
  );
} 