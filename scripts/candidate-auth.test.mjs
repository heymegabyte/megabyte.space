import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { getAuthGatekeeperAllowlist, isDeploymentAdmin, isPasswordAuthEnabled } from '../.ai/runs/heymegabyte--megabyte.space-42420228809-1/candidate-auth-config.ts';

// Exact upstream helper execution only: no Worker, provider or deployed-identity acceptance.
test('candidate snapshot has recorded immutable source identity', async () => {
  const provenance = JSON.parse(await readFile(new URL('../.ai/runs/heymegabyte--megabyte.space-42420228809-1/candidate-source.json', import.meta.url)));
  const source = await readFile(new URL('../.ai/runs/heymegabyte--megabyte.space-42420228809-1/candidate-auth-config.ts', import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'), provenance.sha256);
  assert.equal(provenance.sourceCommit, '2726e932a3fbfcfffa04ee093a881604009f2034');
});
test('password-disable alone retains password login; allowlist selects disabled mode', () => {
  assert.equal(isPasswordAuthEnabled({}), true);
  assert.equal(isPasswordAuthEnabled({ DISABLE_PASSWORD_AUTH: 'true' }), true);
  assert.equal(isPasswordAuthEnabled({ DISABLE_PASSWORD_AUTH: 'true', AUTH_GATEKEEPERS: ' , ' }), true);
  assert.equal(isPasswordAuthEnabled({ DISABLE_PASSWORD_AUTH: 'true', AUTH_GATEKEEPERS: 'google' }), false);
  assert.equal(isPasswordAuthEnabled({ DISABLE_PASSWORD_AUTH: 'TRUE', AUTH_GATEKEEPERS: 'google' }), true);
});
test('allowlist parser does not attest vendor binding availability', () => {
  const env = { DISABLE_PASSWORD_AUTH: 'true', AUTH_GATEKEEPERS: ' MissingVendor, GOOGLE, google ' };
  assert.deepEqual(getAuthGatekeeperAllowlist(env), ['missingvendor', 'google', 'google']);
  assert.equal(isPasswordAuthEnabled(env), false);
  assert.equal(Object.hasOwn(env, 'GATEKEEPER_GOOGLE'), false);
});
test('Access selection is separate from password helper and admin membership', () => {
  const env = { CF_ACCESS_AUD: 'fixture-audience', CF_ACCESS_ISS: 'https://fixture.invalid' };
  assert.equal(isPasswordAuthEnabled(env), true);
  assert.equal(isDeploymentAdmin(env, 'admin@example.com'), false);
});
test('admins accept arrays and serialized arrays with ASCII-only case folding', () => {
  assert.equal(isDeploymentAdmin({ ADMINS: ['Admin@Example.com'] }, 'ADMIN@example.COM'), true);
  assert.equal(isDeploymentAdmin({ ADMINS: '["Admin@Example.com"]' }, 'admin@example.com'), true);
  assert.equal(isDeploymentAdmin({ ADMINS: ['kelvin'] }, '\u212Aelvin'), false);
  assert.equal(isDeploymentAdmin({ ADMINS: [null, 42] }, '42'), false);
  assert.equal(isDeploymentAdmin({ ADMINS: ['admin@example.com'] }, ' admin@example.com'), false);
});
test('malformed admin bindings throw rather than grant membership', () => {
  assert.throws(() => isDeploymentAdmin({ ADMINS: 'not-json' }, 'admin'), SyntaxError);
  assert.throws(() => isDeploymentAdmin({ ADMINS: '{"admin":true}' }, 'admin'), TypeError);
});
