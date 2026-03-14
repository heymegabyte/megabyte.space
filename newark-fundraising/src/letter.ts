import { Prospect, DonationTier } from './types';
import { Config } from './config';

function tierToSuggestedAmount(tier: DonationTier): string {
  switch (tier) {
    case 'anchor': return '$25,000+';
    case 'impact': return '$10,000';
    case 'sponsor': return '$5,000';
    case 'supporter': return '$2,500';
  }
}

function tierToLabel(tier: DonationTier): string {
  switch (tier) {
    case 'anchor': return 'Anchor Partner';
    case 'impact': return 'Community Impact Sponsor';
    case 'sponsor': return 'Meal Service Sponsor';
    case 'supporter': return 'Community Supporter';
  }
}

export function generateLetterText(prospect: Prospect, config: Config): string {
  const suggested = tierToSuggestedAmount(prospect.tier);
  const label = tierToLabel(prospect.tier);

  return `Dear Newark Business Leader,

I'm Brian Zalewski, founder of Megabyte Labs and a volunteer supporting St. John's Soup Kitchen near Newark Penn Station.

Every morning, St. John's provides meals and dignity to hundreds of Newark residents. It is one of the city's most direct frontline services, yet much of this work continues thanks to a small nonprofit operating from a historic church building.

This letter is part of a private civic initiative inviting Newark businesses to help strengthen this essential institution.

Your organization can participate in three meaningful ways:

  - Corporate Donation - the fastest way to support the work being done
  - Volunteer Morning - bring your team to serve and see the impact firsthand
  - Technical Expertise - send AI, engineering, or operations professionals to help modernize nonprofit systems

Suggested contribution levels:

  $2,500 - Community Supporter
  $5,000 - Meal Service Sponsor
  $10,000 - Community Impact Sponsor
  $25,000+ - Anchor Partner

As a ${label}, a contribution of ${suggested} from ${prospect.name} would make a tremendous impact.

Donations can be made directly at:

${config.donationUrl}

This initiative simply invites Newark's business community to step forward and strengthen an institution that quietly serves our neighbors every day.

Thank you for considering joining this effort.

Sincerely,

Brian Zalewski
Megabyte Labs`;
}

export function generateLetterHtml(prospect: Prospect, config: Config): string {
  const suggested = tierToSuggestedAmount(prospect.tier);
  const label = tierToLabel(prospect.tier);

  return `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; color: #222; max-width: 6.5in; margin: 0.75in auto; }
  .header { margin-bottom: 24pt; }
  .sender { font-size: 10pt; color: #555; }
  .greeting { margin-top: 18pt; }
  .signature { margin-top: 24pt; }
  .donation-link { font-size: 14pt; font-weight: bold; color: #1a5276; }
  .tiers { margin: 12pt 0; }
  .tier-line { margin: 4pt 0 4pt 18pt; }
  .highlight { font-weight: bold; color: #1a5276; }
  ul { list-style: none; padding-left: 18pt; }
  ul li::before { content: "\\2022"; color: #1a5276; font-weight: bold; display: inline-block; width: 1em; margin-left: -1em; }
</style>
</head>
<body>
  <div class="header">
    <div class="sender">
      ${config.sender.name}<br>
      ${config.sender.company}<br>
      ${config.sender.address_line1}<br>
      ${config.sender.address_city}, ${config.sender.address_state} ${config.sender.address_zip}
    </div>
  </div>

  <p class="greeting">Dear Newark Business Leader,</p>

  <p>I'm Brian Zalewski, founder of Megabyte Labs and a volunteer supporting St. John's Soup Kitchen near Newark Penn Station.</p>

  <p>Every morning, St. John's provides meals and dignity to hundreds of Newark residents. It is one of the city's most direct frontline services, yet much of this work continues thanks to a small nonprofit operating from a historic church building.</p>

  <p>This letter is part of a <strong>private civic initiative inviting Newark businesses to help strengthen this essential institution.</strong></p>

  <p>Your organization can participate in three meaningful ways:</p>

  <ul>
    <li><strong>Corporate Donation</strong> &mdash; the fastest way to support the work being done</li>
    <li><strong>Volunteer Morning</strong> &mdash; bring your team to serve and see the impact firsthand</li>
    <li><strong>Technical Expertise</strong> &mdash; send AI, engineering, or operations professionals to help modernize nonprofit systems</li>
  </ul>

  <p>Suggested contribution levels:</p>

  <div class="tiers">
    <div class="tier-line">$2,500 &mdash; Community Supporter</div>
    <div class="tier-line">$5,000 &mdash; Meal Service Sponsor</div>
    <div class="tier-line">$10,000 &mdash; Community Impact Sponsor</div>
    <div class="tier-line">$25,000+ &mdash; Anchor Partner</div>
  </div>

  <p>As a <span class="highlight">${label}</span>, a contribution of <span class="highlight">${suggested}</span> from <strong>${prospect.name}</strong> would make a tremendous impact.</p>

  <p>Donations can be made directly at:</p>

  <p class="donation-link"><a href="${config.donationUrl}">${config.donationUrl}</a></p>

  <p>This initiative simply invites Newark's business community to step forward and strengthen an institution that quietly serves our neighbors every day.</p>

  <p>Thank you for considering joining this effort.</p>

  <div class="signature">
    <p>Sincerely,</p>
    <p><strong>Brian Zalewski</strong><br>Megabyte Labs</p>
  </div>
</body>
</html>`;
}
