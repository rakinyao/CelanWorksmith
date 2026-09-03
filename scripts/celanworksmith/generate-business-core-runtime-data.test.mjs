import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadScenario,
  generateRuntimeData,
  validateRuntimeData,
} from './generate-business-core-runtime-data.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const releasePath = resolve(here, '../../docs/superpowers/fixtures/ontology-model-release-demo.json');
const scenarioPath = resolve(here, 'business-core-runtime-scenario.json');

const readJson = async path => JSON.parse(await readFile(path, 'utf8'));

test('generates a deterministic Chinese dataset from the release', async () => {
  const release = await readJson(releasePath);
  const scenario = await loadScenario(scenarioPath);

  const first = generateRuntimeData({ release, scenario });
  const second = generateRuntimeData({ release, scenario });

  assert.deepEqual(second, first);
  assert.deepEqual(Object.fromEntries(Object.entries(first).map(([name, rows]) => [name, rows.length])), {
    ont_supplier: 15,
    ont_customer: 75,
    ont_contract: 260,
    ont_purchase_order: 95,
  });
  assert.match(first.ont_customer[0].customer_name, /[\u3400-\u9fff]/);
  assert.match(first.ont_contract[0].contract_no, /^CON-20(24|25|26)-\d{3}$/);
  const contracts2026 = first.ont_contract.filter(row => row.contract_no.startsWith('CON-2026-'));
  const total2026 = contracts2026.reduce((sum, row) => sum + row.signed_amount, 0);
  const signedCompleted2026 = contracts2026.filter(row => ['已完成', '执行中'].includes(row.state)).reduce((sum, row) => sum + row.signed_amount, 0);
  assert.ok(Math.abs(total2026 - 172500000) < 1, `2026 total was ${total2026}`);
  assert.ok(signedCompleted2026 >= 110000000 && signedCompleted2026 <= 120000000, `2026 signed/completed was ${signedCompleted2026}`);
  validateRuntimeData({ release, scenario, data: first });
});
