const crmClient = window.vmesteSupabase;
const crmState = document.getElementById('crmState');
const crmContent = document.getElementById('crmContent');
const crmOrders = document.getElementById('crmOrders');
const crmMetrics = document.getElementById('crmMetrics');
const crmStatus = document.getElementById('crmStatus');

const crmStatuses = {
  pending: {
    label: 'заказ принят',
    hint: 'Новый заказ: проверьте состав и начните сборку.',
  },
  processing: {
    label: 'собираем заказ',
    hint: 'Товары сейчас собираются командой.',
  },
  ready: {
    label: 'можно забирать',
    hint: 'Заказ готов и ожидает покупателя.',
  },
  completed: {
    label: 'заказ выдан',
    hint: 'Покупатель получил заказ.',
  },
  cancelled: {
    label: 'заказ отменен',
    hint: 'Заказ больше не требует обработки.',
  },
};

const crmPickupPoints = {
  'vmeste-karpovka': 'пространство (в)месте, наб. реки Карповки, 5АК',
};

const crmAllowedStatusTransitions = {
  pending: ['pending', 'processing', 'cancelled'],
  processing: ['processing', 'ready', 'cancelled'],
  ready: ['ready', 'completed'],
  completed: ['completed'],
  cancelled: ['cancelled'],
};

function crmEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function crmMoney(value) {
  return Number(value).toLocaleString('ru-RU');
}

function crmDate(value) {
  return new Date(value).toLocaleString('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function crmShowState(message, isError = false) {
  crmState.textContent = message;
  crmState.hidden = false;
  crmState.classList.toggle('crm-state--error', isError);
}

async function crmLoadOrders() {
  crmShowState('загружаем заказы...');

  const { data: orders, error } = await crmClient
    .from('orders')
    .select('id,user_id,status,total_amount,created_at,pickup_point,order_items(product_name,variant_size,unit_price,quantity,product_image_path)')
    .order('created_at', { ascending: false });

  if (error) {
    crmShowState('Не удалось загрузить заказы. Проверьте, что последняя миграция применена.', true);
    return;
  }

  const filter = crmStatus.value;
  const visibleOrders = filter === 'all'
    ? orders
    : orders.filter(order => order.status === filter);

  crmRenderMetrics(orders);
  crmOrders.innerHTML = visibleOrders.length
    ? visibleOrders.map(crmOrderHTML).join('')
    : '<article class="crm-empty">Заказов с таким статусом пока нет.</article>';
  crmState.hidden = true;
  crmContent.hidden = false;
}

function crmRenderMetrics(orders) {
  const newOrders = orders.filter(order => order.status === 'pending');
  const active = orders.filter(order => ['pending', 'processing', 'ready'].includes(order.status));
  const ready = orders.filter(order => order.status === 'ready');

  crmMetrics.innerHTML = `
    <article class="crm-metric"><span>новые заказы</span><strong>${newOrders.length}</strong></article>
    <article class="crm-metric"><span>в работе</span><strong>${active.length}</strong></article>
    <article class="crm-metric"><span>ждут выдачи</span><strong>${ready.length}</strong></article>
    <article class="crm-metric"><span>всего заказов</span><strong>${orders.length}</strong></article>
  `;
}

function crmItemHTML(item) {
  const imageUrl = window.vmesteProductImageUrl?.(item.product_image_path)
    || 'media/profile-placeholder.svg';

  return `
    <li class="crm-order-item">
      <img src="${crmEscape(imageUrl)}" alt="${crmEscape(item.product_name)}">
      <div>
        <strong>${crmEscape(item.product_name)}</strong>
        <span>размер: ${crmEscape(item.variant_size || 'без размера')}</span>
        <span>${crmEscape(item.quantity)} шт. · ${crmMoney(item.unit_price)} ₽</span>
      </div>
    </li>
  `;
}

function crmStatusOptionsHTML(status) {
  const allowed = crmAllowedStatusTransitions[status] || [status];
  return Object.entries(crmStatuses).map(([value, item]) => {
    return `<option value="${value}" ${status === value ? 'selected' : ''}
      ${allowed.includes(value) ? '' : 'disabled'}>${item.label}</option>`;
  }).join('');
}

function crmOrderHTML(order) {
  const items = order.order_items || [];
  const status = crmStatuses[order.status] || {
    label: order.status,
    hint: '',
  };

  return `
    <article class="crm-order crm-order--${crmEscape(order.status)}" data-order-id="${crmEscape(order.id)}">
      <div class="crm-order__head">
        <div>
          <strong class="crm-order__id">заказ #${crmEscape(order.id.slice(0, 8))}</strong>
          <p>${crmEscape(crmDate(order.created_at))}</p>
        </div>
        <span class="crm-order__badge">${crmEscape(status.label)}</span>
      </div>
      <p class="crm-order__hint">${crmEscape(status.hint)}</p>
      <div class="crm-order__meta">
        <span>покупатель: ${crmEscape(order.user_id.slice(0, 8))}</span>
        <span>самовывоз: ${crmEscape(crmPickupPoints[order.pickup_point] || 'пространство (в)месте')}</span>
      </div>
      <ul class="crm-order__items">
        ${items.map(crmItemHTML).join('')}
      </ul>
      <div class="crm-order__footer">
        <strong>${crmMoney(order.total_amount)} ₽</strong>
        <label class="crm-order__status-control">
          <span>изменить статус</span>
          <select data-action="status">
            ${crmStatusOptionsHTML(order.status)}
          </select>
        </label>
      </div>
    </article>
  `;
}

crmOrders.addEventListener('change', async event => {
  const select = event.target.closest('[data-action="status"]');
  if (!select) return;

  const orderId = select.closest('.crm-order')?.dataset.orderId;
  select.disabled = true;
  const { error } = await crmClient.rpc('admin_update_order_status', {
    p_order_id: orderId,
    p_status: select.value,
  });

  if (error) {
    const message = error.message?.includes('Could not find the function')
      ? 'В Supabase еще не применена миграция 20260531213000_order_status_workflow.sql.'
      : error.message || 'Не удалось изменить статус заказа.';
    crmShowState(message, true);
    select.disabled = false;
    return;
  }

  await crmLoadOrders();
});

document.getElementById('crmRefresh').addEventListener('click', crmLoadOrders);
crmStatus.addEventListener('change', crmLoadOrders);
document.getElementById('crmLogout').addEventListener('click', async () => {
  await crmClient.auth.signOut();
  window.location.href = 'lk.html';
});

async function crmInit() {
  if (!crmClient) {
    crmShowState('Не удалось подключиться к базе данных.', true);
    return;
  }

  const { data: sessionData } = await crmClient.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) {
    crmShowState('Сначала войдите в аккаунт через личный кабинет.', true);
    return;
  }

  const { data: profile, error } = await crmClient
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile?.is_admin) {
    crmShowState('У этого аккаунта нет доступа к CRM.', true);
    return;
  }

  await crmLoadOrders();
}

crmInit();
