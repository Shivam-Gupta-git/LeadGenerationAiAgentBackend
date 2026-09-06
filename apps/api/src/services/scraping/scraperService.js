import { getStealthHeaders } from './userAgentRotator.js';
import { proxyRotator } from './proxyRotator.js';

/**
 * High-performance HTML scraper & contact metadata extractor
 * @param {string} url - Target website URL
 * @returns {Promise<Object>} Extracted metadata & tech signals
 */
export const scrapeWebsite = async (targetUrl) => {
  if (!targetUrl) {
    throw new Error('URL is required for scraping');
  }

  let formattedUrl = targetUrl.trim();
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = `https://${formattedUrl}`;
  }

  const result = {
    url: formattedUrl,
    exists: false,
    statusCode: null,
    hasSsl: formattedUrl.startsWith('https://'),
    title: null,
    metaDescription: null,
    emailsFound: [],
    phonesFound: [],
    socialLinks: {
      instagram: null,
      facebook: null,
      linkedin: null,
      twitter: null,
      youtube: null,
    },
    hasContactForm: false,
    hasOnlineBooking: false,
    techStack: [],
    scrapedAt: new Date().toISOString(),
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const headers = getStealthHeaders();
    const response = await fetch(formattedUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    result.statusCode = response.status;
    result.exists = response.ok || response.status < 400;

    if (!result.exists) {
      return result;
    }

    const html = await response.text();

    // Limit memory usage by capping processed HTML at 2MB
    const sanitizedHtml = html.slice(0, 2000000);

    // 1. Extract Title & Meta Description
    const titleMatch = sanitizedHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) result.title = titleMatch[1].trim();

    const descMatch = sanitizedHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (descMatch) result.metaDescription = descMatch[1].trim();

    // 2. Extract Contact Emails via RegEx
    const emailMatches = sanitizedHtml.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const validEmails = Array.from(new Set(emailMatches))
      .filter((email) => !email.endsWith('.png') && !email.endsWith('.jpg') && !email.includes('wixpress'));
    result.emailsFound = validEmails.slice(0, 5);

    // 3. Extract Social Media Links
    const socialMatches = {
      instagram: /https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+/i,
      facebook: /https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9_.]+/i,
      linkedin: /https?:\/\/(www\.)?linkedin\.com\/(company|in)\/[a-zA-Z0-9_-]+/i,
      twitter: /https?:\/\/(www\.)?(twitter|x)\.com\/[a-zA-Z0-9_]+/i,
      youtube: /https?:\/\/(www\.)?youtube\.com\/[a-zA-Z0-9_/@]+/i,
    };

    for (const [platform, regex] of Object.entries(socialMatches)) {
      const match = sanitizedHtml.match(regex);
      if (match) result.socialLinks[platform] = match[0];
    }

    // 4. Tech Stack Signals
    if (sanitizedHtml.includes('wp-content')) result.techStack.push('WordPress');
    if (sanitizedHtml.includes('Shopify.theme')) result.techStack.push('Shopify');
    if (sanitizedHtml.includes('wix.com')) result.techStack.push('Wix');
    if (sanitizedHtml.includes('squarespace')) result.techStack.push('Squarespace');
    if (sanitizedHtml.includes('calendly.com') || sanitizedHtml.includes('mindbody')) {
      result.hasOnlineBooking = true;
      result.techStack.push('Online Booking Widget');
    }
    if (sanitizedHtml.includes('form') || sanitizedHtml.includes('contact-form')) {
      result.hasContactForm = true;
    }

    return result;
  } catch (error) {
    console.warn(`[Scraper] Failed to fetch ${formattedUrl}:`, error.message);
    result.exists = false;
    return result;
  }
};
