/* =====================================================
   shop.js — модуль магазина
   Зависимости: shop-section.html, cards-shop.css
   ===================================================== */

/* ── SUPABASE CONFIG — замените на свои ── */
const SHOP_SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
const SHOP_SUPABASE_ANON = 'YOUR_ANON_KEY';

/*
  Ожидаемая структура таблицы `products` в Supabase:
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

/* =====================================================
   SUPABASE FETCH
   ===================================================== */
async function shopFetch({ page, search, ascending }) {
  const offset = page * PAGE_SIZE;
  const order  = `name.${ascending ? 'asc' : 'desc'}`;

  let url = `${SHOP_SUPABASE_URL}/rest/v1/products`
    + `?select=*`
    + `&order=${order}`
    + `&limit=${PAGE_SIZE}`
    + `&offset=${offset}`;

  if (search.trim()) {
    url += `&name=ilike.*${encodeURIComponent(search.trim())}*`;
  }

  const res = await fetch(url, {
    headers: {
      'apikey':        SHOP_SUPABASE_ANON,
      'Authorization': `Bearer ${SHOP_SUPABASE_ANON}`,
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
    .map(s => `<button class="shop-card__size${s === 'L' ? ' active' : ''}"
                        onclick="shopSelectSize(this,'${product.id}')">${s}</button>`)
    .join('');

  const img = product.image_url
    ? `<img src="${product.image_url}" alt="${product.name}" loading="lazy" />`
    : `<img src="https://placehold.co/400x400/f0eeeb/b0a898?text=фото"
            alt="${product.name}" loading="lazy" />`;

  const price = product.price
    ? `<div class="shop-card__price">${Number(product.price).toLocaleString('ru-RU')} ₽</div>`
    : '';

  return `
    <article class="shop-card" data-id="${product.id}">
      <div class="shop-card__img-wrap">${img}</div>
      <div class="shop-card__body">
        <div class="shop-card__name">${product.name ?? '—'}</div>
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

  if (reset) {
    grid.innerHTML      = '';
    shopState.page      = 0;
    shopState.hasMore   = true;
    shopState.products  = [];
  }

  /* скелетоны */
  const skelCount = reset ? PAGE_SIZE : 4;
  grid.insertAdjacentHTML('beforeend', shopSkeletonHTML(skelCount));

  try {
    const { items, total } = await shopFetch({
      page:      shopState.page,
      search:    shopState.search,
      ascending: shopState.sortAsc,
    });

    /* убрать скелетоны */
    grid.querySelectorAll('.shop-card--skeleton').forEach(el => el.remove());

    if (items.length === 0 && shopState.page === 0) {
      grid.insertAdjacentHTML('beforeend',
        '<p class="shop__state-msg">ничего не найдено</p>');
      shopState.hasMore = false;
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
  console.log('[shop] addToCart', { product, size });
  /* TODO: ваша логика корзины */
}

/* =====================================================
   INIT
   ===================================================== */
shopLoad(true);
