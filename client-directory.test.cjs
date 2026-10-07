const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {test} = require('node:test');
const original = readFileSync('index-HdJXluQP.js', 'utf8');
const source = readFileSync('client-directory.js', 'utf8').split('const CRMServices')[0];
const escapeCSV = original.slice(original.indexOf('function CF('), original.indexOf('function gF('));
const model = vm.runInNewContext(escapeCSV + source + ';({crmText,crmJobs,crmTotals,crmPayload,crmCSV})');
const jobs = [
  {id:'one', name:'Mismo nombre',date:'2026-09-01',total_cents:130000,paid_cents:26000},
  {id:'two', name:'Nombre cambiado',date:'2027-03-01',total_cents:90000,paid_cents:90000},
  {id:'three',name:'Mismo nombre',date:'2027-04-01',total_cents:80000,paid_cents:0},
];
test('search ignores accents and capitalization', () => assert.equal(model.crmText('  ÁLVAREZ  '), 'alvarez'));
test('links by immutable ID across years, not client name', () => {
  assert.equal(JSON.stringify(model.crmJobs({job_ids:['one','two']}, jobs).map(job=>job.id)), '["one","two"]');
});
test('duplicate and stale links never double count or create phantom money', () => {
  const linked = model.crmJobs({job_ids:['one','one','deleted']},jobs);
  assert.equal(linked.length,1); assert.equal(model.crmTotals(linked).pending,104000);
});
test('totals remain exact integer cents and existing records are untouched', () => {
  const before = JSON.stringify(jobs);
  assert.equal(JSON.stringify(model.crmTotals(model.crmJobs({job_ids:['one','two']},jobs))), '{"total":220000,"paid":116000,"pending":104000}');
  assert.equal(JSON.stringify(jobs),before);
});
test('clients without jobs have zero totals', () => assert.equal(model.crmTotals([]).pending,0));
test('payload trims text and deduplicates links without changing unrelated fields', () => {
  const result=model.crmPayload(new Map([['name','  Ejemplo  '],['tax_id','  ABC  '],['email','demo@example.com']]),['one','one']);
  assert.equal(result.name,'Ejemplo'); assert.equal(result.tax_id,'ABC'); assert.equal(result.job_ids.length,1);
  assert.equal('total_cents' in result,false); assert.equal('date' in result,false);
});
test('blank names, malformed emails and field overflow are rejected', () => {
  assert.throws(()=>model.crmPayload(new Map([['name','  ']]),[]),/nombre/);
  assert.throws(()=>model.crmPayload(new Map([['name','Ejemplo'],['email','bad']]),[]),/email/);
  assert.throws(()=>model.crmPayload(new Map([['name','x'.repeat(181)]]),[]),/máximo/);
  assert.throws(()=>model.crmPayload(new Map([['name','Ejemplo'],['notes','x'.repeat(4001)]]),[]),/4000/);
});
test('CSV escapes quotes, newlines and spreadsheet formulas', () => {
  const csv=model.crmCSV([{name:'=HYPERLINK("example")',phone:'+34123456789',notes:'Una\nnota',job_ids:['one']}],jobs);
  assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes('"\'=HYPERLINK(""example"")"'));
  assert.ok(csv.includes('"\'+34123456789"')); assert.ok(csv.includes('"Una\nnota"')); assert.ok(csv.includes('"1040,00"'));
});
