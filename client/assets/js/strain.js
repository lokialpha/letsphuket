document.addEventListener('DOMContentLoaded', () => {
  const gate = document.getElementById('age-gate');
  const yesBtn = document.getElementById('age-yes');
  const noBtn = document.getElementById('age-no');
  const warning = document.getElementById('age-warning');
  const page = document.getElementById('page');

  const defaultStrainImg = '/image/default.jpg';
  const STRAINS_CACHE_KEY = 'lp_strains_cache_v1';
  const STRAINS_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
  const STRAIN_DETAIL_PREFETCH_KEY_PREFIX = 'lp_strain_prefetch_v1:';
  const STRAIN_DETAIL_PREFETCH_MAX_AGE_MS = 30 * 60 * 1000;
  const DEFAULT_SHOP_NAME = "Let's Phuket";
  const SHOP_NAME_CACHE_KEY = 'lp_shop_name_v1';
  const SHOP_NAME_PATTERNS = [/Let['’]s Phuket/g, /Lets Phuket/g];
  let activeShopName = DEFAULT_SHOP_NAME;
  let brandTextNodes = null;

  const FALLBACK_STRAINS = [
    {
      slug: 'tropical-cherry',
      name: 'Tropical Cherry',
      strain_type: 'Hybrid',
      short_description: 'Cherry gelato with papaya diesel - sticky resin and a blissy, island glow.',
      terpenes: ['Limonene', 'Myrcene'],
      mood_aroma: 'Blissed - Heavy',
      image_url: 'image/default.jpg',
      image_alt: 'Tropical Cherry strain flower'
    },
    {
      slug: 'subzero',
      name: 'Subzero',
      strain_type: 'Hybrid',
      short_description: 'Frosty gas with minty inhale and a clear, chilled headspace.',
      terpenes: ['Caryophyllene', 'Limonene'],
      mood_aroma: 'Icy - Focused',
      image_url: 'image/default.jpg',
      image_alt: 'Subzero strain flower'
    },
    {
      slug: 'banana-daddy',
      name: 'Banana Daddy',
      strain_type: 'Indica',
      short_description: 'Ripe banana bread and grape candy with a mellow, grinny body feel.',
      terpenes: ['Myrcene', 'Linalool'],
      mood_aroma: 'Cozy - Euphoric',
      image_url: 'image/default.jpg',
      image_alt: 'Banana Daddy strain flower'
    },
    {
      slug: 'blueberry-muffin',
      name: 'BlueBerry Muffin',
      strain_type: 'Hybrid',
      short_description: 'Warm blueberry muffin nose with a creamy finish and calming exhale.',
      terpenes: ['Myrcene', 'Pinene'],
      mood_aroma: 'Happy - Relaxed',
      image_url: 'image/default.jpg',
      image_alt: 'BlueBerry Muffin strain flower'
    },
    {
      slug: 'pink-runtz',
      name: 'Pink Runtz',
      strain_type: 'Hybrid',
      short_description: 'Cotton candy and tropical sherbet with a mellow, floaty lift.',
      terpenes: ['Caryophyllene', 'Limonene'],
      mood_aroma: 'Euphoric - Social',
      image_url: 'image/default.jpg',
      image_alt: 'Pink Runtz strain flower'
    },
    {
      slug: 'tea-time',
      name: 'Tea Time',
      strain_type: 'Hybrid',
      short_description: 'Earl grey, lemon zest, and a smooth calm that stays clear and chatty.',
      terpenes: ['Linalool', 'Caryophyllene'],
      mood_aroma: 'Calm - Focused',
      image_url: 'image/Teatime.jpg',
      image_alt: 'Tea Time strain flower'
    },
    {
      slug: 'lgbtq',
      name: 'LGBTQ',
      strain_type: 'Sativa',
      short_description: 'Rainbow sherbet nose with passionfruit pop and an upbeat social lift.',
      terpenes: ['Limonene', 'Terpinolene'],
      mood_aroma: 'Uplifted - Creative',
      image_url: 'image/LGBTQ.jpg',
      image_alt: 'LGBTQ strain flower'
    },
    {
      slug: 'zupa',
      name: 'ZuPa',
      strain_type: 'Hybrid',
      short_description: 'Tropical candy with creamy gas and a floaty, euphoric body melt.',
      terpenes: ['Myrcene', 'Caryophyllene'],
      mood_aroma: 'Relaxed - Euphoric',
      image_url: 'image/Zupa.jpg',
      image_alt: 'ZuPa strain flower'
    },
    {
      slug: 'neon-icon',
      name: 'Neon Icon',
      strain_type: 'Sativa',
      short_description: 'Electric citrus and guava ice that keeps conversations bright and focused.',
      terpenes: ['Ocimene', 'Limonene'],
      mood_aroma: 'Social - Focused',
      image_url: 'image/Neonicon.jpg',
      image_alt: 'Neon Icon strain flower'
    },
    {
      slug: 'super-boof',
      name: 'Super Boof',
      strain_type: 'Hybrid',
      short_description: 'Tangerine peel with earthy cookie, floaty chatter without the couch-lock.',
      terpenes: ['Caryophyllene', 'Linalool'],
      mood_aroma: 'Talkative - Relaxed',
      image_url: 'image/default.jpg',
      image_alt: 'Super Boof strain flower'
    }
  ];

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

    const nameText = String(document.getElementById('strain-name')?.textContent || '').trim();
    const hasRenderableName = Boolean(nameText) && nameText !== 'Loading...';
    document.title = hasRenderableName
      ? `${nameText} | ${activeShopName}`
      : `Strain Detail | ${activeShopName}`;

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

  function normalizeType(value) {
    const type = String(value ?? '').toLowerCase();
    if (type === 'sativa' || type === 'indica' || type === 'hybrid') return type;
    return 'hybrid';
  }

  function formatList(value) {
    if (Array.isArray(value)) return value.filter(Boolean).join(' · ');
    return String(value || '').trim();
  }

  function resolveImageUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return defaultStrainImg;
    if (/^(https?:\/\/|data:|blob:|\/)/i.test(raw)) return raw;
    return raw.startsWith('image/') ? `/${raw}` : raw;
  }

  function getSlugParam() {
    const params = new URLSearchParams(window.location.search);
    return String(params.get('slug') || '').trim().toLowerCase();
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

  function readPrefetchedStrainDetail(slug) {
    if (!slug) return null;
    try {
      const raw = sessionStorage.getItem(`${STRAIN_DETAIL_PREFETCH_KEY_PREFIX}${slug}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;

      const age = Date.now() - Number(parsed.cachedAt || 0);
      if (!Number.isFinite(age) || age > STRAIN_DETAIL_PREFETCH_MAX_AGE_MS) {
        sessionStorage.removeItem(`${STRAIN_DETAIL_PREFETCH_KEY_PREFIX}${slug}`);
        return null;
      }

      const strain = parsed.strain;
      if (!strain || String(strain.slug || '').toLowerCase() !== slug) return null;
      return strain;
    } catch (error) {
      console.warn('Failed to read prefetched strain detail.', error);
      return null;
    }
  }

  function readCachedStrainBySlug(slug) {
    if (!slug) return null;
    try {
      const raw = localStorage.getItem(STRAINS_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        localStorage.removeItem(STRAINS_CACHE_KEY);
        return null;
      }

      const cachedAt = Number(parsed?.updatedAt || 0);
      const ageMs = Date.now() - cachedAt;
      const isFresh = Number.isFinite(cachedAt) && cachedAt > 0 && Number.isFinite(ageMs) && ageMs <= STRAINS_CACHE_MAX_AGE_MS;
      if (!isFresh) {
        localStorage.removeItem(STRAINS_CACHE_KEY);
        return null;
      }

      const strains = Array.isArray(parsed?.strains) ? parsed.strains : [];
      return strains.find((item) => String(item?.slug || '').toLowerCase() === slug) || null;
    } catch (error) {
      console.warn('Failed to read cached strains list.', error);
      return null;
    }
  }

  function renderNotFound(message) {
    const error = document.getElementById('detail-error');
    const name = document.getElementById('strain-name');
    const description = document.getElementById('strain-description');
    const terpenes = document.getElementById('strain-terpenes');
    const mood = document.getElementById('strain-mood');

    if (name) name.textContent = 'Strain not found';
    if (description) description.textContent = 'We could not find this strain profile.';
    if (terpenes) terpenes.textContent = '-';
    if (mood) mood.textContent = '-';

    if (error) {
      error.textContent = message;
      error.classList.remove('hidden');
    }

    document.title = `Strain not found | ${activeShopName}`;
  }

  function renderStrain(strain) {
    const image = document.getElementById('strain-image');
    const type = document.getElementById('strain-type');
    const name = document.getElementById('strain-name');
    const description = document.getElementById('strain-description');
    const terpenes = document.getElementById('strain-terpenes');
    const mood = document.getElementById('strain-mood');
    const kicker = document.getElementById('detail-kicker');
    const error = document.getElementById('detail-error');

    const normalizedType = normalizeType(strain.strain_type);
    const prettyType = normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);

    if (type) {
      type.className = `tag ${normalizedType}`;
      type.textContent = prettyType;
    }
    if (name) name.textContent = strain.name || 'Unnamed strain';
    if (description) description.textContent = strain.short_description || '';
    if (terpenes) terpenes.textContent = formatList(strain.terpenes) || '-';
    if (mood) mood.textContent = String(strain.mood_aroma || '-').replaceAll('-', '•');
    if (kicker) kicker.textContent = `${prettyType} profile`;

    if (image) {
      image.src = resolveImageUrl(strain.image_url || defaultStrainImg);
      image.alt = strain.image_alt || `${strain.name || 'Strain'} flower`;
      image.addEventListener('error', () => {
        image.src = defaultStrainImg;
      }, { once: true });
    }

    if (error) {
      error.textContent = '';
      error.classList.add('hidden');
    }

    const safeName = String(strain.name || 'Strain detail');
    document.title = `${safeName} | ${activeShopName}`;
  }

  async function loadStrainDetail() {
    const slug = getSlugParam();
    if (!slug) {
      renderNotFound('Missing strain slug in URL.');
      return;
    }

    const fallbackStrain = FALLBACK_STRAINS.find((item) => item.slug === slug);
    const prefetchedStrain = readPrefetchedStrainDetail(slug);
    const cachedStrain = readCachedStrainBySlug(slug);
    const immediateStrain = prefetchedStrain || cachedStrain || fallbackStrain || null;
    if (immediateStrain) renderStrain(immediateStrain);
    const supabase = getSupabaseClient();

    if (!supabase) {
      fetchShopNameViaRest()
        .then((name) => {
          if (name) applyLiveShopName(name);
        })
        .catch((_error) => {
          // Keep fallback branding when REST lookup is unavailable.
        });

      if (immediateStrain) {
        if (immediateStrain === cachedStrain || immediateStrain === prefetchedStrain) {
          const error = document.getElementById('detail-error');
          if (error) {
            error.textContent = 'Showing cached profile while live sync is unavailable.';
            error.classList.remove('hidden');
          }
        }
      } else {
        renderNotFound(`No strain found for slug "${slug}".`);
      }
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

    try {
      const { data, error } = await supabase
        .from('strains')
        .select('slug,name,strain_type,short_description,terpenes,mood_aroma,image_url,image_alt,is_published')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        renderStrain(data);
        return;
      }

      if (prefetchedStrain || cachedStrain) {
        const error = document.getElementById('detail-error');
        if (error) {
          error.textContent = 'Live profile unavailable. Showing cached details.';
          error.classList.remove('hidden');
        }
        return;
      }

      if (fallbackStrain) {
        renderStrain(fallbackStrain);
        return;
      }

      renderNotFound(`No published strain found for slug "${slug}".`);
    } catch (error) {
      console.error('Failed to load strain detail from Supabase.', error);
      if (prefetchedStrain || cachedStrain) {
        const detailError = document.getElementById('detail-error');
        if (detailError) {
          detailError.textContent = 'Showing cached profile while live sync is unavailable.';
          detailError.classList.remove('hidden');
        }
      } else if (fallbackStrain) {
        renderStrain(fallbackStrain);
      } else {
        renderNotFound('Could not load strain detail right now.');
      }
    }
  }

  loadStrainDetail();
});
