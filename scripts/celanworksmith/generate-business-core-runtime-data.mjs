import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function loadScenario(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function hashSeed(value) { let h = 2166136261; for (const c of String(value)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(seed) { return () => { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = (rng, values) => values[Math.floor(rng() * values.length) % values.length];
const money = fen => Number((fen / 100).toFixed(2));
const dateFor = (year, rng, snapshot) => { const day = 1 + Math.floor(rng() * (year === 2026 ? 243 : 365)); const d = new Date(Date.UTC(year, 0, day, 2 + Math.floor(rng() * 16), Math.floor(rng() * 60))); const max = new Date(snapshot); return (d > max ? max : d).toISOString(); };
function normalizeSignedTotal(rows, targetFen) {
  const source = rows.reduce((sum, row) => sum + Math.round(row.signed_amount * 100), 0);
  let allocated = 0;
  rows.forEach((row, index) => {
    const signedFen = index === rows.length - 1 ? targetFen - allocated : Math.max(1, Math.round(Math.round(row.signed_amount * 100) * targetFen / source));
    allocated += signedFen;
    const changeFen = Math.round(Number(row.change_amount || 0) * 100);
    row.signed_amount = money(signedFen); row.original_amount = money(signedFen); row.change_amount = money(changeFen); row.current_amount = money(signedFen + changeFen);
  });
}

function bindingsFor(release) {
  return Object.fromEntries(release.elements.filter(e => e.kind === 'runtime_binding').map(b => [b.spec.entity_set, b]));
}
function schema(release, entity) {
  const element = release.elements.find(e => e.kind === 'entity_set' && e.name === entity);
  if (!element) throw new Error(`Missing entity schema: ${entity}`);
  const binding = bindingsFor(release)[entity];
  if (!binding) throw new Error(`Missing runtime binding: ${entity}`);
  return { fields: element.spec.fields, primary: Object.keys(binding.spec.primary_key_mapping)[0] };
}

function makeRow(info, index, ctx, custom) {
  const { fields, primary } = info;
  const row = {};
  for (const field of fields) {
    const n = field.name; const type = field.type;
    if (custom[n] !== undefined) row[n] = custom[n];
    else if (type === 'boolean') row[n] = ctx.rng() > 0.5;
    else if (type === 'integer') row[n] = index + 1;
    else if (type === 'decimal') row[n] = money(Math.floor(ctx.rng() * 90000000) + 10000);
    else if (type === 'timestamp') row[n] = dateFor(2024 + (index % 3), ctx.rng, ctx.snapshot);
    else if (/source_system/.test(n)) row[n] = pick(ctx.rng, ctx.scenario.source_systems);
    else if (/state$/.test(n) && ctx.entity === 'contract') row[n] = pick(ctx.rng, ctx.scenario.contract_states);
    else if (/receipt_state/.test(n)) row[n] = pick(ctx.rng, ['未收货', '部分收货', '已收货']);
    else if (/match_state/.test(n)) row[n] = pick(ctx.rng, ['已匹配', '待匹配', '无需匹配']);
    else if (/state$/.test(n)) row[n] = pick(ctx.rng, ['启用', '停用']);
    else if (/province_name/.test(n)) row[n] = pick(ctx.rng, ctx.scenario.provinces);
    else if (/type/.test(n) && ctx.entity === 'supplier') row[n] = pick(ctx.rng, ctx.scenario.supplier_types);
    else if (/type/.test(n) && ctx.entity === 'customer') row[n] = pick(ctx.rng, ctx.scenario.customer_types);
    else if (/category/.test(n) && ctx.entity === 'contract') row[n] = pick(ctx.rng, ctx.scenario.contract_categories);
    else if (/amount/.test(n)) row[n] = money(Math.floor(ctx.rng() * 90000000) + 10000);
    else row[n] = `${pick(ctx.rng, ['示范', '数字化', '企业', '协同', '平台'])}${index + 1}`;
  }
  row._id = row[primary];
  return row;
}

export function generateRuntimeData({ release, scenario }) {
  const rng = mulberry32(hashSeed(scenario.seed)); const snapshot = scenario.snapshot_at;
  const ctx = { rng, scenario, snapshot, entity: '' };
  const supplierInfo = schema(release, 'supplier'); ctx.entity = 'supplier';
  const suppliers = Array.from({ length: scenario.counts.suppliers }, (_, i) => makeRow(supplierInfo, i, ctx, { supplier_code: `SUP-${String(i + 1).padStart(3, '0')}`, supplier_name: `${pick(rng, ['云启', '华数', '智联', '远景'])}供应商${i + 1}` }));
  const customerInfo = schema(release, 'customer'); ctx.entity = 'customer';
  const customers = Array.from({ length: scenario.counts.customers }, (_, i) => makeRow(customerInfo, i, ctx, { customer_code: `CUS-${2024 + i % 3}-${String(i + 1).padStart(3, '0')}`, customer_name: `${pick(rng, ['华夏', '中科', '东辰', '新城', '明远'])}${pick(rng, ['科技', '信息', '数据', '软件'])}客户${i + 1}`, short_name: `客户${i + 1}`, source_customer_id: i + 1 }));
  const contractInfo = schema(release, 'contract'); ctx.entity = 'contract';
  const contracts = Array.from({ length: scenario.counts.contracts }, (_, i) => {
    const year = 2024 + (i % 3); const no = `CON-${year}-${String(i + 1).padStart(3, '0')}`; const customer = customers[i % customers.length]; const supplier = suppliers[i % suppliers.length];
    const state = year === 2026 ? (i % 5 === 0 ? '草稿' : i % 4 === 0 ? '执行中' : '已完成') : (i % 11 === 0 ? '已取消' : i % 3 ? '已完成' : '执行中');
    const target = scenario.contract_targets[String(year)]; const amountFen = Math.floor((target * 100 / (year === 2026 ? 103 : 87)) * (0.65 + rng() * 0.7)); const changeFen = Math.floor(amountFen * (rng() * 0.05));
    const signedAt = dateFor(year, rng, snapshot);
    return makeRow(contractInfo, i, ctx, { id: `CTR-${i + 1}`, contract_no: no, contract_name: `${pick(rng, scenario.project_names)}合同${i + 1}`, contract_category: pick(rng, scenario.contract_categories), original_amount: money(amountFen), change_amount: money(changeFen), current_amount: money(amountFen + changeFen), signed_amount: money(amountFen), state, customer_code: customer.customer_code, supplier_code: supplier.supplier_code, project_code: `PRJ-${year}-${String(i + 1).padStart(3, '0')}`, signed_at: signedAt, latest_change_at: signedAt, currency: 'CNY', product_line: pick(rng, scenario.project_names) });
  });
  const contracts2026 = contracts.filter(row => row.contract_no.startsWith('CON-2026-'));
  normalizeSignedTotal(contracts2026.filter(row => ['已完成', '执行中'].includes(row.state)), Math.round(scenario.contract_targets['2026'] * 0.6666666667 * 100));
  normalizeSignedTotal(contracts2026.filter(row => !['已完成', '执行中'].includes(row.state)), Math.round(scenario.contract_targets['2026'] * 0.3333333333 * 100));
  const poInfo = schema(release, 'purchase_order'); ctx.entity = 'purchase_order';
  const purchase_orders = Array.from({ length: scenario.counts.purchase_orders }, (_, i) => { const c = contracts[i % contracts.length]; const amount = Math.floor(c.current_amount * 100 * (0.04 + rng() * 0.2)); const paid = Math.floor(amount * (0.2 + rng() * 0.8)); return makeRow(poInfo, i, ctx, { order_no: `PO-${2024 + i % 3}-${String(i + 1).padStart(3, '0')}`, supplier_code: c.supplier_code, contract_no: c.contract_no, project_code: c.project_code, order_amount: money(amount), paid_amount: money(paid), unpaid_amount: money(amount - paid), currency: 'CNY', created_at: c.signed_at, updated_at: c.signed_at, arrived_at: i % 3 ? c.signed_at : null, source_system: pick(rng, scenario.source_systems) }); });
  const data = { ont_supplier: suppliers, ont_customer: customers, ont_contract: contracts, ont_purchase_order: purchase_orders };
  validateRuntimeData({ release, scenario, data }); return data;
}

export function validateRuntimeData({ release, scenario, data }) {
  for (const [name, rows] of Object.entries(data)) { const entity = name.replace(/^ont_/, ''); const { fields, primary } = schema(release, entity); const keys = new Set(); for (const row of rows) { if (keys.has(row[primary])) throw new Error(`${name}: duplicate primary key ${row[primary]}`); keys.add(row[primary]); for (const f of fields) { if (!(f.name in row)) throw new Error(`${name}: missing field ${f.name}`); if (f.type === 'decimal' && typeof row[f.name] !== 'number') throw new Error(`${name}.${f.name}: expected decimal`); } for (const n of Object.keys(row).filter(k => /_at$/.test(k))) if (row[n] && new Date(row[n]) > new Date(scenario.snapshot_at)) throw new Error(`${name}.${n}: exceeds snapshot`); } }
  const suppliers = new Set(data.ont_supplier.map(r => r.supplier_code)); const customers = new Set(data.ont_customer.map(r => r.customer_code)); const contracts = new Map(data.ont_contract.map(r => [r.contract_no, r]));
  for (const c of data.ont_contract) { if (!customers.has(c.customer_code)) throw new Error(`contract.customer_code: unknown ${c.customer_code}`); if (!suppliers.has(c.supplier_code)) throw new Error(`contract.supplier_code: unknown ${c.supplier_code}`); if (c.state !== '已取消' && c.current_amount !== Number((c.original_amount + c.change_amount).toFixed(2))) throw new Error(`contract.current_amount invariant violated`); if (!scenario.contract_states.includes(c.state)) throw new Error(`contract.state: undeclared value ${c.state}`); }
  for (const p of data.ont_purchase_order) { if (!contracts.has(p.contract_no)) throw new Error(`purchase_order.contract_no: unknown ${p.contract_no}`); if (!suppliers.has(p.supplier_code)) throw new Error(`purchase_order.supplier_code: unknown ${p.supplier_code}`); if (Number((p.paid_amount + p.unpaid_amount).toFixed(2)) !== Number(p.order_amount.toFixed(2))) throw new Error('purchase_order payment invariant violated'); }
}

export async function writeRuntimeData({ data, outputDirectory }) { await mkdir(outputDirectory, { recursive: true }); for (const [name, rows] of Object.entries(data)) await writeFile(join(outputDirectory, `${name}.json`), `${JSON.stringify(rows, null, 2)}\n`, 'utf8'); }

if (import.meta.url === `file://${process.argv[1]}`) { const release = JSON.parse(await readFile(process.argv[2] ?? 'docs/superpowers/fixtures/ontology-model-release-demo.json', 'utf8')); const scenario = await loadScenario(process.argv[3] ?? new URL('./business-core-runtime-scenario.json', import.meta.url)); const data = generateRuntimeData({ release, scenario }); await writeRuntimeData({ data, outputDirectory: process.argv[4] ?? 'scripts/celanworksmith/runtime-data' }); }
