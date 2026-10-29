export type Role = "USER" | "ALUMNO" | "PROFESOR" | "ADMIN";

export function isStaff(role?: Role | null) {
  return role === "ADMIN" || role === "PROFESOR";
}

export function isStudent(role?: Role | null) {
  return role === "USER" || role === "ALUMNO";
}

export function roleLabel(role?: Role | null) {
  if (role === "ADMIN") {
    return "Administrador";
  }
  if (role === "PROFESOR") {
    return "Profesor";
  }
  return "Alumno";
}

export function homePath(role?: Role | null) {
  return isStudent(role) ? "/alumno/inicio" : "/app";
}

export interface ProfileFields {
  documentNumber?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  street?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  medicalNotes?: string | null;
  specialties?: string | null;
  biography?: string | null;
  socialLinks?: string | null;
  certifications?: string | null;
}

export interface User extends ProfileFields {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  enabled?: boolean;
  lockedUntil?: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  approved?: boolean;
}

export interface ProfileForm {
  documentNumber: string;
  phone: string;
  birthDate: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  heightCm: string;
  weightKg: string;
  medicalNotes: string;
  specialties: string;
  biography: string;
  socialLinks: string;
  certifications: string;
}

export function emptyProfile(): ProfileForm {
  return {
    documentNumber: "",
    phone: "",
    birthDate: "",
    street: "",
    city: "",
    province: "",
    postalCode: "",
    heightCm: "",
    weightKg: "",
    medicalNotes: "",
    specialties: "",
    biography: "",
    socialLinks: "",
    certifications: "",
  };
}

export function profileFromUser(user: ProfileFields): ProfileForm {
  return {
    documentNumber: user.documentNumber ?? "",
    phone: user.phone ?? "",
    birthDate: user.birthDate ?? "",
    street: user.street ?? "",
    city: user.city ?? "",
    province: user.province ?? "",
    postalCode: user.postalCode ?? "",
    heightCm: user.heightCm == null ? "" : String(user.heightCm),
    weightKg: user.weightKg == null ? "" : String(user.weightKg),
    medicalNotes: user.medicalNotes ?? "",
    specialties: user.specialties ?? "",
    biography: user.biography ?? "",
    socialLinks: user.socialLinks ?? "",
    certifications: user.certifications ?? "",
  };
}

function optionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

export function profilePayload(profile: ProfileForm): ProfileFields {
  return {
    documentNumber: profile.documentNumber.trim() || null,
    phone: profile.phone.trim() || null,
    birthDate: profile.birthDate || null,
    street: profile.street.trim() || null,
    city: profile.city.trim() || null,
    province: profile.province.trim() || null,
    postalCode: profile.postalCode.trim() || null,
    heightCm: optionalNumber(profile.heightCm),
    weightKg: optionalNumber(profile.weightKg),
    medicalNotes: profile.medicalNotes.trim() || null,
    specialties: profile.specialties.trim() || null,
    biography: profile.biography.trim() || null,
    socialLinks: profile.socialLinks.trim() || null,
    certifications: profile.certifications.trim() || null,
  };
}

export function displayName(user: Pick<User, "firstName" | "lastName">) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
}

export interface UserPage {
  items: User[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface ApiError {
  error: string;
  message: string;
}

export interface PublicSettings {
  allowPublicRegistration: boolean;
  passwordMinLength: number;
  passwordMaxLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireDigit: boolean;
}

export interface AppSettings extends PublicSettings {
  maxFailedAttempts: number;
  lockDurationMinutes: number;
  updatedAt?: string | null;
}

export function passwordPolicyHint(settings: Pick<
  PublicSettings,
  | "passwordMinLength"
  | "passwordMaxLength"
  | "passwordRequireUppercase"
  | "passwordRequireLowercase"
  | "passwordRequireDigit"
>) {
  const parts = [`entre ${settings.passwordMinLength} y ${settings.passwordMaxLength} caracteres`];
  const needs: string[] = [];
  if (settings.passwordRequireUppercase) {
    needs.push("mayúscula");
  }
  if (settings.passwordRequireLowercase) {
    needs.push("minúscula");
  }
  if (settings.passwordRequireDigit) {
    needs.push("un número");
  }
  if (needs.length > 0) {
    parts.push(`con ${needs.join(", ")}`);
  }
  return parts.join(", ");
}

