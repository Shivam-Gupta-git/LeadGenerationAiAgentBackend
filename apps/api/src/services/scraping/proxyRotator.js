/**
 * Proxy Rotator Service for Datacenter & Residential IP pools
 */
class ProxyRotator {
  constructor() {
    this.proxyPool = [
      process.env.PROXY_URL_1 || null,
      process.env.PROXY_URL_2 || null,
      process.env.PROXY_URL_3 || null,
    ].filter(Boolean);

    this.currentIndex = 0;
  }

  /**
   * Add a proxy string to the active rotation pool
   * @param {string} proxyUrl e.g. "http://user:pass@proxy.example.com:8080"
   */
  addProxy(proxyUrl) {
    if (proxyUrl && !this.proxyPool.includes(proxyUrl)) {
      this.proxyPool.push(proxyUrl);
    }
  }

  /**
   * Get next rotated proxy URL string or null if pool is empty
   * @returns {string|null}
   */
  getNextProxy() {
    if (this.proxyPool.length === 0) return null;
    const proxy = this.proxyPool[this.currentIndex % this.proxyPool.length];
    this.currentIndex = (this.currentIndex + 1) % this.proxyPool.length;
    return proxy;
  }
}

export const proxyRotator = new ProxyRotator();
