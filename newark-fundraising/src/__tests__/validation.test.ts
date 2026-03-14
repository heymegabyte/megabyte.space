import { validateAddress, validateProspect, validateProspects } from '../validation';
import { Prospect } from '../types';

describe('Address Validation', () => {
  test('should accept valid address', () => {
    const result = validateAddress({
      address_line1: '751 Broad St',
      address_city: 'Newark',
      address_state: 'NJ',
      address_zip: '07102',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should reject missing address line', () => {
    const result = validateAddress({
      address_line1: '',
      address_city: 'Newark',
      address_state: 'NJ',
      address_zip: '07102',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing address line 1');
  });

  test('should reject invalid state code', () => {
    const result = validateAddress({
      address_line1: '123 Main St',
      address_city: 'Newark',
      address_state: 'XX',
      address_zip: '07102',
    });
    expect(result.valid).toBe(false);
  });

  test('should reject invalid zip', () => {
    const result = validateAddress({
      address_line1: '123 Main St',
      address_city: 'Newark',
      address_state: 'NJ',
      address_zip: 'abc',
    });
    expect(result.valid).toBe(false);
  });

  test('should accept zip+4 format', () => {
    const result = validateAddress({
      address_line1: '123 Main St',
      address_city: 'Newark',
      address_state: 'NJ',
      address_zip: '07102-1234',
    });
    expect(result.valid).toBe(true);
  });
});

describe('Prospect Validation', () => {
  const validProspect: Prospect = {
    id: 1,
    name: 'Test Corp',
    address: {
      address_line1: '123 Main St',
      address_city: 'Newark',
      address_state: 'NJ',
      address_zip: '07102',
    },
    category: 'corporate',
    tier: 'supporter',
    score: 50,
  };

  test('should accept valid prospect', () => {
    const result = validateProspect(validProspect);
    expect(result.valid).toBe(true);
  });

  test('should reject prospect without name', () => {
    const result = validateProspect({ ...validProspect, name: '' });
    expect(result.valid).toBe(false);
  });
});

describe('Bulk Validation', () => {
  test('should detect duplicates', () => {
    const prospects: Prospect[] = [
      {
        id: 1,
        name: 'Dup Corp',
        address: { address_line1: '123 Main St', address_city: 'Newark', address_state: 'NJ', address_zip: '07102' },
        category: 'corporate',
        tier: 'supporter',
        score: 50,
      },
      {
        id: 2,
        name: 'Dup Corp',
        address: { address_line1: '123 Main St', address_city: 'Newark', address_state: 'NJ', address_zip: '07102' },
        category: 'corporate',
        tier: 'supporter',
        score: 50,
      },
    ];
    const { valid, invalid } = validateProspects(prospects);
    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(1);
    expect(invalid[0].result.errors).toContain('Duplicate recipient');
  });
});
