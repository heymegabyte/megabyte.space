import * as dotenv from 'dotenv';
import * as path from 'path';
import { logger } from './logger';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export interface SenderAddress {
  name: string;
  company: string;
  address_line1: string;
  address_city: string;
  address_state: string;
  address_zip: string;
}

export interface Config {
  lobApiKey: string;
  testLob: boolean;
  dryRun: boolean;
  sender: SenderAddress;
  donationUrl: string;
}

function envBool(key: string, defaultValue: boolean): boolean {
  const val = process.env[key];
  if (val === undefined) return defaultValue;
  return val.toLowerCase() !== 'false' && val !== '0';
}

function envRequired(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
}

function envOptional(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export function loadConfig(): Config {
  const testLob = envBool('TEST_LOB', true);
  const dryRun = envBool('DRY_RUN', true);

  let lobApiKey = '';
  if (!dryRun) {
    lobApiKey = envRequired('LOB_API_KEY');
    if (testLob && !lobApiKey.startsWith('test_')) {
      logger.warn('TEST_LOB is true but LOB_API_KEY does not start with "test_". Proceeding with caution.');
    }
    if (!testLob && lobApiKey.startsWith('test_')) {
      logger.warn('TEST_LOB is false but LOB_API_KEY starts with "test_". Using test key in production mode.');
    }
  }

  return {
    lobApiKey,
    testLob,
    dryRun,
    sender: {
      name: envOptional('DEFAULT_SENDER_NAME', 'Brian Zalewski'),
      company: envOptional('DEFAULT_SENDER_COMPANY', 'Megabyte Labs'),
      address_line1: envOptional('DEFAULT_SENDER_ADDRESS_LINE1', '1715 U.S. Highway 46 Apt 414'),
      address_city: envOptional('DEFAULT_SENDER_CITY', 'Parsippany'),
      address_state: envOptional('DEFAULT_SENDER_STATE', 'NJ'),
      address_zip: envOptional('DEFAULT_SENDER_ZIP', '07054'),
    },
    donationUrl: envOptional('DEFAULT_DONATION_URL', 'https://njsk.org'),
  };
}
