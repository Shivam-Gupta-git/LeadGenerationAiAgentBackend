import { BaseAdapter } from './BaseAdapter.js';

export class GoogleMapsAdapter extends BaseAdapter {
  constructor() {
    super('GOOGLE_MAPS');
  }

  /**
   * Discover businesses by city and category
   */
  async discover({ country = 'India', city, category, limit = 20 }) {
    if (!city || !category) {
      throw new Error('City and Category are required for Google Maps discovery');
    }

    // High quality sample businesses for test/dev discovery runs
    const samplePrefixes = ['Apex', 'Royal', 'Grand', 'Urban', 'Elite', 'Prime', 'Signature', 'Vibrant', 'Zenith', 'Crown'];
    const results = [];

    const countToGenerate = Math.min(limit, 50);

    for (let i = 1; i <= countToGenerate; i++) {
      const prefix = samplePrefixes[i % samplePrefixes.length];
      const businessName = `${prefix} ${category.charAt(0).toUpperCase() + category.slice(1)} ${city}`;
      const hasWebsite = i % 3 !== 0; // 66% have website, 33% missing website (great leads for agency pitch!)
      
      const rawLead = {
        sourceId: `gmaps_place_${city.toLowerCase()}_${category.toLowerCase()}_${i}`,
        name: businessName,
        category: category,
        country: country,
        city: city,
        address: `${i * 12} Main Road, Sector ${i % 10 + 1}, ${city}`,
        phone: `+91 ${9800000000 + i * 111}`,
        email: i % 2 === 0 ? `contact@${cleanDomain(businessName)}.com` : null,
        website: hasWebsite ? `https://www.${cleanDomain(businessName)}.com` : null,
        rating: Number((3.8 + (i % 12) * 0.1).toFixed(1)),
        reviewCount: 45 + i * 23,
        googleMapsUrl: `https://maps.google.com/?q=${encodeURIComponent(businessName)}`,
        tags: [category.toLowerCase(), city.toLowerCase(), hasWebsite ? 'has-website' : 'no-website'],
      };

      results.push(this.normalize(rawLead));
    }

    return results;
  }
}

function cleanDomain(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}
