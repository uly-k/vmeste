/* =====================================================
   shop.js — модуль магазина
   Зависимости: shop-section.html, cards-shop.css
   ===================================================== */

/* ── SUPABASE CONFIG ── */
const SHOP_SUPABASE_URL = window.vmesteSupabaseConfig.url;
const SHOP_SUPABASE_KEY = window.vmesteSupabaseConfig.publishableKey;

/*
  Данные приходят из представления `catalog_products` в Supabase:
  ┌─────────────┬──────────┬───────────────────────────────┐
  │ поле        │ тип      │ пример                        │
  ├─────────────┼──────────┼───────────────────────────────┤
  │ id          │ int/uuid │ 1                             │
  │ name        │ text     │ "майка"                       │
  │ material    │ text     │ "хлопок, эластан"             │
  │ sizes       │ text[]   │ ["XS","S","M","L","XL"]       │
  │ image_url   │ text     │ "https://..."                 │
  │ price       │ numeric  │ 2900                          │
  └─────────────┴──────────┴───────────────────────────────┘
*/

/* ── Настройки ── */
const PAGE_SIZE     = 8;
const ANIMATE_DELAY = 60; /* ms между карточками */

/* ── Состояние ── */
const shopState = {
  page:     0,
  search:   '',
  sortAsc:  true,
  loading:  false,
  hasMore:  true,
  products: [],
};

function shopCacheKey() {
  return `shop:${shopState.search.trim().toLowerCase()}:${shopState.sortAsc ? 'asc' : 'desc'}`;
}

function shopReadCache() {
  const cached = window.vmesteCache?.read(shopCacheKey());
  return cached && Array.isArray(cached.items) ? cached : null;
}

function shopSameResult(cached, items, total) {
  return cached
    && cached.total === total
    && JSON.stringify(cached.items) === JSON.stringify(items);
}

function shopRenderInitial(items) {
  const grid = document.getElementById('shopGrid');
  grid.innerHTML = items.length
    ? items.map(shopCardHTML).join('')
    : '<p class="shop__state-msg">ничего не найдено</p>';
}

/* =====================================================
   SUPABASE FETCH
   ===================================================== */
async function shopFetch({ page, search, ascending }) {
  const offset = page * PAGE_SIZE;
  const order  = `name.${ascending ? 'asc' : 'desc'}`;

  let url = `${SHOP_SUPABASE_URL}/rest/v1/catalog_products`
    + `?select=*`
    + `&order=${order}`
    + `&limit=${PAGE_SIZE}`
    + `&offset=${offset}`;

  if (search.trim()) {
    url += `&name=ilike.*${encodeURIComponent(search.trim())}*`;
  }

  const res = await fetch(url, {
    headers: {
      'apikey':        SHOP_SUPABASE_KEY,
      'Prefer':        'count=exact',
    },
  });

  if (!res.ok) throw new Error(`Supabase: ${res.status}`);

  const items = await res.json();
  const range = res.headers.get('content-range') || '';
  const total = parseInt(range.split('/')[1] || '0', 10);

  return { items, total };
}

/* =====================================================
   РЕНДЕР
   ===================================================== */
function shopCardHTML(product) {
  const sizes     = Array.isArray(product.sizes) ? product.sizes : ['XS', 'S', 'M', 'L', 'XL'];
  const sizeItems = sizes
    .map((s, index) => `<button class="shop-card__size${s === 'L' || (index === 0 && !sizes.includes('L')) ? ' active' : ''}"
                        onclick="shopSelectSize(this,'${product.id}')">${s}</button>`)
    .join('');

  const imageUrl = window.vmesteProductImageUrl(product.image_url);
  const img = imageUrl
    ? `<img src="${imageUrl}" alt="${product.name}" loading="lazy" />`
    : `<img src="https://placehold.co/400x400/f0eeeb/b0a898?text=фото"
            alt="${product.name}" loading="lazy" />`;

  const price = product.price
    ? `<div class="shop-card__price">${Number(product.price).toLocaleString('ru-RU')} ₽</div>`
    : '';

  return `
    <article class="shop-card" data-id="${product.id}" data-slug="${product.slug}">
      <a class="shop-card__link" href="product.html?slug=${encodeURIComponent(product.slug)}"
         aria-label="Открыть товар: ${product.name}">
        <div class="shop-card__img-wrap">${img}</div>
      </a>
      <div class="shop-card__body">
        <a class="shop-card__name" href="product.html?slug=${encodeURIComponent(product.slug)}">
          ${product.name ?? '—'}
        </a>
        <div class="shop-card__meta">
          <span class="shop-card__meta-label">материал</span>
          <span class="shop-card__meta-value">${product.material ?? '—'}</span>
        </div>
        ${price}
        <div class="shop-card__footer">
          <div class="shop-card__sizes">${sizeItems}</div>
          <button class="shop-card__add"
                  onclick="shopAddToCart('${product.id}')"
                  aria-label="добавить в корзину">+</button>
        </div>
      </div>
    </article>
  `;
}

