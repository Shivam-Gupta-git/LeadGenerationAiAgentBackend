import { BaseAdapter } from './BaseAdapter.js';

export class CSVImportAdapter extends BaseAdapter {
  constructor() {
    super('CSV_IMPORT');
  }

  /**
   * Parse array of raw CSV row objects into normalized leads
   * @param {Object} params
   * @param {Array<Object>} params.rows - Array of JSON objects representing CSV rows
   * @returns {Promise<Array<Object>>}
   */
  async discover({ rows = [] }) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('No valid CSV rows provided for import');
    }

    return rows.map((row, index) => {
      const mapped = {
        sourceId: row.sourceId || `csv_import_${Date.now()}_${index}`,
        name: row.businessName || row.name || row.Company || row.Business || 'Unnamed Business',
        category: row.category || row.Category || 'General Industry',
        country: row.country || row.Country || 'India',
        city: row.city || row.City || 'Unknown City',
        address: row.address || row.Address || null,
        phone: row.phone || row.Phone || row.Mobile || null,
        email: row.email || row.Email || null,
        website: row.website || row.Website || row.URL || null,
        rating: row.rating ? Number(row.rating) : null,
        reviewCount: row.reviewCount ? Number(row.reviewCount) : 0,
        tags: row.tags ? (typeof row.tags === 'string' ? row.tags.split(',') : row.tags) : ['csv-imported'],
      };

      return this.normalize(mapped);
    });
  }
}
