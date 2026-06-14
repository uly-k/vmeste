const cartRoot = document.getElementById('cartRoot');

function cartEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const EVENT_IMAGE_NAMES = ['domik.png','manflowerblue.png','nog.png','foto.png','prl.png','stul.png','book.png','vhod.png','manflower.png','manmo.png','manm.png'];
const SUPABASE_URL = 'https://mmbslfwzaxmxmaevbdse.supabase.co';

function cartImageUrl(path) {
  if (!path) return 'media/profile-placeholder.svg';

  if (path.startsWith('http')) {
    if (window.vmesteProxyUrl) return window.vmesteProxyUrl(path, { fit: 'contain', quality: 85 });
    return path;
  }

  const cleanPath = path.replace('media/', '');
  const bareName = cleanPath.replace('products/', '');
  const isEvent = EVENT_IMAGE_NAMES.includes(bareName);
  const bucket = isEvent ? 'event-images' : 'product-images';
  const storagePath = isEvent ? bareName : cleanPath;
  const fullUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${storagePath}`;
  if (window.vmesteProxyUrl) return window.vmesteProxyUrl(fullUrl, { fit: 'contain', quality: 85 });
  return fullUrl;
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
  const isEvent = String(item.productId).startsWith('event-');
  const sizeLabel = isEvent ? 'дата и время' : 'размер';
  const size = item.size ? `<p class="cart-item__meta">${sizeLabel}: ${cartEscape(item.size)}</p>` : '';
  const detailUrl = isEvent
    ? `event-detail.html?id=${item.productId.replace('event-', '')}`
    : `product.html?slug=${encodeURIComponent(item.slug)}`;
  return `
    <article class="cart-item" data-product-id="${cartEscape(item.productId)}"
             data-size="${cartEscape(item.size || '')}">
      <a class="cart-item__image-wrap" href="${detailUrl}">
        <img class="cart-item__image" src="${cartEscape(cartImageUrl(item.imageUrl))}"
             alt="${cartEscape(item.name)}" loading="lazy" decoding="async"
             ${item.imageUrl ? `data-vmeste-original-image="${cartEscape(item.imageUrl)}"` : ''}>
      </a>
      <div class="cart-item__content">
        <div>
          <a class="cart-item__title" href="${detailUrl}">
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
  const title = document.getElementById('checkoutTitle');
  const intro = modal?.querySelector('.checkout-modal__intro');
  const pickupLabel = modal?.querySelector('.pickup-option strong');
  const pickupSmall = modal?.querySelector('.pickup-option small');
  
  if (!modal) return;
  if (status) status.textContent = '';

  const items = window.vmesteCart.getItems();
  const hasEvents = items.some(i => String(i.productId).startsWith('event-'));
  const hasProducts = items.some(i => !String(i.productId).startsWith('event-'));

  if (hasEvents && !hasProducts) {
    if (title) title.textContent = 'запись на мероприятие';
    if (intro) intro.textContent = 'Подтвердите запись. Информация о мероприятии появится в личном кабинете.';
    if (pickupLabel) pickupLabel.textContent = 'в пространстве (в)месте';
    if (pickupSmall) pickupSmall.textContent = 'Санкт-Петербург, набережная реки Карповки, 5АК';
  } else if (hasProducts && !hasEvents) {
    if (title) title.textContent = 'где забрать заказ?';
    if (intro) intro.textContent = 'Выберите точку самовывоза. Когда заказ будет готов, статус обновится в личном кабинете.';
    if (pickupLabel) pickupLabel.textContent = 'забрать из пространства (в)месте';
    if (pickupSmall) pickupSmall.textContent = 'Санкт-Петербург, набережная реки Карповки, 5АК';
  } else {
    if (title) title.textContent = 'оформление заказа';
    if (intro) intro.textContent = 'Заказ содержит товары и записи на мероприятия. Самовывоз из пространства (в)месте.';
    if (pickupLabel) pickupLabel.textContent = 'забрать из пространства (в)месте';
    if (pickupSmall) pickupSmall.textContent = 'Санкт-Петербург, набережная реки Карповки, 5АК';
  }

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

  try {
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      if (modalStatus) modalStatus.innerHTML = 'Чтобы оформить заказ, <a href="lk.html">войдите в аккаунт</a>.';
      return;
    }
  } catch (_) {
    if (modalStatus) modalStatus.textContent = 'Не удалось проверить авторизацию. Обновите страницу.';
    return;
  }

  button.disabled = true;
  button.textContent = 'оформляем заказ...';
  if (modalStatus) modalStatus.textContent = 'Отправляем запросы...';
  if (status) status.textContent = 'Отправляем запросы...';

  try {
    const realProducts = items.filter(i => !String(i.productId).startsWith('event-'));
    const events = items.filter(i => String(i.productId).startsWith('event-'));

    const totalRpcs = (realProducts.length > 0 ? 1 : 0) + events.reduce((s, e) => s + (e.quantity || 1), 0);
    let doneRpcs = 0;
    const updateProgress = () => {
      doneRpcs++;
      const msg = `Создаём заказ... (${doneRpcs}/${totalRpcs})`;
      if (modalStatus) modalStatus.textContent = msg;
      if (status) status.textContent = msg;
    };

    let orderPromise = null;
    if (realProducts.length > 0) {
      const payload = realProducts
        .filter(i => !String(i.productId).startsWith('event-'))
        .map(item => ({
          product_id: item.productId,
          size: item.size,
          quantity: item.quantity,
        }));
      
      if (payload.length > 0) {
        orderPromise = client.rpc('create_storefront_order', {
          p_items: payload,
          p_pickup_point: pickupPoint,
        }).then(r => { updateProgress(); return r; });
      }
    }

    const eventPromises = [];
    for (const ev of events) {
      const eventId = String(ev.productId).replace('event-', '');
      const dateParts = ev.size ? ev.size.split(', ') : ['', ''];
      const qty = ev.quantity || 1;
      const eventImage = ev.imageUrl || '';
      for (let i = 0; i < qty; i++) {
        eventPromises.push(
          client.rpc('create_event_registration', {
            p_event_id: eventId,
            p_event_name: ev.name,
            p_event_date: dateParts[0] || '',
            p_event_time: dateParts[1] || '',
            p_event_price: ev.price,
            p_event_image: eventImage,
          }).then(r => { updateProgress(); return r; })
        );
      }
    }

    const [orderResult, ...eventResultsRaw] = await Promise.all([
      orderPromise,
      ...eventPromises,
    ]);

    let orderId = null;
    if (orderResult) {
      if (orderResult.error) {
        if (modalStatus) modalStatus.textContent = orderResult.error.message || 'Не удалось оформить заказ.';
        button.disabled = false;
        button.textContent = 'подтвердить заказ';
        return;
      }
      orderId = orderResult.data;
    }

    const eventResults = [];
    let eventIdx = 0;
    for (const ev of events) {
      const qty = ev.quantity || 1;
      for (let i = 0; i < qty; i++) {
        const r = eventResultsRaw[eventIdx++];
        eventResults.push({ name: ev.name, success: !r?.error, error: r?.error?.message });
      }
    }

    cartCloseCheckout();
    window.vmesteCart.clear();

    const orderText = orderId ? `<p>Номер заказа: <strong>${cartEscape(String(orderId).slice(0, 8))}</strong></p>` : '';
    const eventsSuccess = eventResults.filter(r => r.success);
    const eventsFailed = eventResults.filter(r => !r.success);
    const eventsText = eventsSuccess.length > 0
      ? `<p>Записи на мероприятия (${eventsSuccess.map(e => cartEscape(e.name)).join(', ')}) созданы.</p>`
      : '';
    const eventsFailText = eventsFailed.length > 0
      ? `<p style="color:red">Ошибка записи: ${eventsFailed.map(e => `${cartEscape(e.name)} — ${cartEscape(e.error)}`).join(', ')}</p>`
      : '';
    const productText = realProducts.length > 0
      ? `<p>Забрать заказ можно из пространства (в)месте на Карповке, 5АК.</p>`
      : '';

    cartRoot.innerHTML = `
      <section class="cart-success">
        <h1>заказ оформлен</h1>
        ${orderText}
        ${eventsText}
        ${eventsFailText}
        ${productText}
      <a class="btn btn--primary" href="lk.html">перейти в личный кабинет</a>
    </section>
  `;
  } catch (e) {
    if (modalStatus) modalStatus.textContent = 'Ошибка сети. Проверьте соединение и попробуйте снова.';
    if (status) status.textContent = 'Ошибка сети.';
    button.disabled = false;
    button.textContent = 'подтвердить заказ';
  }
}