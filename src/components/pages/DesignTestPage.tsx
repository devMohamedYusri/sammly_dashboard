'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { getToken, getFounderCredits, addFounderCredits } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'scratch' | 'restyle' | 'full-home' | 'mask' | 'sourcing' | 'sourcing-multi';
type ResolutionTier = '512' | '1k' | '2k' | '4k';
type OperationMode = 'REPLACE' | 'ADD' | 'EDIT' | 'REMOVE';

const STYLES = [
  { value: 'neoclassical', label: 'Neoclassical' },
  { value: 'modern', label: 'Modern' },
  { value: 'warm-minimalist', label: 'Warm Minimalist / Japandi' },
  { value: 'coastal', label: 'Coastal / Sahel Chic' },
  { value: 'bohemian', label: 'Bohemian' },
  { value: 'classic', label: 'Classic' },
  { value: 'industrial', label: 'Industrial' },
];

const ROOMS = [
  { value: 'living-room', label: 'Living Room' },
  { value: 'reception', label: 'Reception & Salon' },
  { value: 'master-bedroom', label: 'Master Bedroom' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'kids-bedroom', label: 'Kids Bedroom' },
  { value: 'guest-bedroom', label: 'Guest Bedroom' },
  { value: 'dining-room', label: 'Dining Room' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'guest-bathroom', label: 'Guest Bathroom' },
  { value: 'dressing-room', label: 'Dressing Room' },
  { value: 'corridor', label: 'Corridor' },
  { value: 'home-office', label: 'Home Office' },
  { value: 'balcony', label: 'Balcony / Terrace' },
  { value: 'laundry-room', label: 'Laundry Room' },
];

const RESOLUTION_TIERS: { value: ResolutionTier; label: string; desc: string }[] = [
  { value: '512', label: '512px', desc: 'Standard Testing' },
  { value: '1k', label: '1K HD', desc: 'Production' },
  { value: '2k', label: '2K QHD', desc: 'Pro Tier' },
  { value: '4k', label: '4K UHD', desc: 'Ultra Export' },
];


const SOURCING_CATEGORIES = [
  { value: '', label: '✨ Auto-Detect (Gemini Vision)' },
  { value: 'sofa', label: 'Sofa & Couches' },
  { value: 'chair', label: 'Chairs & Armchairs' },
  { value: 'table', label: 'Tables & Coffee Tables' },
  { value: 'bed', label: 'Beds & Headboards' },
  { value: 'lighting', label: 'Lighting & Lamps' },
  { value: 'storage', label: 'Storage & Cabinets' },
  { value: 'decor', label: 'Decor & Accessories' },
  { value: 'rug', label: 'Rugs & Carpets' },
  { value: 'curtains', label: 'Curtains & Fabrics' },
];

