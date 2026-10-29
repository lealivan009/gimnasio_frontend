import { Navigate, Route, Routes } from "react-router-dom";
import { AdminRoute } from "./auth/AdminRoute";
import { GuestRoute } from "./auth/GuestRoute";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { RegisterRoute } from "./auth/RegisterRoute";
import { StaffRoute } from "./auth/StaffRoute";
import { StudentRoute } from "./auth/StudentRoute";
import { useAuth } from "./auth/AuthContext";
import { AppShell } from "./components/AppShell";
import { AccountPage } from "./pages/AccountPage";
import { ExercisesPage } from "./pages/ExercisesPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { HomePage } from "./pages/HomePage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { CreateRoutinePage } from "./pages/CreateRoutinePage";
import { MyRoutinesPage } from "./pages/MyRoutinesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ProgressPage } from "./pages/ProgressPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { RoutinesPage } from "./pages/RoutinesPage";
import { SchedulesPage } from "./pages/SchedulesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StudentHomePage } from "./pages/StudentHomePage";
import { StudentsFollowPage } from "./pages/StudentsFollowPage";
import { PendingAccountsPage } from "./pages/PendingAccountsPage";
import { TimerPage } from "./pages/TimerPage";
import { UserDetailPage } from "./pages/UserDetailPage";
import { UsersPage } from "./pages/UsersPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<RegisterRoute />}>
          <Route path="/register" element={<RegisterPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/app" element={<HomePage />} />
          <Route path="/app/profile" element={<ProfilePage />} />
          <Route path="/app/account" element={<AccountPage />} />
          <Route path="/cronometro" element={<TimerGate />} />
          <Route element={<AdminRoute />}>
            <Route path="/app/users" element={<UsersPage />} />
            <Route path="/app/users/:id" element={<UserDetailPage />} />
            <Route path="/app/settings" element={<SettingsPage />} />
          </Route>
          <Route element={<StaffRoute />}>
            <Route path="/admin/ejercicios" element={<ExercisesPage />} />
            <Route path="/admin/rutinas" element={<RoutinesPage />} />
            <Route path="/admin/horarios" element={<SchedulesPage />} />
            <Route path="/admin/alumnos" element={<StudentsFollowPage />} />
            <Route path="/admin/pendientes" element={<PendingAccountsPage />} />
            <Route path="/admin/progreso" element={<ProgressPage />} />
          </Route>
          <Route element={<StudentRoute />}>
            <Route path="/alumno/inicio" element={<StudentHomePage />} />
            <Route path="/alumno/mis-rutinas" element={<MyRoutinesPage />} />
            <Route path="/alumno/mis-rutinas/nueva" element={<CreateRoutinePage />} />
            <Route path="/alumno/progreso" element={<ProgressPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function TimerGate() {
  const { user } = useAuth();
  if (user?.role === "ADMIN") {
    return <Navigate to="/app" replace />;
  }
  return <TimerPage />;
}
