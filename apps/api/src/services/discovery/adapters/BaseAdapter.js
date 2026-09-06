export class BaseAdapter {
  constructor(name) {
    if (new.target === BaseAdapter) {
      throw new TypeError('Cannot construct BaseAdapter instances directly');
    }
    this.name = name;
  }

  /**
   * Discover businesses given targeting criteria
   * @param {Object} params
   * @param {string} params.country
   * @param {string} params.city
   * @param {string} params.category
   * @param {number} [params.limit=50]
   * @returns {Promise<Array<Object>>} Standardized business lead objects
   */
  async discover(_params) {
    throw new Error('Method discover() must be implemented by subclass');
  }

  /**
   * Normalize raw business payload into standard schema properties
   */
  normalize(rawItem) {
    const businessName = (rawItem.name || rawItem.businessName || '').trim();
    const city = (rawItem.city || '').trim();
    const phone = (rawItem.phone || '').trim();
    const cleanName = businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanCity = city.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const normalizedKey = `${cleanName}_${cleanCity}_${cleanPhone}`;

    return {
      businessName,
      normalizedKey,
      category: rawItem.category || 'General Business',
      subcategory: rawItem.subcategory || null,
      description: rawItem.description || null,
      location: {
        country: rawItem.country || 'India',
        state: rawItem.state || null,
        city: city || 'Unknown City',
        address: rawItem.address || null,
        latitude: rawItem.latitude ? Number(rawItem.latitude) : null,
        longitude: rawItem.longitude ? Number(rawItem.longitude) : null,
      },
      contact: {
        phone: phone || null,
        email: rawItem.email ? rawItem.email.toLowerCase().trim() : null,
        isEmailVerified: false,
        verificationStatus: 'UNVERIFIED',
        whatsapp: rawItem.whatsapp || null,
        decisionMakerName: rawItem.decisionMakerName || null,
        decisionMakerTitle: rawItem.decisionMakerTitle || null,
      },
      website: {
        url: rawItem.website || rawItem.url || null,
        exists: Boolean(rawItem.website || rawItem.url),
        hasSsl: false,
        isMobileFriendly: false,
        techStack: [],
      },
      social: {
        instagram: rawItem.instagram || null,
        facebook: rawItem.facebook || null,
        linkedin: rawItem.linkedin || null,
        youtube: rawItem.youtube || null,
        twitter: rawItem.twitter || null,
      },
      businessProfile: {
        rating: rawItem.rating ? Number(rawItem.rating) : null,
        reviewCount: rawItem.reviewCount ? Number(rawItem.reviewCount) : 0,
        priceRange: rawItem.priceRange || null,
        googleMapsUrl: rawItem.googleMapsUrl || null,
      },
      status: 'DISCOVERED',
      tags: rawItem.tags || [],
      source: this.name,
      sourceId: rawItem.sourceId || rawItem.placeId || null,
    };
  }
}
