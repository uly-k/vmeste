const PRODUCT_SELECT_FIELDS = 'id,slug,name,description,material,price,sizes,image_url';
const PRODUCT_SUPABASE_URL = window.vmesteSupabaseConfig.url;
const PRODUCT_SUPABASE_KEY = window.vmesteSupabaseConfig.publishableKey;
const PRODUCT_REQUEST_TIMEOUT = 10000;

function productEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function productError(message) {
  document.getElementById('productCard').innerHTML = `
    <div class="product__error">
      <p>${message}</p>
      <a href="magazin.html">вернуться в магазин</a>
    </div>
  `;
}

function productHTML(product) {
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const imagePath = product.image_url || '';
  const imageUrl = window.vmesteProductImageUrl(imagePath, 'product');
  const imageOriginalAttr = imagePath
    ? ` data-vmeste-original-image="${productEscape(imagePath)}"`
    : '';
  const sizeButtons = sizes.map((size, index) => `
    <button class="product__size${index === 0 ? ' active' : ''}"
            type="button"
            data-size="${productEscape(size)}">${productEscape(size)}</button>
  `).join('');
  const safeName = productEscape(product.name);

  return `
    <div class="product__image-wrap">
      <img class="product__image"
           src="${productEscape(imageUrl || 'https://placehold.co/800x800/f0eeeb/b0a898?text=фото')}"
           alt="${safeName}"
           decoding="async"
           fetchpriority="high"${imageOriginalAttr}>
    </div>
    <div class="product__details">
      <h1 class="product__title">${safeName}</h1>
      <div class="product__price">${Number(product.price).toLocaleString('ru-RU')} ₽</div>
      <p class="product__description">${productEscape(product.description || 'Описание появится позже.')}</p>
      <div class="product__meta">
        <span class="product__meta-label">материал</span>
        <span class="product__meta-value">${productEscape(product.material || 'не указан')}</span>
      </div>
      ${sizes.length ? `
        <span class="product__sizes-label">выберите размер</span>
        <div class="product__sizes">${sizeButtons}</div>
      ` : ''}
      <button class="product__add" type="button" id="productAddToCart">
        добавить в корзину
      </button>
    </div>
  `;
}

function bindProductActions(product) {
  document.querySelectorAll('.product__size').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.product__size').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
    });
  });

  document.getElementById('productAddToCart')?.addEventListener('click', () => {
    const size = document.querySelector('.product__size.active')?.dataset.size || null;
    window.vmesteCart.add(product, size);
    window.vmesteCart.notify('Товар добавлен в корзину');
  });
}

function renderProduct(product) {
  document.title = `${product.name} — (в)месте`;
  document.getElementById('productBreadcrumb').textContent = product.name;
  document.getElementById('productCard').innerHTML = productHTML(product);
  bindProductActions(product);
}

async function loadProduct() {
  const slug = new URLSearchParams(window.location.search).get('slug');
  if (!slug) {
    productError('Не указан товар.');
    return;
  }

  const cacheKey = `product:${slug}`;
  const cached = window.vmesteCache?.read(cacheKey);
  if (cached) renderProduct(cached);

  let data = null;
  try {
    const url = `${PRODUCT_SUPABASE_URL}/rest/v1/catalog_products`
      + `?select=${PRODUCT_SELECT_FIELDS}`
      + `&slug=eq.${encodeURIComponent(slug)}`
      + `&limit=1`;
    const result = await window.vmesteFetchJson(url, {
      headers: {
        'apikey': PRODUCT_SUPABASE_KEY,
        'Authorization': `Bearer ${PRODUCT_SUPABASE_KEY}`,
      },
    }, PRODUCT_REQUEST_TIMEOUT);
    data = result.data?.[0] || null;
  } catch (requestError) {
    console.error('[product]', requestError);
    if (!cached) productError('Supabase долго не отвечает. Попробуйте обновить страницу.');
    return;
  }

  if (!data) {
    if (!cached) productError('Товар не найден или больше не опубликован.');
    return;
  }

  if (window.vmesteCache?.write(cacheKey, data) || !cached) renderProduct(data);
}

loadProduct();
