"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import { env } from "@/lib/env";

interface ExportSummary {
  assignment: {
    id: string;
    title: string;
    max_points: number | null;
    due_at: string | null;
  };
  export_info: {
    total_students: number;
    total_submissions: number;
    estimated_size: string;
  };
}

export function useAssignmentExport(assignmentId: string) {
  const [isExporting, setIsExporting] = useState(false);

  // Get export summary info
  const { data: exportSummary } = useQuery({
    queryKey: ['assignment-export-summary', assignmentId],
    queryFn: () => apiGet<ExportSummary>(`/api/v1/assignment-export/${assignmentId}/summary`),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!assignmentId,
  });

  const exportToCsv = async () => {
    if (isExporting) return;
    
    try {
      setIsExporting(true);
      
      // Get auth token from localStorage (using the correct key)
      const token = localStorage.getItem('nerdeala-auth-token');
      
      console.log('Exporting with token:', token ? 'Token found' : 'No token');
      console.log('Assignment ID:', assignmentId);
      
      if (token) {
        // Use direct URL with token in query params
        const downloadUrl = `${env.apiBaseUrl}/api/v1/assignment-export/${assignmentId}/csv?token=${encodeURIComponent(token)}`;
        console.log('Opening download URL:', downloadUrl);
        
        // Method 1: Direct window.open (simplest)
        window.open(downloadUrl, '_blank');
        
        // Method 2: Also try programmatic link click as backup
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `assignment_export_${assignmentId}.csv`;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, 500);
        
      } else {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      return { success: true, filename: `assignment_export_${assignmentId}.csv` };
    } catch (error) {
      console.error('Error exporting CSV:', error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportSummary,
    exportToCsv,
    isExporting,
  };
}
