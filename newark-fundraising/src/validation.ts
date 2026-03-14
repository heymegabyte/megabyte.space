import { Address, Prospect } from './types';
import { logger } from './logger';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const US_STATE_CODES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]);

export function validateAddress(address: Address): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!address.address_line1 || address.address_line1.trim().length === 0) {
    errors.push('Missing address line 1');
  }
  if (!address.address_city || address.address_city.trim().length === 0) {
    errors.push('Missing city');
  }
  if (!address.address_state || address.address_state.trim().length === 0) {
    errors.push('Missing state');
  } else if (!US_STATE_CODES.has(address.address_state.toUpperCase())) {
    errors.push(`Invalid state code: ${address.address_state}`);
  }
  if (!address.address_zip || address.address_zip.trim().length === 0) {
    errors.push('Missing zip code');
  } else if (!/^\d{5}(-\d{4})?$/.test(address.address_zip)) {
    errors.push(`Invalid zip code format: ${address.address_zip}`);
  }

  if (address.address_line1 && address.address_line1.length > 64) {
    warnings.push('Address line 1 exceeds 64 characters');
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateProspect(prospect: Prospect): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!prospect.name || prospect.name.trim().length === 0) {
    errors.push('Missing prospect name');
  }

  const addressResult = validateAddress(prospect.address);
  errors.push(...addressResult.errors);
  warnings.push(...addressResult.warnings);

  if (prospect.score < 0 || prospect.score > 100) {
    warnings.push(`Score out of range: ${prospect.score}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateProspects(prospects: Prospect[]): {
  valid: Prospect[];
  invalid: Array<{ prospect: Prospect; result: ValidationResult }>;
} {
  const valid: Prospect[] = [];
  const invalid: Array<{ prospect: Prospect; result: ValidationResult }> = [];

  const seen = new Set<string>();

  for (const prospect of prospects) {
    const key = `${prospect.name}|${prospect.address.address_line1}|${prospect.address.address_zip}`;
    if (seen.has(key)) {
      logger.warn(`Duplicate prospect skipped: ${prospect.name}`);
      invalid.push({
        prospect,
        result: { valid: false, errors: ['Duplicate recipient'], warnings: [] },
      });
      continue;
    }
    seen.add(key);

    const result = validateProspect(prospect);
    if (result.valid) {
      if (result.warnings.length > 0) {
        logger.warn(`Prospect ${prospect.name} has warnings: ${result.warnings.join(', ')}`);
      }
      valid.push(prospect);
    } else {
      logger.error(`Invalid prospect ${prospect.name}: ${result.errors.join(', ')}`);
      invalid.push({ prospect, result });
    }
  }

  return { valid, invalid };
}
