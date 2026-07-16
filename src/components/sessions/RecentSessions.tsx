import React from 'react';
import { useRouter } from 'next/navigation';
import { useUserSessions, UserSession } from '@/hooks/useUserSessions';
import { BookOpen, Clock, Play, Users } from 'lucide-react';

export default function RecentSessions() {
  const router = useRouter();
  const { sessions, loading, error, refetch } = useUserSessions({ 
    limit: 5, 
    sort: 'updated_desc' 
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleSessionClick = (session: UserSession) => {
    router.push(`/sessions/${session.sessionId}`);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">Your Sessions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">Your Sessions</h3>
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-red-600 text-sm mb-3">{error}</p>
          <button
            onClick={() => refetch()}
            className="bg-primary dark:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary/90 dark:hover:bg-primary transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">Your Sessions</h3>
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">No sessions yet</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Create your first teaching session to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Your Sessions</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((session) => (
          <div
            key={session.sessionId}
            onClick={() => handleSessionClick(session)}
            className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary/30 dark:border-primary hover:bg-primary/5 dark:bg-primary/20 cursor-pointer transition-all duration-200 group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg truncate group-hover:text-primary/95 dark:text-primary/30">
                  {session.classDetails.className}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {session.classDetails.courseName} • {session.classDetails.courseCode}
                </p>
              </div>
              <Play className="w-5 h-5 text-gray-400 group-hover:text-primary/90 dark:text-primary/40 transition-colors flex-shrink-0 ml-2" />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <BookOpen className="w-4 h-4" />
                  <span>{session.totalSlides} slides</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>{session.classDetails.duration}min</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <Users className="w-4 h-4" />
                  <span>{session.runCount} run{session.runCount !== 1 ? 's' : ''}</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(session.lastAccessedAt || session.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 