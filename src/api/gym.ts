export type OperatingMode = "FREE_ACCESS" | "CLASS_SCHEDULED" | "HYBRID";
export type MuscleGroup = "PECHO" | "ESPALDA" | "PIERNAS" | "BRAZOS" | "HOMBROS" | "CORE" | "CARDIO";
export type BookingStatus = "CONFIRMADA" | "CANCELADA" | "ASISTIO";

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "PECHO",
  "ESPALDA",
  "PIERNAS",
  "BRAZOS",
  "HOMBROS",
  "CORE",
  "CARDIO",
];

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  PECHO: "Pecho",
  ESPALDA: "Espalda",
  PIERNAS: "Piernas",
  BRAZOS: "Brazos",
  HOMBROS: "Hombros",
  CORE: "Core",
  CARDIO: "Cardio",
};

export const MODE_LABELS: Record<OperatingMode, string> = {
  FREE_ACCESS: "Acceso libre",
  CLASS_SCHEDULED: "Reserva de clases",
  HYBRID: "Híbrido",
};

export const DAY_LABELS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export const STATUS_LABELS: Record<BookingStatus, string> = {
  CONFIRMADA: "Confirmada",
  CANCELADA: "Cancelada",
  ASISTIO: "Asistió",
};

export type GymTheme = "ENERGIA" | "NEON" | "DEPORTE" | "ELECTRICO";

export const THEME_LABELS: Record<GymTheme, string> = {
  ENERGIA: "Naranja",
  NEON: "Lima neón",
  DEPORTE: "Rojo",
  ELECTRICO: "Amarillo",
};

export interface OpeningHour {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
}

export interface GymConfig {
  operatingMode: OperatingMode;
  openingTime: string;
  closingTime: string;
  maxCapacityPerSlot: number;
  name: string;
  address: string | null;
  mapUrl: string | null;
  theme: GymTheme;
  hours: OpeningHour[];
  description: string | null;
}

export interface PublicGym {
  name: string;
  openingTime: string;
  closingTime: string;
  address: string | null;
  mapUrl: string | null;
  theme: GymTheme;
  hours: OpeningHour[];
  description: string | null;
}

export interface Occupancy {
  operatingMode: OperatingMode;
  currentOccupancy: number;
  maxCapacity: number;
  openNow: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  description: string | null;
  muscleGroup: MuscleGroup;
  videoUrl: string | null;
  createdAt: string;
}

export interface ExerciseInput {
  name: string;
  description?: string | null;
  muscleGroup: MuscleGroup;
  videoUrl?: string | null;
}

export interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ClassSchedule {
  id: string;
  title: string;
  instructorId: string;
  instructorName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  remaining: number;
  active: boolean;
}

export interface ClassScheduleInput {
  title: string;
  instructorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  capacity: number;
  active?: boolean;
}

export interface Booking {
  id: string;
  classScheduleId: string;
  classTitle: string;
  studentId: string;
  studentName: string;
  date: string;
  status: BookingStatus;
  startTime: string;
  endTime: string;
}

export interface RoutineExerciseInput {
  exerciseId: string;
  orderIndex: number;
  targetSets: number;
  targetReps: number;
  targetRestSeconds: number;
  notes?: string | null;
  dayNumber?: number | null;
  dayLabel?: string | null;
}

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  orderIndex: number;
  targetSets: number;
  targetReps: number;
  targetRestSeconds: number;
  notes: string | null;
  dayNumber: number;
  dayLabel: string | null;
}

export interface Routine {
  id: string;
  title: string;
  description: string | null;
  createdByUserId: string;
  createdByName: string;
  customStudent: boolean;
  exercises: RoutineExercise[];
}

export interface RoutineInput {
  title: string;
  description?: string | null;
  exercises: RoutineExerciseInput[];
  startDate?: string | null;
  expirationDate?: string | null;
}

export interface Assignment {
  id: string;
  studentId: string;
  studentName: string;
  routineId: string;
  routineTitle: string;
  customStudent: boolean;
  startDate: string;
  expirationDate: string | null;
  active: boolean;
  expired: boolean;
}

