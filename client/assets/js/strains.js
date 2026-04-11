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
  const STRAINS_CACHE_KEY = 'lp_strains_cache_v1';
  const STRAINS_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
  const STRAIN_DETAIL_PREFETCH_KEY_PREFIX = 'lp_strain_prefetch_v1:';
  const LIVE_SYNC_TIMEOUT_MS = 7000;
  const VALID_STRAIN_FILTERS = ['all', 'sativa', 'indica', 'hybrid'];
  const CARD_IMAGE_WIDTH = 640;
  const CARD_IMAGE_HEIGHT = 390;
  const DEFAULT_SHOP_NAME = "Let's Phuket";
  const SHOP_NAME_CACHE_KEY = 'lp_shop_name_v1';
  const SHOP_NAME_PATTERNS = [/Let['’]s Phuket/g, /Lets Phuket/g];
  let brandTextNodes = null;

  const FALLBACK_STRAINS = [
    { slug: 'tropical-cherry', name: 'Tropical Cherry', strain_type: 'Hybrid', short_description: 'Cherry gelato with papaya diesel - sticky resin and a blissy, island glow.', terpenes: ['Limonene', 'Myrcene'], mood_aroma: 'Blissed - Heavy', image_url: 'image/default.jpg', image_alt: 'Tropical Cherry strain flower', sort_order: 1 },
    { slug: 'subzero', name: 'Subzero', strain_type: 'Hybrid', short_description: 'Frosty gas with minty inhale and a clear, chilled headspace.', terpenes: ['Caryophyllene', 'Limonene'], mood_aroma: 'Icy - Focused', image_url: 'image/default.jpg', image_alt: 'Subzero strain flower', sort_order: 2 },
    { slug: 'banana-daddy', name: 'Banana Daddy', strain_type: 'Indica', short_description: 'Ripe banana bread and grape candy with a mellow, grinny body feel.', terpenes: ['Myrcene', 'Linalool'], mood_aroma: 'Cozy - Euphoric', image_url: 'image/default.jpg', image_alt: 'Banana Daddy strain flower', sort_order: 3 },
    { slug: 'blueberry-muffin', name: 'BlueBerry Muffin', strain_type: 'Hybrid', short_description: 'Warm blueberry muffin nose with a creamy finish and calming exhale.', terpenes: ['Myrcene', 'Pinene'], mood_aroma: 'Happy - Relaxed', image_url: 'image/default.jpg', image_alt: 'BlueBerry Muffin strain flower', sort_order: 4 },
    { slug: 'pink-runtz', name: 'Pink Runtz', strain_type: 'Hybrid', short_description: 'Cotton candy and tropical sherbet with a mellow, floaty lift.', terpenes: ['Caryophyllene', 'Limonene'], mood_aroma: 'Euphoric - Social', image_url: 'image/default.jpg', image_alt: 'Pink Runtz strain flower', sort_order: 5 },
    { slug: 'tea-time', name: 'Tea Time', strain_type: 'Hybrid', short_description: 'Earl grey, lemon zest, and a smooth calm that stays clear and chatty.', terpenes: ['Linalool', 'Caryophyllene'], mood_aroma: 'Calm - Focused', image_url: 'image/Teatime.jpg', image_alt: 'Tea Time strain flower', sort_order: 6 },
    { slug: 'lgbtq', name: 'LGBTQ', strain_type: 'Sativa', short_description: 'Rainbow sherbet nose with passionfruit pop and an upbeat social lift.', terpenes: ['Limonene', 'Terpinolene'], mood_aroma: 'Uplifted - Creative', image_url: 'image/LGBTQ.jpg', image_alt: 'LGBTQ strain flower', sort_order: 7 },
    { slug: 'zupa', name: 'ZuPa', strain_type: 'Hybrid', short_description: 'Tropical candy with creamy gas and a floaty, euphoric body melt.', terpenes: ['Myrcene', 'Caryophyllene'], mood_aroma: 'Relaxed - Euphoric', image_url: 'image/Zupa.jpg', image_alt: 'ZuPa strain flower', sort_order: 8 },
    { slug: 'neon-icon', name: 'Neon Icon', strain_type: 'Sativa', short_description: 'Electric citrus and guava ice that keeps conversations bright and focused.', terpenes: ['Ocimene', 'Limonene'], mood_aroma: 'Social - Focused', image_url: 'image/Neonicon.jpg', image_alt: 'Neon Icon strain flower', sort_order: 9 },
    { slug: 'super-boof', name: 'Super Boof', strain_type: 'Hybrid', short_description: 'Tangerine peel with earthy cookie, floaty chatter without the couch-lock.', terpenes: ['Caryophyllene', 'Linalool'], mood_aroma: 'Talkative - Relaxed', image_url: 'image/default.jpg', image_alt: 'Super Boof strain flower', sort_order: 10 }
  ];

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
  let dataSource = 'fallback';
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

  function readCachedStrains() {
    try {
      const raw = localStorage.getItem(STRAINS_CACHE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        // Legacy payload format had no timestamp and could remain stale forever.
        localStorage.removeItem(STRAINS_CACHE_KEY);
        return [];
      }

      const cachedAt = Number(parsed?.updatedAt || 0);
      const ageMs = Date.now() - cachedAt;
      const isFresh = Number.isFinite(cachedAt) && cachedAt > 0 && Number.isFinite(ageMs) && ageMs <= STRAINS_CACHE_MAX_AGE_MS;
      if (!isFresh) {
        localStorage.removeItem(STRAINS_CACHE_KEY);
        return [];
      }

      if (Array.isArray(parsed?.strains)) return parsed.strains;
      return [];
    } catch (error) {
      console.warn('Failed to read strains cache.', error);
      return [];
    }
  }

  function writeCachedStrains(strains) {
    if (!Array.isArray(strains) || strains.length === 0) return;
    try {
      localStorage.setItem(STRAINS_CACHE_KEY, JSON.stringify({
        updatedAt: Date.now(),
        strains
      }));
    } catch (error) {
      console.warn('Failed to write strains cache.', error);
    }
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

  function getCurrentCatalogLabel() {
    return dataSource === 'cache' ? 'last synced catalog' : 'local catalog';
  }

  function setRefreshingStatus() {
    if (dataSource === 'cache') {
      setStatus('Showing last synced catalog. Refreshing live data...');
    } else {
      setStatus('Refreshing live catalog...');
    }
  }

  function setLiveUnavailableStatus() {
    const sourceLabel = getCurrentCatalogLabel();
    if (navigator.onLine === false) {
      setStatus(`Offline mode. Showing ${sourceLabel}.`);
    } else {
      setStatus(`Live sync unavailable. Showing ${sourceLabel}.`);
    }
  }

  function setTimeoutStatus() {
    const sourceLabel = getCurrentCatalogLabel();
    setStatus(`Live sync timed out. Showing ${sourceLabel}.`);
  }

  function setNoUpdatesStatus() {
    if (dataSource === 'cache') {
      setStatus('No published live updates found. Showing last synced catalog.');
    } else {
      setStatus('No published live strains found. Showing local catalog.');
    }
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
        .select('slug,name,strain_type,short_description,terpenes,mood_aroma,image_url,image_alt,sort_order')
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

      return `
        <a class="strain-card-link" href="${detailHref}">
          <article class="strain-card">
            <div class="strain-media">
              <picture>
                ${image.avifSrcset ? `<source type="image/avif" srcset="${escapeHtml(image.avifSrcset)}" sizes="${imgSizes}">` : ''}
                ${image.webpSrcset ? `<source type="image/webp" srcset="${escapeHtml(image.webpSrcset)}" sizes="${imgSizes}">` : ''}
                <img src="${escapeHtml(image.src)}" ${image.srcset ? `srcset="${escapeHtml(image.srcset)}"` : ''} sizes="${imgSizes}" alt="${imgAlt}" loading="lazy" decoding="async" width="${CARD_IMAGE_WIDTH}" height="${CARD_IMAGE_HEIGHT}">
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

  function setStrains(strains, source = 'live') {
    allStrains = Array.isArray(strains) ? strains : [];
    strainBySlug = new Map(allStrains.map((item) => [String(item?.slug || '').toLowerCase(), item]));
    dataSource = source;
    visibleCount = 0;
    if (grid) grid.innerHTML = '';
    loadMore();
    updateHeaderAndControls();
  }

  async function loadAllStrainsInBackground() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      fetchShopNameViaRest()
        .then((name) => {
          if (name) applyLiveShopName(name);
        })
        .catch((_error) => {
          // Keep fallback branding when REST lookup is unavailable.
        });
      setLiveUnavailableStatus();
      return;
    }

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

    setRefreshingStatus();

    try {
      const { data, error } = await fetchPublishedStrainsWithTimeout(supabase, LIVE_SYNC_TIMEOUT_MS);

      if (error) throw error;

      if (Array.isArray(data) && data.length > 0) {
        setStrains(data, 'live');
        writeCachedStrains(data);
        setStatus('');
      } else {
        setNoUpdatesStatus();
      }
    } catch (error) {
      console.error('Failed to load strains. Falling back to local content.', error);
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

  const cachedStrains = readCachedStrains();
  if (cachedStrains.length > 0) {
    setStrains(cachedStrains, 'cache');
    setRefreshingStatus();
  } else {
    setStrains(FALLBACK_STRAINS, 'fallback');
  }
  loadAllStrainsInBackground();
});
