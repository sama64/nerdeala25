"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { RoleGuard } from "@/components/auth/role-guard";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCourseDetail } from "@/hooks/use-course-detail";
import { useCourseStudents } from "@/hooks/use-course-students";
import { useAuth } from "@/components/auth-provider";
import { apiGet, apiPost } from "@/lib/api-client";
import type { CourseParticipant } from "@/hooks/use-course-students";

function AttendanceContent() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const { data: course, isLoading } = useCourseDetail(courseId);
  const { data: studentsData, isLoading: studentsLoading } = useCourseStudents({ courseId });

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load existing attendance when date changes
  useEffect(() => {
    const loadExistingAttendance = async () => {
      if (!selectedDate || !courseId) return;

      setIsLoadingAttendance(true);
      try {
        const data = await apiGet<any>(`/api/v1/attendance?course_id=${courseId}&target_date=${selectedDate}`);

        const existingAttendance: Record<string, 'present' | 'absent' | 'late'> = {};
        data.items.forEach((record: any) => {
          existingAttendance[record.student_id] = record.status;
        });

        setAttendance(existingAttendance);
      } catch (error) {
        console.error('Error loading attendance:', error);
      } finally {
        setIsLoadingAttendance(false);
      }
    };

    loadExistingAttendance();
  }, [selectedDate, courseId]);

  const handleAttendanceChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSaveAttendance = async () => {
    if (!studentsData?.items || Object.keys(attendance).length === 0) {
      setSaveError('Por favor selecciona la asistencia para al menos un estudiante');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const attendancePayload = Object.entries(attendance).map(([studentId, status]) => ({
        student_id: studentId,
        course_id: courseId,
        date: selectedDate,
        status: status,
        notes: null
      }));

      await apiPost('/api/v1/attendance/bulk', attendancePayload);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      setSaveError(error.message || 'Error de conexión. Por favor intenta de nuevo.');
      console.error('Error saving attendance:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || studentsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner label="Cargando información..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              className="p-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <h1 className="text-2xl font-semibold text-neutral-900">Tomar Asistencia</h1>
          </div>
          <p className="text-neutral-600 ml-11">{course?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Asistencia guardada
            </div>
          )}
          <Button
            onClick={handleSaveAttendance}
            disabled={isSaving || Object.keys(attendance).length === 0}
            variant="primary"
          >
            {isSaving ? (
              <>
                <svg className="w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Guardando...
              </>
            ) : (
              'Guardar Asistencia'
            )}
          </Button>
        </div>
      </div>

      {/* Date Selector and Error Messages */}
      <div className="space-y-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h3 className="font-medium text-neutral-900">Fecha de clase</h3>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {isLoadingAttendance && (
                <p className="text-sm text-neutral-500 flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Cargando asistencia existente...
                </p>
              )}
            </div>
            <div className="text-right">
              <h3 className="font-medium text-neutral-900">Total estudiantes</h3>
              <p className="text-sm text-neutral-600">
                {studentsData?.pagination.total || 0} inscritos
              </p>
            </div>
          </div>
        </div>

        {saveError && (
          <div className="p-4 border border-red-200 bg-red-50 rounded-xl">
            <div className="flex items-center gap-2 text-red-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Error:</span>
              <span>{saveError}</span>
            </div>
          </div>
        )}
      </div>

      {/* Students List */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="p-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">Lista de estudiantes</h2>
          <p className="text-sm text-neutral-600">Marca la asistencia de cada estudiante</p>
        </div>

        {studentsData?.items && studentsData.items.length > 0 ? (
          <div className="divide-y divide-neutral-200">
            {studentsData.items.map((student) => (
              <div key={student.id} className="p-4 hover:bg-neutral-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {student.full_name ? student.full_name.charAt(0).toUpperCase() : '?'}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-neutral-900">{student.full_name || 'Sin nombre'}</h4>
                      <p className="text-sm text-neutral-500">{student.email || 'Sin email'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`attendance-${student.id}`}
                        checked={attendance[student.id] === 'present'}
                        onChange={() => handleAttendanceChange(student.id, 'present')}
                        className="w-4 h-4 text-green-600 border-neutral-300 focus:ring-green-500"
                      />
                      <span className="text-sm font-medium text-green-700">Presente</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`attendance-${student.id}`}
                        checked={attendance[student.id] === 'late'}
                        onChange={() => handleAttendanceChange(student.id, 'late')}
                        className="w-4 h-4 text-yellow-600 border-neutral-300 focus:ring-yellow-500"
                      />
                      <span className="text-sm font-medium text-yellow-700">Tarde</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`attendance-${student.id}`}
                        checked={attendance[student.id] === 'absent'}
                        onChange={() => handleAttendanceChange(student.id, 'absent')}
                        className="w-4 h-4 text-red-600 border-neutral-300 focus:ring-red-500"
                      />
                      <span className="text-sm font-medium text-red-700">Ausente</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-500">
            <div className="space-y-2">
              <div className="mx-auto w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-sm">No hay estudiantes inscritos en este curso</p>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      {studentsData?.items && studentsData.items.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h3 className="font-medium text-neutral-900 mb-3">Resumen de asistencia</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">
                {Object.values(attendance).filter(val => val === 'present').length}
              </p>
              <p className="text-sm text-green-600">Presentes</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-700">
                {Object.values(attendance).filter(val => val === 'late').length}
              </p>
              <p className="text-sm text-yellow-600">Tarde</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-700">
                {Object.values(attendance).filter(val => val === 'absent').length}
              </p>
              <p className="text-sm text-red-600">Ausentes</p>
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg">
              <p className="text-2xl font-bold text-neutral-700">
                {(studentsData?.pagination.total || 0) - Object.keys(attendance).length}
              </p>
              <p className="text-sm text-neutral-600">Sin marcar</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AttendancePage() {
  return (
    <RoleGuard allowed={["admin", "coordinator", "teacher"]}>
      <AttendanceContent />
    </RoleGuard>
  );
}