import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

const profile = { rows: [{ name: 'Reynan Estobo', role: 'Developer' }] };
const projects = { rows: [{ id: 1, title: 'Sample', links: [] }] };
function fakeQuery(sql) {
  if (sql.startsWith('SELECT name')) return Promise.resolve(profile);
  if (sql.startsWith('SELECT p.id')) return Promise.resolve(projects);
  if (sql.startsWith('INSERT')) return Promise.resolve({ rows: [{ id: 7 }] });
  return Promise.resolve({ rows: [] });
}
async function server() {
  const app = createApp({ dbQuery: fakeQuery, sendEmail: async () => {} });
  return new Promise((resolve) => { const instance = app.listen(0, () => resolve(instance)); });
}
test('serves portfolio data and validates contact messages', async () => {
  const instance = await server();
  const base = `http://127.0.0.1:${instance.address().port}`;
  const profileResponse = await fetch(`${base}/api/profile`);
  assert.equal(profileResponse.status, 200);
  assert.equal((await profileResponse.json()).name, 'Reynan Estobo');
  const bad = await fetch(`${base}/api/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
  assert.equal(bad.status, 400);
  const good = await fetch(`${base}/api/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Ada Lovelace', email: 'ada@example.com', subject: 'Project enquiry', message: 'I would like to discuss a website project with you.' }) });
  assert.equal(good.status, 201);
  await new Promise((resolve) => instance.close(resolve));
});
