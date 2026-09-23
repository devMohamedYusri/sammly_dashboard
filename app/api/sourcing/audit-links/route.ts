import { NextRequest, NextResponse } from 'next/server';

const QDRANT_URL = process.env.QDRANT_URL || 'https://ce862da7-a0d3-48e2-9512-21b31eaac3d5.eu-central-1-0.aws.cloud.qdrant.io';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6OWRlMTFkNmYtOTM2My00NjZiLWFkY2YtMGY3MGExNTE1ZGNjIn0.VQ5JiwXooa6Yk-j-DgD2RqcLXjZmLKsyMrSvPEuYAQQ';
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'furniture_catalog_small';
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sammly-backend-p3z7.onrender.com';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
  'Cache-Control': 'no-cache',
};

const SOFT_404_PATTERNS = [
  'page not found',
  '404 not found',
  'product not found',
  'item not found',
  'product is no longer available',
  'item unavailable',
  'sorry, this product is unavailable',
  'الصفحة غير موجودة',
  'عذراً، المنتج غير متوفر',
  'المنتج غير موجود',
  'هذا المنتج غير متوفر حالياً',
  'عذرا، الصفحة غير متوفرة'
];

async function verifyUrl(url: string | null | undefined): Promise<{ isValid: boolean; reason?: string; statusCode?: number }> {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return { isValid: false, reason: 'Missing or empty URL' };
  }

  const cleanUrl = url.trim();
  try {
    const parsed = new URL(cleanUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { isValid: false, reason: 'Invalid URL protocol' };
    }
  } catch {
    return { isValid: false, reason: 'Malformed URL structure' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(cleanUrl, {
      method: 'GET',
      headers: BROWSER_HEADERS,
      signal: controller.signal,
      redirect: 'follow',
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    const status = res.status;
    if (status === 404 || status === 410) {
      return { isValid: false, reason: `HTTP ${status} Not Found`, statusCode: status };
    }
    if (status >= 500) {
      return { isValid: false, reason: `HTTP ${status} Server Error`, statusCode: status };
    }

    // Check redirect destination
    const finalUrl = res.url || cleanUrl;
    try {
      const finalParsed = new URL(finalUrl);
      const path = finalParsed.pathname.replace(/\/+$/, '');
      if (
        path === '' ||
        path === '/en' ||
        path === '/ar' ||
        path === '/eg-en' ||
        path === '/eg-ar' ||
        path.includes('/404') ||
        path.includes('/not-found')
      ) {
        return { isValid: false, reason: 'Redirected to home or 404 page', statusCode: status };
      }
    } catch {
      // Ignore URL parse error
    }

    // Soft-404 check in HTML body
    try {
      const text = await res.text();
      if (text && text.length < 500000) {
        const bodyLower = text.toLowerCase();

        // Homzmart specific soft-404 detection
        if (cleanUrl.includes('homzmart.com')) {
          if (bodyLower.includes('/p/undefined') || bodyLower.includes('"product":null') || bodyLower.includes('<title></title>')) {
            return { isValid: false, reason: 'Soft 404: Product removed on Homzmart', statusCode: status };
          }
        }

        // General empty/404 title tag check
        if (bodyLower.includes('<title></title>') || bodyLower.includes('<title>404') || bodyLower.includes('<title>not found')) {
          return { isValid: false, reason: 'Page title indicates deleted product', statusCode: status };
        }

        for (const pattern of SOFT_404_PATTERNS) {
          if (bodyLower.includes(pattern.toLowerCase())) {
            return { isValid: false, reason: `Soft 404 detected ("${pattern}")`, statusCode: status };
          }
        }
      }
    } catch {
      // Stream reading error is non-fatal if status was 200
    }

    return { isValid: true, statusCode: status };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (errorMsg.includes('aborted') || errorMsg.includes('timeout')) {
      return { isValid: false, reason: 'Request timed out (>7s)' };
    }
    return { isValid: false, reason: `Network error: ${errorMsg}` };
  }
}

async function deleteFromQdrant(pointIds: string[]): Promise<number> {
  if (!pointIds || pointIds.length === 0) return 0;

  try {
    const res = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': QDRANT_API_KEY,
      },
      body: JSON.stringify({ points: pointIds }),
      cache: 'no-store',
    });

    if (res.ok) {
      return pointIds.length;
    }
    const errText = await res.text();
    console.error('[Qdrant Direct Purge Error]:', res.status, errText);
    return 0;
  } catch (err) {
    console.error('[Qdrant Direct Purge Network Error]:', err);
    return 0;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json().catch(() => ({}));
    const { scope = 'page', limit, items = [], speedMode = 'fast', auditMode = 'stale' } = body;
    const effectiveLimit = scope === 'all'
      ? 100000
      : (limit !== undefined && limit !== null && !isNaN(Number(limit)) ? Number(limit) : (scope === 'batch' ? 50 : 24));
    const token = request.headers.get('Authorization') || '';

    // 1. Try Backend Proxy First (Localhost:4000 then Render)
    const tryBackend = async (baseUrl: string) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      try {
        const res = await fetch(`${baseUrl}/api/admin/sourcing/audit-links`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: token } : {}),
          },
          body: JSON.stringify({ scope, limit: effectiveLimit, items, speedMode, auditMode }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return res;
      } catch (e) {
        clearTimeout(timeoutId);
        return null;
      }
    };

    let backendRes = await tryBackend('http://localhost:4000');
    if (!backendRes || !backendRes.ok) {
      backendRes = await tryBackend(BACKEND_BASE_URL);
    }

    if (backendRes && backendRes.ok) {
      const json = await backendRes.json();
      return NextResponse.json(json);
    }

    // 2. Direct Fallback Execution (If backend is unreachable)
    const recentLogs: Array<{ time: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }> = [];
    const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
      const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      recentLogs.push({ time, message, type });
    };

    addLog(`🚀 Direct link audit initiated (Scope: ${scope}, Limit: ${scope === 'all' ? 'Full Catalog' : effectiveLimit})`, 'info');

    // Case A: Items provided directly (visible page)
    if (Array.isArray(items) && items.length > 0) {
      addLog(`📦 Checking ${items.length} items from visible page...`, 'info');
      const results: Array<{ id: string; url: string; isValid: boolean; reason?: string; statusCode?: number }> = [];
      const deadPointIds: string[] = [];

      const CONCURRENCY = 6;
      for (let i = 0; i < items.length; i += CONCURRENCY) {
        const chunk = items.slice(i, i + CONCURRENCY);
        const chunkResults = await Promise.all(
          chunk.map(async (item: { id: string; product_url?: string }) => {
            const check = await verifyUrl(item.product_url);
            return {
              id: String(item.id),
              url: item.product_url || '',
              isValid: check.isValid,
              reason: check.reason,
              statusCode: check.statusCode,
            };
          })
        );

        for (const r of chunkResults) {
          results.push(r);
          const shortUrl = r.url && r.url.length > 55 ? r.url.slice(0, 52) + '...' : (r.url || '(empty URL)');
          if (!r.isValid) {
            deadPointIds.push(r.id);
            addLog(`[${results.length}/${items.length}] ❌ Dead [${r.id}]: ${shortUrl} — ${r.reason}`, 'error');
          } else {
            addLog(`[${results.length}/${items.length}] ✅ Alive (HTTP ${r.statusCode || 200}): ${shortUrl}`, 'success');
          }
        }
      }

      let removedCount = 0;
      if (deadPointIds.length > 0) {
        addLog(`🗑️ Purging ${deadPointIds.length} dead points directly from Qdrant vector database...`, 'warning');
        removedCount = await deleteFromQdrant(deadPointIds);
        addLog(`✅ Successfully purged ${removedCount} points from Qdrant collection "${QDRANT_COLLECTION}"`, 'success');
      }

      const totalChecked = results.length;
      const invalidCount = deadPointIds.length;
      const validRemaining = totalChecked - invalidCount;
      const durationMs = Date.now() - startTime;
      const durationSec = (durationMs / 1000).toFixed(1);
      const durationText = durationMs >= 60000 
        ? `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`
        : `${durationSec}s`;

      const summaryMessage = `Audit Completed in ${durationText}: Checked ${totalChecked} links. Found & purged ${removedCount} dead items directly from Vector DB. ${validRemaining} working links remain active.`;
      addLog(`🎉 ${summaryMessage}`, 'success');

      return NextResponse.json({
        status: 'success',
        message: summaryMessage,
        data: {
          isRunning: false,
          jobId: `quick_${Date.now()}`,
          scope,
          step: 'completed',
          totalChecked,
          invalidCount,
          removedCount,
          validRemaining,
          progressPercent: 100,
          startedAt: new Date(startTime).toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs,
          durationText,
          recentLogs,
          summaryMessage,
          details: results,
        },
      });
    }

    // Case B: Scroll directly from Qdrant
    addLog(`🔍 Scrolling products from Qdrant vector collection "${QDRANT_COLLECTION}"...`, 'info');
    const fetchedPoints: Array<{ id: string | number; payload?: { product_url?: string } }> = [];
    let nextOffset: string | number | null = null;
    let keepScrolling = true;

    while (keepScrolling && fetchedPoints.length < effectiveLimit) {
      const batchSize = Math.min(200, effectiveLimit - fetchedPoints.length);
      const scrollPayload: Record<string, unknown> = {
        limit: batchSize,
        with_payload: true,
        with_vector: false,
      };
      if (nextOffset) scrollPayload.offset = nextOffset;

      const scrollRes = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/scroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': QDRANT_API_KEY,
        },
        body: JSON.stringify(scrollPayload),
        cache: 'no-store',
      });

      if (!scrollRes.ok) break;

      const scrollJson = await scrollRes.json();
      const points = scrollJson?.result?.points || [];
      nextOffset = scrollJson?.result?.next_page_offset || null;
      for (const pt of points) {
        fetchedPoints.push(pt);
      }
      if (!nextOffset || points.length === 0) {
        keepScrolling = false;
      }
    }

    if (fetchedPoints.length === 0) {
      return NextResponse.json(
        { status: 'error', message: 'Unable to start audit: backend offline and Qdrant scroll failed' },
        { status: 502 }
      );
    }
    addLog(`📦 Retrieved ${fetchedPoints.length} points from vector database. Starting verification...`, 'info');

    const deadIds: string[] = [];
    const results = [];
    for (let i = 0; i < fetchedPoints.length; i++) {
      const pt = fetchedPoints[i];
      const url = pt.payload?.product_url || '';
      const check = await verifyUrl(url);
      results.push({ id: String(pt.id), url, ...check });
      const shortUrl = url && url.length > 55 ? url.slice(0, 52) + '...' : (url || '(empty URL)');

      if (!check.isValid) {
        deadIds.push(String(pt.id));
        addLog(`[${i + 1}/${fetchedPoints.length}] ❌ Dead [${pt.id}]: ${shortUrl} — ${check.reason}`, 'error');
      } else {
        addLog(`[${i + 1}/${fetchedPoints.length}] ✅ Alive (HTTP ${check.statusCode || 200}): ${shortUrl}`, 'success');
      }
    }

    let purged = 0;
    if (deadIds.length > 0) {
      addLog(`🗑️ Purging ${deadIds.length} dead points directly from Qdrant...`, 'warning');
      purged = await deleteFromQdrant(deadIds);
      addLog(`✅ Successfully purged ${purged} points from vector database`, 'success');
    }

    const total = results.length;
    const invalid = deadIds.length;
    const remaining = total - invalid;
    const durationMs = Date.now() - startTime;
    const durationSec = (durationMs / 1000).toFixed(1);
    const durationText = durationMs >= 60000 
      ? `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`
      : `${durationSec}s`;

    const summary = `Audit Completed in ${durationText}: Checked ${total} links. Found & purged ${purged} dead items directly from Vector DB. ${remaining} working links remain active.`;
    addLog(`🎉 ${summary}`, 'success');

    return NextResponse.json({
      status: 'success',
      message: summary,
      data: {
        isRunning: false,
        jobId: `batch_${Date.now()}`,
        scope,
        step: 'completed',
        totalChecked: total,
        invalidCount: invalid,
        removedCount: purged,
        validRemaining: remaining,
        progressPercent: 100,
        startedAt: new Date(startTime).toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs,
        durationText,
        recentLogs,
        summaryMessage: summary,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to execute audit';
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const token = request.headers.get('Authorization') || '';
  const tryBackend = async (baseUrl: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(`${baseUrl}/api/admin/sourcing/audit-links/status`, {
        headers: token ? { Authorization: token } : {},
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res;
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  };

  try {
    let res = await tryBackend('http://localhost:4000');
    if (!res || !res.ok) {
      res = await tryBackend(BACKEND_BASE_URL);
    }

    if (res && res.ok) {
      const json = await res.json();
      return NextResponse.json(json);
    }

    return NextResponse.json({
      status: 'success',
      data: {
        isRunning: false,
        jobId: null,
        scope: 'idle',
        step: 'idle',
        totalChecked: 0,
        invalidCount: 0,
        removedCount: 0,
        validRemaining: 0,
        progressPercent: 0,
        recentLogs: [],
        summaryMessage: 'No background audit currently active',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to get audit status';
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const token = request.headers.get('Authorization') || '';
  const tryBackend = async (baseUrl: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(`${baseUrl}/api/admin/sourcing/audit-links/stop`, {
        method: 'POST',
        headers: token ? { Authorization: token } : {},
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res;
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  };

  try {
    let res = await tryBackend('http://localhost:4000');
    if (!res || !res.ok) {
      res = await tryBackend(BACKEND_BASE_URL);
    }

    if (res && res.ok) {
      const json = await res.json();
      return NextResponse.json(json);
    }

    return NextResponse.json({
      status: 'success',
      data: {
        isRunning: false,
        jobId: null,
        scope: 'idle',
        step: 'cancelled',
        totalChecked: 0,
        invalidCount: 0,
        removedCount: 0,
        validRemaining: 0,
        progressPercent: 0,
        recentLogs: [],
        summaryMessage: 'Audit cancelled',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to cancel audit';
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}
