export type ContactType = 'lead' | 'client';

export interface Contact {
  id: string;
  tenant_id: string;
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  type: ContactType;
  status: string;
  created_at: string;
}

export interface Lead extends Contact {
  type: 'lead';
  funnel_step: string;
  source: string;
}
