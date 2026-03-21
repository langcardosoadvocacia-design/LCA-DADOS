export interface Office {
  id: string;
  name: string;
  slug: string;
  cnpj?: string;
  settings: OfficeSettings;
  subscription_plan: 'free' | 'pro' | 'enterprise';
  created_at: string;
}

export interface OfficeSettings {
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  currency: string;
  features: string[];
}
