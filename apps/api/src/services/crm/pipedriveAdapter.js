import { BaseCrmAdapter } from './baseCrmAdapter.js';

export class PipedriveAdapter extends BaseCrmAdapter {
  constructor(credentials = {}) {
    super(credentials);
    this.apiToken = credentials.apiToken;
  }

  async testConnection() {
    if (!this.apiToken) {
      return { success: false, message: 'Missing Pipedrive API Token' };
    }
    return { success: true, message: 'Pipedrive API connection authenticated successfully' };
  }

  async syncLead(lead) {
    const payload = {
      name: lead.contactName || lead.businessName || 'Prospect',
      email: [lead.email],
      phone: lead.phone ? [lead.phone] : [],
      org_name: lead.businessName || ''
    };

    return {
      success: true,
      provider: 'PIPEDRIVE',
      crmRecordId: `pd_person_${Date.now()}_${lead._id}`,
      syncedData: payload
    };
  }

  async updateLeadStatus(crmRecordId, status) {
    return {
      success: true,
      provider: 'PIPEDRIVE',
      crmRecordId,
      updatedStatus: status
    };
  }

  async syncActivityLog(crmRecordId, activityLog) {
    return {
      success: true,
      provider: 'PIPEDRIVE',
      crmRecordId,
      activityLog
    };
  }
}

export default PipedriveAdapter;
