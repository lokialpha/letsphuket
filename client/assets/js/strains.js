document.addEventListener('DOMContentLoaded', () => {
  const gate = document.getElementById('age-gate');
  const yesBtn = document.getElementById('age-yes');
  const noBtn = document.getElementById('age-no');
  const warning = document.getElementById('age-warning');
  const page = document.getElementById('page');
  const grid = document.getElementById('all-strain-grid');
  const heading = document.getElementById('all-strains-heading');
  const loadMoreWrap = document.getElementById('all-strains-load-more-wrap');
  const loadMoreBtn = document.getElementById('all-strains-load-more');

  const defaultStrainImg = '/image/default.jpg';
  const PAGE_SIZE = 12;

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

  let allStrains = [];
  let visibleCount = 0;

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

  function resolveImageUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return defaultStrainImg;
    if (/^(https?:\/\/|data:|blob:|\/)/i.test(raw)) return raw;
    return raw.startsWith('image/') ? `/${raw}` : raw;
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

  function renderCards(items, append = false) {
    if (!grid) return;
    const html = items.map((strain) => {
      const type = normalizeType(strain.strain_type);
      const terpenes = formatList(strain.terpenes);
      const slug = String(strain.slug || '');
      const detailHref = `./strain.html?slug=${encodeURIComponent(slug)}`;

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
            <p>${escapeHtml(strain.short_description || '')}</p>
            <div class="specs">
              <span>Terpenes: ${escapeHtml(terpenes)}</span>
              <span>Mood&Aroma: ${escapeHtml(strain.mood_aroma || '')}</span>
            </div>
            <span class="strain-link">View details</span>
          </article>
        </a>
      `;
    }).join('');

    if (append) grid.insertAdjacentHTML('beforeend', html);
    else grid.innerHTML = html;
  }

  function updateHeaderAndControls() {
    if (heading) heading.textContent = `${allStrains.length} strains in Phuket`;
    if (loadMoreWrap) {
      const hasMore = visibleCount < allStrains.length;
      loadMoreWrap.classList.toggle('hidden', !hasMore);
    }
  }

  function loadMore() {
    const nextItems = allStrains.slice(visibleCount, visibleCount + PAGE_SIZE);
    if (!nextItems.length) return;
    renderCards(nextItems, visibleCount > 0);
    visibleCount += nextItems.length;
    updateHeaderAndControls();
  }

  function setStrains(strains) {
    allStrains = Array.isArray(strains) ? strains : [];
    visibleCount = 0;
    if (grid) grid.innerHTML = '';
    loadMore();
  }

  async function loadAllStrains() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setStrains(FALLBACK_STRAINS);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('strains')
        .select('slug,name,strain_type,short_description,terpenes,mood_aroma,image_url,image_alt,sort_order')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      if (Array.isArray(data) && data.length > 0) {
        setStrains(data);
      } else {
        setStrains(FALLBACK_STRAINS);
      }
    } catch (error) {
      console.error('Failed to load strains. Falling back to local content.', error);
      setStrains(FALLBACK_STRAINS);
    }
  }

  loadMoreBtn?.addEventListener('click', loadMore);
  loadAllStrains();
});
