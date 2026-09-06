import sseManager from '../services/events/sseManager.js';

export const streamEvents = (req, res) => {
  const organizationId = req.user?.organizationId || 'org_pro_99';

  // Set mandatory SSE Headers via setHeader so Express CORS headers are preserved
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Explicitly ensure CORS headers on SSE stream response
  const origin = req.headers.origin || 'http://localhost:5173';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  res.status(200);

  // Send initial connection payload
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE Event Stream Connected', timestamp: new Date().toISOString() })}\n\n`);

  sseManager.addClient(organizationId, res);
};

export const triggerTestEvent = (req, res) => {
  const organizationId = req.user.organizationId;
  const { eventType = 'test_event', payload = {} } = req.body;

  const deliveredCount = sseManager.broadcastToOrganization(organizationId, eventType, payload);

  return res.status(200).json({
    success: true,
    message: `Event '${eventType}' broadcasted to ${deliveredCount} active SSE clients`,
    deliveredCount
  });
};
