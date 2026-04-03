document.addEventListener('DOMContentLoaded', () => {
  const gate = document.getElementById('age-gate');
  const yesBtn = document.getElementById('age-yes');
  const noBtn = document.getElementById('age-no');
  const warning = document.getElementById('age-warning');
  const page = document.getElementById('page');
  const strainFilterButtons = Array.from(document.querySelectorAll('[data-strain-filter]'));

  const defaultStrainImg = '/image/default.jpg';
  const HOMEPAGE_STRAIN_LIMIT = 10;
  let homepageAllStrains = [];
  let activeHomepageFilter = 'all';

  const FALLBACK_DATA = {
    strains: [
      {
        slug: 'tropical-cherry',
        name: 'Tropical Cherry',
        strain_type: 'Hybrid',
        short_description: 'Cherry gelato with papaya diesel - sticky resin and a blissy, island glow.',
        terpenes: ['Limonene', 'Myrcene'],
        mood_aroma: 'Blissed - Heavy',
        image_url: 'image/default.jpg',
        image_alt: 'Tropical Cherry strain flower',
        sort_order: 1,
        is_featured: false
      },
      {
        slug: 'subzero',
        name: 'Subzero',
        strain_type: 'Hybrid',
        short_description: 'Frosty gas with minty inhale and a clear, chilled headspace.',
        terpenes: ['Caryophyllene', 'Limonene'],
        mood_aroma: 'Icy - Focused',
        image_url: 'image/default.jpg',
        image_alt: 'Subzero strain flower',
        sort_order: 2,
        is_featured: false
      },
      {
        slug: 'banana-daddy',
        name: 'Banana Daddy',
        strain_type: 'Indica',
        short_description: 'Ripe banana bread and grape candy with a mellow, grinny body feel.',
        terpenes: ['Myrcene', 'Linalool'],
        mood_aroma: 'Cozy - Euphoric',
        image_url: 'image/default.jpg',
        image_alt: 'Banana Daddy strain flower',
        sort_order: 3,
        is_featured: false
      },
      {
        slug: 'blueberry-muffin',
        name: 'BlueBerry Muffin',
        strain_type: 'Hybrid',
        short_description: 'Warm blueberry muffin nose with a creamy finish and calming exhale.',
        terpenes: ['Myrcene', 'Pinene'],
        mood_aroma: 'Happy - Relaxed',
        image_url: 'image/default.jpg',
        image_alt: 'BlueBerry Muffin strain flower',
        sort_order: 4,
        is_featured: false
      },
      {
        slug: 'pink-runtz',
        name: 'Pink Runtz',
        strain_type: 'Hybrid',
        short_description: 'Cotton candy and tropical sherbet with a mellow, floaty lift.',
        terpenes: ['Caryophyllene', 'Limonene'],
        mood_aroma: 'Euphoric - Social',
        image_url: 'image/default.jpg',
        image_alt: 'Pink Runtz strain flower',
        sort_order: 5,
        is_featured: false
      },
      {
        slug: 'tea-time',
        name: 'Tea Time',
        strain_type: 'Hybrid',
        short_description: 'Earl grey, lemon zest, and a smooth calm that stays clear and chatty.',
        terpenes: ['Linalool', 'Caryophyllene'],
        mood_aroma: 'Calm - Focused',
        image_url: 'image/Teatime.jpg',
        image_alt: 'Tea Time strain flower',
        sort_order: 6,
        is_featured: true
      },
      {
        slug: 'lgbtq',
        name: 'LGBTQ',
        strain_type: 'Sativa',
        short_description: 'Rainbow sherbet nose with passionfruit pop and an upbeat social lift.',
        terpenes: ['Limonene', 'Terpinolene'],
        mood_aroma: 'Uplifted - Creative',
        image_url: 'image/LGBTQ.jpg',
        image_alt: 'LGBTQ strain flower',
        sort_order: 7,
        is_featured: false
      },
      {
        slug: 'zupa',
        name: 'ZuPa',
        strain_type: 'Hybrid',
        short_description: 'Tropical candy with creamy gas and a floaty, euphoric body melt.',
        terpenes: ['Myrcene', 'Caryophyllene'],
        mood_aroma: 'Relaxed - Euphoric',
        image_url: 'image/Zupa.jpg',
        image_alt: 'ZuPa strain flower',
        sort_order: 8,
        is_featured: false
      },
      {
        slug: 'neon-icon',
        name: 'Neon Icon',
        strain_type: 'Sativa',
        short_description: 'Electric citrus and guava ice that keeps conversations bright and focused.',
        terpenes: ['Ocimene', 'Limonene'],
        mood_aroma: 'Social - Focused',
        image_url: 'image/Neonicon.jpg',
        image_alt: 'Neon Icon strain flower',
        sort_order: 9,
        is_featured: false
      },
      {
        slug: 'super-boof',
        name: 'Super Boof',
        strain_type: 'Hybrid',
        short_description: 'Tangerine peel with earthy cookie, floaty chatter without the couch-lock.',
        terpenes: ['Caryophyllene', 'Linalool'],
        mood_aroma: 'Talkative - Relaxed',
        image_url: 'image/default.jpg',
        image_alt: 'Super Boof strain flower',
        sort_order: 10,
        is_featured: false
      }
    ],
    merch: [
      {
        slug: 'island-tee-front',
        name: 'Island Tee - Front',
        category: 'T-Shirt',
        description: 'Front chest print with Our Logo and clean typography.',
        bullet_points: [
          '100% cotton, soft handfeel',
          'Sizes XS-XL, relaxed fit',
          'Front logo: Our Logo'
        ],
        image_url: 'image/1.svg',
        image_alt: 'Let\'s Phuket T-shirt front view',
        cta_label: 'In-store only',
        cta_url: null,
        sort_order: 1
      },
      {
        slug: 'island-tee-back',
        name: 'Island Tee - Back',
        category: 'T-Shirt',
        description: 'Full-back QR for our location',
        bullet_points: [
          'Same fabric/fit as front',
          'Back includes QR to our shop address',
          'Care: cold wash, inside-out'
        ],
        image_url: 'image/2.svg',
        image_alt: 'Let\'s Phuket T-shirt back view',
        cta_label: 'In-store only',
        cta_url: null,
        sort_order: 2
      }
    ],
    shop: {
      visit_lede: 'Drop by our beach-level lounge between Patong and Kamala. Ask for the terp flight and we\'ll line up glass so you can taste the island spectrum.',
      address: '187, 36 Phangnga Rd, Talat Yai, Amphoe Muang, Phuket 83000',
      hours_text: 'Daily 10:00 AM - 12:00 PM',
      whatsapp_url: 'https://wa.me/66628590096',
      map_embed_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7904.215842592954!2d98.39339171929876!3d7.883776347126515!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x305033006d463199%3A0x49f34f4c561f0d75!2sHotel%20California!5e0!3m2!1sen!2sth!4v1765009064854!5m2!1sen!2sth',
      map_note: '2 min walk from the sand - look for the neon leaf above the door.',
      visit_note: 'Visit our physical location. No online sales or delivery are offered through this website.'
    }
  };

  const LEAF_ICON = '<svg viewBox="0 0 64 64"><path d="M32 6c4 9 6 13 10 16 6 4 11 2 11 2s-4 6-10 8c-3 1-8 1-11-1 1 7 3 14 2 23l-3-8-3 8c-1-9 1-16 2-23-3 2-8 2-11 1-6-2-10-8-10-8s5 2 11-2c4-3 6-7 10-16z" /></svg>';

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

    document.querySelectorAll('.strain-media img, .merch-media img').forEach((img) => {
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

  function renderStrains(strains) {
    const strainGrid = document.getElementById('strain-grid');
    if (!strainGrid) return;

    strainGrid.innerHTML = strains.map((strain) => {
      const type = normalizeType(strain.strain_type);
      const terpenes = formatList(strain.terpenes);
      const slug = String(strain.slug || '');
      const detailHref = `client/pages/strain.html?slug=${encodeURIComponent(slug)}`;
      return `
        <a class="strain-card-link" href="${detailHref}">
          <article class="strain-card">
            <div class="strain-media">
              <img src="${escapeHtml(resolveImageUrl(strain.image_url || defaultStrainImg))}" alt="${escapeHtml(strain.image_alt || `${strain.name} strain flower`)}" loading="lazy">
            </div>
            <div class="strain-top">
              <div class="leaf-icon" aria-hidden="true">${LEAF_ICON}</div>
              <span class="tag ${type}">${escapeHtml(type.charAt(0).toUpperCase() + type.slice(1))}</span>
            </div>
            <h3>${escapeHtml(strain.name)}</h3>
            <p class="strain-preview">${escapeHtml(strain.short_description || '')}</p>
            <div class="specs">
              <span>Terpenes: ${escapeHtml(terpenes)}</span>
              <span>Mood&Aroma: ${escapeHtml(strain.mood_aroma || '')}</span>
            </div>
            <span class="strain-link">View details</span>
          </article>
        </a>
      `;
    }).join('');

    const heading = document.getElementById('strains-heading');
    if (heading) heading.textContent = `${strains.length} strains in Phuket`;
  }

  function renderHomepageByFilter() {
    const filtered = getFilteredStrains(homepageAllStrains, activeHomepageFilter);
    const preview = filtered.slice(0, HOMEPAGE_STRAIN_LIMIT);
    renderStrains(preview);

    const heading = document.getElementById('strains-heading');
    if (heading) {
      if (activeHomepageFilter === 'all' && filtered.length > HOMEPAGE_STRAIN_LIMIT) {
        heading.textContent = `Top ${HOMEPAGE_STRAIN_LIMIT} of ${filtered.length} strains in Phuket`;
      } else if (activeHomepageFilter === 'all') {
        heading.textContent = `${filtered.length} featured strains in Phuket`;
      } else {
        heading.textContent = `${filtered.length} ${titleType(activeHomepageFilter)} strains in Phuket`;
      }
    }

    const seeMoreWrap = document.getElementById('strains-see-more-wrap');
    if (seeMoreWrap) {
      seeMoreWrap.classList.toggle('hidden', filtered.length <= HOMEPAGE_STRAIN_LIMIT);
    }
  }

  function applyHomepageStrains(strains) {
    homepageAllStrains = Array.isArray(strains) ? strains : [];
    renderHomepageByFilter();
  }

  function applyFeaturedStrain(strains) {
    const list = Array.isArray(strains) ? strains : [];
    if (!list.length) return;

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

  function renderMerchItems(items) {
    const merchGrid = document.getElementById('merch-grid');
    if (!merchGrid) return;

    merchGrid.innerHTML = items.map((item, index) => {
      const bulletPoints = Array.isArray(item.bullet_points) ? item.bullet_points : [];
      const bulletHtml = bulletPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join('');

      const ctaLabel = escapeHtml(item.cta_label || 'In-store only');
      const ctaUrl = String(item.cta_url || '').trim();
      const actionHtml = ctaUrl
        ? `<a class="btn primary ghost-btn${index === 0 ? ' ghost-btn-left' : ''}" href="${escapeHtml(ctaUrl)}" target="_blank" rel="noopener noreferrer">${ctaLabel}</a>`
        : `<button class="btn primary ghost-btn${index === 0 ? ' ghost-btn-left' : ''}">${ctaLabel}</button>`;

      return `
        <article class="merch-card">
          <div class="merch-top">
            <span class="tag merch-tag">${escapeHtml(item.category || 'Item')}</span>
          </div>
          <div class="merch-media">
            <img src="${escapeHtml(resolveImageUrl(item.image_url || defaultStrainImg))}" alt="${escapeHtml(item.image_alt || item.name)}" loading="lazy">
          </div>
          <div class="merch-copy">
            <h3>${escapeHtml(item.name)}</h3>
            <p>${escapeHtml(item.description || '')}</p>
            <ul>${bulletHtml}</ul>
          </div>
          ${actionHtml}
        </article>
      `;
    }).join('');
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
    if (!shop) return;

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
    const supabase = getSupabaseClient();

    if (!supabase) {
      applyHomepageStrains(FALLBACK_DATA.strains);
      renderMerchItems(FALLBACK_DATA.merch);
      applyShopProfile(FALLBACK_DATA.shop);
      applyFeaturedStrain(FALLBACK_DATA.strains);
      applyImageFallbacks();
      return;
    }

    try {
      const [strainsRes, merchRes, shopRes] = await Promise.all([
        supabase
          .from('strains')
          .select('slug,name,strain_type,short_description,terpenes,mood_aroma,image_url,image_alt,sort_order,is_featured,updated_at')
          .eq('is_published', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('merch_items')
          .select('slug,name,category,description,bullet_points,image_url,image_alt,cta_label,cta_url,sort_order')
          .eq('is_published', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('shop_profile')
          .select('visit_lede,address,hours_text,whatsapp_url,map_embed_url,map_note,visit_note')
          .eq('id', 1)
          .maybeSingle()
      ]);

      if (strainsRes.error || merchRes.error || shopRes.error) {
        throw new Error('Supabase content query failed');
      }

      const strains = Array.isArray(strainsRes.data) && strainsRes.data.length > 0
        ? strainsRes.data
        : FALLBACK_DATA.strains;

      const merch = Array.isArray(merchRes.data) && merchRes.data.length > 0
        ? merchRes.data
        : FALLBACK_DATA.merch;

      const shop = shopRes.data || FALLBACK_DATA.shop;

      applyHomepageStrains(strains);
      renderMerchItems(merch);
      applyShopProfile(shop);
      applyFeaturedStrain(strains);
      applyImageFallbacks();
    } catch (error) {
      console.error('Failed to load Supabase data. Falling back to local content.', error);
      applyHomepageStrains(FALLBACK_DATA.strains);
      renderMerchItems(FALLBACK_DATA.merch);
      applyShopProfile(FALLBACK_DATA.shop);
      applyFeaturedStrain(FALLBACK_DATA.strains);
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
