const productClient = window.vmesteSupabase;

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
  const imageUrl = window.vmesteProductImageUrl(product.image_url);
  const sizeButtons = sizes.map((size, index) => `
    <button class="product__size${index === 0 ? ' active' : ''}"
            type="button"
            data-size="${size}">${size}</button>
  `).join('');

  return `
    <div class="product__image-wrap">
      <img class="product__image"
           src="${imageUrl || 'https://placehold.co/800x800/f0eeeb/b0a898?text=фото'}"
           alt="${product.name}">
    </div>
    <div class="product__details">
      <h1 class="product__title">${product.name}</h1>
      <div class="product__price">${Number(product.price).toLocaleString('ru-RU')} ₽</div>
      <p class="product__description">${product.description || 'Описание появится позже.'}</p>
      <div class="product__meta">
        <span class="product__meta-label">материал</span>
        <span class="product__meta-value">${product.material || 'не указан'}</span>
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

  const { data, error } = await productClient
    .from('catalog_products')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) {
    if (!cached) productError('Товар не найден или больше не опубликован.');
    return;
  }

  if (window.vmesteCache?.write(cacheKey, data) || !cached) renderProduct(data);
}

loadProduct();
