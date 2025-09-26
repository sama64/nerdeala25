"use client";

import { useDemoMode } from "@/hooks/use-demo-mode";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";

interface FeatureCardProps {
  title: string;
  description: string;
  requiredRole: string;
  currentRole?: string;
  isAccessible: boolean;
  icon: string;
  action?: () => void;
}

function FeatureCard({ title, description, requiredRole, currentRole, isAccessible, icon, action }: FeatureCardProps) {
  return (
    <div className={`p-4 rounded-lg border-2 transition-all ${
      isAccessible 
        ? 'border-green-200 bg-green-50' 
        : 'border-red-200 bg-red-50 opacity-75'
    }`}>
      <div className="flex items-start gap-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-xs text-neutral-600 mt-1">{description}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-xs px-2 py-1 rounded-full ${
              isAccessible 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {isAccessible ? '✅ Accesible' : `🔒 Requiere: ${requiredRole}`}
            </span>
            {isAccessible && action && (
              <Button 
                variant="ghost" 
                className="text-xs h-6 px-2"
                onClick={action}
              >
                Probar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DemoFeatureShowcase() {
  const { isDemoMode, demoRole } = useDemoMode();
  const { user } = useAuth();

  if (!isDemoMode) return null;

  const currentRole = demoRole || user?.role;

  const features = [
    {
      title: "Reportes Completos de Curso",
      description: "Generar reportes detallados con métricas de estudiantes, asistencia y rendimiento",
      requiredRole: "Coordinador/Admin",
      icon: "📊",
      isAccessible: currentRole === 'coordinator' || currentRole === 'admin',
      action: () => console.log('Navegando a reportes...')
    },
    {
      title: "Gestión de Usuarios",
      description: "Crear, editar y eliminar usuarios del sistema. Asignar roles y permisos",
      requiredRole: "Admin", 
      icon: "👥",
      isAccessible: currentRole === 'admin',
      action: () => console.log('Navegando a gestión de usuarios...')
    },
    {
      title: "Configuración del Sistema",
      description: "Acceso a configuraciones avanzadas, integraciones y parámetros del sistema",
      requiredRole: "Admin",
      icon: "⚙️", 
      isAccessible: currentRole === 'admin',
      action: () => console.log('Navegando a configuración...')
    },
    {
      title: "Exportación de Datos",
      description: "Exportar datos masivos en CSV, Excel y otros formatos para análisis externos",
      requiredRole: "Coordinador/Admin",
      icon: "📁",
      isAccessible: currentRole === 'coordinator' || currentRole === 'admin',
      action: () => console.log('Iniciando exportación...')
    },
    {
      title: "Supervisión de Cursos",
      description: "Ver todos los cursos del sistema, estadísticas globales y métricas institucionales",
      requiredRole: "Coordinador/Admin", 
      icon: "🎓",
      isAccessible: currentRole === 'coordinator' || currentRole === 'admin',
      action: () => console.log('Navegando a supervisión...')
    },
    {
      title: "Notificaciones Masivas",
      description: "Enviar notificaciones WhatsApp masivas a grupos de estudiantes o profesores",
      requiredRole: "Coordinador/Admin",
      icon: "📢",
      isAccessible: currentRole === 'coordinator' || currentRole === 'admin',
      action: () => console.log('Abriendo notificaciones masivas...')
    },
    {
      title: "Análisis de Asistencia Global",
      description: "Reportes de asistencia de todos los cursos con tendencias y alertas tempranas",
      requiredRole: "Coordinador/Admin",
      icon: "📅",
      isAccessible: currentRole === 'coordinator' || currentRole === 'admin',
      action: () => console.log('Navegando a análisis de asistencia...')
    },
    {
      title: "Gestión de Integraciones",
      description: "Configurar y monitorear integraciones con Google Classroom, WhatsApp y otros servicios",
      requiredRole: "Admin",
      icon: "🔗",
      isAccessible: currentRole === 'admin',
      action: () => console.log('Navegando a integraciones...')
    }
  ];

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Funciones por Rol</h3>
          <p className="text-sm text-neutral-600">
            Simulando como: <span className="font-semibold">{currentRole || 'sin rol'}</span>
          </p>
        </div>
        <div className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
          🎭 Modo Demo
        </div>
      </div>
      
      <div className="grid gap-3 md:grid-cols-2">
        {features.map((feature, index) => (
          <FeatureCard
            key={index}
            title={feature.title}
            description={feature.description}
            requiredRole={feature.requiredRole}
            currentRole={currentRole || undefined}
            isAccessible={feature.isAccessible}
            icon={feature.icon}
            action={feature.action}
          />
        ))}
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 text-sm">💡 Tip del Modo Demo</h4>
        <p className="text-blue-800 text-xs mt-1">
          Cambia el rol en la barra lateral para ver cómo el sistema adapta las funciones disponibles. 
          Los coordinadores tienen acceso a la mayoría de las funciones administrativas, 
          mientras que los administradores tienen control total del sistema.
        </p>
      </div>
    </div>
  );
}
