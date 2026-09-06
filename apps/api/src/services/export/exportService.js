/**
 * Export Service for formatting Lead records into CSV and JSON outputs.
 */

export const generateCSV = (leads = []) => {
  const headers = [
    'Lead ID',
    'Business Name',
    'Contact Name',
    'Email',
    'Phone',
    'Website',
    'City',
    'Industry',
    'Status',
    'Total Score',
    'Fit Score',
    'Intent Score',
    'Tech Stack',
    'Created At'
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = leads.map((lead) => {
    const techStackStr = Array.isArray(lead.techStack) ? lead.techStack.join('; ') : '';
    return [
      escapeCSV(lead._id),
      escapeCSV(lead.businessName),
      escapeCSV(lead.contactName),
      escapeCSV(lead.email),
      escapeCSV(lead.phone),
      escapeCSV(lead.website),
      escapeCSV(lead.location?.city),
      escapeCSV(lead.industry),
      escapeCSV(lead.status),
      escapeCSV(lead.score?.totalScore || 0),
      escapeCSV(lead.score?.fitScore || 0),
      escapeCSV(lead.score?.intentScore || 0),
      escapeCSV(techStackStr),
      escapeCSV(new Date(lead.createdAt).toISOString())
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

export const generateJSON = (leads = []) => {
  return JSON.stringify(leads, null, 2);
};

export default {
  generateCSV,
  generateJSON
};
