import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';

export const authenticate = (req, _res, next) => {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  } else if (req.query && (req.query.token || req.query.access_token)) {
    token = req.query.token || req.query.access_token;
  }

  if (!token) {
    // In dev mode, set default fallback admin user context to prevent blocking unauthenticated browser tools/SSE
    if (process.env.NODE_ENV !== 'production') {
      req.user = { userId: 'dev_user_1', role: 'ADMIN', organizationId: req.headers['x-organization-id'] || 'org_pro_99' };
      req.organizationId = req.headers['x-organization-id'] || 'org_pro_99';
      return next();
    }
    return next(new AppError('Authentication required. Missing token.', 401, 'UNAUTHORIZED'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    req.organizationId = payload.organizationId || req.headers['x-organization-id'] || 'org_pro_99';
    next();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      req.user = { userId: 'dev_user_1', role: 'ADMIN', organizationId: 'org_pro_99' };
      req.organizationId = 'org_pro_99';
      return next();
    }
    return next(new AppError('Invalid or expired access token.', 401, 'INVALID_TOKEN'));
  }
};

export const protect = authenticate;

export const authorizeRoles = (...roles) => {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Forbidden. Insufficient permissions.', 403, 'FORBIDDEN'));
    }
    next();
  };
};

export const restrictTo = authorizeRoles;

export const tenantGuard = (req, _res, next) => {
  const resourceOrgId = req.params.organizationId || req.body.organizationId || req.query.organizationId;
  if (resourceOrgId && req.user && req.user.organizationId !== resourceOrgId) {
    return next(new AppError('Forbidden. Cross-tenant access is prohibited.', 403, 'TENANT_VIOLATION'));
  }
  next();
};

export default {
  authenticate,
  protect,
  authorizeRoles,
  restrictTo,
  tenantGuard
};
