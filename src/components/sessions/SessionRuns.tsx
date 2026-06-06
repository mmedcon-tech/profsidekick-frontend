import React from 'react';
import { useRouter } from 'next/navigation';
import { useSessionRuns } from '@/hooks/useSessionRuns';
import {
  Play, Clock, Calendar, CheckCircle, XCircle, AlertCircle,
  Bot, Tag, Layers,
} from 'lucide-react';

interface SessionRunsProps {
  sessionId: string;
  courseId: string;
  onRunClick?: (runId: string) => void;
}

export default function SessionRuns({ sessionId, courseId, onRunClick }: SessionRunsProps) {
  const router = useRouter();
  const { runs, loading, error, refetch } = useSessionRuns({ sessionId });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'ACTIVE':    return <Play className="w-4 h-4 text-blue-600" />;
      case 'FAILED':    return <XCircle className="w-4 h-4 text-red-600" />;
      default:          return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'ACTIVE':    return 'bg-blue-100 text-blue-800';
      case 'FAILED':    return 'bg-red-100 text-red-800';
      default:          return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRunClick = (run: any) => {
    if (run.status === 'ACTIVE') {
      if (onRunClick) {
        onRunClick(run.sessionRunId);
      } else {
        router.push(`/courses/${courseId}/sessions/${sessionId}/run/${run.sessionRunId}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse p-4 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-3 bg-gray-200 rounded w-16" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-3 bg-gray-200 rounded" />
              <div className="h-3 bg-gray-200 rounded" />
              <div className="h-3 bg-gray-200 rounded" />
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
        <p className="text-gray-600 text-sm mb-3">{error}</p>
        <button onClick={() => refetch()} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
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
        <p className="text-gray-600">No sessions yet</p>
        <p className="text-gray-500 text-sm mt-1">Start your first session to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((run: any) => (
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
              <span className="font-medium text-gray-900 text-sm">
                {run.className ?? `Run #${run.sessionRunId.slice(-8)}`}
              </span>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(run.status)}`}>
              {run.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-500">Started</p>
                <p className="text-xs">{formatDate(run.startedAt)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-500">Duration</p>
                <p className="text-xs">{formatDuration(run.duration)}</p>
              </div>
            </div>

            {run.avatarName && (
              <div className="flex items-center gap-2 text-gray-600">
                <Bot className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500">Avatar</p>
                  <p className="text-xs truncate max-w-[120px]">{run.avatarName}</p>
                </div>
              </div>
            )}

            {run.roleAtStart && (
              <div className="flex items-center gap-2 text-gray-600">
                <Tag className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500">Role</p>
                  <p className="text-xs truncate max-w-[120px]">{run.roleAtStart}</p>
                </div>
              </div>
            )}

            {run.totalSlides > 0 && (
              <div className="flex items-center gap-2 text-gray-600">
                <Layers className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500">Slides</p>
                  <p className="text-xs">{run.slidesCompleted ?? '—'} / {run.totalSlides}</p>
                </div>
              </div>
            )}
          </div>

          {run.status === 'ACTIVE' && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-blue-600 text-sm font-medium">
              <Play className="w-4 h-4" />
              Click to resume session
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
