import { Config } from './config';
import { Prospect, MailingResult } from './types';
import { generateLetterHtml } from './letter';
import { logger } from './logger';

interface LobLetterParams {
  description: string;
  to: {
    name: string;
    address_line1: string;
    address_line2?: string;
    address_city: string;
    address_state: string;
    address_zip: string;
  };
  from: {
    name: string;
    company: string;
    address_line1: string;
    address_city: string;
    address_state: string;
    address_zip: string;
  };
  file: string;
  color: boolean;
  double_sided: boolean;
  address_placement: string;
  mail_type: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendViaLob(params: LobLetterParams, config: Config): Promise<string> {
  // Dynamic import to avoid errors when lob is not installed
  const Lob = (await import('lob')).default;
  const lob = new Lob({ apiKey: config.lobApiKey });

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const letter = await (lob as any).letters.create({
        description: params.description,
        to: params.to,
        from: params.from,
        file: params.file,
        color: params.color,
        double_sided: params.double_sided,
        address_placement: params.address_placement,
        mail_type: params.mail_type,
      });
      return letter.id;
    } catch (err: any) {
      lastError = err;
      if (err.status_code === 429) {
        const backoff = Math.pow(2, attempt) * 1000;
        logger.warn(`Rate limited by Lob API. Retrying in ${backoff}ms (attempt ${attempt}/${maxRetries})`);
        await sleep(backoff);
        continue;
      }
      if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
        const backoff = Math.pow(2, attempt) * 1000;
        logger.warn(`Network error: ${err.code}. Retrying in ${backoff}ms (attempt ${attempt}/${maxRetries})`);
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export async function sendLetter(
  prospect: Prospect,
  config: Config,
): Promise<MailingResult> {
  const timestamp = new Date().toISOString();

  if (config.dryRun) {
    logger.info(`[DRY RUN] Would send letter to: ${prospect.name} at ${prospect.address.address_line1}, ${prospect.address.address_city}`);
    return {
      prospectId: prospect.id,
      prospectName: prospect.name,
      status: 'dry_run',
      timestamp,
    };
  }

  try {
    const html = generateLetterHtml(prospect, config);
    const params: LobLetterParams = {
      description: `St. John's Soup Kitchen - ${prospect.name}`,
      to: {
        name: prospect.name,
        address_line1: prospect.address.address_line1,
        address_line2: prospect.address.address_line2,
        address_city: prospect.address.address_city,
        address_state: prospect.address.address_state,
        address_zip: prospect.address.address_zip,
      },
      from: {
        name: config.sender.name,
        company: config.sender.company,
        address_line1: config.sender.address_line1,
        address_city: config.sender.address_city,
        address_state: config.sender.address_state,
        address_zip: config.sender.address_zip,
      },
      file: html,
      color: false,
      double_sided: false,
      address_placement: 'top_first_page',
      mail_type: 'usps_first_class',
    };

    const lobId = await sendViaLob(params, config);
    logger.info(`Letter sent to ${prospect.name} - Lob ID: ${lobId}`);
    return {
      prospectId: prospect.id,
      prospectName: prospect.name,
      status: 'sent',
      lobId,
      timestamp,
    };
  } catch (err: any) {
    logger.error(`Failed to send letter to ${prospect.name}: ${err.message}`);
    return {
      prospectId: prospect.id,
      prospectName: prospect.name,
      status: 'failed',
      error: err.message,
      timestamp,
    };
  }
}

export async function sendTestLetter(config: Config): Promise<MailingResult> {
  const testProspect: Prospect = {
    id: 0,
    name: config.sender.name,
    address: {
      address_line1: config.sender.address_line1,
      address_city: config.sender.address_city,
      address_state: config.sender.address_state,
      address_zip: config.sender.address_zip,
    },
    category: 'corporate',
    tier: 'anchor',
    score: 100,
    notes: 'Self-test letter',
  };

  logger.info('Sending self-test letter to sender address...');
  return sendLetter(testProspect, config);
}

export async function sendBulkLetters(
  prospects: Prospect[],
  config: Config,
  options: { delayMs?: number } = {},
): Promise<MailingResult[]> {
  const results: MailingResult[] = [];
  const delayMs = options.delayMs ?? 500;

  for (let i = 0; i < prospects.length; i++) {
    const prospect = prospects[i];
    logger.info(`Processing ${i + 1}/${prospects.length}: ${prospect.name}`);
    const result = await sendLetter(prospect, config);
    results.push(result);

    if (i < prospects.length - 1 && !config.dryRun) {
      await sleep(delayMs);
    }
  }

  return results;
}
