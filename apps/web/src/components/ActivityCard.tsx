"use client";

import type { ActivityItem } from "@/hooks/use-course-activity";

interface ActivityCardProps {
  activity: ActivityItem;
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return `hace ${minutes} min`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `hace ${hours}h`;
    } else {
      const days = Math.floor(diffInHours / 24);
      if (days === 1) return 'ayer';
      if (days < 7) return `hace ${days} días`;
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit'
      });
    }
  };

  const getActivityIcon = () => {
    switch (activity.type) {
      case 'submission':
        return (
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'deadline_soon':
        return (
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'deadline_overdue':
        return (
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getActivityColor = () => {
    switch (activity.type) {
      case 'submission':
        return 'text-green-700';
      case 'deadline_soon':
        return 'text-yellow-700';
      case 'deadline_overdue':
        return 'text-red-700';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg hover:bg-neutral-50 transition-colors">
      {getActivityIcon()}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className={`font-medium ${getActivityColor()}`}>
              {activity.title}
            </h4>
            <p className="text-sm text-neutral-600 mt-1">
              {activity.description}
            </p>
            
            {/* Additional metadata */}
            <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
              {activity.student && (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {activity.student.name}
                </span>
              )}
              
              {activity.metadata?.isLate && (
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full">
                  Tardía
                </span>
              )}
              
              {activity.metadata?.grade && (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  {activity.metadata.grade} pts
                </span>
              )}
              
              {activity.metadata?.daysUntilDue !== undefined && (
                <span className={`px-2 py-1 rounded-full ${
                  activity.metadata.daysUntilDue <= 1 
                    ? 'bg-red-100 text-red-700'
                    : activity.metadata.daysUntilDue <= 3
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-blue-100 text-blue-700'
                }`}>
                  {activity.metadata.daysUntilDue > 0 
                    ? `${activity.metadata.daysUntilDue} días` 
                    : 'Vencida'
                  }
                </span>
              )}
            </div>
          </div>
          
          <div className="text-xs text-neutral-400 ml-2 flex-shrink-0">
            {formatTimestamp(activity.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
}
