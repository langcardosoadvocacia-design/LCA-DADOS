export interface Case {
  id: string;
  tenant_id: string;
  contact_id: string;
  internal_id: string;
  title: string;
  description?: string;
  court_id?: string;
  status: CaseStatus;
  created_at: string;
}

export type CaseStatus = 'open' | 'closed' | 'suspended' | 'archived';

export interface CaseDocument {
  id: string;
  case_id: string;
  name: string;
  file_url: string;
  type: string;
  version: number;
  created_at: string;
}
