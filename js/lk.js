/* =====================================================
   lk.js — личный кабинет
   Зависимости: lk.css, Supabase REST API
   ===================================================== */

/* ── SUPABASE CONFIG ── */
const LK_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
const LK_ANON = 'YOUR_ANON_KEY';

/*
  Таблицы которые используются:
  ┌─────────────────┬─────────────────────────────────────────────────────┐
  │ orders          │ id, user_id, status, created_at                     │
  │ order_items     │ id, order_id, product_id, quantity, size            │
  │ products        │ id, name, base_price, image_url, product_type       │
  │ profiles        │ id (= auth uid), full_name, avatar_url              │
  │ user_memberships│ id, user_id, product_id, expires_at, is_active      │
  └─────────────────┴─────────────────────────────────────────────────────┘
*/

/* ── HELPERS ── */
async function lkFetch(path, token) {
  const res = await fetch(`${LK_URL}/rest/v1/${path}`, {
    headers: {
      'apikey':        LK_ANON,
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

async function lkPost(path, body, token) {
  const res = await fetch(`${LK_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      'apikey':        LK_ANON,
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

async function lkPatch(path, body, token) {
  const res = await fetch(`${LK_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      'apikey':        LK_ANON,
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

/* ── AUTH ── */
async function getSession() {
  /*
    Supabase хранит сессию в localStorage под ключом
    'sb-<project_ref>-auth-token' после входа через supabase-js.
    Если используете REST напрямую — храните токен сами.
  */
  const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
  if (!key) return null;
  try {
    const session = JSON.parse(localStorage.getItem(key));
    return session?.access_token ? session : null;
  } catch {
    return null;
  }
}

async function signOut() {
  await fetch(`${LK_URL}/auth/v1/logout`, {
    method: 'POST',
    headers: { 'apikey': LK_ANON, 'Authorization': `Bearer ${(await getSession())?.access_token}` },
  });
  /* Чистим все sb- ключи */
  Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k));
  window.location.href = 'index.html';
}

/* ── КЛАСС ЛИЧНОГО КАБИНЕТА ── */
class PersonalCabinet {
  constructor() {
    this.session   = null;
    this.profile   = null;
    this.orders    = [];
    this.filter    = 'all';
    this.visible   = 8;

    this.grid          = document.getElementById('cardsContainer');
    this.loadmoreWrap  = document.getElementById('loadmoreWrapper');
    this.loadMoreBtn   = document.getElementById('loadMoreBtn');
    this.filterBtns    = document.querySelectorAll('.filter-btn');

    this.init();
  }

  /* ─── INIT ─── */
  async init() {
    this.session = await getSession();

    if (!this.session) {
      this.showAuthWall();
      return;
    }

    await Promise.all([
      this.loadProfile(),
      this.loadOrders(),
    ]);

    this.renderProfile();
    this.render();
    this.bindEvents();
  }

  /* ─── AUTH WALL ─── */
  showAuthWall() {
    /* Скрываем карточку пользователя и блок заказов */
    document.querySelector('.user-card')?.remove();
    document.querySelector('.orders-header')?.remove();
    this.grid.innerHTML = '';
    if (this.loadmoreWrap) this.loadmoreWrap.style.display = 'none';

    const wall = document.createElement('div');
    wall.className = 'lk-auth-wall';
    wall.innerHTML = `
      <h2>личный кабинет</h2>
      <p>войдите, чтобы видеть свои заказы и абонементы</p>
      <a href="auth.html" class="btn btn--primary">войти или создать аккаунт</a>
    `;
    this.grid.replaceWith(wall);
  }

  /* ─── ПРОФИЛЬ ─── */
  async loadProfile() {
    const uid = this.session.user?.id;
    if (!uid) return;
    try {
      const rows = await lkFetch(
        `profiles?id=eq.${uid}&select=full_name,avatar_url&limit=1`,
        this.session.access_token
      );
      this.profile = rows[0] ?? null;
    } catch (e) {
      console.error('[lk] profile:', e);
    }
  }

  renderProfile() {
    const nameEl   = document.querySelector('.user-card__name');
    const emailEl  = document.querySelector('.user-card__email');
    const avatarEl = document.querySelector('.user-card__img');

    const name  = this.profile?.full_name  || this.session.user?.email?.split('@')[0] || 'Гость';
    const email = this.session.user?.email || '';

    if (nameEl)   nameEl.textContent  = name;
    if (emailEl)  emailEl.textContent = email;
    if (avatarEl && this.profile?.avatar_url) avatarEl.src = this.profile.avatar_url;
  }

  /* ─── ЗАКАЗЫ ─── */
  async loadOrders() {
    const uid = this.session.user?.id;
    if (!uid) return;
    try {
      /*
        Делаем JOIN через PostgREST:
        orders → order_items → products
        Итого получаем плоский список с нужными полями
      */
      const rows = await lkFetch(
        `orders?user_id=eq.${uid}`
        + `&select=id,status,created_at,`
        + `order_items(id,quantity,size,products(id,name,image_url,product_type,base_price))`
        + `&order=created_at.desc`,
        this.session.access_token
      );

      /*
        Разворачиваем заказы в плоский список карточек:
        один order_item = одна карточка
      */
      this.orders = rows.flatMap(order =>
        (order.order_items || []).map(item => ({
          orderId:    order.id,
          orderStatus: order.status,
          createdAt:  order.created_at,
          itemId:     item.id,
          quantity:   item.quantity,
          size:       item.size,
          product:    item.products,
          isPast:     ['completed', 'cancelled'].includes(order.status),
        }))
      );
    } catch (e) {
      console.error('[lk] orders:', e);
    }
  }

  /* ─── ФИЛЬТРАЦИЯ ─── */
  getFiltered() {
    if (this.filter === 'past') return this.orders.filter(o => o.isPast);
    return this.orders;
  }

  /* ─── РЕНДЕР СЕТКИ ─── */
  render() {
    const filtered = this.getFiltered();
    const slice    = filtered.slice(0, this.visible);

    this.grid.innerHTML = '';

    if (slice.length === 0) {
      this.grid.innerHTML = '<p class="lk-state-msg">пока здесь ничего нет</p>';
    } else {
      slice.forEach(item => this.grid.appendChild(this.createCard(item)));
    }

    if (this.loadmoreWrap) {
      this.loadmoreWrap.style.display = filtered.length > this.visible ? 'flex' : 'none';
    }
  }

  /* ─── КАРТОЧКА ─── */
  createCard(item) {
    const p      = item.product || {};
    const status = item.orderStatus;

    const statusMap = {
      pending:    { text: 'в обработке', disabled: true },
      processing: { text: 'в процессе',  disabled: true },
      ready:      { text: 'показать QR', disabled: false },
      completed:  { text: 'получен',     disabled: true },
      cancelled:  { text: 'отменён',     disabled: true },
    };
    const s = statusMap[status] || { text: status, disabled: true };

    const metaLines = [
      item.size     ? `Размер: ${item.size}`        : null,
      item.quantity ? `Кол-во: ${item.quantity}`    : null,
      p.base_price  ? `${Number(p.base_price).toLocaleString('ru-RU')} ₽` : null,
    ].filter(Boolean).join(' · ');

    const card = document.createElement('div');
    card.className = `order-card${item.isPast ? ' past-event' : ''}`;
    card.dataset.orderId = item.orderId;

    card.innerHTML = `
      <img class="order-card__img"
           src="${p.image_url || 'media/prof.png'}"
           alt="${p.name || 'товар'}"
           loading="lazy" />
      <div class="order-card__content">
        <div>
          <p class="order-card__title">${p.name || '—'}</p>
          <div class="order-card__meta"><p>${metaLines}</p></div>
        </div>
        <div class="order-card__actions">
          ${!item.isPast ? `
            <button class="btn btn--secondary${s.disabled ? ' btn--disabled' : ''}"
                    ${s.disabled ? 'disabled' : ''}
                    data-action="main">${s.text}</button>
            <button class="cancel-link" data-action="cancel">отменить заказ</button>
          ` : ''}
        </div>
      </div>
    `;

    /* QR-кнопка */
    if (!s.disabled && !item.isPast) {
      card.querySelector('[data-action="main"]')?.addEventListener('click', () => {
        this.showQR(item);
      });
    }

    /* Отмена */
    if (!item.isPast) {
      card.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
        this.cancelOrder(item.orderId, card);
      });
    }

    return card;
  }

  /* ─── QR-ЗАГЛУШКА ─── */
  showQR(item) {
    const modal = document.getElementById('modalOverlay');
    const h3    = modal?.querySelector('h3');
    const body  = modal?.querySelector('.modal__body');
    if (!modal) return;
    if (h3)   h3.textContent = item.product?.name || 'QR-код';
    if (body) body.innerHTML = `<p>QR-код появится здесь после подключения оплаты</p>`;
    modal.classList.add('active');
  }

  /* ─── ОТМЕНА ЗАКАЗА ─── */
  async cancelOrder(orderId, cardEl) {
    if (!confirm('Отменить этот заказ?')) return;
    try {
      await lkPatch(
        `orders?id=eq.${orderId}`,
        { status: 'cancelled' },
        this.session.access_token
      );
      cardEl.classList.add('past-event');
      cardEl.querySelector('[data-action="cancel"]')?.remove();
      cardEl.querySelector('[data-action="main"]')?.remove();
    } catch (e) {
      console.error('[lk] cancel:', e);
      alert('Не удалось отменить заказ');
    }
  }

  /* ─── СОБЫТИЯ ─── */
  bindEvents() {
    /* Фильтры */
    this.filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.filter  = btn.dataset.filter;
        this.visible = 8;
        this.filterBtns.forEach(b => b.classList.toggle('active', b === btn));
        this.render();
      });
    });

    /* Загрузить ещё */
    this.loadMoreBtn?.addEventListener('click', () => {
      this.visible += 8;
      this.render();
    });

    /* Настройки профиля */
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
      document.getElementById('modalOverlay')?.classList.add('active');
    });

    /* Закрыть модальное */
    document.getElementById('closeModal')?.addEventListener('click', () => {
      document.getElementById('modalOverlay')?.classList.remove('active');
    });

    document.getElementById('modalOverlay')?.addEventListener('click', e => {
      if (e.target.id === 'modalOverlay') e.target.classList.remove('active');
    });

    /* Сохранить профиль */
    document.getElementById('saveProfile')?.addEventListener('click', () => {
      this.saveProfile();
    });

    /* Выйти */
    document.getElementById('signOutBtn')?.addEventListener('click', signOut);
  }

  /* ─── СОХРАНЕНИЕ ПРОФИЛЯ ─── */
  async saveProfile() {
    const nameInput = document.getElementById('profileName');
    const name = nameInput?.value.trim();
    if (!name) return;
    try {
      await lkPatch(
        `profiles?id=eq.${this.session.user.id}`,
        { full_name: name },
        this.session.access_token
      );
      document.querySelector('.user-card__name').textContent = name;
      document.getElementById('modalOverlay')?.classList.remove('active');
    } catch (e) {
      console.error('[lk] saveProfile:', e);
    }
  }
}

/* ── СТАРТ ── */
document.addEventListener('DOMContentLoaded', () => {
  new PersonalCabinet();
});
