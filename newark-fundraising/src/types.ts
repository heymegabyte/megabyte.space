export interface Address {
  address_line1: string;
  address_line2?: string;
  address_city: string;
  address_state: string;
  address_zip: string;
}

export interface Prospect {
  id: number;
  name: string;
  address: Address;
  category: ProspectCategory;
  tier: DonationTier;
  score: number;
  notes?: string;
}

export type ProspectCategory =
  | 'corporate'
  | 'university'
  | 'healthcare'
  | 'legal'
  | 'financial'
  | 'hospitality'
  | 'foundation'
  | 'nonprofit'
  | 'government'
  | 'arts'
  | 'retail'
  | 'technology'
  | 'real_estate'
  | 'food_service'
  | 'professional_services'
  | 'religious'
  | 'media'
  | 'utility';

export type DonationTier = 'anchor' | 'impact' | 'sponsor' | 'supporter';

export interface MailingResult {
  prospectId: number;
  prospectName: string;
  status: 'sent' | 'failed' | 'skipped' | 'dry_run';
  lobId?: string;
  error?: string;
  timestamp: string;
}

export interface CampaignReport {
  totalProspects: number;
  sent: number;
  failed: number;
  skipped: number;
  dryRun: number;
  results: MailingResult[];
  generatedAt: string;
}
