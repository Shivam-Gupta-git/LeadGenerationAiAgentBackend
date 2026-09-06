import assert from 'assert';
import { normalizeBusinessName, calculateJaroWinkler } from '../src/services/discovery/deduplicationEngine.js';
import { calculateLeadScore, SCORING_RULES } from '../src/services/ai/hybridScoringEngine.js';
import { computeFactHash, selectModelTier } from '../src/services/ai/aiCostManager.js';
import { isDisposableDomain } from '../src/services/verification/disposableDomains.js';
import { verifySyntax } from '../src/services/verification/emailVerificationService.js';
import { evaluateLeadConfidence } from '../src/services/ai/humanSafetyEngine.js';

console.log('====================================================');
console.log('RUNNING PHASE B24: AUTOMATED BACKEND UNIT TEST SUITE');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

const test = (description, testFn) => {
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`  ✓ PASSED: ${description}`);
  } catch (err) {
    console.error(`  ✕ FAILED: ${description}`);
    console.error(`    Error: ${err.message}\n`);
  }
};

// 1. Deduplication Engine Tests
test('normalizeBusinessName strips corporate suffixes (LLC, Inc, Corp, Solutions)', () => {
  assert.strictEqual(normalizeBusinessName('Acme Solutions LLC'), 'acme');
  assert.strictEqual(normalizeBusinessName('  Apex Tech Inc.  '), 'apextech');
  assert.strictEqual(normalizeBusinessName('Global Services Corp'), 'global');
});

test('calculateJaroWinkler computes accurate string similarity', () => {
  const similarityHigh = calculateJaroWinkler('Acme Marketing', 'Acme Marketing LLC');
  assert.ok(similarityHigh > 0.85, `Expected similarity > 0.85, got ${similarityHigh}`);

  const similarityLow = calculateJaroWinkler('Acme Marketing', 'Banana Republic');
  assert.ok(similarityLow < 0.5, `Expected similarity < 0.5, got ${similarityLow}`);
});

// 2. Lead Scoring Engine Tests
test('calculateLeadScore correctly calculates score rationale and grade', () => {
  const leadData = {
    website: { exists: true, url: 'https://example.com', hasSsl: true, hasOnlineBooking: false },
    contact: { email: 'contact@example.com', phone: '+15551234567' },
    businessProfile: { reviewCount: 65, rating: 4.8 },
    social: { instagram: '@acme' }
  };

  const scoreResult = calculateLeadScore(leadData);
  assert.ok(scoreResult.score > 40, `Expected score > 40, got ${scoreResult.score}`);
  assert.ok(Array.isArray(scoreResult.scoringRationale), 'scoringRationale must be an array');
  assert.ok(scoreResult.scoringRationale.length > 0, 'scoringRationale must contain breakdown items');
});

// 3. Email Hygiene Tests
test('verifySyntax and isDisposableDomain flag email formats correctly', () => {
  assert.strictEqual(verifySyntax('valid.user@company.com'), true);
  assert.strictEqual(verifySyntax('invalid-email-format'), false);
  assert.strictEqual(isDisposableDomain('mailinator.com'), true);
  assert.strictEqual(isDisposableDomain('10minutemail.com'), true);
  assert.strictEqual(isDisposableDomain('acme.com'), false);
});

// 4. AI Cost Management & Hashing Tests
test('computeFactHash generates consistent MD5 hashes for scraped facts', () => {
  const facts1 = { title: 'Acme Agency', city: 'New York' };
  const facts2 = { title: 'Acme Agency', city: 'New York' };
  assert.strictEqual(computeFactHash(facts1), computeFactHash(facts2));
});

test('selectModelTier assigns Tier 1 for simple tasks and Tier 2 for pitch copy', () => {
  const tier1 = selectModelTier('FACT_EXTRACTION');
  assert.strictEqual(tier1.tier, 'TIER_1');

  const tier2 = selectModelTier('PITCH_GENERATION');
  assert.strictEqual(tier2.tier, 'TIER_2');
});

// 5. Human Safety Engine Tests
test('evaluateLeadConfidence assigns correct review requirements based on confidence score', () => {
  const highConf = evaluateLeadConfidence({ confidenceScore: 90 });
  assert.strictEqual(highConf.requiresReview, false);

  const modConf = evaluateLeadConfidence({ confidenceScore: 75 });
  assert.strictEqual(modConf.requiresReview, true);

  const lowConf = evaluateLeadConfidence({ confidenceScore: 40 });
  assert.strictEqual(lowConf.requiresReview, true);
  assert.strictEqual(lowConf.reviewReason, 'LOW_CONFIDENCE');
});

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('====================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
