/**
 * Tech Stack & Business Widget Detector
 */
const PATTERNS = [
  { name: 'WordPress', regex: /wp-content|wp-includes/i },
  { name: 'Shopify', regex: /cdn\.shopify\.com|Shopify\.theme/i },
  { name: 'Wix', regex: /wix\.com|wixpress/i },
  { name: 'Squarespace', regex: /static1\.squarespace\.com/i },
  { name: 'Webflow', regex: /uploads-ssl\.webflow\.com|webflow\.css/i },
  { name: 'React', regex: /react\.production\.min\.js|__NEXT_DATA__/i },
  { name: 'Next.js', regex: /__NEXT_DATA__/i },
  { name: 'WooCommerce', regex: /woocommerce/i },
  { name: 'Calendly', regex: /calendly\.com/i },
  { name: 'Mindbody', regex: /mindbodyonline\.com/i },
  { name: 'Toast POS', regex: /toasttab\.com/i },
  { name: 'DoorDash', regex: /doordash\.com/i },
  { name: 'UberEats', regex: /ubereats\.com/i },
  { name: 'Google Analytics', regex: /googletagmanager\.com|google-analytics\.com/i },
  { name: 'Facebook Pixel', regex: /connect\.facebook\.net/i },
];

/**
 * Detect technologies and business tools from raw HTML string
 * @param {string} html
 * @returns {Array<string>} Detected technology names
 */
export const detectTechStack = (html) => {
  if (!html || typeof html !== 'string') return [];
  const detected = [];

  for (const { name, regex } of PATTERNS) {
    if (regex.test(html)) {
      detected.push(name);
    }
  }

  return Array.from(new Set(detected));
};
