document.addEventListener('DOMContentLoaded', () => {
  const gate = document.getElementById('age-gate');
  const yesBtn = document.getElementById('age-yes');
  const noBtn = document.getElementById('age-no');
  const warning = document.getElementById('age-warning');
  const page = document.getElementById('page');

  const defaultStrainImg = '/image/default.jpg';

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
    document.title = `${safeName} | Let's Phuket`;
  }

  async function loadStrainDetail() {
    const slug = getSlugParam();
    if (!slug) {
      renderNotFound('Missing strain slug in URL.');
      return;
    }

    const fallbackStrain = FALLBACK_STRAINS.find((item) => item.slug === slug);
    const supabase = getSupabaseClient();

    if (!supabase) {
      if (fallbackStrain) {
        renderStrain(fallbackStrain);
      } else {
        renderNotFound(`No strain found for slug "${slug}".`);
      }
      return;
    }

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

      if (fallbackStrain) {
        renderStrain(fallbackStrain);
        return;
      }

      renderNotFound(`No published strain found for slug "${slug}".`);
    } catch (error) {
      console.error('Failed to load strain detail from Supabase.', error);
      if (fallbackStrain) {
        renderStrain(fallbackStrain);
      } else {
        renderNotFound('Could not load strain detail right now.');
      }
    }
  }

  loadStrainDetail();
});
