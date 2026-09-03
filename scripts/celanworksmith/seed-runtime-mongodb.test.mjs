import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const loaderPath = resolve('scripts/celanworksmith/seed-runtime-mongodb.js');
const loaderSource = readFileSync(loaderPath, 'utf8');

function executeLoaderWithFakeMongoShell() {
  const calls = [];
  const files = new Map([
    ['suppliers.json', [{ _id: 'SUP-001' }]],
    ['purchase_orders.json', [{ _id: 'PO-001' }]],
    ['ont_supplier.json', [{ _id: 'SUP-001' }]],
    ['ont_customer.json', [{ _id: 'CUS-2024-001' }]],
    ['ont_contract.json', [{ _id: 'CTR-1' }]],
    ['ont_purchase_order.json', [{ _id: 'PO-2024-001' }]],
  ]);
  const fakeFs = {
    readFileSync(filePath) {
      const fileName = filePath.slice(filePath.lastIndexOf('/') + 1);
      return JSON.stringify(files.get(fileName));
    },
  };
  const fakePath = {
    join(...parts) {
      return parts.join('/');
    },
  };
  const fakeDb = {
    getSiblingDB() {
      return {
        getCollection(collection) {
          return {
            replaceOne(filter, document, options) {
              calls.push({ collection, operation: 'replaceOne', filter, document, options });
            },
          };
        },
      };
    },
  };
  const context = {
    require(moduleName) {
      if (moduleName === 'fs') return fakeFs;
      if (moduleName === 'path') return fakePath;
      throw new Error(`Unexpected module: ${moduleName}`);
    },
    process: { cwd: () => '/workspace' },
    db: fakeDb,
    print() {},
  };
  vm.runInNewContext(loaderSource, context, { filename: loaderPath });
  return calls;
}

test('upserts each release runtime asset without touching legacy collections', () => {
  const calls = executeLoaderWithFakeMongoShell();

  assert.deepEqual([...new Set(calls.map((call) => call.collection))], [
    'suppliers', 'purchase_orders', 'ont_supplier', 'ont_customer',
    'ont_contract', 'ont_purchase_order',
  ]);
  assert.ok(calls.every((call) => call.options.upsert === true));
  assert.ok(calls.every((call) => !['drop', 'deleteMany'].includes(call.operation)));
});
