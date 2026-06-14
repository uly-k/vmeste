const accountOrdersClient = window.vmesteSupabaseDirect;
const accountOrdersContainer = document.getElementById('cardsContainer');
const accountOrdersFilters = document.querySelectorAll('.filter-btn');
let accountOrders = [];
let accountOrdersFilter = 'all';
let pendingCancelOrderId = null;
let accountOrdersLoadPromise = null;
let accountOrdersLoadedUserId = null;
let accountOrdersLoadedAt = 0;
const ACCOUNT_ORDERS_CACHE_TTL = 15000;

const accountOrderStatuses = {
  pending: {
    label: 'заказ принят',
    description: 'Мы получили заказ и скоро начнем его собирать.',
  },
  processing: {
    label: 'собираем заказ',
    description: 'Команда пространства готовит ваши товары.',
  },
  ready: {
    label: 'можно забирать',
    description: 'Заказ готов. Заберите его в пространстве (в)месте.',
  },
  completed: {
    label: 'заказ получен',
    description: 'Заказ завершен. Спасибо, что были с нами.',
  },
  cancelled: {
    label: 'заказ отменен',
    description: 'Этот заказ отменен.',
  },
};

const accountPickupPoints = {
  'vmeste-karpovka': 'пространство (в)месте, наб. реки Карповки, 5АК',
};

function accountOrdersEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function accountOrdersMoney(value) {
  return Number(value).toLocaleString('ru-RU');
}

function accountOrdersDate(value) {
  return new Date(value).toLocaleString('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const EVENT_IMG_NAMES = ['domik.png','manflowerblue.png','nog.png','foto.png','prl.png','stul.png','book.png','vhod.png','manflower.png','manmo.png','manm.png'];

function accountOrdersImageUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) {
    if (window.vmesteProxyUrl) return window.vmesteProxyUrl(path, { fit: 'contain', quality: 85 });
    return path;
  }
  if (path.startsWith('products/')) {
    const fullUrl = `${window.vmesteSupabaseConfig?.url || ''}/storage/v1/object/public/product-images/${path}`;
    if (window.vmesteProxyUrl) return window.vmesteProxyUrl(fullUrl, { fit: 'contain', quality: 85 });
    return fullUrl;
  }
  if (path.startsWith('media/')) {
    const filename = path.replace('media/', '');
    const bucket = EVENT_IMG_NAMES.includes(filename) ? 'event-images' : 'product-images';
    const fullUrl = `${window.vmesteSupabaseConfig?.url || ''}/storage/v1/object/public/${bucket}/${filename}`;
    if (window.vmesteProxyUrl) return window.vmesteProxyUrl(fullUrl, { fit: 'contain', quality: 85 });
    return fullUrl;
  }
  if (window.vmesteProductImageUrl) return window.vmesteProductImageUrl(path, 'order');
  return path;
}

function accountOrderItemHTML(item) {
  const imageUrl = accountOrdersImageUrl(item.product_image_path) || 'media/profile-placeholder.svg';

  return `
    <li class="account-order-item">
      <img class="account-order-item__image" src="${accountOrdersEscape(imageUrl)}"
           alt="${accountOrdersEscape(item.product_name)}" loading="lazy" decoding="async">
      <div class="account-order-item__body">
        <strong>${accountOrdersEscape(item.product_name)}</strong>
        <span>размер: ${accountOrdersEscape(item.variant_size || 'без размера')}</span>
        <span>${accountOrdersEscape(item.quantity)} шт. · ${accountOrdersMoney(item.unit_price)} ₽</span>
      </div>
    </li>
  `;
}

function accountOrdersHTML(order) {
  const items = order.order_items || [];
  const isEvent = order._isEvent;
  const status = accountOrderStatuses[order.status] || {
    label: isEvent ? 'подтверждено' : order.status,
    description: isEvent ? 'Запись на мероприятие подтверждена.' : '',
  };

  const eventImageUrl = isEvent
    ? (window.vmesteEventImageUrl?.(order.order_items?.[0]?.product_image_path, order._eventId) || '')
    : '';

  const itemsHtml = isEvent
    ? items.map(item => `
        <li class="account-order-item">
          ${eventImageUrl ? `<img class="account-order-item__image" src="${accountOrdersEscape(eventImageUrl)}" alt="${accountOrdersEscape(item.product_name)}" loading="lazy" decoding="async">` : ''}
          <div class="account-order-item__body">
            <strong>${accountOrdersEscape(item.product_name)}</strong>
            <span>${accountOrdersEscape(item.variant_size || '')}</span>
            <span>${accountOrdersMoney(item.unit_price)} ₽</span>
          </div>
        </li>`).join('')
    : items.map(accountOrderItemHTML).join('');

  const footerHtml = isEvent
    ? `<div><strong>${accountOrdersMoney(order.total_amount)} ₽</strong></div>`
    : `<div>
        <small>самовывоз</small>
        <p>${accountOrdersEscape(accountPickupPoints[order.pickup_point] || 'пространство (в)месте')}</p>
      </div>
      <strong>${accountOrdersMoney(order.total_amount)} ₽</strong>`;

  return `
    <article class="account-order account-order--${accountOrdersEscape(order.status)}">
      <div class="account-order__head">
        <div>
          <strong>${isEvent ? 'мероприятие' : 'заказ'} #${accountOrdersEscape(order.id.slice(0, 8))}</strong>
          <small>${accountOrdersEscape(accountOrdersDate(order.created_at))}</small>
        </div>
        <span class="account-order__status">${accountOrdersEscape(status.label)}</span>
      </div>
      <p class="account-order__status-note">${accountOrdersEscape(status.description)}</p>
      <ul class="account-order__items">
        ${itemsHtml}
      </ul>
      <div class="account-order__footer">
        ${footerHtml}
      </div>
    </article>
  `;
}

