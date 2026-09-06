/**
 * Disposable & temporary email domain blocklist
 */
export const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'trashmail.com',
  'sharklasers.com',
  'yopmail.com',
  'dispostable.com',
  'getairmail.com',
  'maildrop.cc',
  'throwawaymail.com',
  'temp-mail.org',
  'generator.email',
  'mytrashmail.com',
  'fakeinbox.com',
  'crazymailing.com',
  'binkmail.com',
  'safetymail.info',
]);

export const isDisposableDomain = (domain) => {
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase().trim());
};
