const accountOrdersClient = window.vmesteSupabase;
const accountOrdersContainer = document.getElementById('cardsContainer');
const accountOrdersFilters = document.querySelectorAll('.filter-btn');
let accountOrders = [];
let accountOrdersFilter = 'all';
let pendingCancelOrderId = null;

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

function accountOrderItemHTML(item) {
  const imageUrl = window.vmesteProductImageUrl?.(item.product_image_path)
    || 'media/profile-placeholder.svg';

  return `
    <li class="account-order-item">
      <img class="account-order-item__image" src="${accountOrdersEscape(imageUrl)}"
           alt="${accountOrdersEscape(item.product_name)}">
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
  const status = accountOrderStatuses[order.status] || {
    label: order.status,
    description: '',
  };

  return `
    <article class="account-order account-order--${accountOrdersEscape(order.status)}">
      <div class="account-order__head">
        <div>
          <strong>заказ #${accountOrdersEscape(order.id.slice(0, 8))}</strong>
          <small>${accountOrdersEscape(accountOrdersDate(order.created_at))}</small>
        </div>
        <span class="account-order__status">${accountOrdersEscape(status.label)}</span>
      </div>
      <p class="account-order__status-note">${accountOrdersEscape(status.description)}</p>
      <ul class="account-order__items">
        ${items.map(accountOrderItemHTML).join('')}
      </ul>
      <div class="account-order__footer">
        <div>
          <small>самовывоз</small>
          <p>${accountOrdersEscape(accountPickupPoints[order.pickup_point] || 'пространство (в)месте')}</p>
        </div>
        <strong>${accountOrdersMoney(order.total_amount)} ₽</strong>
      </div>
      ${order.status === 'pending' ? `
        <button class="account-order__cancel" type="button"
                data-action="cancel-order" data-order-id="${accountOrdersEscape(order.id)}">
          отменить заказ
        </button>
      ` : ''}
    </article>
  `;
}

async function accountOrdersLoad() {
  if (!accountOrdersClient || !accountOrdersContainer) return;

  const cachedUserId = window.vmesteCache?.currentUserId();
  const cached = cachedUserId
    ? window.vmesteCache?.read(`orders:${cachedUserId}`)
    : null;
  const hasCachedOrders = Array.isArray(cached);
  if (hasCachedOrders) {
    accountOrders = cached;
    accountOrdersRender();
  }

  const { data: sessionData } = await accountOrdersClient.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) {
    accountOrdersContainer.innerHTML = '<p class="lk-state-msg">Войдите, чтобы увидеть свои заказы.</p>';
    return;
  }

  if (!hasCachedOrders || cachedUserId !== user.id) {
    accountOrdersContainer.innerHTML = '<p class="lk-state-msg">Загружаем заказы...</p>';
  }
  const { data: orders, error } = await accountOrdersClient
    .from('orders')
    .select('id,status,total_amount,created_at,pickup_point,order_items(product_name,variant_size,unit_price,quantity,product_image_path)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    accountOrdersContainer.innerHTML = '<p class="lk-state-msg">Не удалось загрузить заказы. Проверьте обновление базы данных.</p>';
    return;
  }

  const changed = window.vmesteCache?.write(`orders:${user.id}`, orders);
  accountOrders = orders;
  if (changed || !hasCachedOrders || cachedUserId !== user.id) accountOrdersRender();
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
  await accountOrdersLoad();
});

accountOrdersFilters.forEach(button => {
  button.addEventListener('click', () => {
    accountOrdersFilter = button.dataset.filter || 'all';
    accountOrdersFilters.forEach(filter => filter.classList.toggle('active', filter === button));
    accountOrdersRender();
  });
});
accountOrdersLoad();
