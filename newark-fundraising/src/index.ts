import * as readline from 'readline';
import { loadConfig } from './config';
import { logger } from './logger';
import { getRankedProspects, getProspectCount } from './prospects';
import { validateProspects } from './validation';
import { generateLetterText } from './letter';
import { sendTestLetter, sendBulkLetters } from './mailer';
import { generateReport, printReport, saveReport, printProspectPreview } from './report';

type Command = '--preview' | '--dry-run' | '--send-test' | '--send-all' | '--help';

function getCommand(): Command {
  const arg = process.argv[2] as Command | undefined;
  return arg || '--help';
}

function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

function printHelp(): void {
  console.log(`
Newark Fundraising Automation - St. John's Soup Kitchen
========================================================

Commands:
  --preview     Show all prospects ranked by donation likelihood
  --dry-run     Simulate sending all letters (no actual mail sent)
  --send-test   Send a test letter to the sender's own address
  --send-all    Send letters to all validated prospects (requires approval)
  --help        Show this help message

Environment:
  LOB_API_KEY          Lob API key (required for actual sending)
  TEST_LOB=true        Use Lob test mode (default: true)
  DRY_RUN=true         Dry-run mode (default: true)

Safety:
  - DRY_RUN and TEST_LOB both default to true
  - --send-test always sends to the sender's own address first
  - --send-all requires interactive confirmation
`);
}

async function runPreview(): Promise<void> {
  const prospects = getRankedProspects();
  const { valid, invalid } = validateProspects(prospects);

  printProspectPreview(valid);

  if (invalid.length > 0) {
    console.log(`\nWARNING: ${invalid.length} prospect(s) failed validation:`);
    for (const { prospect, result } of invalid) {
      console.log(`  - ${prospect.name}: ${result.errors.join(', ')}`);
    }
  }

  console.log(`\nTotal valid prospects: ${valid.length} / ${getProspectCount()}`);
}

async function runDryRun(): Promise<void> {
  const config = loadConfig();
  config.dryRun = true; // Force dry-run

  const prospects = getRankedProspects();
  const { valid } = validateProspects(prospects);

  console.log(`\nStarting dry run for ${valid.length} prospects...\n`);
  const results = await sendBulkLetters(valid, config);
  const report = generateReport(results, getProspectCount());
  printReport(report);
  saveReport(report, 'output');

  // Preview first letter
  if (valid.length > 0) {
    console.log('\n--- Sample Letter (first prospect) ---\n');
    console.log(generateLetterText(valid[0], config));
    console.log('\n--- End Sample Letter ---\n');
  }
}

async function runSendTest(): Promise<void> {
  const config = loadConfig();

  if (config.dryRun) {
    console.log('\nDRY_RUN is enabled. Set DRY_RUN=false to actually send mail.\n');
  }

  console.log(`Sending test letter to: ${config.sender.name}`);
  console.log(`Address: ${config.sender.address_line1}, ${config.sender.address_city}, ${config.sender.address_state} ${config.sender.address_zip}`);
  console.log(`Mode: ${config.dryRun ? 'DRY RUN' : config.testLob ? 'LOB TEST' : 'PRODUCTION'}\n`);

  const result = await sendTestLetter(config);
  console.log(`\nResult: ${result.status}${result.lobId ? ` (Lob ID: ${result.lobId})` : ''}`);
  if (result.error) {
    console.log(`Error: ${result.error}`);
  }
}

async function runSendAll(): Promise<void> {
  const config = loadConfig();

  const prospects = getRankedProspects();
  const { valid, invalid } = validateProspects(prospects);

  console.log(`\n========================================`);
  console.log(`  BULK SEND CONFIRMATION`);
  console.log(`========================================`);
  console.log(`  Valid prospects: ${valid.length}`);
  console.log(`  Invalid prospects: ${invalid.length}`);
  console.log(`  Mode: ${config.dryRun ? 'DRY RUN' : config.testLob ? 'LOB TEST' : 'PRODUCTION'}`);
  console.log(`  API Key: ${config.lobApiKey ? config.lobApiKey.substring(0, 8) + '...' : 'NOT SET'}`);
  console.log(`========================================\n`);

  if (!config.dryRun) {
    const confirmed = await askConfirmation(
      `Are you sure you want to send ${valid.length} letters in ${config.testLob ? 'TEST' : 'PRODUCTION'} mode?`
    );
    if (!confirmed) {
      console.log('\nAborted. No letters sent.\n');
      return;
    }

    // Double confirmation for production
    if (!config.testLob) {
      const doubleConfirmed = await askConfirmation(
        'WARNING: This is PRODUCTION mode. Letters will be physically mailed. Confirm again?'
      );
      if (!doubleConfirmed) {
        console.log('\nAborted. No letters sent.\n');
        return;
      }
    }
  }

  console.log(`\nSending ${valid.length} letters...\n`);
  const results = await sendBulkLetters(valid, config);
  const report = generateReport(results, getProspectCount());
  printReport(report);
  const reportPath = saveReport(report, 'output');
  console.log(`Full report saved to: ${reportPath}\n`);
}

async function main(): Promise<void> {
  try {
    const command = getCommand();

    switch (command) {
      case '--preview':
        await runPreview();
        break;
      case '--dry-run':
        await runDryRun();
        break;
      case '--send-test':
        await runSendTest();
        break;
      case '--send-all':
        await runSendAll();
        break;
      case '--help':
      default:
        printHelp();
        break;
    }
  } catch (err: any) {
    logger.error(`Fatal error: ${err.message}`, { stack: err.stack });
    console.error(`\nFatal error: ${err.message}\n`);
    process.exit(1);
  }
}

main();
