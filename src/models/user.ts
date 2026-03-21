export type UserRole = 'superadmin' | 'owner' | 'advogado' | 'auxiliar' | 'colaborador';

export interface User {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  avatar_url?: string;
  created_at: string;
}

export interface UserPermissions {
  can_manage_users: boolean;
  can_manage_finance: boolean;
  can_manage_cases: boolean;
  can_manage_clients: boolean;
}
