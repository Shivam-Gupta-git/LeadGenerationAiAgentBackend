/**
 * Server-Sent Events (SSE) Manager
 * Manages live unidirectional HTTP streaming connections per Organization.
 */
class SSEManager {
  constructor() {
    // Map<organizationId, Set<Express.Response>>
    this.clients = new Map();

    // Start 25-second heartbeat to keep connections alive through proxies/load balancers
    this.startHeartbeat();
  }

  addClient(organizationId, res) {
    if (!this.clients.has(organizationId)) {
      this.clients.set(organizationId, new Set());
    }

    const orgClients = this.clients.get(organizationId);
    orgClients.add(res);

    // Initial connection acknowledgement event
    res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString(), status: 'active' })}\n\n`);

    // Clean up when client closes connection
    res.on('close', () => {
      orgClients.delete(res);
      if (orgClients.size === 0) {
        this.clients.delete(organizationId);
      }
    });
  }

  /**
   * Broadcast an event to all connected clients in an Organization.
   */
  broadcastToOrganization(organizationId, eventType, data = {}) {
    const orgClients = this.clients.get(organizationId);
    if (!orgClients || orgClients.size === 0) return 0;

    const payload = `event: ${eventType}\ndata: ${JSON.stringify({ ...data, timestamp: new Date().toISOString() })}\n\n`;
    let deliveredCount = 0;

    for (const res of orgClients) {
      try {
        res.write(payload);
        deliveredCount++;
      } catch (err) {
        orgClients.delete(res);
      }
    }

    return deliveredCount;
  }

  /**
   * Heartbeat to prevent HTTP socket timeouts.
   */
  startHeartbeat() {
    setInterval(() => {
      for (const [orgId, orgClients] of this.clients.entries()) {
        for (const res of orgClients) {
          try {
            res.write(': keep-alive ping\n\n');
          } catch (err) {
            orgClients.delete(res);
          }
        }
      }
    }, 25000);
  }
}

export const sseManager = new SSEManager();
export default sseManager;
