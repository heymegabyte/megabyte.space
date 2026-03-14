import { sendLetter, sendTestLetter } from '../mailer';
import { Prospect } from '../types';
import { Config } from '../config';

const mockConfig: Config = {
  lobApiKey: '',
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

describe('Mailer (Dry Run)', () => {
  test('dry run should return dry_run status', async () => {
    const result = await sendLetter(mockProspect, mockConfig);
    expect(result.status).toBe('dry_run');
    expect(result.prospectName).toBe('Test Corp');
  });

  test('test letter should target sender address', async () => {
    const result = await sendTestLetter(mockConfig);
    expect(result.status).toBe('dry_run');
    expect(result.prospectName).toBe('Brian Zalewski');
  });
});
