import type { BusinessType } from "../types/company";
import type { BusinessTypeConfig, DashboardKpiSlot } from "../types/businessType";

// Los 4 KPI universales — se usan para cualquier rubro que no tenga una
// variación propia definida más abajo.
export const DEFAULT_DASHBOARD_KPIS: DashboardKpiSlot[] = [
  { metric: "appointmentsToday", label: "Citas de hoy", icon: "event_available" },
  { metric: "entityTotal", label: "Total", icon: "group" },
  { metric: "remindersPending", label: "Recordatorios pendientes", icon: "notification_important" },
  { metric: "servicesActive", label: "Servicios activos", icon: "settings_suggest" },
];

// El corazón de "una sola plataforma configurable" (ver docs/arquitectura.md).
// Cada entrada define SOLO las diferencias de un rubro respecto al núcleo
// universal (config/navigation.ts) — ningún componente tiene lógica
// "if (tipo === 'optica')" hardcodeada, todos leen este archivo.
//
// Las entradas marcadas "// basado en mockup" reflejan un dashboard real
// que analizamos en la Fase 1. Las demás son un punto de partida razonable
// sin mockup de referencia — se refinan cuando construyamos ese módulo.
export const BUSINESS_TYPES: Record<BusinessType, BusinessTypeConfig> = {
  odontologia: {
    // basado en mockup (captura9.html)
    id: "odontologia",
    label: "Odontología",
    icon: "dentistry",
    entityLabel: "Pacientes",
    extraModules: [
      { key: "treatments", label: "Tratamientos", icon: "medical_services", path: "/treatments" },
      { key: "history", label: "Historia", icon: "history", path: "/history" },
      { key: "checkups", label: "Controles", icon: "fact_check", path: "/checkups" },
    ],
    dashboardKpis: [
      { metric: "appointmentsToday", label: "Citas de hoy", icon: "event_available" },
      DEFAULT_DASHBOARD_KPIS[1],
      DEFAULT_DASHBOARD_KPIS[2],
      { metric: "servicesActive", label: "Tratamientos", icon: "medical_services" },
    ],
  },
  optica: {
    // basado en mockup (captura8.html)
    id: "optica",
    label: "Óptica",
    icon: "eyeglasses",
    entityLabel: "Clientes",
    extraModules: [
      { key: "measurements", label: "Medidas visuales", icon: "visibility", path: "/measurements" },
      { key: "sales", label: "Ventas", icon: "point_of_sale", path: "/sales" },
      { key: "history", label: "Historial", icon: "history", path: "/history" },
    ],
  },
  barberia: {
    // basado en mockup (captura7.html) — sin módulos extra
    id: "barberia",
    label: "Barbería",
    icon: "content_cut",
    entityLabel: "Clientes",
    extraModules: [],
    dashboardKpis: [
      { metric: "appointmentsToday", label: "Citas de hoy", icon: "event_available" },
      DEFAULT_DASHBOARD_KPIS[1],
      { metric: "completedToday", label: "Servicios realizados", icon: "task_alt" },
      DEFAULT_DASHBOARD_KPIS[2],
    ],
  },
  belleza: {
    // basado en mockup (captura11.html) — sin módulos extra
    id: "belleza",
    label: "Belleza",
    icon: "spa",
    entityLabel: "Clientes",
    extraModules: [],
  },
  veterinaria: {
    // basado en mockup (captura12.html)
    id: "veterinaria",
    label: "Veterinaria",
    icon: "pets",
    entityLabel: "Propietarios",
    extraModules: [
      { key: "pets", label: "Mascotas", icon: "pets", path: "/pets" },
      { key: "treatments", label: "Tratamientos", icon: "medical_services", path: "/treatments" },
      { key: "history", label: "Historial", icon: "history", path: "/history" },
    ],
  },
  taller: {
    // basado en mockup (captura10.html)
    id: "taller",
    label: "Taller mecánico",
    icon: "car_repair",
    entityLabel: "Clientes",
    extraModules: [
      { key: "vehicles", label: "Vehículos", icon: "directions_car", path: "/vehicles" },
      { key: "maintenance", label: "Mantenimientos", icon: "build", path: "/maintenance" },
      { key: "history", label: "Historial", icon: "history", path: "/history" },
    ],
    dashboardKpis: [
      { metric: "appointmentsToday", label: "Servicios de hoy", icon: "build" },
      DEFAULT_DASHBOARD_KPIS[1],
      DEFAULT_DASHBOARD_KPIS[2],
      { metric: "servicesActive", label: "Mantenimientos", icon: "build_circle" },
    ],
  },
  colegio: {
    // basado en mockup (captura13.html) + módulos planeados sin mockup aún
    id: "colegio",
    label: "Colegio",
    icon: "school",
    entityLabel: "Estudiantes",
    extraModules: [
      { key: "guardians", label: "Padres/Apoderados", icon: "family_restroom", path: "/guardians" },
      { key: "grades", label: "Grados", icon: "layers", path: "/grades" },
      { key: "teachers", label: "Docentes", icon: "badge", path: "/teachers" },
      { key: "announcements", label: "Comunicados", icon: "campaign", path: "/announcements" },
    ],
    dashboardKpis: [
      { metric: "appointmentsToday", label: "Clases de hoy", icon: "event_available" },
      DEFAULT_DASHBOARD_KPIS[1],
      DEFAULT_DASHBOARD_KPIS[2],
      DEFAULT_DASHBOARD_KPIS[3],
    ],
  },
  academia: {
    // sin mockup de referencia — punto de partida, se refina al construir el módulo
    id: "academia",
    label: "Academia",
    icon: "auto_stories",
    entityLabel: "Alumnos",
    extraModules: [
      { key: "courses", label: "Cursos", icon: "menu_book", path: "/courses" },
      { key: "teachers", label: "Profesores", icon: "badge", path: "/teachers" },
      { key: "enrollments", label: "Matrículas", icon: "how_to_reg", path: "/enrollments" },
    ],
    dashboardKpis: [
      { metric: "appointmentsToday", label: "Clases de hoy", icon: "event_available" },
      DEFAULT_DASHBOARD_KPIS[1],
      DEFAULT_DASHBOARD_KPIS[2],
      { metric: "servicesActive", label: "Cursos activos", icon: "menu_book" },
    ],
  },
  consultorio: {
    id: "consultorio",
    label: "Consultorio",
    icon: "desk",
    entityLabel: "Pacientes",
    extraModules: [],
  },
  fisioterapia: {
    id: "fisioterapia",
    label: "Fisioterapia",
    icon: "physical_therapy",
    entityLabel: "Pacientes",
    extraModules: [
      { key: "treatments", label: "Tratamientos", icon: "medical_services", path: "/treatments" },
    ],
  },
  psicologia: {
    id: "psicologia",
    label: "Psicología",
    icon: "psychology",
    entityLabel: "Pacientes",
    extraModules: [],
  },
  gimnasio: {
    id: "gimnasio",
    label: "Gimnasio",
    icon: "fitness_center",
    entityLabel: "Clientes",
    extraModules: [],
  },
  estetica: {
    id: "estetica",
    label: "Centro de estética",
    icon: "spa",
    entityLabel: "Clientes",
    extraModules: [],
  },
  masajes: {
    id: "masajes",
    label: "Centro de masajes",
    icon: "self_care",
    entityLabel: "Clientes",
    extraModules: [],
  },
  servicios_tecnicos: {
    id: "servicios_tecnicos",
    label: "Servicios técnicos",
    icon: "handyman",
    entityLabel: "Clientes",
    extraModules: [],
  },
  lavadero: {
    id: "lavadero",
    label: "Lavadero de vehículos",
    icon: "local_car_wash",
    entityLabel: "Clientes",
    extraModules: [
      { key: "vehicles", label: "Vehículos", icon: "directions_car", path: "/vehicles" },
    ],
  },
  mantenimiento: {
    id: "mantenimiento",
    label: "Mantenimiento",
    icon: "build",
    entityLabel: "Clientes",
    extraModules: [],
  },
  otro: {
    id: "otro",
    label: "Otro tipo de negocio",
    icon: "grid_view",
    entityLabel: "Clientes",
    extraModules: [],
  },
};
