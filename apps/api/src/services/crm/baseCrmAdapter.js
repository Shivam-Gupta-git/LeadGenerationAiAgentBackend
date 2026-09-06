/**
 * Base CRM Adapter Interface
 * All specific CRM adapters (HubSpot, Pipedrive, Salesforce) inherit from this base class.
 */
export class BaseCrmAdapter {
  constructor(credentials = {}) {
    this.credentials = credentials;
  }

  /**
   * Sync a lead object to external CRM.
   * @param {Object} lead - Mongoose Lead document or object
   * @returns {Promise<Object>} { success, crmRecordId, provider }
   */
  async syncLead(lead) {
    throw new Error('syncLead method must be implemented by subclass');
  }

  /**
   * Update existing lead status or pipeline stage in CRM.
   * @param {string} crmRecordId
   * @param {string} status
   * @returns {Promise<Object>}
   */
  async updateLeadStatus(crmRecordId, status) {
    throw new Error('updateLeadStatus method must be implemented by subclass');
  }

  /**
   * Sync activity/outreach log to CRM.
   * @param {string} crmRecordId
   * @param {Object} activityLog
   * @returns {Promise<Object>}
   */
  async syncActivityLog(crmRecordId, activityLog) {
    throw new Error('syncActivityLog method must be implemented by subclass');
  }

  /**
   * Test connection to CRM API using credentials.
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async testConnection() {
    throw new Error('testConnection method must be implemented by subclass');
  }
}

export default BaseCrmAdapter;