export interface ActiveRoutine {
  assignment: Assignment | null;
  routine: Routine | null;
  expired: Assignment | null;
}

export interface WorkoutLog {
  id: string;
  studentId: string;
  exerciseId: string;
  exerciseName: string;
  loggedAt: string;
  setNumber: number;
  repsCompleted: number;
  weightKg: number;
  rpe: number | null;
  routineId: string | null;
  loggedDate: string;
  dayNumber: number | null;
  dayLabel: string | null;
}

export interface WorkoutInput {
  exerciseId: string;
  routineId?: string | null;
  setNumber: number;
  repsCompleted: number;
  weightKg: number;
  rpe?: number | null;
  dayNumber?: number | null;
  dayLabel?: string | null;
  loggedDate?: string | null;
}

export interface Attendance {
  id: string;
  studentId: string;
  studentName: string;
  checkInTime: string;
  checkOutTime: string | null;
}

export interface ProgressPoint {
  date: string;
  maxWeightKg: number;
  volumeKg: number;
  sets: number;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  maxWeightKg: number;
  achievedAt: string;
}

export interface StatsSummary {
  weeklyStreak: number;
  workoutsThisWeek: number;
  attendanceDaysThisMonth: number;
  records: PersonalRecord[];
}

export interface CalendarSession {
  dayNumber: number;
  label: string;
}

export interface CalendarDay {
  date: string;
  attended: boolean;
  trained: boolean;
  sets: number;
  sessions: CalendarSession[];
}

export interface RoutineDayGroup {
  dayNumber: number;
  label: string | null;
  exercises: RoutineExercise[];
}

export function routineDays(exercises: RoutineExercise[]): RoutineDayGroup[] {
  const groups = new Map<number, RoutineDayGroup>();
  const sorted = [...exercises].sort(
    (a, b) => (a.dayNumber ?? 1) - (b.dayNumber ?? 1) || a.orderIndex - b.orderIndex
  );
  for (const exercise of sorted) {
    const dayNumber = exercise.dayNumber ?? 1;
    const current = groups.get(dayNumber);
    if (current) {
      current.exercises.push(exercise);
      if (!current.label && exercise.dayLabel) {
        current.label = exercise.dayLabel;
      }
    } else {
      groups.set(dayNumber, {
        dayNumber,
        label: exercise.dayLabel,
        exercises: [exercise],
      });
    }
  }
  return [...groups.values()];
}

export function dayTitle(day: { dayNumber: number; label: string | null }) {
  return day.label ? `Día ${day.dayNumber} · ${day.label}` : `Día ${day.dayNumber}`;
}

export function sessionName(days: RoutineDayGroup[], dayNumber: number) {
  const day = days.find((item) => item.dayNumber === dayNumber);
  if (!day) {
    return "Entrenamiento";
  }
  if (days.length === 1 && !day.label) {
    return "Entrenamiento";
  }
  return dayTitle(day);
}

export function assignmentState(assignment: { active: boolean; expired: boolean; startDate: string }) {
  if (assignment.expired) {
    return "Vencida";
  }
  if (!assignment.active) {
    return "Inactiva";
  }
  if (assignment.startDate > todayIso()) {
    return "Programada";
  }
  return "Activa";
}

export interface StudentFollow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  activeRoutineTitle: string | null;
  routineStartDate: string | null;
  routineExpiration: string | null;
  routineCustom: boolean;
  lastCheckIn: string | null;
  attendanceLast30Days: number;
}

export function formatKg(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(number)} kg`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return value;
  }
  return new Date(year, month - 1, day).toLocaleDateString("es-AR", { dateStyle: "medium" });
}

export function formatTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  return value.slice(0, 5);
}

export function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function shiftIso(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + days);
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${nextMonth}-${nextDay}`;
}

export interface WeightLog {
  id: string;
  studentId: string;
  weightKg: number;
  recordedOn: string;
}
