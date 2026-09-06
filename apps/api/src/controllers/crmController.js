import { Organization } from '../models/Organization.js';
import { syncLeadToCrm, testCrmCredentials } from '../services/crm/crmSyncService.js';

export const getCrmConfig = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.user.organizationId);
    const crmSettings = org?.settings?.crmIntegration || {
      provider: 'HUBSPOT',
      enabled: false,
      credentials: {}
    };

    return res.status(200).json({
      success: true,
      data: crmSettings
    });
  } catch (error) {
    next(error);
  }
};

export const updateCrmConfig = async (req, res, next) => {
  try {
    const { provider = 'HUBSPOT', enabled = true, credentials = {} } = req.body;
    const org = await Organization.findById(req.user.organizationId);

    if (!org.settings) org.settings = {};
    org.settings.crmIntegration = {
      provider: provider.toUpperCase(),
      enabled,
      credentials,
      updatedAt: new Date()
    };

    await org.save();

    return res.status(200).json({
      success: true,
      message: 'CRM integration settings updated successfully',
      data: org.settings.crmIntegration
    });
  } catch (error) {
    next(error);
  }
};

export const syncLeadHandler = async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const organizationId = req.user.organizationId;

    const result = await syncLeadToCrm(leadId, organizationId);

    return res.status(200).json({
      success: true,
      message: `Lead ${leadId} synced to CRM successfully`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const testCrmHandler = async (req, res, next) => {
  try {
    const { provider = 'HUBSPOT', credentials = {} } = req.body;
    const result = await testCrmCredentials(provider, credentials);

    return res.status(200).json({
      success: result.success,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
