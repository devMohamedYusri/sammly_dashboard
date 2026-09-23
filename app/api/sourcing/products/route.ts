import { NextRequest, NextResponse } from 'next/server';

const QDRANT_URL = process.env.QDRANT_URL || 'https://ce862da7-a0d3-48e2-9512-21b31eaac3d5.eu-central-1-0.aws.cloud.qdrant.io';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6OWRlMTFkNmYtOTM2My00NjZiLWFkY2YtMGY3MGExNTE1ZGNjIn0.VQ5JiwXooa6Yk-j-DgD2RqcLXjZmLKsyMrSvPEuYAQQ';
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'furniture_catalog_small';
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sammly-backend-p3z7.onrender.com';

interface QdrantPayload {
  title?: string;
  price_egp?: number;
  original_price_egp?: number;
  category?: string;
  store_name?: string;
  product_url?: string;
  image_url?: string;
  in_stock?: boolean;
  updated_at?: string;
  [key: string]: unknown;
}

interface QdrantPoint {
  id: string | number;
  payload?: QdrantPayload;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 24));
  const offset = searchParams.get('offset') || null;
  const category = searchParams.get('category') || null;
  const storeName = searchParams.get('storeName') || null;
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const inStock = searchParams.get('inStock');
  const missingFilter = searchParams.get('missing') || null;
  const searchQuery = searchParams.get('search')?.toLowerCase().trim() || null;

  // Directly query high-performance Qdrant Cloud cluster
  try {
    const filterMust: Array<Record<string, unknown>> = [];
    if (category && category !== 'all') {
      filterMust.push({
        key: 'category',
        match: { value: category.toLowerCase().trim() },
      });
    }
    if (storeName && storeName !== 'all') {
      filterMust.push({
        key: 'store_name',
        match: { value: storeName.trim() },
      });
    }

    const priceConditions: Record<string, number> = {};
    if (minPrice !== null && minPrice !== '' && !isNaN(Number(minPrice))) {
      priceConditions.gte = Number(minPrice);
    }
    if (maxPrice !== null && maxPrice !== '' && !isNaN(Number(maxPrice))) {
      priceConditions.lte = Number(maxPrice);
    }
    if (Object.keys(priceConditions).length > 0) {
      filterMust.push({
        key: 'price_egp',
        range: priceConditions,
      });
    }

    // Scroll payload
    const scrollPayload: Record<string, unknown> = {
      limit: searchQuery || (missingFilter && missingFilter !== 'all') ? 100 : limit,
      with_payload: true,
      with_vector: false,
    };

    if (offset) {
      scrollPayload.offset = offset;
    }

    if (filterMust.length > 0) {
      scrollPayload.filter = { must: filterMust };
    }

    const [scrollRes, countRes] = await Promise.all([
      fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/scroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': QDRANT_API_KEY,
        },
        body: JSON.stringify(scrollPayload),
        cache: 'no-store',
      }),
      fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/count`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': QDRANT_API_KEY,
        },
        body: JSON.stringify({ exact: true }),
        cache: 'no-store',
      }).catch(() => {
        return fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}`, {
          headers: { 'api-key': QDRANT_API_KEY },
          cache: 'no-store',
        }).catch(() => null);
      }),
    ]);

    if (!scrollRes.ok) {
      const errText = await scrollRes.text();
      return NextResponse.json(
        { status: 'error', message: `Qdrant returned ${scrollRes.status}: ${errText}` },
        { status: 502 }
      );
    }

    const scrollJson = await scrollRes.json();
    const countJson = countRes && countRes.ok ? await countRes.json() : null;

    const rawPoints: QdrantPoint[] = scrollJson?.result?.points || [];
    const nextOffset: string | null = scrollJson?.result?.next_page_offset || null;
    const totalPoints: number = countJson?.result?.count ?? countJson?.result?.points_count ?? 0;

    // Process each point and detect missing attributes
    let products = rawPoints.map((point) => {
      const p = point.payload || {};
      const missing: ('image' | 'link' | 'title' | 'price' | 'category' | 'store')[] = [];

      if (!p.image_url || typeof p.image_url !== 'string' || !p.image_url.trim()) {
        missing.push('image');
      }
      if (!p.product_url || typeof p.product_url !== 'string' || !p.product_url.trim()) {
        missing.push('link');
      }
      if (!p.title || typeof p.title !== 'string' || !p.title.trim()) {
        missing.push('title');
      }
      if (
        p.price_egp === undefined ||
        p.price_egp === null ||
        isNaN(Number(p.price_egp)) ||
        Number(p.price_egp) <= 0
      ) {
        missing.push('price');
      }
      if (!p.category || typeof p.category !== 'string' || !p.category.trim()) {
        missing.push('category');
      }
      if (!p.store_name || typeof p.store_name !== 'string' || !p.store_name.trim()) {
        missing.push('store');
      }

      return {
        id: String(point.id),
        title: p.title || null,
        price_egp: p.price_egp !== undefined ? Number(p.price_egp) : null,
        original_price_egp: p.original_price_egp !== undefined ? Number(p.original_price_egp) : null,
        category: p.category || null,
        store_name: p.store_name || null,
        product_url: p.product_url || null,
        image_url: p.image_url || null,
        in_stock: p.in_stock !== undefined ? Boolean(p.in_stock) : null,
        updated_at: p.updated_at || null,
        missingAttributes: missing,
        hasMissing: missing.length > 0,
      };
    });

    // In-memory filter for inStock if provided
    if (inStock !== null && inStock !== '') {
      const stockBool = inStock === 'true';
      products = products.filter((p) => p.in_stock === stockBool);
    }

    // In-memory filter for missing attributes
    if (missingFilter && missingFilter !== 'all') {
      if (missingFilter === 'any') {
        products = products.filter((p) => p.missingAttributes.length > 0);
      } else if (missingFilter === 'none') {
        products = products.filter((p) => p.missingAttributes.length === 0);
      } else {
        products = products.filter((p) =>
          p.missingAttributes.includes(missingFilter as 'image' | 'link' | 'title' | 'price' | 'category' | 'store')
        );
      }
    }

    // In-memory search filter
    if (searchQuery) {
      products = products.filter((p) => {
        const matchTitle = p.title && p.title.toLowerCase().includes(searchQuery);
        const matchStore = p.store_name && p.store_name.toLowerCase().includes(searchQuery);
        const matchCategory = p.category && p.category.toLowerCase().includes(searchQuery);
        const matchId = p.id && p.id.toLowerCase().includes(searchQuery);
        return matchTitle || matchStore || matchCategory || matchId;
      });
    }

    // Slice for client page limit
    const paginatedProducts = searchQuery || (missingFilter && missingFilter !== 'all')
      ? products.slice(0, limit)
      : products;

    return NextResponse.json({
      status: 'success',
      data: {
        products: paginatedProducts,
        pagination: {
          page,
          limit,
          total: totalPoints,
          totalPages: Math.ceil(totalPoints / limit),
          nextOffset,
        },
        collectionInfo: {
          name: QDRANT_COLLECTION,
          totalPoints,
          vectorSize: 384,
          distance: 'Cosine',
        },
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to query Qdrant';
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}
