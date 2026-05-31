const cartRoot = document.getElementById('cartRoot');

function cartEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function cartImageUrl(path) {
  return window.vmesteProductImageUrl?.(path, 'order') || path || 'media/profile-placeholder.svg';
}

function cartMoney(value) {
  return Number(value).toLocaleString('ru-RU');
}

function cartEmptyHTML() {
  return `
    <section class="cart-empty">
      <h1>корзина пока пустая</h1>
      <p>Добавьте товары из магазина, и они появятся здесь.</p>
      <a class="btn btn--primary" href="magazin.html">перейти в магазин</a>
    </section>
  `;
}

function cartItemHTML(item) {
  const size = item.size ? `<p class="cart-item__meta">размер: ${cartEscape(item.size)}</p>` : '';
  return `
    <article class="cart-item" data-product-id="${cartEscape(item.productId)}"
             data-size="${cartEscape(item.size || '')}">
      <a class="cart-item__image-wrap" href="product.html?slug=${encodeURIComponent(item.slug)}">
        <img class="cart-item__image" src="${cartEscape(cartImageUrl(item.imageUrl))}"
             alt="${cartEscape(item.name)}" loading="lazy" decoding="async"
             ${item.imageUrl ? `data-vmeste-original-image="${cartEscape(item.imageUrl)}"` : ''}>
      </a>
      <div class="cart-item__content">
        <div>
          <a class="cart-item__title" href="product.html?slug=${encodeURIComponent(item.slug)}">
            ${cartEscape(item.name)}
          </a>
          ${size}
          <p class="cart-item__price">${cartMoney(item.price)} ₽</p>
        </div>
        <div class="cart-item__actions">
          <div class="cart-quantity" aria-label="Количество товара">
            <button type="button" data-action="decrease" aria-label="Уменьшить количество">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-action="increase" aria-label="Увеличить количество">+</button>
          </div>
          <button class="cart-item__remove" type="button" data-action="remove">удалить</button>
        </div>
      </div>
    </article>
  `;
}

function cartRender() {
  const items = window.vmesteCart.getItems();
  if (!items.length) {
    cartRoot.innerHTML = cartEmptyHTML();
    return;
  }

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartRoot.innerHTML = `
    <section class="cart-page">
      <div class="cart-page__header">
        <h1>корзина</h1>
        <button class="cart-page__clear" type="button" id="cartClear">очистить корзину</button>
      </div>
      <div class="cart-page__grid">
        <div class="cart-page__items">
          ${items.map(cartItemHTML).join('')}
        </div>
        <aside class="cart-summary">
          <h2>итого</h2>
          <div class="cart-summary__row">
            <span>товары</span>
            <strong>${cartMoney(total)} ₽</strong>
          </div>
          <p class="cart-summary__note" id="checkoutStatus">После оформления заказ появится в личном кабинете.</p>
          <button class="btn btn--primary btn--full" type="button" data-action="checkout">
            оформить заказ
          </button>
        </aside>
      </div>
    </section>
  `;
}

cartRoot?.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  if (button.dataset.action === 'checkout') {
    cartOpenCheckout();
    return;
  }

  const item = button.closest('.cart-item');
  const productId = item?.dataset.productId;
  const size = item?.dataset.size || null;
  const current = window.vmesteCart.getItems()
    .find(entry => entry.productId === productId && (entry.size || null) === size);

  if (!current) return;
  if (button.dataset.action === 'increase') {
    window.vmesteCart.setQuantity(productId, size, current.quantity + 1);
  }
  if (button.dataset.action === 'decrease') {
    if (current.quantity === 1) window.vmesteCart.remove(productId, size);
    else window.vmesteCart.setQuantity(productId, size, current.quantity - 1);
  }
  if (button.dataset.action === 'remove') {
    window.vmesteCart.remove(productId, size);
  }
});

cartRoot?.addEventListener('click', event => {
  if (event.target.id !== 'cartClear') return;
  window.vmesteCart.clear();
});

window.addEventListener('vmeste:cart-updated', cartRender);
cartRender();

function cartOpenCheckout() {
  const modal = document.getElementById('checkoutModal');
  const status = document.getElementById('checkoutModalStatus');
  if (!modal) return;
  if (status) status.textContent = '';
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function cartCloseCheckout() {
  const modal = document.getElementById('checkoutModal');
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = '';
}

document.querySelectorAll('[data-checkout-close]').forEach(button => {
  button.addEventListener('click', cartCloseCheckout);
});

document.getElementById('checkoutConfirm')?.addEventListener('click', event => {
  cartCheckout(event.currentTarget);
});

async function cartCheckout(button) {
  const status = document.getElementById('checkoutStatus');
  const modalStatus = document.getElementById('checkoutModalStatus');
  const items = window.vmesteCart.getItems();
  const client = window.vmesteSupabase;
  const pickupPoint = document.querySelector('input[name="pickup-point"]:checked')?.value;

  if (!client) {
    if (modalStatus) modalStatus.textContent = 'Не удалось подключиться к базе данных. Обновите страницу.';
    return;
  }

  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData.session) {
    if (modalStatus) modalStatus.innerHTML = 'Чтобы оформить заказ, <a href="lk.html">войдите в аккаунт</a>.';
    return;
  }

  button.disabled = true;
  button.textContent = 'оформляем заказ...';
  if (modalStatus) modalStatus.textContent = 'Проверяем товары и создаем заказ.';

  const payload = items.map(item => ({
    product_id: item.productId,
    size: item.size,
    quantity: item.quantity,
  }));
  const { data: orderId, error } = await client.rpc('create_storefront_order', {
    p_items: payload,
    p_pickup_point: pickupPoint,
  });

  if (error) {
    if (modalStatus) modalStatus.textContent = error.message || 'Не удалось оформить заказ.';
    button.disabled = false;
    button.textContent = 'подтвердить заказ';
    return;
  }

  cartCloseCheckout();
  window.vmesteCart.clear();
  cartRoot.innerHTML = `
    <section class="cart-success">
      <h1>заказ оформлен</h1>
      <p>Номер заказа: <strong>${cartEscape(String(orderId).slice(0, 8))}</strong></p>
      <p>Забрать заказ можно будет из пространства (в)месте на Карповке, 5АК. Дождитесь статуса «можно забирать» в личном кабинете.</p>
      <a class="btn btn--primary" href="lk.html">перейти в личный кабинет</a>
    </section>
  `;
}
