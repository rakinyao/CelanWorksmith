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
  validateRuntimeData({ release, scenario, data: first });
});