function shopSkeletonHTML(count) {
  return Array.from({ length: count }, () => `
    <article class="shop-card shop-card--skeleton" aria-hidden="true">
      <div class="shop-card__img-wrap"></div>
      <div class="shop-card__body" style="gap:8px">
        <div class="skel" style="height:20px;width:55%"></div>
        <div class="skel" style="height:13px;width:35%"></div>
        <div class="skel" style="height:13px;width:45%"></div>
        <div class="shop-card__footer" style="margin-top:4px">
          <div class="skel" style="height:12px;width:90px"></div>
          <div class="skel" style="width:36px;height:36px;border-radius:50%"></div>
        </div>
      </div>
    </article>
  `).join('');
}

function shopAnimateCards(cards) {
  cards.forEach((card, i) => {
    setTimeout(() => card.classList.add('visible'), i * ANIMATE_DELAY);
  });
}

/* =====================================================
   ЗАГРУЗКА
   ===================================================== */
async function shopLoad(reset = false) {
  if (shopState.loading) return;
  shopState.loading = true;

  const grid = document.getElementById('shopGrid');
  const btn  = document.getElementById('shopLoadMore');
  if (btn) btn.disabled = true;

  let cached = null;
  if (reset) {
    grid.innerHTML      = '';
    shopState.page      = 0;
    shopState.hasMore   = true;
    shopState.products  = [];

    cached = shopReadCache();
    if (cached) {
      shopRenderInitial(cached.items);
      shopState.products = [...cached.items];
      shopState.page = 1;
      shopState.hasMore = shopState.products.length < cached.total;
    }
  }

  /* скелетоны */
  const skelCount = reset ? PAGE_SIZE : 4;
  if (!cached) grid.insertAdjacentHTML('beforeend', shopSkeletonHTML(skelCount));

  try {
    const { items, total } = await shopFetch({
      page:      reset ? 0 : shopState.page,
      search:    shopState.search,
      ascending: shopState.sortAsc,
    });

    /* убрать скелетоны */
    grid.querySelectorAll('.shop-card--skeleton').forEach(el => el.remove());

    if (reset) {
      if (!shopSameResult(cached, items, total)) {
        shopRenderInitial(items);
        shopAnimateCards([...grid.querySelectorAll('.shop-card')]);
      }
      shopState.products = [...items];
      shopState.page = 1;
      shopState.hasMore = shopState.products.length < total;
      window.vmesteCache?.write(shopCacheKey(), { items, total });
    } else {
      const startIndex = grid.querySelectorAll('.shop-card:not(.shop-card--skeleton)').length;
      grid.insertAdjacentHTML('beforeend', items.map(shopCardHTML).join(''));

      const newCards = [...grid.querySelectorAll('.shop-card')]
        .slice(startIndex);
      shopAnimateCards(newCards);

      shopState.products.push(...items);
      shopState.page++;
      shopState.hasMore = shopState.products.length < total;
    }
  } catch (err) {
    grid.querySelectorAll('.shop-card--skeleton').forEach(el => el.remove());
    if (shopState.page === 0) {
      grid.insertAdjacentHTML('beforeend',
        `<p class="shop__state-msg">ошибка загрузки: ${err.message}</p>`);
    }
    console.error('[shop]', err);
  } finally {
    shopState.loading = false;
    if (btn) {
      btn.disabled     = !shopState.hasMore;
      btn.style.display = shopState.hasMore ? '' : 'none';
    }
  }
}

/* =====================================================
   ОБРАБОТЧИКИ
   ===================================================== */

/* Поиск */
let shopSearchTimer;
document.getElementById('shopSearch')?.addEventListener('input', e => {
  clearTimeout(shopSearchTimer);
  shopState.search = e.target.value;
  shopSearchTimer  = setTimeout(() => shopLoad(true), 350);
});

/* Сортировка */
document.getElementById('shopSortBtn')?.addEventListener('click', () => {
  shopState.sortAsc = !shopState.sortAsc;
  shopLoad(true);
});

/* Загрузить ещё */
document.getElementById('shopLoadMore')?.addEventListener('click', () => {
  shopLoad(false);
});

/* Фильтры */
document.getElementById('shopFiltersBtn')?.addEventListener('click', () => {
  /* TODO: откройте свою панель фильтров */
  console.log('[shop] фильтры');
});

/* Переход на страницу товара по клику на свободную область карточки */
document.getElementById('shopGrid')?.addEventListener('click', event => {
  if (event.target.closest('a, button')) return;

  const card = event.target.closest('.shop-card[data-slug]');
  if (!card) return;

  window.location.href = `product.html?slug=${encodeURIComponent(card.dataset.slug)}`;
});

/* =====================================================
   API ДЛЯ КАРТОЧЕК
   ===================================================== */

/* Выбор размера */
function shopSelectSize(btn, id) {
  btn.closest('.shop-card__sizes')
     .querySelectorAll('.shop-card__size')
     .forEach(s => s.classList.remove('active'));
  btn.classList.add('active');
}

/* Добавить в корзину */
function shopAddToCart(id) {
  const product = shopState.products.find(p => String(p.id) === String(id));
  const card    = document.querySelector(`.shop-card[data-id="${id}"]`);
  const size    = card?.querySelector('.shop-card__size.active')?.textContent;
  if (!product) return;
  window.vmesteCart.add(product, size);
  window.vmesteCart.notify('Товар добавлен в корзину');
}

/* =====================================================
   INIT
   ===================================================== */
shopLoad(true);
