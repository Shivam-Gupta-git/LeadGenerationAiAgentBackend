import { BaseAdapter } from './BaseAdapter.js';

export class ManualImportAdapter extends BaseAdapter {
  constructor() {
    super('MANUAL_IMPORT');
  }

  /**
   * Normalize single or multiple manual lead payloads
   */
  async discover({ leads = [] }) {
    const leadList = Array.isArray(leads) ? leads : [leads];
    return leadList.map((item, idx) => {
      const mapped = {
        sourceId: item.sourceId || `manual_${Date.now()}_${idx}`,
        name: item.businessName || item.name || 'Manual Business',
        category: item.category || 'General',
        country: item.country || item.location?.country || 'India',
        city: item.city || item.location?.city || 'Unknown City',
        address: item.address || item.location?.address || null,
        phone: item.phone || item.contact?.phone || null,
        email: item.email || item.contact?.email || null,
        website: item.website || item.website?.url || null,
        tags: item.tags || ['manual-entry'],
      };

      return this.normalize(mapped);
    });
  }
}
