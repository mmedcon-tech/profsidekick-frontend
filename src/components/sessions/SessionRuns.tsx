import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionRuns, SessionRunSummary } from '@/hooks/useSessionRuns';
import { Play, Clock, Star, Calendar, CheckCircle, XCircle, AlertCircle, MessageSquare, AlertTriangle, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

interface SessionRunsProps {
  sessionId: string;
  courseId: string;
  onRunClick?: (runId: string) => void;
}

export default function SessionRuns({ sessionId, courseId, onRunClick }: SessionRunsProps) {
  const router = useRouter();
  const { runs, loading, error, refetch } = useSessionRuns({ sessionId });
  const [expandedFeedback, setExpandedFeedback] = useState<string[]>([]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'ACTIVE':
        return <Play className="w-4 h-4 text-blue-600" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'ACTIVE':
        return 'bg-blue-100 text-blue-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderStarRating = (rating?: number) => {
    if (!rating) return <span className="text-gray-400 text-sm">No rating</span>;
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">({rating}/5)</span>
      </div>
    );
  };

  const handleRunClick = (run: SessionRunSummary) => {
    if (run.status === 'ACTIVE') {
      if (onRunClick) {
        onRunClick(run.sessionRunId);
      } else {
        router.push(`/courses/${courseId}/sessions/${sessionId}/run/${run.sessionRunId}`);
      }
    }
    // For completed/failed runs, we could show a detailed view or prevent clicks
  };

  const toggleFeedback = (runId: string) => {
    setExpandedFeedback(prev => 
      prev.includes(runId) 
        ? prev.filter(id => id !== runId)
        : [...prev, runId]
    );
  };

  const renderComprehensiveFeedback = (run: SessionRunSummary) => {
    const { feedback } = run;
    if (!feedback) return null;

    const hasGeneralFeedback = feedback.general_feedback?.trim();
    const hasIssues = feedback.issues_encountered?.trim();
    const hasSuggestions = feedback.suggestions?.trim();
    
    if (!hasGeneralFeedback && !hasIssues && !hasSuggestions) return null;

    const isExpanded = expandedFeedback.includes(run.sessionRunId);

    return (
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Session Feedback
          </h4>
          <button
            onClick={() => toggleFeedback(run.sessionRunId)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Always show general feedback if it exists */}
        

        {/* Expandable sections for issues and suggestions */}
        {isExpanded && (
          <div className="space-y-3">
            {hasGeneralFeedback && (
            <div className="mb-3">
                <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                    <p className="text-xs font-medium text-blue-700 mb-1">Overall Experience</p>
                    <p className="text-sm text-blue-800">{feedback.general_feedback}</p>
                    </div>
                </div>
                </div>
            </div>
            )}

            {hasIssues && (
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-yellow-700 mb-1">Issues Encountered</p>
                    <p className="text-sm text-yellow-800">{feedback.issues_encountered}</p>
                  </div>
                </div>
              </div>
            )}

            {hasSuggestions && (
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-green-700 mb-1">Suggestions for Improvement</p>
                    <p className="text-sm text-green-800">{feedback.suggestions}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Expand/collapse hint */}
        {(hasIssues || hasSuggestions) && (
          <div className="mt-2 text-center">
            <span className="text-xs text-gray-500">
              {isExpanded ? 'Click to collapse details' : `Click to view ${hasIssues && hasSuggestions ? 'issues & suggestions' : hasIssues ? 'issues' : 'suggestions'}`}
            </span>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse p-4 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-yellow-600" />
        </div>
        <p className="text-gray-800 font-medium mb-2">Session Runs Unavailable</p>
        <p className="text-gray-600 text-sm mb-3">
          {error.includes('endpoint not available') || error.includes('404') 
            ? 'The session runs feature requires backend implementation. See README for API specification.'
            : error}
        </p>
        <button
          onClick={() => refetch()}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Play className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-600">No teaching sessions yet</p>
        <p className="text-gray-500 text-sm mt-1">Start your first session to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => (
        <div
          key={run.sessionRunId}
          onClick={() => handleRunClick(run)}
          className={`p-4 border border-gray-200 rounded-lg transition-all duration-200 ${
            run.status === 'ACTIVE' 
              ? 'hover:border-blue-300 hover:bg-blue-50 cursor-pointer' 
              : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              {getStatusIcon(run.status)}
              <span className="font-medium text-gray-900">
                Session Run #{run.sessionRunId.slice(-8)}
              </span>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(run.status)}`}>
              {run.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <div>
                <p className="font-medium">Started</p>
                <p>{formatDate(run.startedAt)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <div>
                <p className="font-medium">Duration</p>
                <p>{formatDuration(run.duration)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-gray-600">
              <Star className="w-4 h-4" />
              <div>
                <p className="font-medium">Rating</p>
                {renderStarRating(run.feedback?.rating)}
              </div>
            </div>

            {/* <div className="flex items-center gap-2 text-gray-600">
              <Play className="w-4 h-4" />
              <div>
                <p className="font-medium">Progress</p>
                <p>
                  {run.slidesCompleted || 0}/{run.totalSlides || 0} slides
                </p>
              </div>
            </div> */}
          </div>

          {renderComprehensiveFeedback(run)}

          {run.status === 'ACTIVE' && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
                <Play className="w-4 h-4" />
                Click to resume session
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 