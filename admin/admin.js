document.addEventListener('DOMContentLoaded', () => {
  const cfg = window.__SUPABASE_CONFIG__;
  const createClient = window.supabase?.createClient;

  const authCard = document.getElementById('auth-card');
  const adminApp = document.getElementById('admin-app');
  const authError = document.getElementById('auth-error');
  const sessionEmail = document.getElementById('session-email');
  const loginForm = document.getElementById('login-form');
  const signoutBtn = document.getElementById('signout-btn');

  const navButtons = Array.from(document.querySelectorAll('[data-view-target]'));
  const views = Array.from(document.querySelectorAll('[data-view]'));

  const overviewTotal = document.getElementById('overview-total');
  const overviewPublished = document.getElementById('overview-published');
  const overviewDraft = document.getElementById('overview-draft');
  const overviewFeatured = document.getElementById('overview-featured');
  const overviewShopName = document.getElementById('overview-shop-name');
  const overviewShopHours = document.getElementById('overview-shop-hours');
  const overviewShopAddress = document.getElementById('overview-shop-address');
  const overviewShopWhatsapp = document.getElementById('overview-shop-whatsapp');
  const overviewStrainsSync = document.getElementById('overview-strains-sync');
  const overviewShopSync = document.getElementById('overview-shop-sync');

  const refreshBtn = document.getElementById('refresh-btn');
  const newBtn = document.getElementById('new-btn');
  const searchInput = document.getElementById('search-input');
  const filterSelect = document.getElementById('filter-select');
  const strainsList = document.getElementById('strains-list');
  const listShell = document.getElementById('list-shell');
  const listLoading = document.getElementById('list-loading');
  const listEmpty = document.getElementById('list-empty');
  const listEmptyTitle = document.getElementById('list-empty-title');
  const listEmptyCopy = document.getElementById('list-empty-copy');
  const listResetBtn = document.getElementById('list-reset-btn');
  const listSummary = document.getElementById('list-summary');
  const metricTotal = document.getElementById('metric-total');
  const metricPublished = document.getElementById('metric-published');
  const metricDraft = document.getElementById('metric-draft');
  const metricFeatured = document.getElementById('metric-featured');

  const strainDrawer = document.getElementById('strain-drawer');
  const strainDrawerBackdrop = document.getElementById('strain-drawer-backdrop');
  const drawerCloseBtn = document.getElementById('drawer-close-btn');

  const strainForm = document.getElementById('strain-form');
  const formTitle = document.getElementById('form-title');
  const formModeBadge = document.getElementById('form-mode-badge');
  const editorPanel = document.querySelector('.editor-panel');
  const formStatus = document.getElementById('form-status');
  const formError = document.getElementById('form-error');
  const saveBtn = document.getElementById('save-btn');
  const deleteBtn = document.getElementById('delete-btn');

  const inputId = document.getElementById('strain-id');
  const inputName = document.getElementById('name');
  const inputSlug = document.getElementById('slug');
  const inputStrainType = document.getElementById('strain_type');
  const inputSortOrder = document.getElementById('sort_order');
  const inputDescription = document.getElementById('short_description');
  const inputMoodAroma = document.getElementById('mood_aroma');
  const inputTerpenes = document.getElementById('terpenes');
  const inputImageUrl = document.getElementById('image_url');
  const inputImageFile = document.getElementById('image_file');
  const inputImageAlt = document.getElementById('image_alt');
  const inputFeatured = document.getElementById('is_featured');
  const inputPublished = document.getElementById('is_published');

  const imagePreviewFrame = document.getElementById('image-preview-frame');
  const imagePreview = document.getElementById('image-preview');
  const imagePreviewNote = document.getElementById('image-preview-note');
  const imagePreviewMeta = document.getElementById('image-preview-meta');
  const imagePreviewHint = document.getElementById('image-preview-hint');
  const imagePreviewTools = document.getElementById('image-preview-tools');
  const previewOpenBtn = document.getElementById('preview-open-btn');
  const previewCopyBtn = document.getElementById('preview-copy-btn');
  const previewDownloadBtn = document.getElementById('preview-download-btn');

  const imageModal = document.getElementById('image-modal');
  const imageModalImg = document.getElementById('image-modal-img');
  const imageModalClose = document.getElementById('image-modal-close');
  const imageModalBackdrop = document.getElementById('image-modal-backdrop');
  const toastRoot = document.getElementById('toast-root');

  const shopRefreshBtn = document.getElementById('shop-refresh-btn');
  const shopForm = document.getElementById('shop-form');
  const shopFormStatus = document.getElementById('shop-form-status');
  const shopFormError = document.getElementById('shop-form-error');
  const shopInputName = document.getElementById('shop-name');
  const shopInputVisitLede = document.getElementById('shop-visit-lede');
  const shopInputAddress = document.getElementById('shop-address');
  const shopInputHoursText = document.getElementById('shop-hours-text');
  const shopInputWhatsappUrl = document.getElementById('shop-whatsapp-url');
  const shopInputMapEmbedUrl = document.getElementById('shop-map-embed-url');
  const shopInputMapNote = document.getElementById('shop-map-note');
  const shopInputVisitNote = document.getElementById('shop-visit-note');

  let supabase = null;
  let strains = [];
  let formBaseline = '';
  let isDirty = false;
  let isListLoading = false;
  let shopFormBaseline = '';
  let isShopDirty = false;
  let shopProfileCache = null;

  let activeBootstrapUserId = '';
  let bootstrapPromise = null;
  let currentView = 'overview';
  let isStrainDrawerOpen = false;
  let drawerReturnFocusEl = null;

  let previewCandidates = [];
  let previewCandidateIndex = 0;
  let activePreviewUrl = '';
  let modalReturnFocusEl = null;

  const VIEW_NAMES = new Set(['overview', 'strains', 'shop']);
  const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;
  const SHOP_NAME_CACHE_KEY = 'lp_shop_name_v1';

  function formatSyncTime(date = new Date()) {
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function setAuthMode(isAuthed) {
    authCard.classList.toggle('hidden', isAuthed);
    adminApp.classList.toggle('hidden', !isAuthed);

    if (!isAuthed) {
      setListLoading(false);
      closeStrainDrawer({ force: true, resetFormState: true, skipFocusRestore: true });
      activeBootstrapUserId = '';
      bootstrapPromise = null;
    }
  }

  function normalizeView(value) {
    const key = String(value || '').trim().toLowerCase();
    return VIEW_NAMES.has(key) ? key : 'overview';
  }

  function getViewFromHash() {
    return normalizeView(window.location.hash.replace('#', ''));
  }

  function setHashForView(viewName) {
    const nextHash = `#${viewName}`;
    if (window.location.hash === nextHash) return;
    history.replaceState(null, '', nextHash);
  }

  function setActiveView(viewName, options = {}) {
    const { updateHash = true } = options;
    const nextView = normalizeView(viewName);

    currentView = nextView;

    navButtons.forEach((button) => {
      const isCurrent = button.dataset.viewTarget === nextView;
      button.classList.toggle('is-active', isCurrent);
      button.setAttribute('aria-current', isCurrent ? 'page' : 'false');
    });

    views.forEach((view) => {
      view.classList.toggle('hidden', view.dataset.view !== nextView);
    });

    if (updateHash) setHashForView(nextView);
  }

  function toSlug(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
  }

  function parseTerpenes(value) {
    return String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function normalizeWhatsappUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    try {
      const parsed = new URL(raw);
      const allowedHost = parsed.hostname === 'wa.me' || parsed.hostname === 'api.whatsapp.com';
      if (parsed.protocol === 'https:' && allowedHost) {
        return parsed.toString();
      }
      return '';
    } catch (_error) {
      return '';
    }
  }

  function normalizeMapEmbedUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    try {
      const parsed = new URL(raw);
      const isGoogleMapsEmbed = parsed.hostname === 'www.google.com' && parsed.pathname.startsWith('/maps/embed');
      if (parsed.protocol === 'https:' && isGoogleMapsEmbed) {
        return parsed.toString();
      }
      return '';
    } catch (_error) {
      return '';
    }
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('File read failed.'));
      reader.readAsDataURL(file);
    });
  }

  function getAltFromFileName(fileName) {
    const base = String(fileName || '')
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    if (!base) return '';
    return `${base} strain flower`;
  }

  function setOverviewStrainsSync(label) {
    if (overviewStrainsSync) overviewStrainsSync.textContent = label;
  }

  function setOverviewShopSync(label) {
    if (overviewShopSync) overviewShopSync.textContent = label;
  }

  function updateOverviewShopSnapshot() {
    if (!overviewShopName) return;

    const safeValue = (value, fallback = 'Not set') => {
      const text = String(value || '').trim();
      return text || fallback;
    };

    overviewShopName.textContent = safeValue(shopInputName?.value, 'Not set');
    overviewShopHours.textContent = safeValue(shopInputHoursText?.value, 'Not set');
    overviewShopAddress.textContent = safeValue(shopInputAddress?.value, 'Not set');
    overviewShopWhatsapp.textContent = safeValue(shopInputWhatsappUrl?.value, 'Not set');
  }

  function persistShopNameForPublic(name) {
    const safeName = String(name || '').trim();
    if (!safeName) return;

    try {
      localStorage.setItem(SHOP_NAME_CACHE_KEY, safeName);
    } catch (_error) {
      // Ignore storage write failures (private mode/quota limits).
    }
  }

  function setFormMessage(statusText, errorText) {
    formStatus.textContent = statusText || '';
    formError.textContent = errorText || '';

    if (errorText) showToast(errorText, 'error');
  }

  function setShopFormMessage(statusText, errorText) {
    shopFormStatus.textContent = statusText || '';
    shopFormError.textContent = errorText || '';

    if (errorText) showToast(errorText, 'error');
  }

  function showToast(message, type = 'success') {
    if (!toastRoot || !message) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastRoot.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();
    }, 3200);
  }

  function getCurrentFormSnapshot() {
    return JSON.stringify({
      id: inputId.value.trim(),
      name: inputName.value.trim(),
      slug: inputSlug.value.trim(),
      strain_type: inputStrainType.value,
      sort_order: inputSortOrder.value.trim(),
      short_description: inputDescription.value.trim(),
      mood_aroma: inputMoodAroma.value.trim(),
      terpenes: inputTerpenes.value.trim(),
      image_url: inputImageUrl.value.trim(),
      image_alt: inputImageAlt.value.trim(),
      is_featured: inputFeatured.checked,
      is_published: inputPublished.checked
    });
  }

  function markClean() {
    formBaseline = getCurrentFormSnapshot();
    isDirty = false;
  }

  function updateDirtyState() {
    isDirty = getCurrentFormSnapshot() !== formBaseline;
  }

  function getCurrentShopFormSnapshot() {
    return JSON.stringify({
      name: shopInputName.value.trim(),
      visit_lede: shopInputVisitLede.value.trim(),
      address: shopInputAddress.value.trim(),
      hours_text: shopInputHoursText.value.trim(),
      whatsapp_url: shopInputWhatsappUrl.value.trim(),
      map_embed_url: shopInputMapEmbedUrl.value.trim(),
      map_note: shopInputMapNote.value.trim(),
      visit_note: shopInputVisitNote.value.trim()
    });
  }

  function markShopClean() {
    shopFormBaseline = getCurrentShopFormSnapshot();
    isShopDirty = false;
  }

  function updateShopDirtyState() {
    isShopDirty = getCurrentShopFormSnapshot() !== shopFormBaseline;
  }

  function hasAnyUnsavedChanges() {
    return isDirty || isShopDirty;
  }

  function confirmDiscardChanges() {
    if (!isDirty) return true;
    return window.confirm('You have unsaved strain changes. Discard them?');
  }

  function confirmDiscardShopChanges() {
    if (!isShopDirty) return true;
    return window.confirm('You have unsaved shop profile changes. Discard them?');
  }

  function confirmDiscardAnyChanges() {
    if (!hasAnyUnsavedChanges()) return true;
    return window.confirm('You have unsaved changes. Discard them?');
  }

  function resetForm() {
    inputId.value = '';
    inputName.value = '';
    inputSlug.value = '';
    inputStrainType.value = 'hybrid';
    inputSortOrder.value = '100';
    inputDescription.value = '';
    inputMoodAroma.value = '';
    inputTerpenes.value = '';
    inputImageUrl.value = '';
    if (inputImageFile) inputImageFile.value = '';
    inputImageAlt.value = '';
    inputFeatured.checked = false;
    inputPublished.checked = true;

    formTitle.textContent = 'Create Strain';
    formModeBadge.textContent = 'Create mode';
    editorPanel?.classList.remove('is-editing');
    saveBtn.textContent = 'Create strain';
    deleteBtn.classList.add('hidden');

    setFormMessage('', '');
    updateImagePreview();
    markClean();
    renderList();
  }

  function fillForm(strain) {
    inputId.value = String(strain.id);
    inputName.value = strain.name || '';
    inputSlug.value = strain.slug || '';
    inputStrainType.value = String(strain.strain_type || 'hybrid').toLowerCase();
    inputSortOrder.value = String(strain.sort_order ?? 100);
    inputDescription.value = strain.short_description || '';
    inputMoodAroma.value = strain.mood_aroma || '';
    inputTerpenes.value = Array.isArray(strain.terpenes) ? strain.terpenes.join(', ') : '';
    inputImageUrl.value = strain.image_url || '';
    if (inputImageFile) inputImageFile.value = '';
    inputImageAlt.value = strain.image_alt || '';
    inputFeatured.checked = Boolean(strain.is_featured);
    inputPublished.checked = Boolean(strain.is_published);

    formTitle.textContent = `Edit Strain: ${strain.name || ''}`;
    formModeBadge.textContent = 'Edit mode';
    editorPanel?.classList.add('is-editing');
    saveBtn.textContent = 'Update strain';
    deleteBtn.classList.remove('hidden');

    setFormMessage('', '');
    updateImagePreview();
    markClean();
    renderList();
  }

  function openStrainDrawer() {
    if (isStrainDrawerOpen) return;

    drawerReturnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    isStrainDrawerOpen = true;
    strainDrawer.classList.remove('hidden');
    strainDrawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('drawer-open');

    if (currentView !== 'strains') {
      setActiveView('strains');
    }
  }

  function closeStrainDrawer(options = {}) {
    const { force = false, resetFormState = false, skipFocusRestore = false } = options;
    if (!isStrainDrawerOpen) return true;

    if (!force && !confirmDiscardChanges()) {
      return false;
    }

    isStrainDrawerOpen = false;
    strainDrawer.classList.add('hidden');
    strainDrawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('drawer-open');

    if (resetFormState) {
      resetForm();
    }

    if (!skipFocusRestore && drawerReturnFocusEl && document.contains(drawerReturnFocusEl)) {
      drawerReturnFocusEl.focus();
    }
    drawerReturnFocusEl = null;

    return true;
  }

  function maybeNavigateToView(viewName) {
    const target = normalizeView(viewName);

    if (target === currentView) {
      setActiveView(target);
      return;
    }

    if (isStrainDrawerOpen) {
      const closed = closeStrainDrawer({ resetFormState: true });
      if (!closed) {
        setHashForView(currentView);
        return;
      }
    } else if (isDirty) {
      if (!confirmDiscardChanges()) {
        setHashForView(currentView);
        return;
      }
      resetForm();
    }

    if (isShopDirty && currentView === 'shop') {
      if (!confirmDiscardShopChanges()) {
        setHashForView(currentView);
        return;
      }
      if (shopProfileCache) {
        applyShopProfile(shopProfileCache, { persistCache: false });
      } else {
        resetShopForm();
      }
    }

    setActiveView(target);
  }

  function setListLoading(isLoading) {
    isListLoading = Boolean(isLoading);
    listLoading.classList.toggle('hidden', !isListLoading);
    strainsList.classList.toggle('hidden', isListLoading);

    if (isListLoading) {
      listEmpty.classList.add('hidden');
      listShell.setAttribute('aria-busy', 'true');
    } else {
      listShell.setAttribute('aria-busy', 'false');
    }
  }

  function setListEmptyState(title, copy, showReset = false) {
    listEmptyTitle.textContent = title;
    listEmptyCopy.textContent = copy;
    listResetBtn.classList.toggle('hidden', !showReset);
    listEmpty.classList.remove('hidden');
    strainsList.classList.add('hidden');
    listLoading.classList.add('hidden');
  }

  function hideListEmptyState() {
    listEmpty.classList.add('hidden');
    strainsList.classList.remove('hidden');
  }

  function updateListMetrics() {
    const total = strains.length;
    const published = strains.filter((item) => Boolean(item.is_published)).length;
    const drafts = Math.max(0, total - published);
    const featured = strains.filter((item) => Boolean(item.is_featured)).length;

    metricTotal.textContent = String(total);
    metricPublished.textContent = String(published);
    metricDraft.textContent = String(drafts);
    metricFeatured.textContent = String(featured);

    overviewTotal.textContent = String(total);
    overviewPublished.textContent = String(published);
    overviewDraft.textContent = String(drafts);
    overviewFeatured.textContent = String(featured);
  }

  function updateListSummary(filteredCount) {
    listSummary.textContent = `Showing ${filteredCount} of ${strains.length} strains.`;
  }

  function openEditorForStrain(strain) {
    if (!confirmDiscardChanges()) return;
    fillForm(strain);
    openStrainDrawer();
  }

  function renderList() {
    if (isListLoading) return;

    strainsList.innerHTML = '';
    const selectedId = inputId.value.trim();
    const query = String(searchInput.value || '').trim().toLowerCase();
    const statusFilter = String(filterSelect.value || 'all');

    const filtered = strains.filter((strain) => {
      const matchesQuery = !query
        || String(strain.name || '').toLowerCase().includes(query)
        || String(strain.slug || '').toLowerCase().includes(query);

      if (!matchesQuery) return false;
      if (statusFilter === 'published') return Boolean(strain.is_published);
      if (statusFilter === 'draft') return !strain.is_published;
      if (statusFilter === 'featured') return Boolean(strain.is_featured);
      return true;
    });

    updateListMetrics();
    updateListSummary(filtered.length);

    if (filtered.length === 0) {
      const hasFilters = Boolean(query) || statusFilter !== 'all';

      if (strains.length === 0) {
        setListEmptyState(
          'No strains yet',
          'Create your first strain from the editor drawer to populate this list.',
          false
        );
      } else {
        setListEmptyState(
          'No matching strains',
          'Try a different search term or clear filters to view the full list.',
          hasFilters
        );
      }
      return;
    }

    hideListEmptyState();

    filtered.forEach((strain) => {
      const row = document.createElement('article');
      row.className = 'item';
      if (selectedId && String(strain.id) === selectedId) {
        row.classList.add('is-selected');
      }

      const left = document.createElement('div');
      left.className = 'item-left';

      const name = document.createElement('strong');
      name.textContent = strain.name;

      const meta = document.createElement('small');
      meta.textContent = `${strain.slug} | #${strain.sort_order}`;

      const itemMeta = document.createElement('div');
      itemMeta.className = 'item-meta';

      const typeBadge = document.createElement('span');
      typeBadge.className = 'badge type';
      typeBadge.textContent = String(strain.strain_type || 'hybrid');

      const publishedBadge = document.createElement('span');
      publishedBadge.className = `badge ${strain.is_published ? 'live' : ''}`;
      publishedBadge.textContent = strain.is_published ? 'Published' : 'Draft';

      itemMeta.append(typeBadge, publishedBadge);

      if (strain.is_featured) {
        const featuredBadge = document.createElement('span');
        featuredBadge.className = 'badge featured';
        featuredBadge.textContent = 'Featured';
        itemMeta.appendChild(featuredBadge);
      }

      left.append(name, meta, itemMeta);

      const actions = document.createElement('div');
      actions.className = 'item-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn';
      editBtn.type = 'button';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => {
        openEditorForStrain(strain);
      });

      actions.append(editBtn);
      row.append(left, actions);
      row.addEventListener('click', (event) => {
        if (event.target.closest('button')) return;
        openEditorForStrain(strain);
      });

      strainsList.appendChild(row);
    });
  }

  async function fetchStrains() {
    setFormMessage('Loading strains...', '');
    setListLoading(true);

    const { data, error } = await supabase
      .from('strains')
      .select('id,slug,name,strain_type,short_description,terpenes,mood_aroma,image_url,image_alt,is_featured,is_published,sort_order,updated_at')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      strains = [];
      setListLoading(false);
      updateListMetrics();
      updateListSummary(0);
      setListEmptyState('Unable to load strains', 'Check your connection, then click Refresh list.', false);
      setFormMessage('', `Load failed: ${error.message}`);
      setOverviewStrainsSync('Sync failed');
      return;
    }

    strains = data || [];
    setListLoading(false);
    renderList();
    setFormMessage('Strains loaded.', '');
    setOverviewStrainsSync(`Synced ${formatSyncTime()}`);
  }

  function setPreviewState(state, noteText = '') {
    imagePreviewFrame.classList.remove('is-loading', 'is-error');
    if (state === 'loading') imagePreviewFrame.classList.add('is-loading');
    if (state === 'error') imagePreviewFrame.classList.add('is-error');

    if (noteText) {
      imagePreviewNote.textContent = noteText;
      imagePreviewNote.classList.remove('hidden');
    } else {
      imagePreviewNote.classList.add('hidden');
    }
  }

  function setPreviewMeta(text) {
    if (!text) {
      imagePreviewMeta.classList.add('hidden');
      imagePreviewMeta.textContent = '';
      return;
    }
    imagePreviewMeta.textContent = text;
    imagePreviewMeta.classList.remove('hidden');
  }

  function setPreviewToolsVisible(visible) {
    imagePreviewTools.classList.toggle('hidden', !visible);
  }

  function clearPreviewDisplay(noteText, state = 'idle') {
    imagePreview.classList.add('hidden');
    imagePreview.removeAttribute('src');
    imagePreviewFrame.classList.remove('has-image');
    imagePreviewHint.classList.add('hidden');
    activePreviewUrl = '';
    setPreviewMeta('');
    setPreviewToolsVisible(false);
    setPreviewState(state, noteText);
  }

  function getProjectBasePath() {
    const path = window.location.pathname || '/';
    const idx = path.indexOf('/admin/');
    if (idx >= 0) {
      return path.slice(0, idx + 1);
    }
    return '/';
  }

  function normalizePath(path) {
    return path.replace(/\/{2,}/g, '/');
  }

  function isAbsoluteUrl(value) {
    return /^(https?:\/\/|data:|blob:)/i.test(value);
  }

  function uniqueNonEmpty(values) {
    const seen = new Set();
    return values.filter((value) => {
      const normalized = String(value || '').trim();
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }

  function getPreviewCandidates(raw) {
    const value = String(raw || '').trim();
    const projectBase = getProjectBasePath();
    const clean = value.replace(/^\.\//, '');

    if (isAbsoluteUrl(value)) {
      return [value];
    }

    if (value.startsWith('/')) {
      const baseRelative = normalizePath(`${projectBase}${value.slice(1)}`);
      return uniqueNonEmpty([value, baseRelative]);
    }

    const parentRelative = `../${clean}`;
    const baseRelative = normalizePath(`${projectBase}${clean}`);
    return uniqueNonEmpty([value, parentRelative, baseRelative]);
  }

  function loadCurrentPreviewCandidate() {
    if (!previewCandidates.length || previewCandidateIndex >= previewCandidates.length) {
      clearPreviewDisplay('Image preview unavailable. Check the URL.', 'error');
      return;
    }

    setPreviewState('loading', 'Loading image preview...');
    imagePreview.classList.add('hidden');
    imagePreviewFrame.classList.remove('has-image');
    imagePreviewHint.classList.add('hidden');
    setPreviewMeta('');
    setPreviewToolsVisible(false);
    imagePreview.src = previewCandidates[previewCandidateIndex];
  }

  function updateImagePreview() {
    const raw = inputImageUrl.value.trim();
    if (!raw) {
      clearPreviewDisplay('Enter an image URL to preview.', 'idle');
      return;
    }

    previewCandidates = getPreviewCandidates(raw);
    previewCandidateIndex = 0;
    setPreviewState('loading', 'Loading image preview...');
    loadCurrentPreviewCandidate();
  }

  function getResolvedPreviewUrl() {
    const raw = imagePreview.currentSrc || imagePreview.getAttribute('src') || '';
    if (!raw) return '';

    try {
      return new URL(raw, window.location.href).href;
    } catch (_error) {
      return raw;
    }
  }

  function getImageAspectLabel(width, height) {
    const a = Number(width);
    const b = Number(height);
    if (!a || !b) return '';

    const gcd = (x, y) => {
      let m = Math.abs(x);
      let n = Math.abs(y);
      while (n) {
        const t = n;
        n = m % n;
        m = t;
      }
      return m || 1;
    };

    const divisor = gcd(a, b);
    return `${a / divisor}:${b / divisor}`;
  }

  function updatePreviewMetaFromImage() {
    const width = imagePreview.naturalWidth || 0;
    const height = imagePreview.naturalHeight || 0;

    if (!width || !height) {
      setPreviewMeta('');
      return;
    }

    const ratio = getImageAspectLabel(width, height);
    const ratioText = ratio ? ` • ${ratio}` : '';
    setPreviewMeta(`${width}x${height}${ratioText}`);
  }

  async function handleImageFileSelected(event) {
    const file = event.target?.files?.[0];
    if (!file) return;

    if (!String(file.type || '').startsWith('image/')) {
      setFormMessage('', 'Selected file is not an image.');
      inputImageFile.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      setFormMessage('', 'Image file is too large. Please use a file smaller than 5 MB.');
      inputImageFile.value = '';
      return;
    }

    setFormMessage('Processing image file...', '');

    try {
      const dataUrl = await fileToDataUrl(file);
      if (!dataUrl) throw new Error('Image conversion returned empty result.');

      inputImageUrl.value = dataUrl;

      if (!inputImageAlt.value.trim()) {
        const alt = getAltFromFileName(file.name);
        if (alt) inputImageAlt.value = alt;
      }

      updateImagePreview();
      updateDirtyState();
      setFormMessage('Image added. Preview updated.', '');
      showToast('Image added to form.', 'success');
    } catch (_error) {
      setFormMessage('', 'Could not process the selected image file.');
    } finally {
      inputImageFile.value = '';
    }
  }

  function openImageModal() {
    const src = activePreviewUrl || getResolvedPreviewUrl();
    if (!src || imagePreview.classList.contains('hidden')) return;

    modalReturnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    imageModalImg.src = src;
    imageModalImg.alt = inputImageAlt.value.trim() || 'Full size preview';
    imageModal.classList.remove('hidden');
    document.body.classList.add('modal-open');

    window.setTimeout(() => {
      imageModalClose?.focus();
    }, 0);
  }

  function closeImageModal() {
    imageModal.classList.add('hidden');
    imageModalImg.removeAttribute('src');
    document.body.classList.remove('modal-open');

    if (modalReturnFocusEl && document.contains(modalReturnFocusEl)) {
      modalReturnFocusEl.focus();
    }
    modalReturnFocusEl = null;
  }

  function getModalFocusableElements() {
    return Array.from(imageModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter((element) => !element.hasAttribute('disabled') && !element.classList.contains('hidden'));
  }

  function handleModalKeydown(event) {
    if (imageModal.classList.contains('hidden') || event.key !== 'Tab') return;

    const focusables = getModalFocusableElements();
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function resetShopForm() {
    shopInputName.value = '';
    shopInputVisitLede.value = '';
    shopInputAddress.value = '';
    shopInputHoursText.value = '';
    shopInputWhatsappUrl.value = '';
    shopInputMapEmbedUrl.value = '';
    shopInputMapNote.value = '';
    shopInputVisitNote.value = '';

    setShopFormMessage('', '');
    markShopClean();
    updateOverviewShopSnapshot();
  }

  function applyShopProfile(profile, options = {}) {
    const { persistCache = true } = options;
    const data = profile || {};

    shopInputName.value = data.name || 'Lets Phuket';
    shopInputVisitLede.value = data.visit_lede || '';
    shopInputAddress.value = data.address || '';
    shopInputHoursText.value = data.hours_text || '';
    shopInputWhatsappUrl.value = data.whatsapp_url || '';
    shopInputMapEmbedUrl.value = data.map_embed_url || '';
    shopInputMapNote.value = data.map_note || '';
    shopInputVisitNote.value = data.visit_note || '';
    persistShopNameForPublic(shopInputName.value);

    if (persistCache) {
      shopProfileCache = {
        name: shopInputName.value,
        visit_lede: shopInputVisitLede.value,
        address: shopInputAddress.value,
        hours_text: shopInputHoursText.value,
        whatsapp_url: shopInputWhatsappUrl.value,
        map_embed_url: shopInputMapEmbedUrl.value,
        map_note: shopInputMapNote.value,
        visit_note: shopInputVisitNote.value
      };
    }

    setShopFormMessage('', '');
    markShopClean();
    updateOverviewShopSnapshot();
  }

  async function fetchShopProfile() {
    if (!supabase) return;

    setShopFormMessage('Loading shop profile...', '');

    const { data, error } = await supabase
      .from('shop_profile')
      .select('name,visit_lede,address,hours_text,whatsapp_url,map_embed_url,map_note,visit_note')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      setShopFormMessage('', `Load failed: ${error.message}`);
      setOverviewShopSync('Sync failed');
      return;
    }

    if (data) {
      applyShopProfile(data, { persistCache: true });
      setShopFormMessage('Shop profile loaded.', '');
    } else {
      applyShopProfile({ name: 'Lets Phuket' }, { persistCache: true });
      setShopFormMessage('No profile row found. Save to create id=1 profile.', '');
    }

    setOverviewShopSync(`Synced ${formatSyncTime()}`);
  }

  function getShopPayloadFromForm() {
    const rawWhatsapp = shopInputWhatsappUrl.value.trim();
    const rawMapEmbed = shopInputMapEmbedUrl.value.trim();
    const normalizedWhatsapp = normalizeWhatsappUrl(rawWhatsapp);
    const normalizedMapEmbed = normalizeMapEmbedUrl(rawMapEmbed);

    if (rawWhatsapp && !normalizedWhatsapp) {
      throw new Error('WhatsApp URL must use https://wa.me or https://api.whatsapp.com');
    }

    if (rawMapEmbed && !normalizedMapEmbed) {
      throw new Error('Map embed URL must be https://www.google.com/maps/embed...');
    }

    return {
      name: shopInputName.value.trim(),
      visit_lede: shopInputVisitLede.value.trim(),
      address: shopInputAddress.value.trim(),
      hours_text: shopInputHoursText.value.trim(),
      whatsapp_url: normalizedWhatsapp,
      map_embed_url: normalizedMapEmbed,
      map_note: shopInputMapNote.value.trim(),
      visit_note: shopInputVisitNote.value.trim()
    };
  }

  async function saveShopProfile(event) {
    event.preventDefault();
    setShopFormMessage('Saving...', '');

    let payload;
    try {
      payload = getShopPayloadFromForm();
    } catch (error) {
      setShopFormMessage('', error.message || 'Invalid shop profile input.');
      return;
    }

    if (!payload.name) {
      setShopFormMessage('', 'Shop name is required.');
      return;
    }

    const { error } = await supabase
      .from('shop_profile')
      .upsert({ id: 1, ...payload }, { onConflict: 'id' });

    if (error) {
      setShopFormMessage('', `Save failed: ${error.message}`);
      return;
    }

    shopProfileCache = { ...payload };
    persistShopNameForPublic(payload.name);
    setShopFormMessage('Saved.', '');
    showToast('Shop profile saved.', 'success');
    markShopClean();
    updateOverviewShopSnapshot();
    setOverviewShopSync(`Saved ${formatSyncTime()}`);
  }

  function getPayloadFromForm() {
    const name = inputName.value.trim();
    const rawSlug = inputSlug.value.trim();
    const slug = toSlug(rawSlug || name);

    return {
      name,
      slug,
      strain_type: inputStrainType.value,
      sort_order: Number(inputSortOrder.value || 100),
      short_description: inputDescription.value.trim(),
      mood_aroma: inputMoodAroma.value.trim(),
      terpenes: parseTerpenes(inputTerpenes.value),
      image_url: inputImageUrl.value.trim() || null,
      image_alt: inputImageAlt.value.trim() || null,
      is_featured: inputFeatured.checked,
      is_published: inputPublished.checked
    };
  }

  async function saveStrain(event) {
    event.preventDefault();
    setFormMessage('Saving...', '');

    const id = inputId.value.trim();
    const payload = getPayloadFromForm();

    if (!payload.name || !payload.slug) {
      setFormMessage('', 'Name and slug are required.');
      return;
    }

    if (payload.is_featured) {
      const clearFeaturedQuery = supabase.from('strains').update({ is_featured: false });
      const { error: clearFeaturedError } = id
        ? await clearFeaturedQuery.neq('id', Number(id))
        : await clearFeaturedQuery;

      if (clearFeaturedError) {
        setFormMessage('', `Save failed: ${clearFeaturedError.message}`);
        return;
      }
    }

    let query = supabase.from('strains');
    if (id) {
      query = query.update(payload).eq('id', Number(id));
    } else {
      query = query.insert(payload);
    }

    const { error } = await query;

    if (error) {
      setFormMessage('', `Save failed: ${error.message}`);
      return;
    }

    setFormMessage('Saved.', '');
    showToast('Strain saved successfully.', 'success');
    await fetchStrains();

    if (!id) {
      const created = strains.find((item) => item.slug === payload.slug);
      if (created) fillForm(created);
    } else {
      const updated = strains.find((item) => String(item.id) === id);
      if (updated) fillForm(updated);
    }
  }

  async function deleteStrain() {
    const id = inputId.value.trim();
    if (!id) return;

    const strainName = inputName.value.trim() || 'this strain';
    const confirmed = window.confirm(`Delete ${strainName}? This cannot be undone.`);
    if (!confirmed) return;

    setFormMessage('Deleting...', '');

    const { error } = await supabase.from('strains').delete().eq('id', Number(id));
    if (error) {
      setFormMessage('', `Delete failed: ${error.message}`);
      return;
    }

    closeStrainDrawer({ force: true, resetFormState: true, skipFocusRestore: false });
    await fetchStrains();
    setFormMessage('Deleted.', '');
    showToast('Strain deleted.', 'success');
  }

  async function ensureAdminUser(user) {
    const { data, error } = await supabase.rpc('is_admin');

    if (error) {
      authError.textContent = `Admin check failed: ${error.message}`;
      showToast(`Admin check failed: ${error.message}`, 'error');
      return false;
    }

    if (!data) {
      authError.textContent = 'You are signed in, but this account is not in public.admin_users.';
      showToast('This account is not in public.admin_users.', 'error');
      return false;
    }

    return true;
  }

  async function bootstrapAuthenticated(user) {
    const userId = String(user?.id || '');
    if (!userId) return;

    if (bootstrapPromise && activeBootstrapUserId === userId) {
      await bootstrapPromise;
      return;
    }

    activeBootstrapUserId = userId;
    bootstrapPromise = (async () => {
      sessionEmail.textContent = `Signed in as ${user.email || user.id}`;
      authError.textContent = '';

      const allowed = await ensureAdminUser(user);
      if (!allowed) {
        setAuthMode(false);
        return;
      }

      setAuthMode(true);
      closeStrainDrawer({ force: true, resetFormState: true, skipFocusRestore: true });
      resetForm();
      resetShopForm();
      setActiveView(getViewFromHash(), { updateHash: true });

      await Promise.all([fetchStrains(), fetchShopProfile()]);
    })();

    try {
      await bootstrapPromise;
    } finally {
      bootstrapPromise = null;
    }
  }

  async function handleSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      authError.textContent = `Session error: ${error.message}`;
      return;
    }

    const user = data.session?.user;
    if (!user) {
      setAuthMode(false);
      return;
    }

    await bootstrapAuthenticated(user);
  }

  function initialize() {
    const hasValidUrl = typeof cfg?.url === 'string' && cfg.url.startsWith('https://');
    const hasValidKey = typeof cfg?.anonKey === 'string' && cfg.anonKey.length > 20;

    if (!createClient || !hasValidUrl || !hasValidKey) {
      authError.textContent = 'Supabase is not configured. Check ../supabase-config.js';
      return;
    }

    supabase = createClient(cfg.url, cfg.anonKey);

    imagePreviewFrame.setAttribute('role', 'button');
    imagePreviewFrame.setAttribute('tabindex', '0');
    imagePreviewFrame.setAttribute('aria-label', 'Open full size image preview');

    navButtons.forEach((button) => {
      button.addEventListener('click', () => {
        maybeNavigateToView(button.dataset.viewTarget);
      });
    });

    window.addEventListener('hashchange', () => {
      if (adminApp.classList.contains('hidden')) return;
      maybeNavigateToView(getViewFromHash());
    });

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      authError.textContent = '';

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        authError.textContent = error.message;
        showToast(error.message, 'error');
        return;
      }

      if (data.user) {
        showToast('Sign-in successful.', 'success');
      }
    });

    signoutBtn.addEventListener('click', async () => {
      if (!confirmDiscardAnyChanges()) return;

      await supabase.auth.signOut();
      strains = [];
      updateListMetrics();
      updateListSummary(0);
      renderList();
      closeStrainDrawer({ force: true, resetFormState: true, skipFocusRestore: true });
      resetShopForm();
      setOverviewStrainsSync('Not synced yet');
      setOverviewShopSync('Not synced yet');
      setAuthMode(false);
    });

    refreshBtn.addEventListener('click', fetchStrains);

    newBtn.addEventListener('click', () => {
      if (!confirmDiscardChanges()) return;
      resetForm();
      openStrainDrawer();
      inputName.focus();
    });

    drawerCloseBtn.addEventListener('click', () => {
      closeStrainDrawer({ resetFormState: true });
    });

    strainDrawerBackdrop.addEventListener('click', () => {
      closeStrainDrawer({ resetFormState: true });
    });

    strainForm.addEventListener('submit', saveStrain);
    deleteBtn.addEventListener('click', deleteStrain);

    inputName.addEventListener('input', () => {
      if (!inputId.value.trim()) {
        inputSlug.value = toSlug(inputName.value);
      }
      updateDirtyState();
    });

    [inputSlug, inputStrainType, inputSortOrder, inputDescription, inputMoodAroma, inputTerpenes, inputImageAlt].forEach((el) => {
      el.addEventListener('input', updateDirtyState);
      el.addEventListener('change', updateDirtyState);
    });

    inputImageUrl.addEventListener('input', () => {
      updateImagePreview();
      updateDirtyState();
    });

    inputImageFile.addEventListener('change', handleImageFileSelected);

    imagePreview.addEventListener('load', () => {
      activePreviewUrl = getResolvedPreviewUrl();
      imagePreview.classList.remove('hidden');
      setPreviewState('ready', '');
      imagePreviewFrame.classList.add('has-image');
      updatePreviewMetaFromImage();
      imagePreviewHint.classList.remove('hidden');
      setPreviewToolsVisible(true);
    });

    imagePreview.addEventListener('error', () => {
      imagePreviewFrame.classList.remove('has-image');
      imagePreviewHint.classList.add('hidden');
      activePreviewUrl = '';
      setPreviewMeta('');
      setPreviewToolsVisible(false);
      previewCandidateIndex += 1;
      loadCurrentPreviewCandidate();
    });

    inputFeatured.addEventListener('change', updateDirtyState);
    inputPublished.addEventListener('change', updateDirtyState);

    searchInput.addEventListener('input', renderList);
    filterSelect.addEventListener('change', renderList);

    listResetBtn.addEventListener('click', () => {
      searchInput.value = '';
      filterSelect.value = 'all';
      renderList();
    });

    imagePreview.addEventListener('click', openImageModal);
    imagePreviewFrame.addEventListener('click', openImageModal);
    imagePreviewFrame.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openImageModal();
      }
    });

    previewOpenBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (activePreviewUrl) {
        window.open(activePreviewUrl, '_blank', 'noopener,noreferrer');
      }
    });

    previewCopyBtn.addEventListener('click', async (event) => {
      event.stopPropagation();
      if (!activePreviewUrl) return;

      try {
        await navigator.clipboard.writeText(activePreviewUrl);
        showToast('Image URL copied.', 'success');
      } catch (_error) {
        setFormMessage('', 'Could not copy image URL. Browser blocked clipboard access.');
      }
    });

    previewDownloadBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!activePreviewUrl) return;

      const link = document.createElement('a');
      link.href = activePreviewUrl;
      link.download = '';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
    });

    imageModalClose.addEventListener('click', closeImageModal);
    imageModalBackdrop.addEventListener('click', closeImageModal);
    imageModal.addEventListener('click', (event) => {
      if (event.target === imageModal) closeImageModal();
    });
    imageModal.addEventListener('keydown', handleModalKeydown);

    shopRefreshBtn.addEventListener('click', async () => {
      if (!confirmDiscardShopChanges()) return;
      await fetchShopProfile();
    });

    shopForm.addEventListener('submit', saveShopProfile);

    [
      shopInputName,
      shopInputVisitLede,
      shopInputAddress,
      shopInputHoursText,
      shopInputWhatsappUrl,
      shopInputMapEmbedUrl,
      shopInputMapNote,
      shopInputVisitNote
    ].forEach((el) => {
      el.addEventListener('input', () => {
        updateShopDirtyState();
        updateOverviewShopSnapshot();
      });
      el.addEventListener('change', () => {
        updateShopDirtyState();
        updateOverviewShopSnapshot();
      });
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (user) {
        bootstrapAuthenticated(user);
      } else {
        setAuthMode(false);
      }
    });

    window.addEventListener('beforeunload', (event) => {
      if (!hasAnyUnsavedChanges()) return;
      event.preventDefault();
      event.returnValue = '';
    });

    window.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;

      if (!imageModal.classList.contains('hidden')) {
        closeImageModal();
        return;
      }

      if (isStrainDrawerOpen) {
        closeStrainDrawer({ resetFormState: true });
      }
    });

    updateListMetrics();
    updateListSummary(0);
    updateOverviewShopSnapshot();
    setOverviewStrainsSync('Not synced yet');
    setOverviewShopSync('Not synced yet');
    resetForm();
    resetShopForm();
    handleSession();
  }

  initialize();
});
