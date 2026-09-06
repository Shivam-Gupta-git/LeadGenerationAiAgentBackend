import { Lead } from '../models/Lead.js';
import { generateCSV, generateJSON } from '../services/export/exportService.js';

export const exportLeads = async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const { format = 'csv', status, minScore = 0 } = req.query;

    const query = { organizationId };
    if (status) query.status = status.toUpperCase();
    if (minScore > 0) query['score.totalScore'] = { $gte: parseInt(minScore, 10) };

    const leads = await Lead.find(query).sort({ createdAt: -1 });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (format.toLowerCase() === 'json') {
      const jsonOutput = generateJSON(leads);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="leads_export_${timestamp}.json"`);
      return res.status(200).send(jsonOutput);
    }

    // Default to CSV
    const csvOutput = generateCSV(leads);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads_export_${timestamp}.csv"`);
    return res.status(200).send(csvOutput);
  } catch (error) {
    next(error);
  }
};