function accountOrdersLoad(options = {}) {
  if (accountOrdersLoadPromise) return accountOrdersLoadPromise;
  accountOrdersLoadPromise = accountOrdersLoadInner(options)
    .finally(() => {
      accountOrdersLoadPromise = null;
    });
  return accountOrdersLoadPromise;
}

async function accountOrdersLoadInner({ force = false } = {}) {
  if (!accountOrdersClient || !accountOrdersContainer) return;

  const { data: sessionData } = await accountOrdersClient.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) {
    accountOrdersContainer.innerHTML = '<p class="lk-state-msg">Войдите, чтобы увидеть свои заказы.</p>';
    return;
  }

  accountOrdersContainer.innerHTML = '<p class="lk-state-msg">Загружаем заказы...</p>';

  const [ordersResult, eventsResult] = await Promise.all([
    accountOrdersClient.from('orders')
      .select('id,status,total_amount,created_at,pickup_point,order_items(product_name,variant_size,unit_price,quantity,product_image_path)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    accountOrdersClient.from('event_registrations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  const orders = ordersResult.data || [];
  const eventRows = eventsResult.data || [];

  const eventCards = eventRows.map(ev => ({
    id: ev.id,
    status: ev.status,
    total_amount: ev.event_price,
    created_at: ev.created_at,
    pickup_point: '',
    order_items: [{
      product_name: ev.event_name,
      variant_size: ev.event_date && ev.event_time ? `${ev.event_date}, ${ev.event_time}` : ev.event_date,
      unit_price: ev.event_price,
      quantity: 1,
      product_image_path: ev.event_image || '',
    }],
    _isEvent: true,
    _eventId: ev.event_id,
  }));

  const allOrders = [...orders, ...eventCards].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  window.vmesteCache?.write(`orders:${user.id}`, allOrders);
  accountOrders = allOrders;
  accountOrdersLoadedUserId = user.id;
  accountOrdersLoadedAt = Date.now();
  accountOrdersRender();
  return accountOrders;
}

function accountOrdersRender() {
  const visibleOrders = accountOrdersFilter === 'past'
    ? accountOrders.filter(order => ['completed', 'cancelled'].includes(order.status))
    : accountOrders;

  const html = visibleOrders.length
    ? visibleOrders.map(accountOrdersHTML).join('')
    : '<p class="lk-state-msg">Заказов пока нет.</p>';
  if (accountOrdersContainer.innerHTML !== html) accountOrdersContainer.innerHTML = html;
}

window.vmesteAccountOrdersLoad = accountOrdersLoad;
accountOrdersContainer?.addEventListener('click', event => {
  const button = event.target.closest('[data-action="cancel-order"]');
  if (!button) return;
  accountOrdersOpenCancelModal(button.dataset.orderId);
});

function accountOrdersOpenCancelModal(orderId) {
  const modal = document.getElementById('orderCancelModal');
  const message = document.getElementById('orderCancelMessage');
  if (!modal) return;
  pendingCancelOrderId = orderId;
  if (message) message.textContent = '';
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function accountOrdersCloseCancelModal() {
  const modal = document.getElementById('orderCancelModal');
  if (!modal) return;
  modal.hidden = true;
  pendingCancelOrderId = null;
  document.body.style.overflow = '';
}

function accountOrdersErrorMessage(error) {
  const message = error?.message || '';
  if (message.includes('Could not find the function')) {
    return 'В Supabase еще не применена миграция 20260531213000_order_status_workflow.sql.';
  }
  return message || 'Не удалось отменить заказ. Попробуйте еще раз.';
}

document.querySelectorAll('[data-cancel-close]').forEach(button => {
  button.addEventListener('click', accountOrdersCloseCancelModal);
});

document.getElementById('orderCancelConfirm')?.addEventListener('click', async event => {
  if (!pendingCancelOrderId) return;
  const button = event.currentTarget;
  const message = document.getElementById('orderCancelMessage');

  button.disabled = true;
  button.textContent = 'отменяем...';
  const { error } = await accountOrdersClient.rpc('cancel_own_order', {
    p_order_id: pendingCancelOrderId,
  });

  if (error) {
    if (message) message.textContent = accountOrdersErrorMessage(error);
    button.disabled = false;
    button.textContent = 'отменить заказ';
    return;
  }

  accountOrdersCloseCancelModal();
  button.disabled = false;
  button.textContent = 'отменить заказ';
  const userId = window.vmesteCache?.currentUserId();
  if (userId) window.vmesteCache?.remove(`orders:${userId}`);
  await accountOrdersLoad({ force: true });
});

accountOrdersFilters.forEach(button => {
  button.addEventListener('click', () => {
    accountOrdersFilter = button.dataset.filter || 'all';
    accountOrdersFilters.forEach(filter => filter.classList.toggle('active', filter === button));
    accountOrdersRender();
  });
});
accountOrdersLoad();
