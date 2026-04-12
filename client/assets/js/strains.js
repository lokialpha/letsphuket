document.addEventListener('DOMContentLoaded', () => {
  const gate = document.getElementById('age-gate');
  const yesBtn = document.getElementById('age-yes');
  const noBtn = document.getElementById('age-no');
  const warning = document.getElementById('age-warning');
  const page = document.getElementById('page');
  const grid = document.getElementById('all-strain-grid');
  const heading = document.getElementById('all-strains-heading');
  const status = document.getElementById('all-strains-status');
  const loadMoreWrap = document.getElementById('all-strains-load-more-wrap');
  const loadMoreBtn = document.getElementById('all-strains-load-more');
  const searchInput = document.getElementById('strain-search-input');
  const filterButtons = Array.from(document.querySelectorAll('[data-strain-filter]'));

  const defaultStrainImg = '/image/default.jpg';
  const PAGE_SIZE = 12;
  const STRAIN_DETAIL_PREFETCH_KEY_PREFIX = 'lp_strain_prefetch_v1:';
  const LIVE_SYNC_TIMEOUT_MS = 7000;
  const STRAIN_IMAGE_FETCH_TIMEOUT_MS = 12000;
  const MAX_PARALLEL_IMAGE_FETCHES = 2;
  const VALID_STRAIN_FILTERS = ['all', 'sativa', 'indica', 'hybrid'];
  const CARD_IMAGE_WIDTH = 640;
  const CARD_IMAGE_HEIGHT = 390;
  const DEFAULT_SHOP_NAME = "Let's Phuket";
  const SHOP_NAME_CACHE_KEY = 'lp_shop_name_v1';
  const SHOP_NAME_PATTERNS = [/Let['’]s Phuket/g, /Lets Phuket/g];
  let brandTextNodes = null;

  const LEAF_ICON = '<svg viewBox="0 0 64 64"><path d="M32 6c4 9 6 13 10 16 6 4 11 2 11 2s-4 6-10 8c-3 1-8 1-11-1 1 7 3 14 2 23l-3-8-3 8c-1-9 1-16 2-23-3 2-8 2-11 1-6-2-10-8-10-8s5 2 11-2c4-3 6-7 10-16z" /></svg>';

  function normalizeShopName(value) {
    const name = String(value || '').trim();
    return name || DEFAULT_SHOP_NAME;
  }

  function readCachedShopName() {
    try {
      const cached = String(localStorage.getItem(SHOP_NAME_CACHE_KEY) || '').trim();
      return cached || null;
    } catch (_error) {
      return null;
    }
  }

  function writeCachedShopName(value) {
    const safeName = normalizeShopName(value);

    try {
      localStorage.setItem(SHOP_NAME_CACHE_KEY, safeName);
    } catch (_error) {
      // Ignore storage write failures (private mode/quota limits).
    }
  }

  function replaceBrandText(template, shopName) {
    return SHOP_NAME_PATTERNS.reduce((output, pattern) => output.replace(pattern, shopName), String(template || ''));
  }

  function getBrandTextNodes() {
    if (Array.isArray(brandTextNodes)) return brandTextNodes;

    brandTextNodes = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const text = String(node.nodeValue || '');
      if (SHOP_NAME_PATTERNS.some((pattern) => {
        pattern.lastIndex = 0;
        return pattern.test(text);
      })) {
        node.__brandTemplate = text;
        brandTextNodes.push(node);
      }
      node = walker.nextNode();
    }
    return brandTextNodes;
  }

  function applyShopNameToPageText(shopName) {
    getBrandTextNodes().forEach((node) => {
      const template = String(node.__brandTemplate || node.nodeValue || '');
      node.nodeValue = replaceBrandText(template, shopName);
    });
  }

  function applyShopNameToMeta(shopName) {
    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) {
      const template = String(descriptionMeta.__brandTemplate || descriptionMeta.getAttribute('content') || '');
      descriptionMeta.__brandTemplate = template;
      descriptionMeta.setAttribute('content', replaceBrandText(template, shopName));
    }
  }

  function applyShopBranding(value) {
    const safeName = normalizeShopName(value);
    applyShopNameToPageText(safeName);
    applyShopNameToMeta(safeName);

    document.querySelectorAll('[data-shop-name]').forEach((element) => {
      element.textContent = safeName;
    });

    document.querySelectorAll('[data-shop-back-home]').forEach((element) => {
      element.textContent = `Back to ${safeName}`;
    });

    document.title = `All Strains | ${safeName}`;
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.setAttribute('content', safeName);
  }

  function applyLiveShopName(value) {
    const safeName = normalizeShopName(value);
    applyShopBranding(safeName);
    writeCachedShopName(safeName);
  }

  applyShopBranding(readCachedShopName() || DEFAULT_SHOP_NAME);

  window.addEventListener('storage', (event) => {
    if (event.key !== SHOP_NAME_CACHE_KEY) return;
    applyShopBranding(event.newValue);
  });

  async function fetchShopNameViaRest() {
    const cfg = window.__SUPABASE_CONFIG__;
    const baseUrl = String(cfg?.url || '').trim();
    const anonKey = String(cfg?.anonKey || '').trim();
    if (!baseUrl.startsWith('https://') || anonKey.length < 20) return null;

    const endpoint = `${baseUrl}/rest/v1/shop_profile?id=eq.1&select=name`;
    const response = await fetch(endpoint, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`
      }
    });
    if (!response.ok) return null;

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const name = String(data[0]?.name || '').trim();
    return name || null;
  }

  let allStrains = [];
  let strainBySlug = new Map();
  let visibleCount = 0;
  let activeFilter = 'all';
  let searchQuery = '';
  let imageHydrationSupabase = null;
  const strainImageCache = new Map();
  const strainImageInFlight = new Map();
  const prefetchedDetailDocuments = new Set();
  const prefetchedDetailSlugs = new Set();
  const supportsLinkPrefetch = (() => {
    const link = document.createElement('link');
    return Boolean(link.relList?.supports?.('prefetch'));
  })();
  const detailPrefetchObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const link = entry.target;
        detailPrefetchObserver.unobserve(link);
        const slug = String(link.dataset.prefetchSlug || '').trim().toLowerCase();
        prefetchStrainDetail(slug, link.href);
      });
    }, { rootMargin: '180px 0px', threshold: 0.01 })
    : null;

  function setUnlocked() {
    gate.classList.add('hidden');
    document.body.classList.remove('age-locked');
    warning.textContent = '';
  }

  function setLocked() {
    gate.classList.remove('hidden');
    document.body.classList.add('age-locked');
  }

  const alreadyVerified = localStorage.getItem('lp_ageVerified') === 'true';
  if (alreadyVerified) setUnlocked();
  else setLocked();

  yesBtn?.addEventListener('click', () => {
    localStorage.setItem('lp_ageVerified', 'true');
    setUnlocked();
  });

  noBtn?.addEventListener('click', () => {
    warning.textContent = 'We can only serve guests 20 and up under Thai law. Come back when it is your time.';
    page?.scrollTo({ top: 0, behavior: 'smooth' });
  });

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function normalizeType(value) {
    const type = String(value ?? '').toLowerCase();
    if (type === 'sativa' || type === 'indica' || type === 'hybrid') return type;
    return 'hybrid';
  }

  function formatList(value) {
    if (Array.isArray(value)) return value.filter(Boolean).join(' · ');
    return String(value ?? '').trim();
  }

  function getSearchableText(strain) {
    return [
      strain?.name,
      strain?.strain_type,
      strain?.short_description,
      formatList(strain?.terpenes),
      strain?.mood_aroma
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  }

  function readBrowseStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const rawType = String(params.get('type') || 'all').toLowerCase();
    const rawQuery = String(params.get('q') || '').trim();

    return {
      type: VALID_STRAIN_FILTERS.includes(rawType) ? rawType : 'all',
      query: rawQuery
    };
  }

  function syncBrowseStateToUrl() {
    const url = new URL(window.location.href);
    if (activeFilter === 'all') url.searchParams.delete('type');
    else url.searchParams.set('type', activeFilter);

    if (searchQuery) url.searchParams.set('q', searchQuery);
    else url.searchParams.delete('q');

    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) window.history.replaceState(null, '', next);
  }

  function applyBrowseState(options = {}) {
    const shouldSyncUrl = options.syncUrl !== false;
    setActiveFilterUi();
    if (searchInput && searchInput.value !== searchQuery) searchInput.value = searchQuery;
    visibleCount = 0;
    if (grid) grid.innerHTML = '';
    loadMore();
    updateHeaderAndControls();
    if (shouldSyncUrl) syncBrowseStateToUrl();
  }

  function getFilteredStrains() {
    const typeFiltered = activeFilter === 'all'
      ? allStrains
      : allStrains.filter((strain) => normalizeType(strain.strain_type) === activeFilter);
    if (!searchQuery) return typeFiltered;

    const needle = searchQuery.toLowerCase();
    return typeFiltered.filter((strain) => getSearchableText(strain).includes(needle));
  }

  function typeLabel(type) {
    if (type === 'all') return 'All';
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  function setActiveFilterUi() {
    filterButtons.forEach((btn) => {
      const isActive = btn.dataset.strainFilter === activeFilter;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
  }

  function resolveImageUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return defaultStrainImg;
    if (/^(https?:\/\/|data:|blob:|\/)/i.test(raw)) return raw;
    return raw.startsWith('image/') ? `/${raw}` : raw;
  }

  function getSlugFromHref(href) {
    try {
      const url = new URL(String(href || ''), window.location.href);
      return String(url.searchParams.get('slug') || '').trim().toLowerCase();
    } catch {
      return '';
    }
  }

  function isSupabaseStorageUrl(url) {
    return /^https?:\/\//i.test(url) && url.includes('/storage/v1/object/');
  }

  function buildSupabaseThumbUrl(url, options = {}) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('width', String(options.width ?? CARD_IMAGE_WIDTH));
      parsed.searchParams.set('height', String(options.height ?? CARD_IMAGE_HEIGHT));
      parsed.searchParams.set('resize', 'cover');
      parsed.searchParams.set('quality', String(options.quality ?? 70));
      if (options.format) parsed.searchParams.set('format', options.format);
      else parsed.searchParams.delete('format');
      return parsed.toString();
    } catch {
      return url;
    }
  }

  function getCardImageSources(imageUrl) {
    const originalUrl = resolveImageUrl(imageUrl || defaultStrainImg);
    if (!isSupabaseStorageUrl(originalUrl)) {
      return {
        src: originalUrl,
        srcset: '',
        avifSrcset: '',
        webpSrcset: ''
      };
    }

    const fallback1x = buildSupabaseThumbUrl(originalUrl, { quality: 72 });
    const fallback2x = buildSupabaseThumbUrl(originalUrl, {
      width: CARD_IMAGE_WIDTH * 2,
      height: CARD_IMAGE_HEIGHT * 2,
      quality: 62
    });
    const webp1x = buildSupabaseThumbUrl(originalUrl, { format: 'webp', quality: 72 });
    const webp2x = buildSupabaseThumbUrl(originalUrl, {
      width: CARD_IMAGE_WIDTH * 2,
      height: CARD_IMAGE_HEIGHT * 2,
      format: 'webp',
      quality: 62
    });
    const avif1x = buildSupabaseThumbUrl(originalUrl, { format: 'avif', quality: 62 });
    const avif2x = buildSupabaseThumbUrl(originalUrl, {
      width: CARD_IMAGE_WIDTH * 2,
      height: CARD_IMAGE_HEIGHT * 2,
      format: 'avif',
      quality: 54
    });

    return {
      src: fallback1x,
      srcset: `${fallback1x} 1x, ${fallback2x} 2x`,
      webpSrcset: `${webp1x} 1x, ${webp2x} 2x`,
      avifSrcset: `${avif1x} 1x, ${avif2x} 2x`
    };
  }

  function getSupabaseClient() {
    const cfg = window.__SUPABASE_CONFIG__;
    const createClient = window.supabase?.createClient;
    if (!createClient || !cfg) return null;

    const hasValidUrl = typeof cfg.url === 'string' && cfg.url.startsWith('https://');
    const hasValidKey = typeof cfg.anonKey === 'string' && cfg.anonKey.length > 20;
    if (!hasValidUrl || !hasValidKey) return null;

    return createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: false }
    });
  }

  async function fetchStrainImageBySlugWithTimeout(supabase, slug, timeoutMs = STRAIN_IMAGE_FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    let timeoutId = 0;

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        controller.abort();
        reject(createTimeoutError(timeoutMs));
      }, timeoutMs);
    });

    try {
      let query = supabase
        .from('strains')
        .select('slug,image_url,image_alt')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (typeof query.abortSignal === 'function') {
        query = query.abortSignal(controller.signal);
      }

      const result = await Promise.race([query, timeoutPromise]);
      if (result?.error) throw result.error;
      return result?.data || null;
    } catch (error) {
      if (controller.signal.aborted && error?.name !== 'TimeoutError') {
        throw createTimeoutError(timeoutMs);
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function cacheStrainImage(slug, payload) {
    if (!slug || !payload?.image_url) return;
    const normalizedSlug = String(slug).toLowerCase();
    const target = strainBySlug.get(normalizedSlug);
    if (!target) return;
    target.image_url = payload.image_url;
    if (payload.image_alt) target.image_alt = payload.image_alt;
  }

  async function getStrainImageBySlug(supabase, slug) {
    const normalizedSlug = String(slug || '').trim().toLowerCase();
    if (!normalizedSlug) return null;

    if (strainImageCache.has(normalizedSlug)) {
      return strainImageCache.get(normalizedSlug);
    }

    if (strainImageInFlight.has(normalizedSlug)) {
      return strainImageInFlight.get(normalizedSlug);
    }

    const request = (async () => {
      try {
        const data = await fetchStrainImageBySlugWithTimeout(supabase, normalizedSlug, STRAIN_IMAGE_FETCH_TIMEOUT_MS);
        const imageUrl = String(data?.image_url || '').trim();
        const imageAlt = String(data?.image_alt || '').trim();
        if (!imageUrl) return null;

        const payload = { image_url: imageUrl, image_alt: imageAlt || null };
        strainImageCache.set(normalizedSlug, payload);
        cacheStrainImage(normalizedSlug, payload);
        return payload;
      } catch (error) {
        console.warn(`Failed to hydrate image for slug "${normalizedSlug}".`, error);
        return null;
      } finally {
        strainImageInFlight.delete(normalizedSlug);
      }
    })();

    strainImageInFlight.set(normalizedSlug, request);
    return request;
  }

  async function hydrateRenderedCardImages() {
    const supabase = imageHydrationSupabase || getSupabaseClient();
    if (!supabase || !grid) return;

    const imageNodes = Array.from(grid.querySelectorAll('.strain-media img[data-strain-slug]'))
      .filter((img) => img.dataset.imageHydrated !== 'true');
    if (!imageNodes.length) return;

    const nodesBySlug = new Map();
    imageNodes.forEach((img) => {
      const slug = String(img.dataset.strainSlug || '').trim().toLowerCase();
      if (!slug) return;
      if (!nodesBySlug.has(slug)) nodesBySlug.set(slug, []);
      nodesBySlug.get(slug).push(img);
    });

    const slugs = Array.from(nodesBySlug.keys());
    if (!slugs.length) return;

    let cursor = 0;
    const workerCount = Math.min(MAX_PARALLEL_IMAGE_FETCHES, slugs.length);

    const workers = Array.from({ length: workerCount }, async () => {
      while (cursor < slugs.length) {
        const slug = slugs[cursor];
        cursor += 1;

        const payload = await getStrainImageBySlug(supabase, slug);
        const targets = nodesBySlug.get(slug) || [];

        targets.forEach((img) => {
          if (payload?.image_url) {
            img.src = resolveImageUrl(payload.image_url);
            if (payload.image_alt) img.alt = payload.image_alt;
          }
          img.dataset.imageHydrated = 'true';
        });
      }
    });

    await Promise.all(workers);
  }

  function writePrefetchedStrainDetail(strain) {
    const slug = String(strain?.slug || '').trim().toLowerCase();
    if (!slug) return;
    try {
      sessionStorage.setItem(`${STRAIN_DETAIL_PREFETCH_KEY_PREFIX}${slug}`, JSON.stringify({
        cachedAt: Date.now(),
        strain
      }));
    } catch (error) {
      console.warn('Failed to write prefetched strain detail.', error);
    }
  }

  function prefetchDetailDocument(href) {
    if (!href || prefetchedDetailDocuments.has(href)) return;
    prefetchedDetailDocuments.add(href);

    if (supportsLinkPrefetch) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'document';
      link.href = href;
      document.head.appendChild(link);
      return;
    }

    fetch(href, { credentials: 'same-origin' }).catch(() => {
      prefetchedDetailDocuments.delete(href);
    });
  }

  function prefetchStrainDetail(slug, href) {
    const normalizedSlug = String(slug || '').trim().toLowerCase();
    if (!normalizedSlug || prefetchedDetailSlugs.has(normalizedSlug)) {
      prefetchDetailDocument(href);
      return;
    }

    prefetchedDetailSlugs.add(normalizedSlug);
    prefetchDetailDocument(href);

    const strain = strainBySlug.get(normalizedSlug);
    if (strain) writePrefetchedStrainDetail(strain);
  }

  function setStatus(message = '') {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('hidden', !message);
  }

  function setLoadingStatus() {
    setStatus('Loading strains from database...');
  }

  function setLiveUnavailableStatus() {
    if (navigator.onLine === false) {
      setStatus('You are offline. Could not load strains from database.');
    } else {
      setStatus('Could not load live strains right now.');
    }
  }

  function setTimeoutStatus() {
    setStatus('Live sync timed out while loading strains.');
  }

  function setNoUpdatesStatus() {
    setStatus('No published live strains found yet.');
  }

  function setLoadingView() {
    if (grid) grid.innerHTML = '';
    if (loadMoreWrap) loadMoreWrap.classList.add('hidden');
    if (heading) heading.textContent = 'Loading strains in Thailand...';
    setLoadingStatus();
  }

  function createTimeoutError(timeoutMs) {
    const error = new Error(`Live sync timed out after ${timeoutMs}ms`);
    error.name = 'TimeoutError';
    return error;
  }

  async function fetchPublishedStrainsWithTimeout(supabase, timeoutMs) {
    const controller = new AbortController();
    let timeoutId = 0;

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        controller.abort();
        reject(createTimeoutError(timeoutMs));
      }, timeoutMs);
    });

    try {
      let query = supabase
        .from('strains')
        .select('slug,name,strain_type,short_description,terpenes,mood_aroma,sort_order')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });

      if (typeof query.abortSignal === 'function') {
        query = query.abortSignal(controller.signal);
      }

      return await Promise.race([query, timeoutPromise]);
    } catch (error) {
      if (controller.signal.aborted && error?.name !== 'TimeoutError') {
        throw createTimeoutError(timeoutMs);
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function renderCards(items, append = false) {
    if (!grid) return;
    const html = items.map((strain) => {
      const type = normalizeType(strain.strain_type);
      const terpenes = formatList(strain.terpenes);
      const slug = String(strain.slug || '');
      const detailHref = `./strain.html?slug=${encodeURIComponent(slug)}`;
      const image = getCardImageSources(strain.image_url || defaultStrainImg);
      const imgAlt = escapeHtml(strain.image_alt || `${strain.name} strain flower`);
      const imgSizes = '(max-width: 640px) calc(100vw - 48px), (max-width: 1100px) calc(50vw - 40px), 280px';
      const hasImage = Boolean(String(strain.image_url || '').trim());

      return `
        <a class="strain-card-link" href="${detailHref}">
          <article class="strain-card">
            <div class="strain-media">
              <picture>
                ${image.avifSrcset ? `<source type="image/avif" srcset="${escapeHtml(image.avifSrcset)}" sizes="${imgSizes}">` : ''}
                ${image.webpSrcset ? `<source type="image/webp" srcset="${escapeHtml(image.webpSrcset)}" sizes="${imgSizes}">` : ''}
                <img src="${escapeHtml(image.src)}" ${image.srcset ? `srcset="${escapeHtml(image.srcset)}"` : ''} sizes="${imgSizes}" alt="${imgAlt}" loading="lazy" decoding="async" width="${CARD_IMAGE_WIDTH}" height="${CARD_IMAGE_HEIGHT}" data-strain-slug="${escapeHtml(slug)}" data-image-hydrated="${hasImage ? 'true' : 'false'}">
              </picture>
            </div>
            <div class="strain-top">
              <div class="leaf-icon" aria-hidden="true">${LEAF_ICON}</div>
              <span class="tag ${type}">${escapeHtml(type.charAt(0).toUpperCase() + type.slice(1))}</span>
            </div>
            <h3>${escapeHtml(strain.name)}</h3>
            <p class="strain-preview">${escapeHtml(strain.short_description || '')}</p>
            <div class="specs">
              <span>Terpenes: ${escapeHtml(terpenes)}</span>
              <span>Mood &amp; Aroma: ${escapeHtml(strain.mood_aroma || '')}</span>
            </div>
            <span class="strain-link">View details</span>
          </article>
        </a>
      `;
    }).join('');

    if (append) grid.insertAdjacentHTML('beforeend', html);
    else grid.innerHTML = html;
    bindDetailPrefetchHandlers();
    void hydrateRenderedCardImages();
  }

  function bindDetailPrefetchHandlers() {
    if (!grid) return;
    const links = grid.querySelectorAll('.strain-card-link');
    links.forEach((link) => {
      if (link.dataset.prefetchBound === 'true') return;
      link.dataset.prefetchBound = 'true';

      const slug = getSlugFromHref(link.getAttribute('href'));
      if (!slug) return;

      link.dataset.prefetchSlug = slug;
      const runPrefetch = () => prefetchStrainDetail(slug, link.href);
      link.addEventListener('mouseenter', runPrefetch, { once: true, passive: true });
      link.addEventListener('focus', runPrefetch, { once: true });
      link.addEventListener('touchstart', runPrefetch, { once: true, passive: true });
      detailPrefetchObserver?.observe(link);
    });
  }

  function updateHeaderAndControls() {
    const filtered = getFilteredStrains();
    const searchSuffix = searchQuery ? ` for "${searchQuery}"` : '';
    if (heading) {
      if (activeFilter === 'all') heading.textContent = `${filtered.length} strains in Thailand${searchSuffix}`;
      else heading.textContent = `${filtered.length} ${typeLabel(activeFilter)} strains in Thailand${searchSuffix}`;
    }
    if (loadMoreWrap) {
      const hasMore = visibleCount < filtered.length;
      loadMoreWrap.classList.toggle('hidden', !hasMore);
    }
  }

  function loadMore() {
    const filtered = getFilteredStrains();
    const nextItems = filtered.slice(visibleCount, visibleCount + PAGE_SIZE);
    if (!nextItems.length) return;
    renderCards(nextItems, visibleCount > 0);
    visibleCount += nextItems.length;
    updateHeaderAndControls();
  }

  function setStrains(strains) {
    allStrains = Array.isArray(strains) ? strains : [];
    strainBySlug = new Map(allStrains.map((item) => [String(item?.slug || '').toLowerCase(), item]));
    visibleCount = 0;
    if (grid) grid.innerHTML = '';
    loadMore();
    updateHeaderAndControls();
  }

  async function loadAllStrainsInBackground() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      imageHydrationSupabase = null;
      fetchShopNameViaRest()
        .then((name) => {
          if (name) applyLiveShopName(name);
        })
        .catch((_error) => {
          // Keep local branding when REST lookup is unavailable.
        });
      setStrains([]);
      setLiveUnavailableStatus();
      return;
    }
    imageHydrationSupabase = supabase;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('shop_profile')
          .select('name')
          .eq('id', 1)
          .maybeSingle();

        if (!error && data) {
          applyLiveShopName(data?.name);
          return;
        }
      } catch (_error) {
        // Try REST fallback below.
      }

      const restName = await fetchShopNameViaRest().catch(() => null);
      if (restName) applyLiveShopName(restName);
    })();

    setLoadingStatus();

    try {
      const { data, error } = await fetchPublishedStrainsWithTimeout(supabase, LIVE_SYNC_TIMEOUT_MS);

      if (error) throw error;

      if (Array.isArray(data) && data.length > 0) {
        setStrains(data);
        setStatus('');
      } else {
        setStrains([]);
        setNoUpdatesStatus();
      }
    } catch (error) {
      console.error('Failed to load strains from Supabase.', error);
      setStrains([]);
      if (error?.name === 'TimeoutError') {
        setTimeoutStatus();
      } else {
        setLiveUnavailableStatus();
      }
    }
  }

  loadMoreBtn?.addEventListener('click', loadMore);
  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const selectedType = String(btn.dataset.strainFilter || 'all').toLowerCase();
      if (!VALID_STRAIN_FILTERS.includes(selectedType)) return;
      activeFilter = selectedType;
      applyBrowseState({ syncUrl: true });
    });
  });
  searchInput?.addEventListener('input', () => {
    searchQuery = String(searchInput.value || '').trim();
    applyBrowseState({ syncUrl: true });
  });

  const initialBrowseState = readBrowseStateFromUrl();
  activeFilter = initialBrowseState.type;
  searchQuery = initialBrowseState.query;
  if (searchInput) searchInput.value = searchQuery;
  setActiveFilterUi();
  syncBrowseStateToUrl();

  window.addEventListener('popstate', () => {
    const nextState = readBrowseStateFromUrl();
    activeFilter = nextState.type;
    searchQuery = nextState.query;
    applyBrowseState({ syncUrl: false });
  });

  setLoadingView();
  loadAllStrainsInBackground();
});
