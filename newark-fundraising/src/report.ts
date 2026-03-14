import * as fs from 'fs';
import * as path from 'path';
import { CampaignReport, MailingResult, Prospect } from './types';
import { logger } from './logger';

export function generateReport(results: MailingResult[], totalProspects: number): CampaignReport {
  return {
    totalProspects,
    sent: results.filter((r) => r.status === 'sent').length,
    failed: results.filter((r) => r.status === 'failed').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    dryRun: results.filter((r) => r.status === 'dry_run').length,
    results,
    generatedAt: new Date().toISOString(),
  };
}

export function printReport(report: CampaignReport): void {
  console.log('\n========================================');
  console.log('  CAMPAIGN REPORT');
  console.log('========================================');
  console.log(`  Generated: ${report.generatedAt}`);
  console.log(`  Total Prospects: ${report.totalProspects}`);
  console.log(`  Sent: ${report.sent}`);
  console.log(`  Failed: ${report.failed}`);
  console.log(`  Skipped: ${report.skipped}`);
  console.log(`  Dry Run: ${report.dryRun}`);
  console.log('========================================\n');

  if (report.failed > 0) {
    console.log('FAILURES:');
    for (const r of report.results.filter((r) => r.status === 'failed')) {
      console.log(`  - ${r.prospectName}: ${r.error}`);
    }
    console.log('');
  }
}

export function saveReport(report: CampaignReport, outputDir: string): string {
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(outputDir, `campaign-report-${timestamp}.json`);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    logger.info(`Report saved to: ${filePath}`);
    return filePath;
  } catch (err: any) {
    logger.error(`Failed to save report: ${err.message}`);
    throw err;
  }
}

export function printProspectPreview(prospects: Prospect[]): void {
  console.log('\n========================================');
  console.log('  PROSPECT PREVIEW');
  console.log(`  Total: ${prospects.length} organizations`);
  console.log('========================================\n');

  const tiers = ['anchor', 'impact', 'sponsor', 'supporter'] as const;
  for (const tier of tiers) {
    const tierProspects = prospects.filter((p) => p.tier === tier);
    console.log(`[${tier.toUpperCase()}] (${tierProspects.length} prospects)`);
    for (const p of tierProspects) {
      console.log(`  ${p.score.toString().padStart(3)} | ${p.name}`);
      console.log(`       ${p.address.address_line1}, ${p.address.address_city}, ${p.address.address_state} ${p.address.address_zip}`);
    }
    console.log('');
  }
}
