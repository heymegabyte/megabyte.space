import { generateLetterText, generateLetterHtml } from '../letter';
import { Prospect } from '../types';
import { Config } from '../config';

const mockConfig: Config = {
  lobApiKey: 'test_key',
  testLob: true,
  dryRun: true,
  sender: {
    name: 'Brian Zalewski',
    company: 'Megabyte Labs',
    address_line1: '1715 U.S. Highway 46 Apt 414',
    address_city: 'Parsippany',
    address_state: 'NJ',
    address_zip: '07054',
  },
  donationUrl: 'https://njsk.org',
};

const mockProspect: Prospect = {
  id: 1,
  name: 'Prudential Financial',
  address: {
    address_line1: '751 Broad St',
    address_city: 'Newark',
    address_state: 'NJ',
    address_zip: '07102',
  },
  category: 'corporate',
  tier: 'anchor',
  score: 100,
};

describe('Letter Generation', () => {
  test('text letter should contain prospect name', () => {
    const text = generateLetterText(mockProspect, mockConfig);
    expect(text).toContain('Prudential Financial');
  });

  test('text letter should contain donation URL', () => {
    const text = generateLetterText(mockProspect, mockConfig);
    expect(text).toContain('https://njsk.org');
  });

  test('text letter should contain tier-appropriate amount', () => {
    const text = generateLetterText(mockProspect, mockConfig);
    expect(text).toContain('$25,000+');
    expect(text).toContain('Anchor Partner');
  });

  test('supporter tier should suggest $2,500', () => {
    const supporter: Prospect = { ...mockProspect, tier: 'supporter' };
    const text = generateLetterText(supporter, mockConfig);
    expect(text).toContain('$2,500');
    expect(text).toContain('Community Supporter');
  });

  test('HTML letter should be valid HTML', () => {
    const html = generateLetterHtml(mockProspect, mockConfig);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
    expect(html).toContain('Prudential Financial');
  });

  test('letter should contain sender info', () => {
    const text = generateLetterText(mockProspect, mockConfig);
    expect(text).toContain('Brian Zalewski');
    expect(text).toContain('Megabyte Labs');
  });
});
