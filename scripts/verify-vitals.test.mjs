import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyVitals } from './verify-vitals.mjs';

const beacon = '<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon=\'{"token":"fixture"}\'></script>';
function fixture({ html = beacon, status = 200, type = 'text/html; charset=utf-8', retired = 404 } = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return url.endsWith('/api/analytics/live')
      ? new Response('', { status: retired })
      : new Response(html, { status, headers: { 'content-type': type } });
  };
  return { fetchImpl, calls };
}

test('reports static beacon evidence without claiming delivery of field metrics', async () => {
  const f = fixture();
  const checks = await verifyVitals(f.fetchImpl);
  assert.equal(checks.length, 4);
  assert.ok(checks.every(c => c.pass));
  assert.doesNotMatch(checks.map(c => c.name).join(' '), /RUM live|field RUM live/);
  assert.equal(f.calls.length, 2);
  for (const { options } of f.calls) assert.ok(options.signal instanceof AbortSignal);
});
for (const [label, options] of [
  ['non-HTML response', { type: 'application/json' }],
  ['HTTP failure', { status: 503 }],
  ['incidental domain text', { html: '<p>cloudflareinsights.com cf-beacon</p>' }],
  ['commented-out beacon', { html: `<!-- ${beacon} -->` }],
  ['lookalike source', { html: beacon.replace('beacon.min.js', 'beacon.min.js.evil') }],
  ['configuration elsewhere', { html: '<script src="https://static.cloudflareinsights.com/beacon.min.js"></script><p data-cf-beacon="fixture"></p>' }],
  ['malformed configuration', { html: beacon.replace('{"token":"fixture"}', 'not-json') }],
  ['missing token', { html: beacon.replace('{"token":"fixture"}', '{}') }],
  ['empty token', { html: beacon.replace('fixture', '   ') }],
  ['absent beacon', { html: '<h1>Sign in</h1>' }],
  ['unconfigured beacon', { html: '<script src="https://static.cloudflareinsights.com/beacon.min.js"></script>' }],
  ['retired endpoint returning success', { retired: 200 }],
]) {
  test(`fails for ${label}`, async () => {
    assert.ok((await verifyVitals(fixture(options).fetchImpl)).some(c => !c.pass));
  });
}
test('network failures become named failures without leaking error details', async () => {
  const checks = await verifyVitals(async () => { throw new Error('private-fixture-detail'); });
  assert.ok(checks.some(c => !c.pass));
  assert.doesNotMatch(JSON.stringify(checks), /private-fixture-detail/);
});

test('accepts the versioned script URL served by the live edge', async () => {
  const html = beacon.replace('beacon.min.js', 'beacon.min.js/vce701823e78c4301a35b7e07294d87301792088814092');
  assert.ok((await verifyVitals(fixture({ html }).fetchImpl)).every(c => c.pass));
});

test('accepts entity-encoded JSON configuration', async () => {
  const html = beacon.replaceAll('"token":"fixture"', '&quot;token&quot;:&quot;fixture&quot;');
  assert.ok((await verifyVitals(fixture({ html }).fetchImpl)).every(c => c.pass));
});
