import { Lead } from '../../models/Lead.js';

export const MatchResult = {
  EXACT_DUPLICATE: 'EXACT_DUPLICATE',
  POSSIBLE_DUPLICATE: 'POSSIBLE_DUPLICATE',
  UNIQUE: 'UNIQUE',
};

/**
 * Strip business suffixes (e.g. "pvt ltd", "inc", "llc", "corp") for clean normalization
 */
export function normalizeBusinessName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(pvt|ltd|private|limited|inc|llc|co|corp|corporation|services|enterprises|solutions)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Extract clean root domain from website URL
 */
export function extractRootDomain(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch (_e) {
    return null;
  }
}

/**
 * Jaro-Winkler string similarity calculation (0.0 to 1.0)
 */
export function calculateJaroWinkler(s1, s2) {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const len1 = s1.length;
  const len2 = s2.length;
  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;

  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3.0;

  // Winkler prefix boost
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Deduplicate a batch of discovered lead objects against existing workspace database entries
 * @param {string} organizationId
 * @param {Array<Object>} batchLeads
 * @returns {Promise<{ uniqueLeads: Array<Object>, duplicateLeads: Array<Object> }>}
 */
export const filterDuplicates = async (organizationId, batchLeads) => {
  if (!batchLeads || batchLeads.length === 0) {
    return { uniqueLeads: [], duplicateLeads: [] };
  }

  // 1. Fetch existing workspace leads
  const existingLeads = await Lead.find({ organizationId }).select(
    'businessName normalizedKey location.city contact.phone website.url'
  );

  const existingKeys = new Set(existingLeads.map((l) => l.normalizedKey));
  const existingPhones = new Set(
    existingLeads
      .map((l) => l.contact?.phone)
      .filter(Boolean)
      .map((p) => p.replace(/[^0-9]/g, ''))
  );
  const existingDomains = new Set(
    existingLeads
      .map((l) => extractRootDomain(l.website?.url))
      .filter(Boolean)
  );

  const uniqueLeads = [];
  const duplicateLeads = [];
  const seenInCurrentBatch = new Set();

  for (const lead of batchLeads) {
    const rawName = lead.businessName || lead.name || '';
    const cleanName = normalizeBusinessName(rawName);
    const city = lead.location?.city || lead.city || '';
    const cleanCity = city.toLowerCase().replace(/[^a-z0-9]/g, '');
    const phone = lead.contact?.phone || lead.phone ? (lead.contact?.phone || lead.phone).replace(/[^0-9]/g, '') : null;
    const domain = extractRootDomain(lead.website?.url || lead.website);

    const key = `${cleanName}_${cleanCity}_${phone || ''}`;

    // Exact Duplicate Check
    const isExactKeyDup = existingKeys.has(key) || seenInCurrentBatch.has(key);
    const isPhoneDup = phone && phone.length >= 8 && existingPhones.has(phone);
    const isDomainDup = domain && existingDomains.has(domain);

    if (isExactKeyDup || isPhoneDup || isDomainDup) {
      duplicateLeads.push({
        lead,
        matchType: MatchResult.EXACT_DUPLICATE,
        reason: isExactKeyDup ? 'Normalized Key Match' : isPhoneDup ? 'Phone Match' : 'Domain Match',
      });
      continue;
    }

    // Fuzzy Possible Duplicate Check (Jaro-Winkler > 0.85 in same city)
    let isPossibleDup = false;
    for (const existing of existingLeads) {
      if ((existing.location?.city || '').toLowerCase() === cleanCity) {
        const existingCleanName = normalizeBusinessName(existing.businessName);
        const similarity = calculateJaroWinkler(cleanName, existingCleanName);
        if (similarity >= 0.85) {
          isPossibleDup = true;
          duplicateLeads.push({
            lead,
            matchType: MatchResult.POSSIBLE_DUPLICATE,
            similarityScore: Number(similarity.toFixed(2)),
            matchedWith: existing.businessName,
            reason: `Fuzzy Name Similarity (${Math.round(similarity * 100)}%)`,
          });
          break;
        }
      }
    }

    if (isPossibleDup) continue;

    // Mark as unique & track in batch set
    seenInCurrentBatch.add(key);
    if (phone) existingPhones.add(phone);
    if (domain) existingDomains.add(domain);

    uniqueLeads.push(lead);
  }

  return { uniqueLeads, duplicateLeads };
};
