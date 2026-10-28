import type {
  ActiveRoutine,
  Assignment,
  Attendance,
  Booking,
  CalendarDay,
  ClassSchedule,
  ClassScheduleInput,
  Exercise,
  ExerciseInput,
  GymConfig,
  Instructor,
  Occupancy,
  ProgressPoint,
  PublicGym,
  Routine,
  RoutineInput,
  StatsSummary,
  StudentFollow,
  WorkoutInput,
  WorkoutLog,
  WeightLog,
} from "./gym";
import type { ApiError, AppSettings, AuthResponse, ProfileFields, PublicSettings, Role, User, UserPage } from "./types";

function resolveApiUrl(): string {
  const runtime = window.__APP_CONFIG__?.API_URL?.trim();
  if (runtime) {
    return runtime.replace(/\/$/, "");
  }
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return "";
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiError;
    return body.message || body.error || "Ocurrió un error inesperado";
  } catch {
    return "Ocurrió un error inesperado";
  }
}

export class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshing: Promise<boolean> | null = null;

  constructor() {
    this.refreshToken = sessionStorage.getItem("refreshToken");
  }

  setSession(auth: AuthResponse | null) {
    if (!auth) {
      this.accessToken = null;
      this.refreshToken = null;
      sessionStorage.removeItem("refreshToken");
      return;
    }
    this.accessToken = auth.accessToken;
    this.refreshToken = auth.refreshToken;
    sessionStorage.setItem("refreshToken", auth.refreshToken);
  }

  hasRefreshToken() {
    return Boolean(this.refreshToken);
  }

  async register(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    profile: ProfileFields = {}
  ): Promise<AuthResponse> {
    const auth = await this.request<AuthResponse>("/api/auth/register", {
      method: "POST",
      auth: false,
      body: { firstName, lastName, email, password, ...profile },
    });
    this.setSession(auth);
    return auth;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const auth = await this.request<AuthResponse>("/api/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password },
    });
    this.setSession(auth);
    return auth;
  }

  async refresh(): Promise<AuthResponse | null> {
    if (!this.refreshToken) {
      return null;
    }
    const auth = await this.request<AuthResponse>("/api/auth/refresh", {
      method: "POST",
      auth: false,
      body: { refreshToken: this.refreshToken },
    });
    this.setSession(auth);
    return auth;
  }

  async logout() {
    const token = this.refreshToken;
    this.setSession(null);
    if (!token) {
      return;
    }
    try {
      await this.request("/api/auth/logout", {
        method: "POST",
        auth: false,
        body: { refreshToken: token },
      });
    } catch {
      // La sesión local ya quedó limpia.
    }
  }

  me() {
    return this.request<User>("/api/auth/me");
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.request("/api/auth/change-password", {
      method: "POST",
      body: { currentPassword, newPassword },
    });
  }

  forgotPassword(email: string) {
    return this.request<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      auth: false,
      body: { email },
    });
  }

  resetPassword(token: string, newPassword: string) {
    return this.request<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      auth: false,
      body: { token, newPassword },
    });
  }

  updateProfile(input: { firstName: string; lastName: string } & ProfileFields) {
    return this.request<User>("/api/auth/me", {
      method: "PATCH",
      body: input,
    });
  }

  listUsers(params: {
    q?: string;
    page?: number;
    size?: number;
    enabled?: boolean;
    role?: Role;
  } = {}) {
    const query = new URLSearchParams();
    if (params.q?.trim()) {
      query.set("q", params.q.trim());
    }
    if (params.page != null) {
      query.set("page", String(params.page));
    }
    if (params.size != null) {
      query.set("size", String(params.size));
    }
    if (params.enabled != null) {
      query.set("enabled", String(params.enabled));
    }
    if (params.role) {
      query.set("role", params.role);
    }
    const qs = query.toString();
    return this.request<UserPage>(`/api/users${qs ? `?${qs}` : ""}`);
  }

  getUser(id: string) {
    return this.request<User>(`/api/users/${id}`);
  }

  createUser(
    input: { firstName: string; lastName: string; email: string; password: string; role: Role } & ProfileFields
  ) {
    return this.request<User>("/api/users", {
      method: "POST",
      body: input,
    });
  }

  updateUser(
    id: string,
    input: { firstName?: string; lastName?: string; role?: Role; enabled?: boolean } & ProfileFields
  ) {
    return this.request<User>(`/api/users/${id}`, {
      method: "PATCH",
      body: input,
    });
  }

  deleteUser(id: string) {
    return this.request(`/api/users/${id}`, { method: "DELETE" });
  }

  getPublicSettings() {
    return this.request<PublicSettings>("/api/settings/public", { auth: false });
  }

  getSettings() {
    return this.request<AppSettings>("/api/settings");
  }

  updateSettings(input: {
    allowPublicRegistration: boolean;
    maxFailedAttempts: number;
    lockDurationMinutes: number;
    passwordMinLength: number;
    passwordMaxLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireLowercase: boolean;
    passwordRequireDigit: boolean;
  }) {
    return this.request<AppSettings>("/api/settings", {
      method: "PATCH",
      body: input,
    });
  }

  getGymConfig() {
    return this.request<GymConfig>("/api/gimnasio/config");
  }

  getPublicGym() {
    return this.request<PublicGym>("/api/gimnasio/publico", { auth: false });
  }

  updateGymConfig(input: GymConfig) {
    return this.request<GymConfig>("/api/gimnasio/config", { method: "PUT", body: input });
  }

  getOccupancy() {
    return this.request<Occupancy>("/api/gimnasio/ocupacion");
  }

  listExercises(params: { q?: string; muscleGroup?: string } = {}) {
    const query = new URLSearchParams();
    if (params.q?.trim()) {
      query.set("q", params.q.trim());
    }
    if (params.muscleGroup) {
      query.set("muscleGroup", params.muscleGroup);
    }
    const qs = query.toString();
    return this.request<Exercise[]>(`/api/ejercicios${qs ? `?${qs}` : ""}`);
  }

  createExercise(input: ExerciseInput) {
    return this.request<Exercise>("/api/ejercicios", { method: "POST", body: input });
  }

  updateExercise(id: string, input: ExerciseInput) {
    return this.request<Exercise>(`/api/ejercicios/${id}`, { method: "PUT", body: input });
  }

  deleteExercise(id: string) {
    return this.request(`/api/ejercicios/${id}`, { method: "DELETE" });
  }

  listInstructors() {
    return this.request<Instructor[]>("/api/clases/instructores");
  }

  listClasses(params: { date?: string; active?: boolean } = {}) {
    const query = new URLSearchParams();
    if (params.date) {
      query.set("date", params.date);
    }
    if (params.active != null) {
      query.set("active", String(params.active));
    }
    const qs = query.toString();
    return this.request<ClassSchedule[]>(`/api/clases${qs ? `?${qs}` : ""}`);
  }

  createClass(input: ClassScheduleInput) {
    return this.request<ClassSchedule>("/api/clases", { method: "POST", body: input });
  }

  updateClass(id: string, input: ClassScheduleInput) {
    return this.request<ClassSchedule>(`/api/clases/${id}`, { method: "PUT", body: input });
  }

  deactivateClass(id: string) {
    return this.request(`/api/clases/${id}`, { method: "DELETE" });
  }

  listBookings(params: { date?: string; studentId?: string } = {}) {
    const query = new URLSearchParams();
    if (params.date) {
      query.set("date", params.date);
    }
    if (params.studentId) {
      query.set("studentId", params.studentId);
    }
    const qs = query.toString();
    return this.request<Booking[]>(`/api/clases/reservas${qs ? `?${qs}` : ""}`);
  }

  bookClass(id: string, date: string) {
    return this.request<Booking>(`/api/clases/${id}/reservas`, { method: "POST", body: { date } });
  }

  cancelBooking(id: string) {
    return this.request<Booking>(`/api/clases/reservas/${id}/cancelar`, { method: "POST" });
  }

  listRoutines() {
    return this.request<Routine[]>("/api/rutinas");
  }

  getActiveRoutine() {
    return this.request<ActiveRoutine>("/api/rutinas/activa");
  }

  listAssignments(params: { studentId?: string; active?: boolean } = {}) {
    const query = new URLSearchParams();
    if (params.studentId) {
      query.set("studentId", params.studentId);
    }
    if (params.active != null) {
      query.set("active", String(params.active));
    }
    const qs = query.toString();
    return this.request<Assignment[]>(`/api/rutinas/asignaciones${qs ? `?${qs}` : ""}`);
  }

  createRoutine(input: RoutineInput) {
    return this.request<Routine>("/api/rutinas", { method: "POST", body: input });
  }

  updateRoutine(id: string, input: RoutineInput) {
    return this.request<Routine>(`/api/rutinas/${id}`, { method: "PUT", body: input });
  }

  deleteRoutine(id: string) {
    return this.request(`/api/rutinas/${id}`, { method: "DELETE" });
  }

  cloneRoutine(id: string, title?: string) {
    return this.request<Routine>(`/api/rutinas/${id}/clonar`, {
      method: "POST",
      body: { title: title ?? null },
    });
  }

  assignRoutine(id: string, input: { studentId: string; startDate: string; expirationDate?: string | null }) {
    return this.request<Assignment>(`/api/rutinas/${id}/asignar`, { method: "POST", body: input });
  }

  updateAssignment(
    id: string,
    input: { startDate: string; expirationDate?: string | null; active?: boolean }
  ) {
    return this.request<Assignment>(`/api/rutinas/asignaciones/${id}`, { method: "PUT", body: input });
  }

  deleteAssignment(id: string) {
    return this.request(`/api/rutinas/asignaciones/${id}`, { method: "DELETE" });
  }

  listWorkouts(params: { studentId?: string; exerciseId?: string; from?: string; to?: string } = {}) {
    const query = new URLSearchParams();
    if (params.studentId) {
      query.set("studentId", params.studentId);
    }
    if (params.exerciseId) {
      query.set("exerciseId", params.exerciseId);
    }
    if (params.from) {
      query.set("from", params.from);
    }
    if (params.to) {
      query.set("to", params.to);
    }
    const qs = query.toString();
    return this.request<WorkoutLog[]>(`/api/registros-entrenamiento${qs ? `?${qs}` : ""}`);
  }

  createWorkout(input: WorkoutInput) {
    return this.request<WorkoutLog>("/api/registros-entrenamiento", { method: "POST", body: input });
  }

  listWeights(studentId?: string) {
    const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
    return this.request<WeightLog[]>(`/api/peso${query}`);
  }

  createWeight(input: { weightKg: number; recordedOn?: string | null }) {
    return this.request<WeightLog>("/api/peso", { method: "POST", body: input });
  }

  listAttendance(params: { studentId?: string; from?: string; to?: string } = {}) {
    const query = new URLSearchParams();
    if (params.studentId) {
      query.set("studentId", params.studentId);
    }
    if (params.from) {
      query.set("from", params.from);
    }
    if (params.to) {
      query.set("to", params.to);
    }
    const qs = query.toString();
    return this.request<Attendance[]>(`/api/asistencia${qs ? `?${qs}` : ""}`);
  }

  attendanceToday() {
    return this.request<Attendance | null>("/api/asistencia/hoy");
  }

  listInside() {
    return this.request<Attendance[]>("/api/asistencia/adentro");
  }

  staffCheckIn(studentId: string) {
    return this.request<Attendance>(`/api/asistencia/ingreso?studentId=${encodeURIComponent(studentId)}`, {
      method: "POST",
    });
  }

  staffCheckOut(studentId: string) {
    return this.request<Attendance>(`/api/asistencia/egreso?studentId=${encodeURIComponent(studentId)}`, {
      method: "POST",
    });
  }

  statsSummary(studentId?: string) {
    const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
    return this.request<StatsSummary>(`/api/estadisticas/resumen${qs}`);
  }

  exerciseProgress(exerciseId: string, studentId?: string) {
    const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
    return this.request<ProgressPoint[]>(`/api/estadisticas/ejercicio/${exerciseId}${qs}`);
  }

  calendar(year: number, month: number, studentId?: string) {
    const query = new URLSearchParams({ year: String(year), month: String(month) });
    if (studentId) {
      query.set("studentId", studentId);
    }
    return this.request<CalendarDay[]>(`/api/estadisticas/calendario?${query.toString()}`);
  }

  listStudentFollow() {
    return this.request<StudentFollow[]>("/api/alumnos");
  }

  private async request<T>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      auth?: boolean;
      retry?: boolean;
    } = {}
  ): Promise<T> {
    const { method = "GET", body, auth = true, retry = true } = options;
    const headers: Record<string, string> = {};
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (auth && this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${resolveApiUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (response.status === 401 && auth && retry && this.refreshToken) {
      const ok = await this.refreshOnce();
      if (ok) {
        return this.request<T>(path, { ...options, retry: false });
      }
    }

    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    if (response.status === 204) {
      return undefined as T;
    }
    const text = await response.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }

  private refreshOnce() {
    if (!this.refreshing) {
      this.refreshing = this.refresh()
        .then((auth) => Boolean(auth))
        .catch(() => {
          this.setSession(null);
          return false;
        })
        .finally(() => {
          this.refreshing = null;
        });
    }
    return this.refreshing;
  }
}

export const api = new ApiClient();
