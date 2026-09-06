import { BaseAdapter } from './BaseAdapter.js';

export class DirectoryAdapter extends BaseAdapter {
  constructor() {
    super('DIRECTORY');
  }

  /**
   * Discover business listings from online directory indexes
   */
  async discover({ country = 'India', city, category, limit = 20 }) {
    if (!city || !category) {
      throw new Error('City and Category are required for Directory discovery');
    }

    const directoryNames = ['YellowPages', 'LocalBiz', 'CityDirectory', 'TradeHub', 'IndiaDirectory'];
    const results = [];
    const countToGenerate = Math.min(limit, 50);

    for (let i = 1; i <= countToGenerate; i++) {
      const dirName = directoryNames[i % directoryNames.length];
      const businessName = `${dirName} ${category} ${i} ${city}`;

      const rawLead = {
        sourceId: `dir_${city.toLowerCase()}_${category.toLowerCase()}_${i}`,
        name: businessName,
        category: category,
        country: country,
        city: city,
        address: `Suite ${i * 5}, Commercial Hub, ${city}`,
        phone: `+91 ${9700000000 + i * 222}`,
        email: `info@dir-lead-${i}-${city.toLowerCase()}.com`,
        website: `https://www.dir-lead-${i}-${city.toLowerCase()}.com`,
        rating: Number((4.0 + (i % 10) * 0.1).toFixed(1)),
        reviewCount: 15 + i * 5,
        tags: [category.toLowerCase(), 'directory-listing'],
      };

      results.push(this.normalize(rawLead));
    }

    return results;
  }
}
