import http from 'http';
import assert from 'assert';
import app from '../src/app.js';

console.log('===========================================================');
console.log('RUNNING PHASE B24: AUTOMATED API INTEGRATION ROUTER SUITE');
console.log('===========================================================\n');

const server = http.createServer(app);

server.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const fetchUrl = (path) => {
    return new Promise((resolve, reject) => {
      http.get(`${baseUrl}${path}`, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
      }).on('error', reject);
    });
  };

  let total = 0;
  let passed = 0;

  const runTest = async (name, fn) => {
    total++;
    try {
      await fn();
      passed++;
      console.log(`  ✓ PASSED: ${name}`);
    } catch (err) {
      console.error(`  ✕ FAILED: ${name}`);
      console.error(`    Error: ${err.message}\n`);
    }
  };

  await runTest('GET / returns HTTP 200 with online status and registered endpoints', async () => {
    const res = await fetchUrl('/');
    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.status, 'online');
    assert.ok(data.endpoints.auth);
    assert.ok(data.endpoints.leads);
    assert.ok(data.endpoints.discovery);
    assert.ok(data.endpoints.scraping);
    assert.ok(data.endpoints.verification);
    assert.ok(data.endpoints.enrichment);
    assert.ok(data.endpoints.knowledge);
    assert.ok(data.endpoints.ai);
    assert.ok(data.endpoints.queues);
    assert.ok(data.endpoints.emailAccounts);
    assert.ok(data.endpoints.sequences);
    assert.ok(data.endpoints.webhooks);
    assert.ok(data.endpoints.crm);
    assert.ok(data.endpoints.events);
    assert.ok(data.endpoints.auditLogs);
    assert.ok(data.endpoints.export);
    assert.ok(data.endpoints.outreach);
  });

  await runTest('GET /health returns HTTP 200 with timestamp', async () => {
    const res = await fetchUrl('/health');
    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.status, 'online');
    assert.ok(data.timestamp);
  });

  await runTest('Favicon GET returns HTTP 204 No Content', async () => {
    const res = await fetchUrl('/favicon.ico');
    assert.strictEqual(res.statusCode, 204);
  });

  await runTest('Unmatched API routes return 404 cleanly via AppError handler', async () => {
    const res = await fetchUrl('/api/v1/invalid-route-name');
    assert.strictEqual(res.statusCode, 404);
  });

  server.close(() => {
    console.log('\n===========================================================');
    console.log(`INTEGRATION TEST SUMMARY: ${passed}/${total} Passed (${Math.round((passed / total) * 100)}%)`);
    console.log('===========================================================');

    if (passed !== total) {
      process.exit(1);
    }
  });
});
