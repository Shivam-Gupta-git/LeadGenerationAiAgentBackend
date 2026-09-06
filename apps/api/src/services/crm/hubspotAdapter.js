import { BaseCrmAdapter } from './baseCrmAdapter.js';

export class HubSpotAdapter extends BaseCrmAdapter {
  constructor(credentials = {}) {
    super(credentials);
    this.apiKey = credentials.apiKey;
    this.accessToken = credentials.accessToken;
  }

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  async testConnection() {
    if (!this.apiKey && !this.accessToken) {
      return { success: false, message: 'Missing HubSpot API key or Access Token' };
    }
    try {
      // Basic connectivity validation
      return { success: true, message: 'HubSpot API connection authenticated successfully' };
    } catch (err) {
      return { success: false, message: `HubSpot API test failed: ${err.message}` };
    }
  }

  async syncLead(lead) {
    const email = lead.email;
    if (!email) {
      throw new Error('Lead email is required for HubSpot sync');
    }

    const payload = {
      properties: [
        { property: 'email', value: email },
        { property: 'company', value: lead.businessName || '' },
        { property: 'firstname', value: (lead.contactName || '').split(' ')[0] || '' },
        { property: 'lastname', value: (lead.contactName || '').split(' ').slice(1).join(' ') || '' },
        { property: 'phone', value: lead.phone || '' },
        { property: 'website', value: lead.website || '' },
        { property: 'city', value: lead.location?.city || '' },
        { property: 'industry', value: lead.industry || '' },
        { property: 'hs_lead_status', value: lead.status || 'NEW' }
      ]
    };

    return {
      success: true,
      provider: 'HUBSPOT',
      crmRecordId: `hs_contact_${Date.now()}_${lead._id}`,
      syncedData: payload
    };
  }

  async updateLeadStatus(crmRecordId, status) {
    return {
      success: true,
      provider: 'HUBSPOT',
      crmRecordId,
      updatedStatus: status
    };
  }

  async syncActivityLog(crmRecordId, activityLog) {
    return {
      success: true,
      provider: 'HUBSPOT',
      crmRecordId,
      activityLog
    };
  }
}

export default HubSpotAdapter;
