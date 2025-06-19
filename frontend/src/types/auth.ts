export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  profilePicture?: string;
  department?: string;
  phoneNumber?: string;
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystemRole: boolean;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
  message?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  phoneNumber?: string;
}

export interface RegisterResponse {
  success: boolean;
  user?: User;
  message: string;
}

export interface TokenValidationResponse {
  valid: boolean;
  user?: User;
  message?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordChangeResponse {
  success: boolean;
  message: string;
}

export interface ProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  department?: string;
  profilePicture?: string;
}

export interface ProfileUpdateResponse {
  success: boolean;
  user?: User;
  message: string;
}

export interface SessionInfo {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading?: boolean;
  refreshToken?: () => Promise<boolean>;
  updateProfile?: (data: ProfileUpdateRequest) => Promise<boolean>;
  changePassword?: (data: PasswordChangeRequest) => Promise<boolean>;
  hasPermission?: (resource: string, action: string) => boolean;
  hasRole?: (roleName: string) => boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthAction {
  type: 'LOGIN_START' | 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'REFRESH_TOKEN' | 'UPDATE_PROFILE' | 'CLEAR_ERROR';
  payload?: any;
}

// Permission constants
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard:view',
  
  // Devices
  DEVICE_VIEW: 'device:view',
  DEVICE_CREATE: 'device:create',
  DEVICE_UPDATE: 'device:update',
  DEVICE_DELETE: 'device:delete',
  DEVICE_CONTROL: 'device:control',
  
  // Alarms
  ALARM_VIEW: 'alarm:view',
  ALARM_ACKNOWLEDGE: 'alarm:acknowledge',
  ALARM_RESOLVE: 'alarm:resolve',
  ALARM_CREATE: 'alarm:create',
  ALARM_DELETE: 'alarm:delete',
  
  // Analytics
  ANALYTICS_VIEW: 'analytics:view',
  ANALYTICS_EXPORT: 'analytics:export',
  
  // ML Models
  ML_VIEW: 'ml:view',
  ML_CREATE: 'ml:create',
  ML_UPDATE: 'ml:update',
  ML_DELETE: 'ml:delete',
  ML_DEPLOY: 'ml:deploy',
  
  // Users (Admin)
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  
  // Roles (Admin)
  ROLE_VIEW: 'role:view',
  ROLE_CREATE: 'role:create',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',
  
  // System
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_LOGS: 'system:logs',
  SYSTEM_BACKUP: 'system:backup',
} as const;

// Role constants
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  OPERATOR: 'operator',
  VIEWER: 'viewer',
  MAINTENANCE: 'maintenance',
  ENGINEER: 'engineer',
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
export type RoleKey = keyof typeof ROLES;