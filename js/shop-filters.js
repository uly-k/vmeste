// ==================== МАГАЗИН: фильтры + сортировка ====================
// Подключается ПОСЛЕ shop.js.
// shop.js вызывает window.shopFilters.setProducts(products, renderFn) после загрузки.

(function () {

  // ── СОСТОЯНИЕ ────────────────────────────────────────────────────────────────
  const state = {
    query:      '',
    categories: [],
    priceType:  '',
    sort:       'default',
  };

  let allProducts = [];
  let renderFn    = null;

  // ── ЭЛЕМЕНТЫ ─────────────────────────────────────────────────────────────────
  const filtersBtn       = document.getElementById('shopFiltersBtn');
  const filtersWrap      = filtersBtn?.closest('.shop__filters-wrap') || filtersBtn?.parentElement;
  const sortSelect       = document.getElementById('shopSortSelect');
  const searchInput      = document.getElementById('shopSearch');
  const activeFiltersBar = document.getElementById('shopActiveFilters');

  // ── ПРИМЕНИТЬ ────────────────────────────────────────────────────────────────
  function apply() {
    let result = allProducts.slice();

    if (state.query) {
      const q = state.query.toLowerCase();
      result = result.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    }
    if (state.categories.length) {
      result = result.filter(p => state.categories.includes(p.category));
    }
    if (state.priceType === 'free') result = result.filter(p => !p.price || p.price === 0);
    if (state.priceType === 'paid') result = result.filter(p => p.price > 0);

    if (state.sort === 'price-asc')  result.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    if (state.sort === 'price-desc') result.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    if (state.sort === 'name-asc')   result.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));

    renderFn?.(result);
    renderActiveTags();
    updateBadge();
  }

  // ── БЕЙДЖ ────────────────────────────────────────────────────────────────────
  function updateBadge() {
    if (!filtersBtn) return;
    const count = state.categories.length + (state.priceType ? 1 : 0);
    let badge = filtersBtn.querySelector('.mer__filter-badge');
    if (!count) { badge?.remove(); return; }
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'mer__filter-badge';
      filtersBtn.appendChild(badge);
    }
    badge.textContent = count;
  }

  // ── АКТИВНЫЕ ТЕГИ ────────────────────────────────────────────────────────────
  function renderActiveTags() {
    if (!activeFiltersBar) return;
    const tags = [];
    state.categories.forEach(cat => {
      tags.push(`<span class="mer__active-tag">${cat}<button data-type="category" data-val="${cat}">×</button></span>`);
    });
    if (state.priceType) {
      const label = state.priceType === 'free' ? 'бесплатно' : 'платные';
      tags.push(`<span class="mer__active-tag">${label}<button data-type="priceType" data-val="">×</button></span>`);
    }
    activeFiltersBar.innerHTML = tags.join('');
    activeFiltersBar.hidden = !tags.length;
  }

  activeFiltersBar?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-type]');
    if (!btn) return;
    if (btn.dataset.type === 'category') state.categories = state.categories.filter(c => c !== btn.dataset.val);
    if (btn.dataset.type === 'priceType') state.priceType = '';
    syncChips();
    apply();
  });

  // ── ПОИСК ────────────────────────────────────────────────────────────────────
  let debounce;
  searchInput?.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.query = searchInput.value.trim(); apply(); }, 300);
  });

  // ── СОРТИРОВКА ───────────────────────────────────────────────────────────────
  sortSelect?.addEventListener('change', () => { state.sort = sortSelect.value; apply(); });

  // ── ПОПАП ────────────────────────────────────────────────────────────────────
  let popup = null;

  function buildPopup(categories) {
    if (popup) popup.remove();

    const hasFree = allProducts.some(p => !p.price || p.price === 0);
    const hasPaid = allProducts.some(p => p.price > 0);

    popup = document.createElement('div');
    popup.className = 'mer__filter-popup';
    popup.id = 'shopFilterPopup';
    popup.innerHTML = `
      <div class="mer__filter-popup-head">
        <span>фильтры</span>
        <button class="mer__filter-popup-close" id="shopFilterClose">×</button>
      </div>
      ${categories.length ? `
      <div class="mer__filter-group">
        <span class="mer__filter-group-label">категория</span>
        <div class="mer__chips">
          ${categories.map(cat =>
            `<button class="mer__chip" data-group="category" data-value="${cat}">${cat}</button>`
          ).join('')}
        </div>
      </div>` : ''}
      ${(hasFree || hasPaid) ? `
      <div class="mer__filter-group">
        <span class="mer__filter-group-label">цена</span>
        <div class="mer__chips">
          ${hasFree ? `<button class="mer__chip" data-group="priceType" data-value="free">бесплатно</button>` : ''}
          ${hasPaid ? `<button class="mer__chip" data-group="priceType" data-value="paid">платные</button>` : ''}
        </div>
      </div>` : ''}
      <div class="mer__filter-popup-footer">
        <button class="mer__filter-reset" id="shopFilterReset">сбросить</button>
        <button class="mer__filter-apply" id="shopFilterApply">показать</button>
      </div>
    `;

    // Вставляем попап ВНУТРЬ shop__filters-wrap — он открывается под кнопкой
    if (filtersWrap) {
      filtersWrap.style.position = 'relative';
      filtersWrap.appendChild(popup);
    }

    popup.querySelector('#shopFilterClose')?.addEventListener('click', closePopup);

    popup.addEventListener('click', e => {
      const chip = e.target.closest('.mer__chip');
      if (!chip) return;
      const { group, value } = chip.dataset;
      if (group === 'category') {
        state.categories = state.categories.includes(value)
          ? state.categories.filter(c => c !== value)
          : [...state.categories, value];
      }
      if (group === 'priceType') {
        state.priceType = state.priceType === value ? '' : value;
      }
      syncChips();
    });

    popup.querySelector('#shopFilterReset')?.addEventListener('click', () => {
      state.categories = [];
      state.priceType = '';
      syncChips();
      apply();
      closePopup();
    });

    popup.querySelector('#shopFilterApply')?.addEventListener('click', () => {
      apply();
      closePopup();
    });
  }

  function syncChips() {
    if (!popup) return;
    popup.querySelectorAll('.mer__chip[data-group="category"]').forEach(c =>
      c.classList.toggle('active', state.categories.includes(c.dataset.value))
    );
    popup.querySelectorAll('.mer__chip[data-group="priceType"]').forEach(c =>
      c.classList.toggle('active', state.priceType === c.dataset.value)
    );
  }

  function openPopup() {
    if (!popup) return;
    syncChips();
    popup.classList.add('active');
    filtersBtn?.classList.add('active');
    setTimeout(() => document.addEventListener('click', outsideClick), 0);
    document.addEventListener('keydown', escKey);
  }

  function closePopup() {
    if (!popup) return;
    popup.classList.remove('active');
    filtersBtn?.classList.remove('active');
    document.removeEventListener('click', outsideClick);
    document.removeEventListener('keydown', escKey);
  }

  function outsideClick(e) {
    if (!popup?.contains(e.target) && !filtersWrap?.contains(e.target)) closePopup();
  }
  function escKey(e) { if (e.key === 'Escape') closePopup(); }

  filtersBtn?.addEventListener('click', e => {
    e.stopPropagation();
    popup?.classList.contains('active') ? closePopup() : openPopup();
  });

  // ── ПУБЛИЧНЫЙ API ─────────────────────────────────────────────────────────────
  window.shopFilters = {
    setProducts(products, render) {
      allProducts = products || [];
      renderFn    = render || null;
      const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'ru'));
      // Если Supabase ещё не вернул категории — показываем базовый набор
    const fallbackCategories = ['одежда', 'канцелярия', 'книги', 'аксессуары', 'сувениры'];
    const finalCategories = categories.length ? categories : fallbackCategories;
    buildPopup(finalCategories);
      apply();
    },
    apply,
  };

})();
