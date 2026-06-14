const crmClient = window.vmesteSupabaseDirect;
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
    label: 'отменено',
    hint: 'Больше не требует обработки.',
  },
  confirmed: {
    label: 'подтверждено',
    hint: 'Запись на мероприятие подтверждена.',
  },
};

const crmEventStatuses = {
  pending: {
    label: 'ожидает подтверждения',
    hint: 'Новая запись на мероприятие. Подтвердите или отмените.',
  },
  confirmed: {
    label: 'подтверждено',
    hint: 'Запись на мероприятие подтверждена.',
  },
  cancelled: {
    label: 'отменено',
    hint: 'Запись отменена.',
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
  confirmed: ['confirmed', 'cancelled'],
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

  try {
    let allItems = [];

    try {
      const { data: orders, error: ordersErr } = await crmClient.from('orders')
        .select('id,user_id,status,total_amount,created_at,pickup_point,order_items(product_name,variant_size,unit_price,quantity,product_image_path)')
        .order('created_at', { ascending: false });

      if (!ordersErr && orders) {
        allItems.push(...orders.map(order => ({ ...order, type: 'order' })));
      }
    } catch (_) {}

    try {
      const { data: events, error: eventsErr } = await crmClient.from('event_registrations')
        .select('id,user_id,event_id,event_name,event_date,event_time,event_price,status,created_at,event_image')
        .order('created_at', { ascending: false });

      if (!eventsErr && events) {
        allItems.push(...events.map(ev => ({
          id: ev.id,
          user_id: ev.user_id,
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
          type: 'event',
          event_id: ev.event_id,
        })));
      }
    } catch (_) {}

    allItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const filter = crmStatus.value;
    const visibleOrders = filter === 'all'
      ? allItems
      : allItems.filter(order => order.status === filter);

    crmRenderMetrics(allItems);
    crmOrders.innerHTML = visibleOrders.length
      ? visibleOrders.map(crmOrderHTML).join('')
      : '<article class="crm-empty">Заказов с таким статусом пока нет.</article>';
    crmState.hidden = true;
    crmContent.hidden = false;
  } catch (e) {
    crmShowState('Ошибка загрузки: ' + (e.message || e), true);
  }
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

function crmItemHTML(item, eventImage) {
  const imageUrl = eventImage
    || (item.product_image_path && window.vmesteProductImageUrl?.(item.product_image_path, 'thumb'))
    || 'media/profile-placeholder.svg';

  return `
    <li class="crm-order-item">
      <img src="${crmEscape(imageUrl)}" alt="${crmEscape(item.product_name)}" loading="lazy" decoding="async">
      <div>
        <strong>${crmEscape(item.product_name)}</strong>
        <span>размер: ${crmEscape(item.variant_size || 'без размера')}</span>
        <span>${crmEscape(item.quantity)} шт. · ${crmMoney(item.unit_price)} ₽</span>
      </div>
    </li>
  `;
}

function crmStatusOptionsHTML(status, isEvent) {
  const statuses = isEvent ? crmEventStatuses : crmStatuses;
  const eventTransitions = {
    pending: ['pending', 'confirmed', 'cancelled'],
    confirmed: ['confirmed', 'cancelled'],
    cancelled: ['cancelled'],
  };
  const orderTransitions = crmAllowedStatusTransitions;
  const allowed = isEvent
    ? (eventTransitions[status] || [status])
    : (orderTransitions[status] || [status]);
  return Object.entries(statuses).map(([value, item]) => {
    return `<option value="${value}" ${status === value ? 'selected' : ''}
      ${allowed.includes(value) ? '' : 'disabled'}>${item.label}</option>`;
  }).join('');
}

function crmOrderHTML(order) {
  const items = order.order_items || [];
  const isEvent = order.type === 'event';
  const statuses = isEvent ? crmEventStatuses : crmStatuses;
  const status = statuses[order.status] || {
    label: order.status,
    hint: '',
  };
  const eventImage = window.vmesteEventImageUrl?.('', order.event_id) || '';

  const metaHtml = isEvent
    ? `<div class="crm-order__meta">
        <span>участник: ${crmEscape(order.user_id.slice(0, 8))}</span>
      </div>`
    : `<div class="crm-order__meta">
        <span>покупатель: ${crmEscape(order.user_id.slice(0, 8))}</span>
        <span>самовывоз: ${crmEscape(crmPickupPoints[order.pickup_point] || 'пространство (в)месте')}</span>
      </div>`;

  return `
    <article class="crm-order crm-order--${crmEscape(order.status)}" data-order-id="${crmEscape(order.id)}" data-order-type="${isEvent ? 'event' : 'order'}">
      <div class="crm-order__head">
        <div>
          <strong class="crm-order__id">${isEvent ? 'мероприятие' : 'заказ'} #${crmEscape(order.id.slice(0, 8))}</strong>
          <p>${crmEscape(crmDate(order.created_at))}</p>
        </div>
        <span class="crm-order__badge">${crmEscape(status.label)}</span>
      </div>
      <p class="crm-order__hint">${crmEscape(status.hint)}</p>
      ${metaHtml}
      <ul class="crm-order__items">
        ${items.map(item => crmItemHTML(item, eventImage)).join('')}
      </ul>
      <div class="crm-order__footer">
        <strong>${crmMoney(order.total_amount)} ₽</strong>
        <label class="crm-order__status-control">
          <span>изменить статус</span>
          <select data-action="status">
            ${crmStatusOptionsHTML(order.status, isEvent)}
          </select>
        </label>
      </div>
    </article>
  `;
}

crmOrders.addEventListener('change', async event => {
  const select = event.target.closest('[data-action="status"]');
  if (!select) return;

  const orderEl = select.closest('.crm-order');
  const orderId = orderEl?.dataset.orderId;
  const orderType = orderEl?.dataset.orderType;
  select.disabled = true;

  let error;
  if (orderType === 'event') {
    const result = await crmClient.rpc('admin_update_event_status', {
      p_registration_id: orderId,
      p_status: select.value,
    });
    error = result.error;
  } else {
    const result = await crmClient.rpc('admin_update_order_status', {
      p_order_id: orderId,
      p_status: select.value,
    });
    error = result.error;
  }

  if (error) {
    const message = error.message?.includes('Could not find the function')
      ? 'В Supabase еще не применена нужная миграция.'
      : error.message || 'Не удалось изменить статус.';
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

  crmShowState('проверяем доступ...');

  try {
    const { data: sessionData } = await crmClient.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      crmShowState('Сначала войдите в аккаунт через личный кабинет.', true);
      return;
    }

    crmShowState('загружаем данные...');

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
  } catch (e) {
    crmShowState('Ошибка: ' + (e.message || 'не удалось подключиться к серверу. Проверьте соединение.'), true);
  }
}

crmInit();
