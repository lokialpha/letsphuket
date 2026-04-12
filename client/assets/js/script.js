document.addEventListener('DOMContentLoaded', () => {
  const gate = document.getElementById('age-gate');
  const yesBtn = document.getElementById('age-yes');
  const noBtn = document.getElementById('age-no');
  const warning = document.getElementById('age-warning');
  const page = document.getElementById('page');
  const strainFilterButtons = Array.from(document.querySelectorAll('[data-strain-filter]'));

  const defaultStrainImg = '/image/default.jpg';
  const HOMEPAGE_STRAIN_LIMIT = 10;
  const STRAIN_IMAGE_FETCH_TIMEOUT_MS = 12000;
  const MAX_HOMEPAGE_IMAGE_FETCHES = 2;
  const DEFAULT_SHOP_NAME = "Let's Phuket";
  const SHOP_NAME_CACHE_KEY = 'lp_shop_name_v1';
  const SHOP_NAME_PATTERNS = [/Let['’]s Phuket/g, /Lets Phuket/g];
  let homepageAllStrains = [];
  let activeHomepageFilter = 'all';
  let activeShopName = DEFAULT_SHOP_NAME;
  let brandTextNodes = null;
  const strainImageCache = new Map();
  const strainImageInFlight = new Map();

  const FALLBACK_SHOP_PROFILE = {
    name: DEFAULT_SHOP_NAME,
    visit_lede: 'Drop by our beach-level lounge between Patong and Kamala. Ask for the terp flight and we\'ll line up glass so you can taste the island spectrum.',
    address: '187, 36 Phangnga Rd, Talat Yai, Amphoe Muang, Phuket 83000',
    hours_text: 'Daily 10:00 AM - 12:00 PM',
    whatsapp_url: 'https://wa.me/66628590096',
    map_embed_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7904.215842592954!2d98.39339171929876!3d7.883776347126515!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x305033006d463199%3A0x49f34f4c561f0d75!2sHotel%20California!5e0!3m2!1sen!2sth!4v1765009064854!5m2!1sen!2sth',
    map_note: '2 min walk from the sand - look for the neon leaf above the door.',
    visit_note: 'Visit our physical location. No online sales or delivery are offered through this website.'
  };

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
    activeShopName = normalizeShopName(value);
    applyShopNameToPageText(activeShopName);
    applyShopNameToMeta(activeShopName);

    document.querySelectorAll('[data-shop-name]').forEach((element) => {
      element.textContent = activeShopName;
    });

    const heading = document.querySelector('[data-shop-heading]');
    if (heading) heading.textContent = 'Cannabis Guide';

    const ageCopy = document.querySelector('#age-gate .age-copy');
    if (ageCopy) {
      ageCopy.textContent = 'We love sharing good flower, but Thai law only allows us to serve adults 20+. Confirm your age to enter Cannabis Guide.';
    }

    document.title = `${activeShopName} | Cannabis Guide`;
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.setAttribute('content', activeShopName);
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

  const setUnlocked = () => {
    gate.classList.add('hidden');
    document.body.classList.remove('age-locked');
    warning.textContent = '';
  };

  const setLocked = () => {
    gate.classList.remove('hidden');
    document.body.classList.add('age-locked');
  };

  const alreadyVerified = localStorage.getItem('lp_ageVerified') === 'true';
  if (alreadyVerified) {
    setUnlocked();
  } else {
    setLocked();
  }

  yesBtn?.addEventListener('click', () => {
    localStorage.setItem('lp_ageVerified', 'true');
    setUnlocked();
  });

  noBtn?.addEventListener('click', () => {
    warning.textContent = 'We can only serve guests 20 and up under Thai law. Come back when it is your time.';
    page?.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function formatList(value) {
    if (Array.isArray(value)) {
      return value.filter(Boolean).join(' · ');
    }
    return String(value ?? '').trim();
  }

  function normalizeType(value) {
    const type = String(value ?? '').toLowerCase();
    if (type === 'sativa' || type === 'indica' || type === 'hybrid') {
      return type;
    }
    return 'hybrid';
  }

  function getFilteredStrains(strains, filterType) {
    const list = Array.isArray(strains) ? strains : [];
    if (filterType === 'all') return list;
    return list.filter((strain) => normalizeType(strain.strain_type) === filterType);
  }

  function titleType(type) {
    if (type === 'all') return 'All';
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  function setActiveFilterUi(type) {
    strainFilterButtons.forEach((btn) => {
      const isActive = btn.dataset.strainFilter === type;
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

  function applyImageFallbacks() {
    const setFallback = (img) => {
      if (img.dataset.fallbackApplied === 'true') return;
      img.dataset.fallbackApplied = 'true';
      img.src = defaultStrainImg;
    };

    document.querySelectorAll('.strain-media img').forEach((img) => {
      img.addEventListener('error', () => setFallback(img), { once: true });

      const src = img.getAttribute('src');
      if (
        !src ||
        src.trim() === '' ||
        src.includes('picsum.photos') ||
        src.includes('source.unsplash.com')
      ) {
        setFallback(img);
      }
    });
  }

  function createTimeoutError(timeoutMs) {
    const error = new Error(`Image fetch timed out after ${timeoutMs}ms`);
    error.name = 'TimeoutError';
    return error;
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

  function cacheHomepageStrainImage(slug, payload) {
    if (!slug || !payload?.image_url) return;
    const normalizedSlug = String(slug).toLowerCase();
    const target = homepageAllStrains.find((item) => String(item?.slug || '').toLowerCase() === normalizedSlug);
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
        cacheHomepageStrainImage(normalizedSlug, payload);
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

  async function hydrateHomepageCardImages() {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const imageNodes = Array.from(document.querySelectorAll('#strain-grid .strain-media img[data-strain-slug]'))
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
    const workerCount = Math.min(MAX_HOMEPAGE_IMAGE_FETCHES, slugs.length);

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
          img.dataset.fallbackApplied = 'false';
        });
      }
    });

    await Promise.all(workers);
    applyImageFallbacks();
  }

  function setHomepageLoadingState() {
    const strainGrid = document.getElementById('strain-grid');
    const heading = document.getElementById('strains-heading');
    const seeMoreWrap = document.getElementById('strains-see-more-wrap');

    if (strainGrid) strainGrid.innerHTML = '';
    if (heading) heading.textContent = 'Loading strains in Thailand...';
    if (seeMoreWrap) seeMoreWrap.classList.add('hidden');
  }

  function setHomepageUnavailableState(message) {
    const heading = document.getElementById('strains-heading');
    const seeMoreWrap = document.getElementById('strains-see-more-wrap');

    if (heading) heading.textContent = String(message || 'Could not load strains right now.');
    if (seeMoreWrap) seeMoreWrap.classList.add('hidden');
  }

  function renderStrains(strains) {
    const strainGrid = document.getElementById('strain-grid');
    if (!strainGrid) return;

    strainGrid.innerHTML = strains.map((strain) => {
      const type = normalizeType(strain.strain_type);
      const terpenes = formatList(strain.terpenes);
      const slug = String(strain.slug || '');
      const detailHref = `client/pages/strain.html?slug=${encodeURIComponent(slug)}`;
      const hasImage = Boolean(String(strain.image_url || '').trim());
      return `
        <a class="strain-card-link" href="${detailHref}">
          <article class="strain-card">
            <div class="strain-media">
              <img src="${escapeHtml(resolveImageUrl(strain.image_url || defaultStrainImg))}" alt="${escapeHtml(strain.image_alt || `${strain.name} strain flower`)}" loading="lazy" data-strain-slug="${escapeHtml(slug)}" data-image-hydrated="${hasImage ? 'true' : 'false'}">
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

    const heading = document.getElementById('strains-heading');
    if (heading) heading.textContent = `${strains.length} strains in Thailand`;
  }

  function renderHomepageByFilter() {
    const filtered = getFilteredStrains(homepageAllStrains, activeHomepageFilter);
    const preview = filtered.slice(0, HOMEPAGE_STRAIN_LIMIT);
    renderStrains(preview);

    const heading = document.getElementById('strains-heading');
    if (heading) {
      if (activeHomepageFilter === 'all' && filtered.length > HOMEPAGE_STRAIN_LIMIT) {
        heading.textContent = `Top ${HOMEPAGE_STRAIN_LIMIT} of ${filtered.length} strains in Thailand`;
      } else if (activeHomepageFilter === 'all') {
        heading.textContent = `${filtered.length} featured strains in Thailand`;
      } else {
        heading.textContent = `${filtered.length} ${titleType(activeHomepageFilter)} strains in Thailand`;
      }
    }

    const seeMoreWrap = document.getElementById('strains-see-more-wrap');
    if (seeMoreWrap) {
      seeMoreWrap.classList.toggle('hidden', filtered.length <= HOMEPAGE_STRAIN_LIMIT);
    }

    applyImageFallbacks();
    void hydrateHomepageCardImages();
  }

  function applyHomepageStrains(strains) {
    homepageAllStrains = Array.isArray(strains) ? strains : [];
    renderHomepageByFilter();
  }

  function applyFeaturedStrain(strains) {
    const list = Array.isArray(strains) ? strains : [];
    if (!list.length) {
      setFeaturedEmptyState();
      return;
    }

    const featuredByFlag = list.find((strain) => Boolean(strain.is_featured));
    const toTimestamp = (value) => {
      const ts = Date.parse(String(value || ''));
      return Number.isFinite(ts) ? ts : 0;
    };

    const featured = featuredByFlag || [...list]
      .sort((a, b) => {
        const bTs = toTimestamp(b.updated_at || b.created_at);
        const aTs = toTimestamp(a.updated_at || a.created_at);
        if (bTs !== aTs) return bTs - aTs;
        return Number(a.sort_order ?? 1000000) - Number(b.sort_order ?? 1000000);
      })[0];

    if (!featured) return;

    const terpenes = formatList(featured.terpenes);

    const badgeName = document.getElementById('featured-badge-name');
    const badgeTerpenes = document.getElementById('featured-badge-terpenes');
    const cardName = document.getElementById('featured-card-name');
    const cardDescription = document.getElementById('featured-card-description');
    const cardTerpenes = document.getElementById('featured-card-terpenes');
    const cardMood = document.getElementById('featured-card-mood');

    if (badgeName) badgeName.textContent = featured.name;
    if (badgeTerpenes) badgeTerpenes.textContent = terpenes.replaceAll(' · ', ' × ');
    if (cardName) cardName.textContent = featured.name;
    if (cardDescription) cardDescription.textContent = featured.short_description || '';
    if (cardTerpenes) cardTerpenes.textContent = terpenes;
    if (cardMood) cardMood.textContent = String(featured.mood_aroma || '').replaceAll('-', '•');
  }

  function setFeaturedLoadingState() {
    const badgeName = document.getElementById('featured-badge-name');
    const badgeTerpenes = document.getElementById('featured-badge-terpenes');
    const cardName = document.getElementById('featured-card-name');
    const cardDescription = document.getElementById('featured-card-description');
    const cardTerpenes = document.getElementById('featured-card-terpenes');
    const cardMood = document.getElementById('featured-card-mood');

    if (badgeName) badgeName.textContent = 'Loading...';
    if (badgeTerpenes) badgeTerpenes.textContent = 'Loading...';
    if (cardName) cardName.textContent = 'Loading...';
    if (cardDescription) cardDescription.textContent = 'Loading featured strain from database...';
    if (cardTerpenes) cardTerpenes.textContent = 'Loading...';
    if (cardMood) cardMood.textContent = 'Loading...';
  }

  function setFeaturedEmptyState() {
    const badgeName = document.getElementById('featured-badge-name');
    const badgeTerpenes = document.getElementById('featured-badge-terpenes');
    const cardName = document.getElementById('featured-card-name');
    const cardDescription = document.getElementById('featured-card-description');
    const cardTerpenes = document.getElementById('featured-card-terpenes');
    const cardMood = document.getElementById('featured-card-mood');

    if (badgeName) badgeName.textContent = 'No featured strain';
    if (badgeTerpenes) badgeTerpenes.textContent = 'Add published strains in Supabase';
    if (cardName) cardName.textContent = 'No featured strain';
    if (cardDescription) cardDescription.textContent = 'No published strains are available yet.';
    if (cardTerpenes) cardTerpenes.textContent = '-';
    if (cardMood) cardMood.textContent = '-';
  }

  function safeMapUrl(value) {
    const url = String(value || '').trim();
    if (!url) return null;

    try {
      const parsed = new URL(url);
      const isGoogleMaps = parsed.hostname === 'www.google.com' && parsed.pathname.startsWith('/maps/embed');
      if (parsed.protocol === 'https:' && isGoogleMaps) {
        return parsed.toString();
      }
      return null;
    } catch (_error) {
      return null;
    }
  }

  function safeWhatsappUrl(value) {
    const url = String(value || '').trim();
    if (!url) return null;

    try {
      const parsed = new URL(url);
      const allowedHost = parsed.hostname === 'wa.me' || parsed.hostname === 'api.whatsapp.com';
      if (parsed.protocol === 'https:' && allowedHost) {
        return parsed.toString();
      }
      return null;
    } catch (_error) {
      return null;
    }
  }

  function applyShopProfile(shop) {
    if (!shop) {
      applyShopBranding(DEFAULT_SHOP_NAME);
      return;
    }

    applyShopBranding(shop.name);
    writeCachedShopName(shop.name);

    const visitLede = document.getElementById('visit-lede');
    const visitAddress = document.getElementById('visit-address');
    const visitHours = document.getElementById('visit-hours');
    const visitWhatsapp = document.getElementById('visit-whatsapp');
    const visitMap = document.getElementById('visit-map');
    const visitMapNote = document.getElementById('visit-map-note');
    const visitNote = document.getElementById('visit-note');

    if (visitLede && shop.visit_lede) visitLede.textContent = shop.visit_lede;
    if (visitAddress && shop.address) visitAddress.textContent = shop.address;
    if (visitHours && shop.hours_text) visitHours.textContent = shop.hours_text;

    const whatsappUrl = safeWhatsappUrl(shop.whatsapp_url);
    if (visitWhatsapp && whatsappUrl) {
      visitWhatsapp.href = whatsappUrl;
    }

    const mapUrl = safeMapUrl(shop.map_embed_url);
    if (visitMap && mapUrl) {
      visitMap.src = mapUrl;
    }

    if (visitMapNote && shop.map_note) visitMapNote.textContent = shop.map_note;
    if (visitNote && shop.visit_note) visitNote.textContent = shop.visit_note;
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

  async function loadContent() {
    setHomepageLoadingState();
    setFeaturedLoadingState();

    const supabase = getSupabaseClient();

    if (!supabase) {
      fetchShopNameViaRest()
        .then((name) => {
          if (name) applyLiveShopName(name);
        })
        .catch((_error) => {
          // Keep local branding when REST lookup is unavailable.
        });

      applyHomepageStrains([]);
      applyShopProfile(FALLBACK_SHOP_PROFILE);
      setHomepageUnavailableState('Supabase is not configured. Strains are unavailable.');
      setFeaturedEmptyState();
      applyImageFallbacks();
      return;
    }

    try {
      const [strainsResult, shopResult] = await Promise.allSettled([
        supabase
          .from('strains')
          .select('slug,name,strain_type,short_description,terpenes,mood_aroma,sort_order,is_featured,updated_at')
          .eq('is_published', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('shop_profile')
          .select('name,visit_lede,address,hours_text,whatsapp_url,map_embed_url,map_note,visit_note')
          .eq('id', 1)
          .maybeSingle()
      ]);

      const strainsRes = strainsResult.status === 'fulfilled' ? strainsResult.value : null;
      const shopRes = shopResult.status === 'fulfilled' ? shopResult.value : null;

      const strains = strainsRes && !strainsRes.error && Array.isArray(strainsRes.data) && strainsRes.data.length > 0
        ? strainsRes.data
        : [];

      const shop = shopRes && !shopRes.error && shopRes.data
        ? shopRes.data
        : { ...FALLBACK_SHOP_PROFILE };

      if (!shopRes || shopRes.error || !shopRes.data) {
        const restName = await fetchShopNameViaRest().catch(() => null);
        if (restName) shop.name = restName;
      }

      applyHomepageStrains(strains);
      applyShopProfile(shop);
      applyFeaturedStrain(strains);
      if (!strains.length) {
        setHomepageUnavailableState('No published strains found in database yet.');
      }
      applyImageFallbacks();
    } catch (error) {
      console.error('Failed to load Supabase data.', error);
      applyHomepageStrains([]);
      applyShopProfile(FALLBACK_SHOP_PROFILE);
      setHomepageUnavailableState('Could not load strains right now.');
      setFeaturedEmptyState();
      applyImageFallbacks();
    }
  }

  strainFilterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const selectedType = String(btn.dataset.strainFilter || 'all').toLowerCase();
      if (!['all', 'sativa', 'indica', 'hybrid'].includes(selectedType)) return;
      activeHomepageFilter = selectedType;
      setActiveFilterUi(activeHomepageFilter);
      renderHomepageByFilter();
    });
  });

  setActiveFilterUi(activeHomepageFilter);
  loadContent();
});
