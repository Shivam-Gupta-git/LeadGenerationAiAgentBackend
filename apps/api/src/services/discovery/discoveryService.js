import { GoogleMapsAdapter } from './adapters/GoogleMapsAdapter.js';
import { CSVImportAdapter } from './adapters/CSVImportAdapter.js';
import { DirectoryAdapter } from './adapters/DirectoryAdapter.js';
import { ManualImportAdapter } from './adapters/ManualImportAdapter.js';
import { filterDuplicates } from './deduplicationEngine.js';
import { Lead } from '../../models/Lead.js';
import { Campaign } from '../../models/Campaign.js';
import { AppError } from '../../utils/AppError.js';

const adapters = {
  GOOGLE_MAPS: new GoogleMapsAdapter(),
  CSV_IMPORT: new CSVImportAdapter(),
  DIRECTORY: new DirectoryAdapter(),
  MANUAL_IMPORT: new ManualImportAdapter(),
};

/**
 * Execute discovery workflow for given organization & params
 */
export const runDiscovery = async ({ organizationId, campaignId, source = 'GOOGLE_MAPS', params }) => {
  const adapter = adapters[source];
  if (!adapter) {
    throw new AppError(`Unsupported discovery source: '${source}'`, 400, 'UNSUPPORTED_SOURCE');
  }

  // 1. Fetch raw business leads from source adapter
  const discoveredLeads = await adapter.discover(params);

  // 2. Filter out duplicates using deduplication engine
  const { uniqueLeads, duplicateLeads } = await filterDuplicates(organizationId, discoveredLeads);

  if (uniqueLeads.length === 0) {
    return {
      discoveredCount: discoveredLeads.length,
      savedCount: 0,
      duplicateCount: duplicateLeads.length,
      leads: [],
    };
  }

  // 3. Attach organizationId and campaignId to all unique leads
  const leadsToInsert = uniqueLeads.map((lead) => ({
    ...lead,
    organizationId,
    campaignId: campaignId || null,
  }));

  // 4. Batch insert unique leads into MongoDB
  const savedLeads = await Lead.insertMany(leadsToInsert);

  // 5. Update Campaign stats if campaignId was supplied
  if (campaignId) {
    await Campaign.findByIdAndUpdate(campaignId, {
      $inc: { 'stats.discovered': savedLeads.length },
    });
  }

  return {
    discoveredCount: discoveredLeads.length,
    savedCount: savedLeads.length,
    duplicateCount: duplicateLeads.length,
    leads: savedLeads,
  };
};
