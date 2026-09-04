import {
  AnalysisRequest,
  DeFiRiskAssessmentReport,
  NetworkOverviewResponse,
  TelegraphMinerIntegration,
  TelegraphSubnetResponseEvent,
} from '../types/index.ts';

// A single analysis may dispatch several paid Telegraph Engine intents. The
// backend serializes x402 requests to avoid settlement/nonce collisions, so the
// browser timeout must cover the complete multi-intent operation, not one call.
const API_TIMEOUT_MS = 120000;

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = API_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s while waiting for Telegraph Engine intelligence.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export class TelegraphGuardianApiClient {
  public async getOverview(): Promise<NetworkOverviewResponse> {
    const res = await fetchWithTimeout('/api/telegraph/overview', {}, 20000);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Failed to fetch Telegraph network overview (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.data;
  }

  public async analyzeTarget(req: AnalysisRequest): Promise<DeFiRiskAssessmentReport> {
    const res = await fetchWithTimeout('/api/telegraph/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `DeFi Guardian analysis failed (HTTP ${res.status})`);
    }

    const data = await res.json();
    if (!data.success || !data.data) {
      throw new Error(data.error || 'Invalid or malformed analysis report received from backend.');
    }

    return data.data;
  }

  public async getMiners(): Promise<TelegraphMinerIntegration[]> {
    const res = await fetchWithTimeout('/api/telegraph/miners', {}, 20000);
    if (!res.ok) {
      throw new Error(`Failed to fetch miners (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.data;
  }

  public async getLiveEvents(): Promise<TelegraphSubnetResponseEvent[]> {
    const res = await fetchWithTimeout('/api/telegraph/events', {}, 20000);
    if (!res.ok) {
      throw new Error(`Failed to fetch live subnet events (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.data;
  }
}

export const guardianApi = new TelegraphGuardianApiClient();
