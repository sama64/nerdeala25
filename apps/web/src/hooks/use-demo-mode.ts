"use client";

import { useState, useCallback, createContext, useContext } from "react";
import type { Course, Role } from "@/types";

interface DemoContextType {
  isDemoMode: boolean;
  demoRole: Role | null;
  toggleDemoMode: () => void;
  setDemoRole: (role: Role) => void;
  getDemoCourses: (role: Role) => Course[];
}

const DemoContext = createContext<DemoContextType | null>(null);

export function useDemoMode() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemoMode must be used within a DemoProvider");
  }
  return context;
}

// Mock data para diferentes roles
const mockCourses: Course[] = [
  {
    id: "demo-math-101",
    name: "Matemáticas Avanzadas",
    description: "Curso de matemáticas para estudiantes de último año",
    teacher_id: "demo-teacher-1",
    created_at: "2024-09-01T10:00:00Z",
    updated_at: "2024-09-26T10:00:00Z"
  },
  {
    id: "demo-physics-201",
    name: "Física Cuántica",
    description: "Introducción a los principios de la física cuántica",
    teacher_id: "demo-teacher-2",
    created_at: "2024-09-01T11:00:00Z",
    updated_at: "2024-09-26T11:00:00Z"
  },
  {
    id: "demo-chemistry-101",
    name: "Química Orgánica",
    description: "Fundamentos de química orgánica y reacciones",
    teacher_id: "demo-teacher-3",
    created_at: "2024-09-01T12:00:00Z",
    updated_at: "2024-09-26T12:00:00Z"
  },
  {
    id: "demo-biology-301",
    name: "Biología Molecular",
    description: "Estudio avanzado de procesos moleculares en organismos vivos",
    teacher_id: "demo-teacher-4",
    created_at: "2024-09-01T13:00:00Z",
    updated_at: "2024-09-26T13:00:00Z"
  },
  {
    id: "demo-literature-101",
    name: "Literatura Contemporánea",
    description: "Análisis de obras literarias del siglo XXI",
    teacher_id: "demo-teacher-1",
    created_at: "2024-09-01T14:00:00Z",
    updated_at: "2024-09-26T14:00:00Z"
  },
  {
    id: "demo-history-201",
    name: "Historia Universal",
    description: "Eventos históricos que marcaron la humanidad",
    teacher_id: "demo-teacher-5",
    created_at: "2024-09-01T15:00:00Z",
    updated_at: "2024-09-26T15:00:00Z"
  }
];

export function useDemoModeProvider() {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nerdeala-demo-mode');
      return saved === 'true';
    }
    return false;
  });

  const [demoRole, setDemoRoleState] = useState<Role | null>(() => {
    // Initialize demo role from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nerdeala-demo-role') as Role | null;
      return saved || 'coordinator'; // Default to coordinator to show all features
    }
    return 'coordinator';
  });

  const toggleDemoMode = useCallback(() => {
    setIsDemoMode(prev => {
      const newValue = !prev;
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('nerdeala-demo-mode', newValue.toString());
      }
      console.log('Demo mode toggled:', newValue);
      return newValue;
    });
  }, []);

  const setDemoRole = useCallback((role: Role) => {
    setDemoRoleState(role);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nerdeala-demo-role', role);
    }
    console.log('Demo role changed to:', role);
  }, []);

  const getDemoCourses = useCallback((role: Role): Course[] => {
    console.log('Getting demo courses for role:', role);
    
    let courses: Course[] = [];
    switch (role) {
      case "student":
        // Estudiantes ven solo 2-3 cursos en los que están inscritos
        courses = mockCourses.slice(0, 3);
        break;

      case "teacher":
        // Profesores ven los cursos que enseñan (simulamos que enseña 4 cursos)
        courses = mockCourses.slice(0, 4);
        break;

      case "coordinator":
        // Coordinadores ven todos los cursos
        courses = mockCourses;
        break;

      case "admin":
        // Admins ven todos los cursos
        courses = mockCourses;
        break;

      default:
        courses = [];
    }
    
    console.log('Returning demo courses:', courses.length, 'courses for role:', role);
    return courses;
  }, []);

  // Add debug function to window for easy testing
  if (typeof window !== 'undefined') {
    (window as any).enableDemoMode = () => {
      setIsDemoMode(true);
      localStorage.setItem('nerdeala-demo-mode', 'true');
      console.log('✅ Demo mode enabled from console');
    };
    
    (window as any).disableDemoMode = () => {
      setIsDemoMode(false);
      localStorage.setItem('nerdeala-demo-mode', 'false');
      console.log('❌ Demo mode disabled from console');
    };
    
    (window as any).setDemoRole = (role: string) => {
      setDemoRoleState(role as any);
      localStorage.setItem('nerdeala-demo-role', role);
      console.log('🎭 Demo role changed to:', role);
    };
    
    (window as any).checkDemoMode = () => {
      console.log('🔍 Demo mode status:', { 
        isDemoMode, 
        demoRole,
        localStorage: {
          mode: localStorage.getItem('nerdeala-demo-mode'),
          role: localStorage.getItem('nerdeala-demo-role')
        }
      });
    };
  }

  return {
    isDemoMode,
    demoRole,
    toggleDemoMode,
    setDemoRole,
    getDemoCourses,
  };
}

export { DemoContext };