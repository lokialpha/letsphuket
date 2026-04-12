document.addEventListener('DOMContentLoaded', () => {
  const gate = document.getElementById('age-gate');
  const yesBtn = document.getElementById('age-yes');
  const noBtn = document.getElementById('age-no');
  const warning = document.getElementById('age-warning');
  const page = document.getElementById('page');

  const defaultStrainImg = '/image/default.jpg';
  const DEFAULT_SHOP_NAME = "Let's Phuket";
  const SHOP_NAME_CACHE_KEY = 'lp_shop_name_v1';
  const SHOP_NAME_PATTERNS = [/Let['’]s Phuket/g, /Lets Phuket/g];
  const DEFAULT_DESCRIPTION_LANGUAGE = 'en';
  const DESCRIPTION_LANGUAGE_OPTIONS = ['en', 'mm'];
  let activeShopName = DEFAULT_SHOP_NAME;
  let brandTextNodes = null;
  let activeDescriptionLanguage = DEFAULT_DESCRIPTION_LANGUAGE;
  let activeStrainDetail = null;
  const descriptionLanguageButtons = Array.from(document.querySelectorAll('[data-description-lang]'));

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

  descriptionLanguageButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setDescriptionLanguage(button.dataset.descriptionLang);
    });
  });

  setDescriptionLanguage(DEFAULT_DESCRIPTION_LANGUAGE);

  function normalizeType(value) {
    const type = String(value ?? '').toLowerCase();
    if (type === 'sativa' || type === 'indica' || type === 'hybrid') return type;
    return 'hybrid';
  }

  function formatList(value) {
    if (Array.isArray(value)) return value.filter(Boolean).join(' · ');
    return String(value || '').trim();
  }

  function normalizeDescriptionLanguage(value) {
    const language = String(value || '').trim().toLowerCase();
    return DESCRIPTION_LANGUAGE_OPTIONS.includes(language) ? language : DEFAULT_DESCRIPTION_LANGUAGE;
  }

  function getEnglishDescription(strain) {
    const english = String(strain?.description_en || '').trim();
    if (english) return english;
    return String(strain?.short_description || '').trim();
  }

  function getMyanmarDescription(strain) {
    return String(strain?.description_mm || '').trim();
  }

  function getDescriptionByLanguage(strain, language) {
    const english = getEnglishDescription(strain);
    if (normalizeDescriptionLanguage(language) === 'mm') {
      return getMyanmarDescription(strain) || english;
    }
    return english;
  }

  function renderDescription(strain) {
    const description = document.getElementById('strain-description');
    if (!description || !strain) return;
    description.textContent = getDescriptionByLanguage(strain, activeDescriptionLanguage);
  }

  function setDescriptionLanguage(language) {
    activeDescriptionLanguage = normalizeDescriptionLanguage(language);

    descriptionLanguageButtons.forEach((button) => {
      const buttonLanguage = normalizeDescriptionLanguage(button.dataset.descriptionLang);
      const isActive = buttonLanguage === activeDescriptionLanguage;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    renderDescription(activeStrainDetail);
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

  function renderNotFound(message) {
    const error = document.getElementById('detail-error');
    const name = document.getElementById('strain-name');
    const description = document.getElementById('strain-description');
    const terpenes = document.getElementById('strain-terpenes');
    const mood = document.getElementById('strain-mood');

    activeStrainDetail = null;

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
    const terpenes = document.getElementById('strain-terpenes');
    const mood = document.getElementById('strain-mood');
    const kicker = document.getElementById('detail-kicker');
    const error = document.getElementById('detail-error');

    activeStrainDetail = strain;
    const normalizedType = normalizeType(strain.strain_type);
    const prettyType = normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);

    if (type) {
      type.className = `tag ${normalizedType}`;
      type.textContent = prettyType;
    }
    if (name) name.textContent = strain.name || 'Unnamed strain';
    renderDescription(strain);
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

  function hasMissingDescriptionColumns(error) {
    const details = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
    return details.includes('description_en') || details.includes('description_mm');
  }

  async function fetchPublishedStrainBySlug(supabase, slug) {
    const selectWithLanguage = 'slug,name,strain_type,short_description,description_en,description_mm,terpenes,mood_aroma,image_url,image_alt,is_published';
    const legacySelect = 'slug,name,strain_type,short_description,terpenes,mood_aroma,image_url,image_alt,is_published';

    let result = await supabase
      .from('strains')
      .select(selectWithLanguage)
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();

    if (result.error && hasMissingDescriptionColumns(result.error)) {
      result = await supabase
        .from('strains')
        .select(legacySelect)
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();
    }

    if (result.error) throw result.error;
    return result.data || null;
  }

  async function loadStrainDetail() {
    const slug = getSlugParam();
    if (!slug) {
      renderNotFound('Missing strain slug in URL.');
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      fetchShopNameViaRest()
        .then((name) => {
          if (name) applyLiveShopName(name);
        })
        .catch((_error) => {
          // Keep local branding when REST lookup is unavailable.
        });

      renderNotFound('Supabase is not configured. Could not load strain detail.');
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
      const data = await fetchPublishedStrainBySlug(supabase, slug);

      if (data) {
        renderStrain(data);
        return;
      }

      renderNotFound(`No published strain found for slug "${slug}".`);
    } catch (error) {
      console.error('Failed to load strain detail from Supabase.', error);
      renderNotFound('Could not load strain detail right now.');
    }
  }

  loadStrainDetail();
});