const SOURCING_STORES = [
  { value: '', label: 'All Stores' },
  { value: 'Homzmart', label: 'Homzmart' },
  { value: 'Chic Homz', label: 'Chic Homz' },
  { value: 'HUB Furniture', label: 'HUB Furniture' },
  { value: 'In & Out', label: 'In & Out' },
  { value: 'IKEA', label: 'IKEA' },
  { value: 'Kabbani', label: 'Kabbani Furniture' },
  { value: 'Kemitt', label: 'Kemitt' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateCurl(baseUrl: string, method: string, endpoint: string, body: object, token: string) {
  return `curl -X ${method} "${baseUrl}${endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token || '<JWT_TOKEN>'}" \\
  -d '${JSON.stringify(body, null, 2)}'`;
}

function formatApiError(message: string | undefined, defaultFallback: string, activeUrl: string) {
  if (message === 'Invalid token' || message?.toLowerCase().includes('invalid token')) {
    return `Invalid Token: The active token is not accepted by ${activeUrl}. If you recently switched between Local and Render in Settings, please log in through ${activeUrl} or paste a Bearer token issued by that backend in ⚙️ Settings.`;
  }
  if (message?.includes('prepayment credits are depleted') || message?.includes('Quota exceeded') || message?.includes('free_tier_requests') || message?.includes('Billing/Quota Error')) {
    return `Google Gemini Quota / Billing Error: The API key on ${activeUrl} is attached to a Google Cloud project with 0 available credits for image generation. In Google AI Studio, ensure your API key was generated from the specific project that contains your active credit balance ($8.86).`;
  }
  return message || defaultFallback;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ImageDropzone({
  label,
  value,
  onChange,
  onUrlChange,
  id,
  onUpload,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onUrlChange: (url: string) => void;
  id: string;
  onUpload?: (dataUrl: string) => Promise<string | null>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      onChange(dataUrl);

      if (onUpload) {
        setUploading(true);
        setStatusText('☁️ Uploading to Cloudinary CDN...');
        try {
          const cdnUrl = await onUpload(dataUrl);
          if (cdnUrl) {
            onChange(cdnUrl);
            setStatusText('✅ Uploaded to Cloudinary CDN');
          } else {
            setStatusText('⚠️ Raw data buffered (will upload to CDN on submit)');
          }
        } catch {
          setStatusText('⚠️ Will upload to CDN on submit');
        } finally {
          setUploading(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  }, []);

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center cursor-pointer hover:border-[#31A895] hover:bg-[#31A895]/5 transition-all relative"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          id={id}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {value ? (
          <div className="space-y-2">
            <img
              src={value}
              alt="preview"
              className="max-h-48 mx-auto rounded-lg object-contain"
            />
            {value.startsWith('http') && (
              <span className="inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                ☁️ Cloudinary CDN: {value.substring(0, 50)}...
              </span>
            )}
          </div>
        ) : (
          <div className="py-4">
            <div className="text-3xl mb-2">🖼️</div>
            <p className="text-sm text-slate-500">
              Drag &amp; drop or <span className="text-[#31A895] font-semibold">click to upload</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">or paste a Cloudinary URL below</p>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <input
          type="text"
          placeholder="https://res.cloudinary.com/.../room.jpg"
          value={value.startsWith('data:') ? '' : value}
          onChange={(e) => {
            onUrlChange(e.target.value);
            setStatusText(null);
          }}
          className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#31A895]/40 focus:border-[#31A895] font-mono"
        />
        {uploading && (
          <div className="flex items-center gap-2 text-xs text-[#31A895] font-medium bg-[#31A895]/10 px-3 py-1.5 rounded-lg animate-pulse">
            <span>☁️</span> Uploading to Cloudinary CDN...
          </div>
        )}
        {!uploading && statusText && (
          <div className="text-xs text-slate-500 flex items-center justify-between px-1">
            <span>{statusText}</span>
            {value.startsWith('http') && (
              <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                CDN URL Active
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ComparisonSlider({ before, after }: { before: string; after: string }) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-72 rounded-xl overflow-hidden border border-slate-200 cursor-ew-resize select-none"
      onMouseDown={(e) => { isDragging.current = true; updatePosition(e.clientX); }}
      onMouseMove={(e) => { if (isDragging.current) updatePosition(e.clientX); }}
      onMouseUp={() => { isDragging.current = false; }}
      onMouseLeave={() => { isDragging.current = false; }}
    >
      <img src={after} alt="After" className="absolute inset-0 w-full h-full object-contain bg-slate-50" />
      <div
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${sliderPos}%` }}
      >
        <img
          src={before}
          alt="Before"
          className="absolute inset-0 w-full h-full object-contain bg-slate-100"
          style={{ width: containerRef.current?.offsetWidth ? containerRef.current.offsetWidth + 'px' : '100%' }}
        />
      </div>
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-600 text-xs font-bold border border-slate-200">
          ⟷
        </div>
      </div>
      <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">BEFORE</div>
      <div className="absolute top-2 right-2 bg-[#31A895]/90 text-white text-[10px] px-2 py-0.5 rounded-full">AFTER</div>
    </div>
  );
}

function JsonInspector({ request, response, curl, duration }: {
  request: object | null;
  response: object | null;
  curl: string;
  duration: number | null;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!request && !response && !curl) return (
    <div className="text-xs text-slate-400 text-center py-4">Run a request to see inspector output</div>
  );

  return (
    <div className="space-y-3">
      {duration !== null && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
          Completed in <strong className="text-slate-700">{duration.toFixed(1)}s</strong>
        </div>
      )}
      {request && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Request Payload</p>
          <pre className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto max-h-36 text-slate-700 whitespace-pre-wrap">
            {JSON.stringify(request, null, 2)}
          </pre>
        </div>
      )}
      {response && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Response</p>
          <pre className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto max-h-48 text-slate-700 whitespace-pre-wrap">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
      {curl && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">cURL Command</p>
            <button onClick={handleCopy} className="text-[10px] text-[#31A895] font-semibold hover:underline">
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="text-[11px] bg-slate-900 text-emerald-400 rounded-lg p-3 overflow-auto max-h-36 whitespace-pre-wrap font-mono">
            {curl}
          </pre>
        </div>
      )}
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <>
      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      {label}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DesignTestPage() {
  const [activeTab, setActiveTab] = useState<Tab>('scratch');
  const [baseUrl, setBaseUrl] = useState('http://localhost:4000');
  const [customToken, setCustomToken] = useState('');
  const [resolution, setResolution] = useState<ResolutionTier>('512');
  const [showSettings, setShowSettings] = useState(false);

  const { user } = useAuth();
  const isFounder = user?.role === 'founder';

  const getAuthToken = useCallback(() => {
    return customToken || (typeof window !== 'undefined' ? localStorage.getItem('founder_test_token') : null) || getToken() || '';
  }, [customToken]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('founder_test_token');
      if (saved && !customToken) setCustomToken(saved);
    }
  }, [customToken]);

  // ── Founder Live Credits State ──
  const [credits, setCredits] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(100);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpSuccess, setTopUpSuccess] = useState<string | null>(null);
  const [autoConnectingToken, setAutoConnectingToken] = useState(false);
  const [tokenStatusMessage, setTokenStatusMessage] = useState<string | null>(null);

  const loadCredits = useCallback(async (tokenOverride?: string) => {
    try {
      setCreditsLoading(true);
      const activeToken = tokenOverride || getAuthToken();
      const data = await getFounderCredits(baseUrl, activeToken);
      if (data && typeof data.credits === 'number') {
        setCredits(data.credits);
      }
    } catch {
      // Fallback if local backend not yet reachable
    } finally {
      setCreditsLoading(false);
    }
  }, [baseUrl, getAuthToken]);

  useEffect(() => {
    loadCredits();
  }, [loadCredits]);

  const connectFounderTestToken = async () => {
    try {
      setAutoConnectingToken(true);
      setTokenStatusMessage(null);
      const res = await fetch(`${baseUrl}/api/admin/founder/test-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email || 'mohamedyousry@founder.sammly' }),
      });
      const data = await res.json();
      if (res.ok && data?.data?.token) {
        const newToken = data.data.token;
        setCustomToken(newToken);
        if (typeof window !== 'undefined') {
          localStorage.setItem('founder_test_token', newToken);
        }
        setTokenStatusMessage(`Successfully connected to ${baseUrl} with Founder test token!`);
        setTimeout(() => setTokenStatusMessage(null), 5000);
        await loadCredits(newToken);
      } else {
        alert(data?.message || 'Failed to generate founder test token');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Network error connecting test token');
    } finally {
      setAutoConnectingToken(false);
    }
  };

  const handleTopUp = async (amount: number) => {
    if (!isFounder) {
      alert('Only founders are authorized to directly add test credits.');
      return;
    }
    try {
      setTopUpLoading(true);
      setTopUpSuccess(null);
      const data = await addFounderCredits(amount, undefined, baseUrl, getAuthToken());
      if (data && typeof data.credits === 'number') {
        setCredits(data.credits);
        setTopUpSuccess(`Successfully added +${amount} credits! New balance: ${data.credits} credits`);
        setTimeout(() => setTopUpSuccess(null), 4000);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to top up credits');
    } finally {
      setTopUpLoading(false);
    }
  };


  // ── Restyle State ──
  const [restyleImage, setRestyleImage] = useState('');
  const [restyleStyle, setRestyleStyle] = useState('modern');
  const [restyleRoom, setRestyleRoom] = useState('living-room');
  const [restylePrompt, setRestylePrompt] = useState('');
  const [restyleAspect, setRestyleAspect] = useState('auto');
  const [restyleResult, setRestyleResult] = useState<string | null>(null);
  const [restyleLoading, setRestyleLoading] = useState(false);
  const [restyleReq, setRestyleReq] = useState<object | null>(null);
  const [restyleRes, setRestyleRes] = useState<object | null>(null);
  const [restyleCurl, setRestyleCurl] = useState('');
  const [restyleDuration, setRestyleDuration] = useState<number | null>(null);
  const [restyleError, setRestyleError] = useState('');

  // ── Scratch State ──
  const [scratchStyle, setScratchStyle] = useState('modern');
  const [scratchRoom, setScratchRoom] = useState('living-room');
  const [scratchPrompt, setScratchPrompt] = useState('');
  const [scratchRefImage, setScratchRefImage] = useState('');
  const [scratchResult, setScratchResult] = useState<string | null>(null);
  const [scratchLoading, setScratchLoading] = useState(false);
  const [scratchReq, setScratchReq] = useState<object | null>(null);
  const [scratchRes, setScratchRes] = useState<object | null>(null);
  const [scratchCurl, setScratchCurl] = useState('');
  const [scratchDuration, setScratchDuration] = useState<number | null>(null);
  const [scratchError, setScratchError] = useState('');

  // ── Full-Home State ──
  const [homeStyle, setHomeStyle] = useState('modern');
  const [homeRooms, setHomeRooms] = useState<string[]>(['living-room', 'master-bedroom']);
  const [homeStyleImage, setHomeStyleImage] = useState('');
  const [homeRoomImages, setHomeRoomImages] = useState<Record<string, string>>({});
  const [homeResults, setHomeResults] = useState<Record<string, string>>({});
  const [homeLoading, setHomeLoading] = useState(false);
  const [homeReq, setHomeReq] = useState<object | null>(null);
  const [homeRes, setHomeRes] = useState<object | null>(null);
  const [homeCurl, setHomeCurl] = useState('');
  const [homeDuration, setHomeDuration] = useState<number | null>(null);
  const [homeError, setHomeError] = useState('');

  // ── Mask State ──
  const [maskBaseImage, setMaskBaseImage] = useState('');
  const [maskMaskUrl, setMaskMaskUrl] = useState('');
  const [maskRoom, setMaskRoom] = useState('living-room');
  const [maskStyle, setMaskStyle] = useState('modern');
  const [maskMode, setMaskMode] = useState<OperationMode>('REPLACE');
  const [maskPrompt, setMaskPrompt] = useState('');
  const [maskResult, setMaskResult] = useState<string | null>(null);
  const [maskLoading, setMaskLoading] = useState(false);
  const [maskReq, setMaskReq] = useState<object | null>(null);
  const [maskRes, setMaskRes] = useState<object | null>(null);
  const [maskCurl, setMaskCurl] = useState('');
  const [maskDuration, setMaskDuration] = useState<number | null>(null);
  const [maskError, setMaskError] = useState('');

  // ── Sourcing (Single Item) State ──
  const [sourcingImage, setSourcingImage] = useState('');
  const [sourcingCategory, setSourcingCategory] = useState('');
  const [sourcingStore, setSourcingStore] = useState('');
  const [sourcingMinPrice, setSourcingMinPrice] = useState('');
  const [sourcingMaxPrice, setSourcingMaxPrice] = useState('');
  const [sourcingLimit, setSourcingLimit] = useState(10);
  const [sourcingResult, setSourcingResult] = useState<any | null>(null);
  const [sourcingLoading, setSourcingLoading] = useState(false);
  const [sourcingReq, setSourcingReq] = useState<object | null>(null);
  const [sourcingRes, setSourcingRes] = useState<object | null>(null);
  const [sourcingCurl, setSourcingCurl] = useState('');
  const [sourcingDuration, setSourcingDuration] = useState<number | null>(null);
  const [sourcingError, setSourcingError] = useState('');

  // ── Multi-Element Sourcing (Scene) State ──
  const [multiImage, setMultiImage] = useState('');
  const [multiStore, setMultiStore] = useState('');
  const [multiMinPrice, setMultiMinPrice] = useState('');
  const [multiMaxPrice, setMultiMaxPrice] = useState('');
  const [multiLimit, setMultiLimit] = useState(4);
  const [multiResult, setMultiResult] = useState<any | null>(null);
  const [multiLoading, setMultiLoading] = useState(false);
  const [multiReq, setMultiReq] = useState<object | null>(null);
  const [multiRes, setMultiRes] = useState<object | null>(null);
  const [multiCurl, setMultiCurl] = useState('');
  const [multiDuration, setMultiDuration] = useState<number | null>(null);
  const [multiError, setMultiError] = useState('');

  // ── Upload & Actions ──

  const uploadToCloudinary = async (dataUrl: string): Promise<string | null> => {
    try {
      const res = await fetch(`${baseUrl}/api/designs/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json();
      if (res.ok && data?.data?.imageUrl) {
        return data.data.imageUrl;
      }
    } catch (err) {
      console.warn('Cloudinary upload error:', err);
    }
    return null;
  };

  const runRestyle = async () => {
    if (!restyleImage) { setRestyleError('Please provide a room image'); return; }
    setRestyleLoading(true);
    setRestyleError('');
    setRestyleDuration(null);

    // Guarantee image is uploaded to Cloudinary CDN before sending request
    let cleanImageUrl = restyleImage;
    if (cleanImageUrl.startsWith('data:')) {
      const cdnUrl = await uploadToCloudinary(cleanImageUrl);
      if (cdnUrl) {
        cleanImageUrl = cdnUrl;
        setRestyleImage(cdnUrl);
      }
    }

    const payload: Record<string, unknown> = {
      style: restyleStyle,
      image_url: cleanImageUrl,
      room_type: restyleRoom,
      aspect_ratio: restyleAspect,
      resolution,
    };
    if (restylePrompt) payload.prompt = restylePrompt;
    setRestyleReq(payload);
    setRestyleCurl(generateCurl(baseUrl, 'POST', '/api/designs/restyle', payload, getAuthToken()));
    const t0 = Date.now();
    try {
      const res = await fetch(`${baseUrl}/api/designs/restyle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setRestyleRes(data);
      setRestyleDuration((Date.now() - t0) / 1000);
      if (res.ok && data?.data?.design?.imageUrl) {
        setRestyleResult(data.data.design.imageUrl);
        loadCredits();
      } else {
        setRestyleError(formatApiError(data?.message, 'Generation failed', baseUrl));
      }
    } catch (e: unknown) {
      setRestyleError(formatApiError((e as Error).message, 'Network request failed', baseUrl));
    } finally {
      setRestyleLoading(false);
    }
  };

  const runScratch = async () => {
    if (!scratchPrompt) { setScratchError('Please enter a prompt'); return; }
    setScratchLoading(true);
    setScratchError('');
    setScratchDuration(null);

    let cleanRefImage = scratchRefImage;
    if (cleanRefImage && cleanRefImage.startsWith('data:')) {
      const cdnUrl = await uploadToCloudinary(cleanRefImage);
      if (cdnUrl) {
        cleanRefImage = cdnUrl;
        setScratchRefImage(cdnUrl);
      }
    }

    const payload: Record<string, unknown> = {
      style: scratchStyle,
      room_type: scratchRoom,
      prompt: scratchPrompt,
      resolution,
    };
    if (cleanRefImage) payload.image_url = cleanRefImage;
    setScratchReq(payload);
    setScratchCurl(generateCurl(baseUrl, 'POST', '/api/designs/generate', payload, getAuthToken()));
    const t0 = Date.now();
    try {
      const res = await fetch(`${baseUrl}/api/designs/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setScratchRes(data);
      setScratchDuration((Date.now() - t0) / 1000);
      if (res.ok && data?.data?.design?.imageUrl) {
        setScratchResult(data.data.design.imageUrl);
        loadCredits();
      } else {
        setScratchError(formatApiError(data?.message, 'Generation failed', baseUrl));
      }
    } catch (e: unknown) {
      setScratchError(formatApiError((e as Error).message, 'Network request failed', baseUrl));
    } finally {
      setScratchLoading(false);
    }
  };

  const runFullHome = async () => {
    if (homeRooms.length === 0) { setHomeError('Select at least one room'); return; }
    setHomeLoading(true);
    setHomeError('');
    setHomeDuration(null);

    let cleanStyleImage = homeStyleImage;
    const styleUploadPromise = (cleanStyleImage && cleanStyleImage.startsWith('data:'))
      ? uploadToCloudinary(cleanStyleImage).then(cdnUrl => {
          if (cdnUrl) {
            cleanStyleImage = cdnUrl;
            setHomeStyleImage(cdnUrl);
          }
        })
      : Promise.resolve();

    const cleanRoomImages: Record<string, string> = {};
    const roomUploadPromises = Object.entries(homeRoomImages).map(async ([room, img]) => {
      if (img && img.startsWith('data:')) {
        const cdnUrl = await uploadToCloudinary(img);
        cleanRoomImages[room] = cdnUrl || img;
      } else {
        cleanRoomImages[room] = img;
      }
    });

    await Promise.all([styleUploadPromise, ...roomUploadPromises]);
    setHomeRoomImages(cleanRoomImages);

    const payload: Record<string, unknown> = {
      style: homeStyle,
      room_types: homeRooms,
      resolution,
    };
    if (cleanStyleImage) payload.style_image_url = cleanStyleImage;
    if (Object.keys(cleanRoomImages).length > 0) payload.room_images = cleanRoomImages;
    setHomeReq(payload);
    setHomeCurl(generateCurl(baseUrl, 'POST', '/api/designs/full-home', payload, getAuthToken()));
    const t0 = Date.now();
    try {
      const res = await fetch(`${baseUrl}/api/designs/full-home`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setHomeRes(data);
      setHomeDuration((Date.now() - t0) / 1000);
      if (res.ok && data?.data?.designs) {
        const map: Record<string, string> = {};
        data.data.designs.forEach((d: { room: string; imageUrl: string }) => { map[d.room] = d.imageUrl; });
        setHomeResults(map);
        loadCredits();
      } else {
        setHomeError(formatApiError(data?.message, 'Generation failed', baseUrl));
      }
    } catch (e: unknown) {
      setHomeError(formatApiError((e as Error).message, 'Network request failed', baseUrl));
    } finally {
      setHomeLoading(false);
    }
  };

  const runMask = async () => {
    if (!maskBaseImage) { setMaskError('Please provide a base image'); return; }
    setMaskLoading(true);
    setMaskError('');
    setMaskDuration(null);

    let cleanBaseImage = maskBaseImage;
    if (cleanBaseImage && cleanBaseImage.startsWith('data:')) {
      const cdnUrl = await uploadToCloudinary(cleanBaseImage);
      if (cdnUrl) {
        cleanBaseImage = cdnUrl;
        setMaskBaseImage(cdnUrl);
      }
    }

    let cleanMaskUrl = maskMaskUrl;
    if (cleanMaskUrl && cleanMaskUrl.startsWith('data:')) {
      const cdnUrl = await uploadToCloudinary(cleanMaskUrl);
      if (cdnUrl) {
        cleanMaskUrl = cdnUrl;
        setMaskMaskUrl(cdnUrl);
      }
    }

    const payload: Record<string, unknown> = {
      image_url: cleanBaseImage,
      room: maskRoom,
      style: maskStyle,
      operation_mode: maskMode,
      prompt: maskPrompt,
      resolution,
    };
    if (cleanMaskUrl) payload.mask_url = cleanMaskUrl;
    setMaskReq(payload);
    setMaskCurl(generateCurl(baseUrl, 'POST', '/api/designs/mask', payload, getAuthToken()));
    const t0 = Date.now();
    try {
      const res = await fetch(`${baseUrl}/api/designs/mask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setMaskRes(data);
      setMaskDuration((Date.now() - t0) / 1000);
      if (res.ok && data?.data?.design?.imageUrl) {
        setMaskResult(data.data.design.imageUrl);
        loadCredits();
      } else {
        setMaskError(formatApiError(data?.message, 'Generation failed', baseUrl));
      }
    } catch (e: unknown) {
      setMaskError(formatApiError((e as Error).message, 'Network request failed', baseUrl));
    } finally {
      setMaskLoading(false);
    }
  };

  const runSourcing = async () => {
    if (!sourcingImage) { setSourcingError('Please provide a furniture or product image'); return; }
    setSourcingLoading(true);
    setSourcingError('');
    setSourcingDuration(null);

    let cleanImageUrl = sourcingImage;
    if (cleanImageUrl.startsWith('data:')) {
      const cdnUrl = await uploadToCloudinary(cleanImageUrl);
      if (cdnUrl) {
        cleanImageUrl = cdnUrl;
        setSourcingImage(cdnUrl);
      }
    }

    const payload: Record<string, unknown> = {
      imageUrl: cleanImageUrl,
      limit: Number(sourcingLimit) || 10,
    };
    if (sourcingCategory) payload.category = sourcingCategory;
    if (sourcingStore) payload.storeName = sourcingStore;
    if (sourcingMinPrice) payload.minPrice = Number(sourcingMinPrice);
    if (sourcingMaxPrice) payload.maxPrice = Number(sourcingMaxPrice);

    setSourcingReq(payload);
    setSourcingCurl(generateCurl(baseUrl, 'POST', '/api/sourcing/search', payload, getAuthToken()));
    const t0 = Date.now();
    try {
      const res = await fetch(`${baseUrl}/api/sourcing/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setSourcingRes(data);
      setSourcingDuration((Date.now() - t0) / 1000);
      if (res.ok && data?.data) {
        setSourcingResult(data.data);
        loadCredits();
      } else {
        setSourcingError(formatApiError(data?.message, 'Sourcing search failed', baseUrl));
      }
    } catch (e: unknown) {
      setSourcingError(formatApiError((e as Error).message, 'Network request failed', baseUrl));
    } finally {
      setSourcingLoading(false);
    }
  };

  const runMultiSourcing = async () => {
    if (!multiImage) { setMultiError('Please provide a room scene image'); return; }
    setMultiLoading(true);
    setMultiError('');
    setMultiDuration(null);

    let cleanImageUrl = multiImage;
    if (cleanImageUrl.startsWith('data:')) {
      const cdnUrl = await uploadToCloudinary(cleanImageUrl);
      if (cdnUrl) {
        cleanImageUrl = cdnUrl;
        setMultiImage(cdnUrl);
      }
    }

    const payload: Record<string, unknown> = {
      imageUrl: cleanImageUrl,
      limitPerCategory: Number(multiLimit) || 4,
    };
    if (multiStore) payload.storeName = multiStore;
    if (multiMinPrice) payload.minPrice = Number(multiMinPrice);
    if (multiMaxPrice) payload.maxPrice = Number(multiMaxPrice);

    setMultiReq(payload);
    setMultiCurl(generateCurl(baseUrl, 'POST', '/api/sourcing/search-multi', payload, getAuthToken()));
    const t0 = Date.now();
    try {
      const res = await fetch(`${baseUrl}/api/sourcing/search-multi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setMultiRes(data);
      setMultiDuration((Date.now() - t0) / 1000);
      if (res.ok && data?.data) {
        setMultiResult(data.data);
        loadCredits();
      } else {
        setMultiError(formatApiError(data?.message, 'Multi-element sourcing failed', baseUrl));
      }
    } catch (e: unknown) {
      setMultiError(formatApiError((e as Error).message, 'Network request failed', baseUrl));
    } finally {
      setMultiLoading(false);
    }
  };

  // ── UI ──

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'scratch', label: 'Scratch Concept', icon: '✨' },
    { id: 'restyle', label: 'Room Restyle', icon: '🏠' },
    { id: 'full-home', label: 'Full-Home Suite', icon: '🏡' },
    { id: 'mask', label: 'Mask & Inpaint', icon: '🎭' },
    { id: 'sourcing', label: 'Visual Matching (Item)', icon: '🔍' },
    { id: 'sourcing-multi', label: 'Scene Sourcing (Multi)', icon: '🛋️' },
  ];

  const selectClass = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#31A895]/40';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">AI Design Playground</h1>
          <p className="text-sm text-slate-500 mt-1">
            Test all Gemini-powered design features live against your backend
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Resolution Tier */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {RESOLUTION_TIERS.map((t) => (
              <button
                key={t.value}
                onClick={() => setResolution(t.value)}
                title={t.desc}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  resolution === t.value
                    ? 'bg-[#31A895] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="flex items-center gap-2 text-sm font-medium border border-slate-200 rounded-xl px-4 py-2 bg-white hover:bg-slate-50 transition-all text-slate-700 shadow-sm"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Founder Test Account & Live Credit Top-Up Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-3 border border-slate-700/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#31A895]/20 border border-[#31A895]/40 flex items-center justify-center text-xl shadow-inner">
              💳
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Test Account</span>
                {isFounder ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                    FOUNDER
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                    {user?.role || 'Admin'}
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-white font-mono mt-0.5">
                {user?.email || 'Logged in Account'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Live Balance Pill */}
            <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl flex items-center gap-2 shadow-inner">
              <span className="text-xs text-slate-400 font-medium">Test Balance:</span>
              <strong className="text-base font-bold text-[#1ECB7F] font-mono">
                {creditsLoading ? '...' : (credits !== null ? `${credits.toLocaleString()} credits` : 'Active')}
              </strong>
              <button
                onClick={() => loadCredits()}
                title="Refresh live credits"
                className="text-slate-400 hover:text-white transition-colors p-0.5 text-xs ml-1"
              >
                🔄
              </button>
            </div>

            {/* Auto-Connect Test Account Button */}
            <button
              onClick={connectFounderTestToken}
              disabled={autoConnectingToken}
              title={`Request and connect a fresh valid founder token from active backend (${baseUrl})`}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-slate-900 font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {autoConnectingToken ? <Spinner label="Connecting..." /> : '🔑 Auto-Connect Test Token'}
            </button>

            {/* Founder-Only Instant Top-Up Options */}
            {isFounder && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400 font-semibold mr-1">Founder Top-Up:</span>
                <button
                  onClick={() => handleTopUp(50)}
                  disabled={topUpLoading}
                  className="px-3 py-1.5 bg-[#31A895] hover:bg-[#289076] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                >
                  +50
                </button>
                <button
                  onClick={() => handleTopUp(100)}
                  disabled={topUpLoading}
                  className="px-3 py-1.5 bg-[#31A895] hover:bg-[#289076] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                >
                  +100
                </button>
                <button
                  onClick={() => handleTopUp(500)}
                  disabled={topUpLoading}
                  className="px-3 py-1.5 bg-[#31A895] hover:bg-[#289076] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                >
                  +500
                </button>
                <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(Number(e.target.value))}
                    className="w-16 bg-transparent text-xs text-white px-2 py-0.5 focus:outline-none font-mono text-center"
                  />
                  <button
                    onClick={() => handleTopUp(topUpAmount)}
                    disabled={topUpLoading || topUpAmount <= 0}
                    className="px-2.5 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-xs font-semibold rounded-md text-white transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {tokenStatusMessage && (
          <div className="text-xs text-amber-300 bg-amber-950/60 border border-amber-500/30 rounded-xl px-4 py-2 flex items-center justify-between animate-fadeIn">
            <span>🔑 {tokenStatusMessage}</span>
            <button onClick={() => setTokenStatusMessage(null)} className="text-amber-400 hover:text-white text-xs">✕</button>
          </div>
        )}

        {topUpSuccess && (
          <div className="text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 rounded-xl px-4 py-2 flex items-center justify-between animate-fadeIn">
            <span>🎉 {topUpSuccess}</span>
            <button onClick={() => setTopUpSuccess(null)} className="text-emerald-400 hover:text-white text-xs">✕</button>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-700 text-sm">Connection Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Backend URL</label>
              <div className="flex gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value === 'local') setBaseUrl('http://localhost:4000');
                    else if (e.target.value === 'prod') setBaseUrl('https://sammly-backend-p3z7.onrender.com');
                  }}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#31A895]/40"
                >
                  <option value="local">Local (localhost:4000)</option>
                  <option value="prod">Production (Render)</option>
                </select>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-[#31A895]/40"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Override Bearer Token <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <button
                  onClick={connectFounderTestToken}
                  disabled={autoConnectingToken}
                  className="text-[11px] text-[#31A895] hover:text-[#289076] font-semibold underline disabled:opacity-50 cursor-pointer"
                >
                  {autoConnectingToken ? 'Generating...' : 'Auto-Generate for this backend ↗'}
                </button>
              </div>
              <input
                type="text"
                value={customToken}
                onChange={(e) => setCustomToken(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-[#31A895]/40"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-3">
            <span>🔑</span>
            <span>Active token: <code className="font-mono text-slate-700">{(customToken || getToken() || '').substring(0, 40)}{(customToken || getToken() || '').length > 40 ? '...' : 'none'}</code></span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm w-fit flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all ${
              activeTab === tab.id
                ? 'bg-[#31A895] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Scratch Concept ── */}
      {activeTab === 'scratch' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Scratch Concept</h2>
              <p className="text-xs text-slate-500 mt-1">Generate a luxury room render from text and optional style reference</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Style</label>
                <select value={scratchStyle} onChange={(e) => setScratchStyle(e.target.value)} className={selectClass}>
                  {STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Room Type</label>
                <select value={scratchRoom} onChange={(e) => setScratchRoom(e.target.value)} className={selectClass}>
                  {ROOMS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Prompt / Concept</label>
              <textarea
                value={scratchPrompt}
                onChange={(e) => setScratchPrompt(e.target.value)}
                rows={3}
                placeholder="e.g. Warm minimalist living room with a curved sofa and natural wood coffee table..."
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#31A895]/40"
              />
            </div>
            <ImageDropzone label="Style Reference Image (optional)" value={scratchRefImage} onChange={setScratchRefImage} onUrlChange={setScratchRefImage} id="scratch-ref" onUpload={uploadToCloudinary} />
            {scratchError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">⚠️ {scratchError}</div>}
            <button onClick={runScratch} disabled={scratchLoading} className="w-full bg-[#31A895] text-white text-sm font-semibold py-3 rounded-xl hover:bg-[#2a8f7e] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {scratchLoading ? <Spinner label={`Generating at ${resolution}...`} /> : `✨ Generate Concept (${resolution})`}
            </button>
          </div>
          <div className="space-y-4">
            {scratchResult ? (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <img src={scratchResult} alt="Generated" className="w-full object-contain max-h-80 bg-slate-50" />
                <div className="p-4 flex justify-between items-center">
                  <span className="text-xs text-slate-500">Model: <strong className="text-slate-700">gemini-3.1-flash-image</strong> · <strong className="text-[#31A895]">{resolution}</strong></span>
                  <a href={scratchResult} target="_blank" rel="noreferrer" className="text-xs text-[#31A895] font-semibold hover:underline">Open Full ↗</a>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-64 flex items-center justify-center text-slate-400 text-sm">Result will appear here</div>
            )}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <JsonInspector request={scratchReq} response={scratchRes} curl={scratchCurl} duration={scratchDuration} />
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Restyle ── */}
      {activeTab === 'restyle' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Room Restyle</h2>
              <p className="text-xs text-slate-500 mt-1">Redesign a real room photo while preserving its geometry</p>
            </div>
            <ImageDropzone label="Room Photo (required)" value={restyleImage} onChange={setRestyleImage} onUrlChange={setRestyleImage} id="restyle-img" onUpload={uploadToCloudinary} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Style</label>
                <select value={restyleStyle} onChange={(e) => setRestyleStyle(e.target.value)} className={selectClass}>
                  {STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Room Type</label>
                <select value={restyleRoom} onChange={(e) => setRestyleRoom(e.target.value)} className={selectClass}>
                  {ROOMS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Aspect Ratio</label>
                <select value={restyleAspect} onChange={(e) => setRestyleAspect(e.target.value)} className={selectClass}>
                  <option value="auto">Auto (preserve original)</option>
                  <option value="1:1">1:1 Square</option>
                  <option value="16:9">16:9 Landscape</option>
                  <option value="4:3">4:3</option>
                  <option value="9:16">9:16 Portrait</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Custom Prompt (optional)</label>
                <input type="text" value={restylePrompt} onChange={(e) => setRestylePrompt(e.target.value)} placeholder="e.g. add a fireplace" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#31A895]/40" />
              </div>
            </div>
            {restyleError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">⚠️ {restyleError}</div>}
            <button onClick={runRestyle} disabled={restyleLoading} className="w-full bg-[#31A895] text-white text-sm font-semibold py-3 rounded-xl hover:bg-[#2a8f7e] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {restyleLoading ? <Spinner label={`Redesigning at ${resolution}...`} /> : `🏠 Redesign Room (${resolution})`}
            </button>
          </div>
          <div className="space-y-4">
            {restyleResult && restyleImage ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                <ComparisonSlider before={restyleImage} after={restyleResult} />
                <div className="flex justify-between pt-1">
                  <span className="text-xs text-slate-500">Drag slider to compare</span>
                  <a href={restyleResult} target="_blank" rel="noreferrer" className="text-xs text-[#31A895] font-semibold hover:underline">Open Full ↗</a>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-72 flex items-center justify-center text-slate-400 text-sm">Before / After comparison will appear here</div>
            )}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <JsonInspector request={restyleReq} response={restyleRes} curl={restyleCurl} duration={restyleDuration} />
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Full-Home ── */}
      {activeTab === 'full-home' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Full-Home Suite</h2>
              <p className="text-xs text-slate-500 mt-1">Generate multiple cohesive rooms with visual DNA chaining</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Style</label>
              <select value={homeStyle} onChange={(e) => setHomeStyle(e.target.value)} className={selectClass}>
                {STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Rooms to Generate</label>
              <div className="grid grid-cols-2 gap-2">
                {ROOMS.map((r) => (
                  <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={homeRooms.includes(r.value)}
                      onChange={(e) => {
                        if (e.target.checked) setHomeRooms((prev) => [...prev, r.value]);
                        else setHomeRooms((prev) => prev.filter((x) => x !== r.value));
                      }}
                      className="rounded accent-[#31A895]"
                    />
                    <span className="text-sm text-slate-700">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <ImageDropzone label="Master Style Reference (optional)" value={homeStyleImage} onChange={setHomeStyleImage} onUrlChange={setHomeStyleImage} id="home-style" onUpload={uploadToCloudinary} />
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Per-Room Photos (optional)</label>
              <p className="text-xs text-slate-400 mb-2">Upload actual room photos for geometry-preserving redesign.</p>
              {homeRooms.map((room) => (
                <div key={room} className="mb-3">
                  <ImageDropzone
                    label={`${ROOMS.find((r) => r.value === room)?.label ?? room} photo`}
                    value={homeRoomImages[room] ?? ''}
                    onChange={(url) => setHomeRoomImages((prev) => ({ ...prev, [room]: url }))}
                    onUrlChange={(url) => setHomeRoomImages((prev) => ({ ...prev, [room]: url }))}
                    id={`home-room-${room}`}
                  />
                </div>
              ))}
            </div>
            {homeError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">⚠️ {homeError}</div>}
            <button onClick={runFullHome} disabled={homeLoading} className="w-full bg-[#31A895] text-white text-sm font-semibold py-3 rounded-xl hover:bg-[#2a8f7e] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {homeLoading ? <Spinner label={`Generating ${homeRooms.length} room(s)...`} /> : `🏡 Generate Suite (${homeRooms.length} rooms · ${resolution})`}
            </button>
          </div>
          <div className="space-y-4">
            {Object.keys(homeResults).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(homeResults).map(([room, url]) => (
                  <div key={room} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <img src={url} alt={room} className="w-full h-40 object-cover" />
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 capitalize">{room.replace(/-/g, ' ')}</span>
                      <a href={url} target="_blank" rel="noreferrer" className="text-xs text-[#31A895] font-semibold hover:underline">Open ↗</a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-64 flex items-center justify-center text-slate-400 text-sm">Room cards will appear here</div>
            )}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <JsonInspector request={homeReq} response={homeRes} curl={homeCurl} duration={homeDuration} />
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Mask ── */}
      {activeTab === 'mask' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Mask & Inpainting</h2>
              <p className="text-xs text-slate-500 mt-1">Precisely replace, add, edit, or remove interior elements</p>
            </div>
            <ImageDropzone label="Base Room Image (required)" value={maskBaseImage} onChange={setMaskBaseImage} onUrlChange={setMaskBaseImage} id="mask-base" onUpload={uploadToCloudinary} />
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Mask Image URL (optional)</label>
              <input type="text" value={maskMaskUrl} onChange={(e) => setMaskMaskUrl(e.target.value)} placeholder="https://example.com/mask.png" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#31A895]/40" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Room</label>
                <select value={maskRoom} onChange={(e) => setMaskRoom(e.target.value)} className={selectClass}>
                  {ROOMS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Style</label>
                <select value={maskStyle} onChange={(e) => setMaskStyle(e.target.value)} className={selectClass}>
                  {STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Operation Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {(['REPLACE', 'ADD', 'EDIT', 'REMOVE'] as OperationMode[]).map((mode) => (
                  <button key={mode} onClick={() => setMaskMode(mode)}
                    className={`text-sm font-semibold py-2 rounded-xl border transition-all ${
                      maskMode === mode ? 'bg-[#31A895] text-white border-[#31A895]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#31A895]/50'
                    }`}>
                    {mode === 'REPLACE' ? '🔄 Replace' : mode === 'ADD' ? '➕ Add' : mode === 'EDIT' ? '✏️ Edit' : '🗑️ Remove'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Instruction Prompt</label>
              <textarea value={maskPrompt} onChange={(e) => setMaskPrompt(e.target.value)} rows={3}
                placeholder="e.g. Replace the sofa with a curved cream bouclé sectional..."
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#31A895]/40" />
            </div>
            {maskError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">⚠️ {maskError}</div>}
            <button onClick={runMask} disabled={maskLoading} className="w-full bg-[#31A895] text-white text-sm font-semibold py-3 rounded-xl hover:bg-[#2a8f7e] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {maskLoading ? <Spinner label={`Inpainting at ${resolution}...`} /> : `🎭 Apply Inpainting (${resolution})`}
            </button>
          </div>
          <div className="space-y-4">
            {maskResult ? (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                {maskBaseImage ? <ComparisonSlider before={maskBaseImage} after={maskResult} /> : <img src={maskResult} alt="Masked" className="w-full object-contain max-h-72 bg-slate-50" />}
                <div className="p-4 flex justify-between items-center">
                  <span className="text-xs text-slate-500">Mode: <strong className="text-slate-700">{maskMode}</strong></span>
                  <a href={maskResult} target="_blank" rel="noreferrer" className="text-xs text-[#31A895] font-semibold hover:underline">Open Full ↗</a>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-72 flex items-center justify-center text-slate-400 text-sm">Inpainting result will appear here</div>
            )}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <JsonInspector request={maskReq} response={maskRes} curl={maskCurl} duration={maskDuration} />
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Visual Matching (Item) ── */}
      {activeTab === 'sourcing' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Visual Sourcing &amp; Matching</h2>
              <p className="text-xs text-slate-500 mt-1">
                Gemini Vision guard + DINOv2 vector similarity matching against Egyptian retail catalogs
              </p>
            </div>

            <ImageDropzone
              label="Item Photo (required)"
              value={sourcingImage}
              onChange={setSourcingImage}
              onUrlChange={setSourcingImage}
              id="sourcing-img"
              onUpload={uploadToCloudinary}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Target Category</label>
                <select value={sourcingCategory} onChange={(e) => setSourcingCategory(e.target.value)} className={selectClass}>
                  {SOURCING_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Store Filter</label>
                <select value={sourcingStore} onChange={(e) => setSourcingStore(e.target.value)} className={selectClass}>
                  {SOURCING_STORES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Min Price (EGP)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={sourcingMinPrice}
                  onChange={(e) => setSourcingMinPrice(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#31A895]/40"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Max Price (EGP)</label>
                <input
                  type="number"
                  placeholder="100000"
                  value={sourcingMaxPrice}
                  onChange={(e) => setSourcingMaxPrice(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#31A895]/40"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Results Limit</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={sourcingLimit}
                  onChange={(e) => setSourcingLimit(Number(e.target.value))}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#31A895]/40"
                />
              </div>
            </div>

            {sourcingError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">⚠️ {sourcingError}</div>
            )}

            <button
              onClick={runSourcing}
              disabled={sourcingLoading}
              className="w-full bg-[#31A895] text-white text-sm font-semibold py-3 rounded-xl hover:bg-[#2a8f7e] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sourcingLoading ? <Spinner label="Analyzing &amp; Matching (Gemini + DINOv2)..." /> : '🔍 Search &amp; Match Product'}
            </button>
          </div>

          <div className="space-y-4">
            {sourcingResult ? (
              <div className="space-y-4">
                {/* Meta summary card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                        sourcingResult.quality === 'good'
                          ? 'bg-emerald-100 text-emerald-800'
                          : sourcingResult.quality === 'moderate'
                          ? 'bg-amber-100 text-amber-800'
                          : sourcingResult.quality === 'poor'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {sourcingResult.quality || 'matched'} match
                      </span>
                      {sourcingResult.primaryCategory && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold capitalize">
                          🏷️ {sourcingResult.primaryCategory}
                        </span>
                      )}
                    </div>
                    {sourcingResult.latency && (
                      <div className="text-[11px] text-slate-400 font-mono">
                        Gemini: {sourcingResult.latency.geminiMs}ms | DINOv2: {sourcingResult.latency.dinoMs}ms
                      </div>
                    )}
                  </div>
                  {sourcingResult.visualDescription && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <strong>AI Visual Description:</strong> {sourcingResult.visualDescription}
                    </p>
                  )}
                  {sourcingResult.topScore && (
                    <div className="text-xs text-slate-500">
                      Highest Similarity Score: <strong className="text-emerald-600 font-mono">{(sourcingResult.topScore * 100).toFixed(1)}%</strong>
                    </div>
                  )}
                </div>

                {/* Match Cards */}
                {sourcingResult.matches && sourcingResult.matches.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                    {sourcingResult.matches.map((item: any, idx: number) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between hover:border-[#31A895] transition-colors">
                        <div>
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.title} className="w-full h-36 object-contain bg-slate-50 p-2" />
                          ) : (
                            <div className="w-full h-36 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">No image</div>
                          )}
                          <div className="p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{item.store_name || 'Retail'}</span>
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {item.score ? `${(item.score * 100).toFixed(0)}% match` : 'Match'}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-800 line-clamp-2" title={item.title}>{item.title}</h4>
                            <p className="text-xs font-extrabold text-[#31A895]">
                              {item.price_egp ? `${item.price_egp.toLocaleString()} EGP` : 'Price upon request'}
                            </p>
                          </div>
                        </div>
                        {item.product_url && (
                          <div className="p-3 pt-0">
                            <a
                              href={item.product_url}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-center text-xs font-semibold py-1.5 px-3 bg-slate-100 hover:bg-[#31A895] hover:text-white rounded-lg transition-colors text-slate-700"
                            >
                              View Product ↗
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-48 flex items-center justify-center text-slate-400 text-xs text-center p-4">
                    {sourcingResult.rejectionReason || 'No catalog matches found for this query'}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-64 flex items-center justify-center text-slate-400 text-sm">
                Search results will appear here
              </div>
            )}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <JsonInspector request={sourcingReq} response={sourcingRes} curl={sourcingCurl} duration={sourcingDuration} />
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Scene Sourcing (Multi-Element) ── */}
      {activeTab === 'sourcing-multi' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Multi-Element Scene Sourcing</h2>
              <p className="text-xs text-slate-500 mt-1">
                Detect all furniture in a room scene and source matching catalog products simultaneously
              </p>
            </div>

            <ImageDropzone
              label="Full Room Scene Photo (required)"
              value={multiImage}
              onChange={setMultiImage}
              onUrlChange={setMultiImage}
              id="multi-img"
              onUpload={uploadToCloudinary}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Store Filter</label>
                <select value={multiStore} onChange={(e) => setMultiStore(e.target.value)} className={selectClass}>
                  {SOURCING_STORES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Items Per Element</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={multiLimit}
                  onChange={(e) => setMultiLimit(Number(e.target.value))}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#31A895]/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Min Price (EGP)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={multiMinPrice}
                  onChange={(e) => setMultiMinPrice(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#31A895]/40"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Max Price (EGP)</label>
                <input
                  type="number"
                  placeholder="100000"
                  value={multiMaxPrice}
                  onChange={(e) => setMultiMaxPrice(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#31A895]/40"
                />
              </div>
            </div>

            {multiError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">⚠️ {multiError}</div>
            )}

            <button
              onClick={runMultiSourcing}
              disabled={multiLoading}
              className="w-full bg-[#31A895] text-white text-sm font-semibold py-3 rounded-xl hover:bg-[#2a8f7e] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {multiLoading ? <Spinner label="Extracting Elements &amp; Matching Scene..." /> : '🛋️ Source All Room Elements'}
            </button>
          </div>

          <div className="space-y-4">
            {multiResult ? (
              <div className="space-y-4">
                {/* Meta summary */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      Found {multiResult.totalResults || 0} Products across {multiResult.detectedCategories?.length || 0} Categories
                    </span>
                    {multiResult.latency && (
                      <div className="text-[11px] text-slate-400 font-mono">
                        Total: {multiResult.latency.totalMs}ms
                      </div>
                    )}
                  </div>
                  {multiResult.detectedCategories && multiResult.detectedCategories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {multiResult.detectedCategories.map((cat: string) => (
                        <span key={cat} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200 capitalize">
                          ✓ {cat}
                        </span>
                      ))}
                    </div>
                  )}
                  {multiResult.visualDescription && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <strong>AI Scene Breakdown:</strong> {multiResult.visualDescription}
                    </p>
                  )}
                </div>

                {/* Elements Section */}
                {multiResult.elements && multiResult.elements.length > 0 ? (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {multiResult.elements.map((elem: any, eIdx: number) => (
                      <div key={eIdx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            📦 {elem.category || 'Element'} ({elem.totalMatches || elem.matches?.length || 0} matches)
                          </h4>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {(elem.matches || []).map((prod: any, pIdx: number) => (
                            <div key={pIdx} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-2 text-center flex flex-col justify-between">
                              {prod.image_url && (
                                <img src={prod.image_url} alt={prod.title} className="w-full h-24 object-contain mb-1" />
                              )}
                              <p className="text-[11px] font-bold text-slate-700 line-clamp-1" title={prod.title}>{prod.title}</p>
                              <div className="flex justify-between items-center text-[10px] mt-1 pt-1 border-t border-slate-200">
                                <span className="font-bold text-[#31A895]">{prod.price_egp ? `${prod.price_egp.toLocaleString()} EGP` : 'N/A'}</span>
                                <span className="font-mono text-emerald-700">{prod.score ? `${(prod.score * 100).toFixed(0)}%` : ''}</span>
                              </div>
                              {prod.product_url && (
                                <a href={prod.product_url} target="_blank" rel="noreferrer" className="text-[10px] text-[#31A895] font-semibold mt-1 hover:underline">
                                  View ↗
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-48 flex items-center justify-center text-slate-400 text-xs">
                    No scene elements matched
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-64 flex items-center justify-center text-slate-400 text-sm">
                Multi-element matches will appear here
              </div>
            )}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <JsonInspector request={multiReq} response={multiRes} curl={multiCurl} duration={multiDuration} />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 text-xs text-slate-400 pt-2 border-t border-slate-100 flex-wrap">
        <span>🧠 <strong className="text-slate-600">Tier 1 Guard:</strong> gemini-3.5-flash-lite</span>
        <span>·</span>
        <span>🏗️ <strong className="text-slate-600">Orchestrator:</strong> gemini-3.8-flash → 3.6 fallback</span>
        <span>·</span>
        <span>🎨 <strong className="text-slate-600">Vision:</strong> gemini-3.1-flash-image (Nano Banana 2)</span>
        <span>·</span>
        <span>📐 <strong className="text-slate-600">Resolution:</strong> {resolution}</span>
      </div>
    </div>
  );
}
