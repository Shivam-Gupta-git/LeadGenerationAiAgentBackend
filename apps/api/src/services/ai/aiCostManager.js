import crypto from 'crypto';
import getRedisClient from '../../config/redis.js';

const memoryCache = new Map();

// Token Cost Estimates per 1,000,000 Tokens (USD)
const TIER_PRICING = {
  'gemini-1.5-flash': { inputPerM: 0.075, outputPerM: 0.30 },
  'gpt-4o-mini': { inputPerM: 0.15, outputPerM: 0.60 },
  'gemini-1.5-pro': { inputPerM: 1.25, outputPerM: 5.00 },
  'gpt-4o': { inputPerM: 2.50, outputPerM: 10.00 }
};

/**
 * Computes MD5 hash of raw scraped business data to detect duplicate inputs.
 */
export const computeFactHash = (scrapedFacts) => {
  const normalizedString = typeof scrapedFacts === 'string'
    ? scrapedFacts.trim().toLowerCase()
    : JSON.stringify(scrapedFacts || {}).toLowerCase();
  
  return crypto.createHash('md5').update(normalizedString).digest('hex');
};

/**
 * Retrieves cached AI analysis using MD5 fact hash.
 */
export const getCachedAnalysis = async (factHash) => {
  try {
    const redis = getRedisClient();
    const cached = await redis.get(`ai:fact_cache:${factHash}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    // Fallback to memory cache if Redis is offline
    if (memoryCache.has(factHash)) {
      return memoryCache.get(factHash);
    }
  }
  return null;
};

/**
 * Stores AI analysis result in cache for 7 days (604,800 seconds).
 */
export const setCachedAnalysis = async (factHash, analysisOutput, ttlSeconds = 604800) => {
  try {
    const redis = getRedisClient();
    await redis.setex(`ai:fact_cache:${factHash}`, ttlSeconds, JSON.stringify(analysisOutput));
  } catch (err) {
    memoryCache.set(factHash, analysisOutput);
  }
};

/**
 * Model Tier Router Strategy
 * Tier 1 (Fast / Cheap): Fact extraction, tech stack tagging, sentiment classification
 * Tier 2 (Deep / Reasoning): Pitch generation, cold call scripting, complex audit reasoning
 */
export const selectModelTier = (taskType) => {
  const TIER_1_TASKS = ['FACT_EXTRACTION', 'TECH_TAGGING', 'SENTIMENT_ANALYSIS', 'DEDUPLICATION', 'EMAIL_VERIFICATION'];
  
  if (TIER_1_TASKS.includes(taskType.toUpperCase())) {
    return {
      tier: 'TIER_1',
      primaryModel: 'gemini-1.5-flash',
      fallbackModel: 'gpt-4o-mini',
      description: 'Tier 1 (Fast & Token Efficient)'
    };
  }

  return {
    tier: 'TIER_2',
    primaryModel: 'gemini-1.5-pro',
    fallbackModel: 'gpt-4o',
    description: 'Tier 2 (Deep Reasoning & Sales Copywriting)'
  };
};

/**
 * Calculates estimated USD cost for an LLM call.
 */
export const calculateTokenCost = (modelName, promptTokens = 0, completionTokens = 0) => {
  const pricing = TIER_PRICING[modelName] || TIER_PRICING['gemini-1.5-flash'];
  const inputCost = (promptTokens / 1000000) * pricing.inputPerM;
  const outputCost = (completionTokens / 1000000) * pricing.outputPerM;
  return parseFloat((inputCost + outputCost).toFixed(6));
};

export default {
  computeFactHash,
  getCachedAnalysis,
  setCachedAnalysis,
  selectModelTier,
  calculateTokenCost
};
