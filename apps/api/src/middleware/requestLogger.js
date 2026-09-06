import crypto from 'crypto';

export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const logData = {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs,
      organizationId: req.user?.organizationId || req.organizationId || null,
      userId: req.user?.id || req.user?._id || null,
      ip: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    if (res.statusCode >= 400) {
      console.error('[HTTP Error]', JSON.stringify(logData));
    } else {
      console.log('[HTTP Request]', JSON.stringify(logData));
    }
  });

  next();
};

export default requestLogger;
