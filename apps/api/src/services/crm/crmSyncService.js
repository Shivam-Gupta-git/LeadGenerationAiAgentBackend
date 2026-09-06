import { Organization } from '../../models/Organization.js';
import { Lead } from '../../models/Lead.js';
import { HubSpotAdapter } from './hubspotAdapter.js';
import { PipedriveAdapter } from './pipedriveAdapter.js';

export const getCrmAdapter = async (organizationId, overrideConfig = null) => {
  let crmProvider = 'HUBSPOT';
  let credentials = {};

  if (overrideConfig) {
    crmProvider = overrideConfig.provider || 'HUBSPOT';
    credentials = overrideConfig.credentials || {};
  } else {
    const org = await Organization.findById(organizationId);
    if (org && org.settings?.crmIntegration) {
      crmProvider = org.settings.crmIntegration.provider || 'HUBSPOT';
      credentials = org.settings.crmIntegration.credentials || {};
    }
  }

  switch (crmProvider.toUpperCase()) {
    case 'HUBSPOT':
      return new HubSpotAdapter(credentials);
    case 'PIPEDRIVE':
      return new PipedriveAdapter(credentials);
    default:
      return new HubSpotAdapter(credentials);
  }
};

export const syncLeadToCrm = async (leadId, organizationId) => {
  const lead = await Lead.findOne({ _id: leadId, organizationId });
  if (!lead) {
    throw new Error(`Lead ${leadId} not found for organization ${organizationId}`);
  }

  const adapter = await getCrmAdapter(organizationId);
  const syncResult = await adapter.syncLead(lead);

  // Store external CRM reference ID in lead metadata
  if (!lead.customFields) lead.customFields = new Map();
  lead.customFields.set('crmRecordId', syncResult.crmRecordId);
  lead.customFields.set('crmProvider', syncResult.provider);
  await lead.save();

  return syncResult;
};

export const testCrmCredentials = async (provider, credentials) => {
  let adapter = null;
  if (provider.toUpperCase() === 'PIPEDRIVE') {
    adapter = new PipedriveAdapter(credentials);
  } else {
    adapter = new HubSpotAdapter(credentials);
  }
  return await adapter.testConnection();
};

export default {
  getCrmAdapter,
  syncLeadToCrm,
  testCrmCredentials
};
