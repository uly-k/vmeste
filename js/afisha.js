// ==================== АФИША: единые фильтры + сортировка для двух блоков, глобальный поиск ====================

document.addEventListener('DOMContentLoaded', () => {

  // ── КОНФИГ ─────────────────────────────────────────────────────────────────
  const EVENT_IMG_BASE = 'https://mmbslfwzaxmxmaevbdse.supabase.co/storage/v1/object/public/event-images';

  function eventImg(filename) {
    if (!filename) return '';
    if (filename.startsWith('http')) return filename;
    const name = filename.replace(/^media\//, '');
    return `${EVENT_IMG_BASE}/${name}`;
  }

  function eventImgProxy(filename) {
    const raw = eventImg(filename);
    if (!raw) return '';
    if (window.vmesteProxyUrl) return window.vmesteProxyUrl(raw, { fit: 'contain', quality: 85 });
    return raw;
  }

  // ── ДАННЫЕ ──────────────────────────────────────────────────────────────────
  const events = [
    {
      id: 0,
      pinned: true,
      name: "Вход в пространство",
      leader: "команда (в)месте",
      leaderRole: "организатор",
      weekday: null,
      weekdayIndex: null,
      price: 300,
      time: null,
      image: eventImg("media/domik.png"),
      category: "посещение",
      type: "посещение",
      description: "Просто приходите. Пространство открыто для всех — можно работать, отдыхать, общаться или быть рядом с людьми в тишине. Выберите удобную дату и время.",
      pickDate: true,
    },
    {
      id: 1,
      name: "Группа равных для людей с ПРЛ",
      leader: "Александра Романова",
      leaderRole: "психолог",
      weekday: "понедельник",
      weekdayIndex: 1,
      price: 800,
      time: "18:00",
      image: eventImg("media/manflowerblue.png"),
      category: "психологическая группа",
      type: "психологическая группа",
      description: "Поддерживающая группа для людей с пограничным расстройством личности. Пространство доверия, принятия и взаимной поддержки. Ведущая — практикующий психолог.",
    },
    {
      id: 6,
      name: "Коллажный арт-клуб",
      leader: "Митя Нахимов",
      leaderRole: "арт-терапевт",
      weekday: "суббота",
      weekdayIndex: 6,
      price: 1000,
      time: "16:00",
      image: eventImg("media/nog.png"),
      category: "мастер-класс",
      type: "мастер-класс",
      description: "Создаём коллажи из журналов, распечаток и найденных материалов. Никакого художественного опыта не нужно — только желание исследовать образы.",
    },
    {
      id: 7,
      name: "Киноклуб",
      leader: "Андрей Скворцов",
      leaderRole: "ведущий",
      weekday: "суббота",
      weekdayIndex: 6,
      price: 500,
      time: "18:00",
      image: eventImg("media/foto.png"),
      category: "клуб интересов",
      type: "клуб интересов",
      description: "Смотрим фильмы и обсуждаем их после просмотра. Авторское, документальное, жанровое кино. Субтитры на всех сеансах.",
    },
    {
      id: 2,
      name: "Группа равных для людей с БАР",
      leader: "Александра Романова",
      leaderRole: "психолог",
      weekday: "среда",
      weekdayIndex: 3,
      price: 800,
      time: "18:00",
      image: eventImg("media/prl.png"),
      category: "психологическая группа",
      type: "психологическая группа",
      description: "Группа поддержки для людей с биполярным аффективным расстройством. Делимся опытом, стратегиями стабилизации и просто слушаем друг друга.",
    },
    {
      id: 3,
      name: "Группа равных для нейроотличных",
      leader: "Александра Романова",
      leaderRole: "консультант",
      weekday: "пятница",
      weekdayIndex: 5,
      price: 600,
      time: "19:00",
      image: eventImg("media/stul.png"),
      category: "психологическая группа",
      type: "психологическая группа",
      description: "Встреча для людей с СДВГ, РАС, дислексией и другими особенностями нейроразвития. Обсуждаем повседневные стратегии и поддерживаем друг друга.",
    },
    {
      id: 4,
      name: "Хор",
      leader: "Дарья Сенюкова",
      leaderRole: "дирижёр",
      weekday: "вторник",
      weekdayIndex: 2,
      price: 500,
      time: "19:30",
      image: eventImg("media/nog.png"),
      category: "клуб интересов",
      type: "клуб интересов",
      description: "Хор для всех желающих — без конкурсного отбора и требований к опыту. Поём народные, классические и современные произведения. Голос найдётся у каждого.",
    },
    {
      id: 5,
      name: "Летний читальный клуб",
      leader: "Евгения Кудашева",
      leaderRole: "ведущий",
      weekday: "среда",
      weekdayIndex: 3,
      price: 400,
      time: "19:00",
      image: eventImg("media/book.png"),
      category: "клуб интересов",
      type: "клуб интересов",
      description: "Читаем и обсуждаем книги вместе — художественные, научпоп, эссе. Список формируют участники. Можно просто слушать или активно участвовать.",
    },
    {
      id: 8,
      name: "Лекция «Мудрый разум»",
      leader: "Анна Левина",
      leaderRole: "лектор",
      weekday: "четверг",
      weekdayIndex: 4,
      price: 700,
      time: "19:00",
      image: eventImg("media/book.png"),
      category: "лекция",
      type: "лекция",
      description: "Лекция о том, как справляться с тревогой и принимать решения без внутреннего шума. Разговор о внимании, устойчивости и ясности мышления в повседневной жизни.",
    },
    {
      id: 9,
      name: "Писательский клуб",
      leader: "Марина Орлова",
      leaderRole: "ведущий",
      weekday: "воскресенье",
      weekdayIndex: 0,
      price: 600,
      time: "16:00",
      image: eventImg("media/book.png"),
      category: "клуб интересов",
      type: "клуб интересов",
      description: "Пишем короткие тексты, читаем их вслух и обсуждаем в поддерживающей атмосфере. Подходит для всех — от новичков до опытных авторов.",
    },
  ];

  const upcoming = [
    { id:'u1',  name:'Лекция «Психология влияния»',   leader:'Александра Захаркова', leaderRole:'лектор',     date:'14 июня',  time:'18:00', image:'media/book.png',  category:'лекция',                description:'Как работают механизмы убеждения и манипуляции. Разбираем реальные примеры и учимся замечать влияние.', price: 700 },
    { id:'u2',  name:'Лекция «Мозг и эмоции»',        leader:'Любава Тор',           leaderRole:'нейробиолог',date:'17 июня',  time:'19:00', image:'media/book.png',  category:'лекция',                description:'Что происходит в мозге во время сильных эмоций и почему мы иногда теряем контроль.', price: 700 },
    { id:'u3',  name:'Тренинг «Говори вслух»',         leader:'Анатолий Камыш',       leaderRole:'тренер',     date:'18 июня',  time:'19:00', image:'media/foto.png',  category:'мастер-класс',          description:'Тренинг публичных выступлений. Учимся говорить уверенно, структурированно и без страха.', price: 1000 },
    { id:'u4',  name:'Арт-терапия: акварель',          leader:'Митя Нахимов',         leaderRole:'арт-терапевт',date:'19 июня', time:'17:00', image:'media/nog.png',   category:'мастер-класс',          description:'Мягкое знакомство с акварелью как инструментом самовыражения. Без оценок и правил.', price: 900 },
    { id:'u5',  name:'Лекция «Как работает память»',   leader:'Ольга Ветрова',        leaderRole:'психолог',   date:'20 июня',  time:'19:00', image:'media/book.png',  category:'лекция',                description:'Почему мы забываем важное и помним ненужное. Практики для улучшения памяти.', price: 700 },
    { id:'u6',  name:'Поэтический вечер',              leader:'Марина Орлова',        leaderRole:'ведущий',    date:'21 июня',  time:'18:00', image:'media/foto.png',  category:'клуб интересов',        description:'Читаем стихи вслух — свои и чужие. Разговор о слове, ритме и личном.', price: 400 },
    { id:'u7',  name:'Открытая лекция о нейроотличии', leader:'Анна Левина',          leaderRole:'лектор',     date:'22 июня',  time:'12:00', image:'media/book.png',  category:'лекция',                description:'Что такое нейроразнообразие, как оно проявляется и почему это важно знать всем.', price: 600 },
    { id:'u8',  name:'Мастер-класс по каллиграфии',    leader:'Евгения Кудашева',     leaderRole:'мастер',     date:'24 июня',  time:'16:00', image:'media/nog.png',   category:'мастер-класс',          description:'Основы каллиграфии с нуля. Пробуем разные стили, уходим с красивыми буквами.', price: 850 },
    { id:'u9',  name:'Группа поддержки: тревога',      leader:'Дарья Сенюкова',       leaderRole:'психолог',   date:'25 июня',  time:'19:00', image:'media/stul.png',  category:'психологическая группа',description:'Встреча для тех, кто хочет поговорить о тревоге в безопасном пространстве.', price: 600 },
    { id:'u10', name:'Лекция «Сон и психическое здоровье»', leader:'Любава Тор',      leaderRole:'нейробиолог',date:'26 июня',  time:'19:30', image:'media/book.png',  category:'лекция',                description:'Почему сон — это не роскошь. Разбираем связь между режимом сна и эмоциональным состоянием.', price: 700 },
    { id:'u11', name:'Воркшоп «Дневник ощущений»',     leader:'Марина Орлова',        leaderRole:'фасилитатор',date:'27 июня',  time:'17:00', image:'media/nog.png',   category:'мастер-класс',          description:'Практика ведения дневника как инструмент самопознания. Пишем, рисуем, клеим.', price: 750 },
    { id:'u12', name:'Кинопоказ: документальное кино', leader:'Андрей Скворцов',      leaderRole:'ведущий',    date:'28 июня',  time:'18:00', image:'media/foto.png',  category:'клуб интересов',        description:'Показ документального фильма с обсуждением. Тема — история психиатрии в России.', price: 500 },
    { id:'u13', name:'Лекция «Стресс: враг или союзник»', leader:'Ольга Ветрова',     leaderRole:'психолог',   date:'1 июля',   time:'19:00', image:'media/book.png',  category:'лекция',                description:'Что такое эустресс и дистресс, как тело реагирует на перегрузку и как с этим работать.', price: 700 },
    { id:'u14', name:'Тренинг «Границы в отношениях»', leader:'Александра Захаркова', leaderRole:'тренер',     date:'3 июля',   time:'18:30', image:'media/stul.png',  category:'мастер-класс',          description:'Практический тренинг: как говорить «нет», выстраивать границы без вины и агрессии.', price: 950 },
    { id:'u15', name:'Открытый разговор о СДВГ',       leader:'Александра Романова',  leaderRole:'консультант',date:'5 июля',   time:'16:00', image:'media/stul.png',  category:'психологическая группа',description:'Неформальная встреча для людей с СДВГ и их близких. Делимся опытом, задаём вопросы.', price: 500 },
    { id:'u16', name:'Пение как практика',             leader:'Дарья Сенюкова',       leaderRole:'вокалист',   date:'7 июля',   time:'18:00', image:'media/nog.png',   category:'клуб интересов',        description:'Не хор, не урок пения. Просто поём вместе — народные, современные, любимые. Для всех.', price: 400 },
  ];

  const PAGE_SIZE = 4;
  const UPCOMING_PAGE_SIZE = 4;

  // ── СОСТОЯНИЕ ────────────────────────────────────────────────────────────────
  const state = {
    query:           '',
    weekdays:        [],
    priceType:       '',
    categories:      [],
    sort:            'default',
    permanentShown:  PAGE_SIZE,
    upcomingShown:   UPCOMING_PAGE_SIZE,
  };

  // ── ЭЛЕМЕНТЫ ─────────────────────────────────────────────────────────────────
  const permanentContainer = document.getElementById('merGrid');
  const searchInput        = document.getElementById('merSearch');
  const filtersBtn         = document.getElementById('merFiltersBtn');
  const sortSelect         = document.getElementById('merSortSelect');
  const activeFiltersBar   = document.getElementById('merActiveFilters');
  const permanentLoadMore  = document.getElementById('merLoadMore');
  const upcomingGrid       = document.getElementById('upcomingGrid');
  const upcomingLoadMore   = document.getElementById('upcomingLoadMore');
  const searchHeading      = document.getElementById('searchResultsHeading');
  const searchGrid         = document.getElementById('searchResultsGrid');

  // Находим заголовки блоков
  let permanentHeading = null;
  let upcomingHeading = null;
  document.querySelectorAll('#afisha .full-width').forEach(el => {
    const text = el.textContent.trim();
    if (text.includes('постоянные мероприятия')) permanentHeading = el;
    if (text.includes('ближайшие мероприятия')) upcomingHeading = el;
  });

  if (!permanentContainer) return;

  // ── ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ──────────────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function cardHTML(event) {
    const dateLabel = event.pickDate ? 'выбрать дату' : (event.weekday || event.date || '—');
    const timeLabel = event.pickDate ? 'и время' : (event.time || '');
    const role = event.leaderRole || 'ведущий';

    return `
      <div class="mer-card visible" data-id="${event.id}" style="cursor:pointer;">
        <div class="mer-card__img-wrap">
          <img src="${eventImgProxy(event.image)}" alt="${event.name}" loading="lazy">
        </div>
        <div class="mer-card__body">
          <div class="mer-card__name">${escapeHtml(event.name)}</div>
          <div class="mer-card__leader">
            <div class="mer-card__leader-label">${escapeHtml(role)}</div>
            <div class="mer-card__leader-name">${escapeHtml(event.leader)}</div>
          </div>
          <div class="mer-card__datetime">
            <span class="mer-card__weekday">${escapeHtml(dateLabel)}</span>
            <span class="mer-card__time">${escapeHtml(timeLabel)}</span>
          </div>
        </div>
      </div>
    `;
  }

  // ── ФИЛЬТРАЦИЯ И СОРТИРОВКА (единая для двух блоков) ─────────────────────────
  function filterAndSort(items) {
    let result = items.slice();

    if (state.weekdays.length) {
      result = result.filter(item => {
        if (item.weekday === undefined || item.weekday === null) return false;
        return state.weekdays.includes(item.weekday);
      });
    }

    if (state.categories.length) {
      result = result.filter(item => state.categories.includes(item.category));
    }

    if (state.priceType === 'free') result = result.filter(item => item.price === 0);
    if (state.priceType === 'paid') result = result.filter(item => item.price > 0);

    if (state.sort === 'default') {
      result.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0;
      });
    } else if (state.sort === 'weekday') {
      result.sort((a, b) => (a.weekdayIndex ?? 99) - (b.weekdayIndex ?? 99));
    } else if (state.sort === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (state.sort === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }

  // ── РЕНДЕР ПОСТОЯННЫХ (с двумя кнопками) ─────────────────────────────────────
  let permanentCollapseBtn = null;

  function renderPermanent() {
    const filtered = filterAndSort(events);
    const toShow = filtered.slice(0, state.permanentShown);
    permanentContainer.innerHTML = toShow.map(cardHTML).join('');

    permanentContainer.querySelectorAll('.mer-card').forEach(card => {
      if (card.dataset.bound) return;
      card.dataset.bound = '1';
      card.addEventListener('click', () => {
        const id = parseInt(card.dataset.id);
        const ev = events.find(e => e.id === id);
        if (ev) {
          sessionStorage.setItem('currentEvent', JSON.stringify(ev));
          window.location.href = `event-detail.html?id=${id}`;
        }
      });
    });

    if (permanentLoadMore && permanentCollapseBtn) {
      const hasMore = state.permanentShown < filtered.length;
      const isExpanded = state.permanentShown > PAGE_SIZE;
      permanentLoadMore.style.display = hasMore ? '' : 'none';
      permanentCollapseBtn.style.display = isExpanded ? '' : 'none';
    }
  }

  function loadMorePermanent() {
    const filtered = filterAndSort(events);
    if (state.permanentShown < filtered.length) {
      state.permanentShown = Math.min(state.permanentShown + PAGE_SIZE, filtered.length);
      renderPermanent();
    }
  }

  function collapsePermanent() {
    state.permanentShown = PAGE_SIZE;
    renderPermanent();
  }

  // Создаём кнопку «свернуть» для постоянных
  const permanentWrapper = permanentLoadMore?.parentElement;
  if (permanentWrapper && !document.getElementById('permanentCollapseBtn')) {
    permanentCollapseBtn = document.createElement('button');
    permanentCollapseBtn.id = 'permanentCollapseBtn';
    permanentCollapseBtn.className = 'mer__collapse-btn';
    permanentCollapseBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 5L12 19M12 5L5 12M12 5L19 12" stroke="#0178FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    permanentCollapseBtn.title = 'свернуть';
    permanentCollapseBtn.style.display = 'none';
    permanentCollapseBtn.style.width = '48px';
    permanentCollapseBtn.style.height = '48px';
    permanentCollapseBtn.style.borderRadius = '50%';
    permanentCollapseBtn.style.backgroundColor = 'white';
    permanentCollapseBtn.style.border = 'none';
    permanentCollapseBtn.style.cursor = 'pointer';
    permanentCollapseBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    permanentCollapseBtn.style.display = 'inline-flex';
    permanentCollapseBtn.style.alignItems = 'center';
    permanentCollapseBtn.style.justifyContent = 'center';
    permanentCollapseBtn.style.marginLeft = '12px';
    permanentCollapseBtn.style.verticalAlign = 'middle';
    permanentWrapper.appendChild(permanentCollapseBtn);
  } else {
    permanentCollapseBtn = document.getElementById('permanentCollapseBtn');
  }

  if (permanentLoadMore) {
    permanentLoadMore.removeEventListener('click', loadMorePermanent);
    permanentLoadMore.addEventListener('click', loadMorePermanent);
  }
  if (permanentCollapseBtn) {
    permanentCollapseBtn.removeEventListener('click', collapsePermanent);
    permanentCollapseBtn.addEventListener('click', collapsePermanent);
  }

  // ── БЛОК БЛИЖАЙШИХ МЕРОПРИЯТИЙ (с двумя кнопками) ────────────────────────────
  let upcomingCollapseBtn = null;

  function renderUpcoming() {
    const filtered = filterAndSort(upcoming);
    const toShow = filtered.slice(0, state.upcomingShown);
    upcomingGrid.innerHTML = toShow.map(cardHTML).join('');

    upcomingGrid.querySelectorAll('.mer-card').forEach(card => {
      if (card.dataset.bound) return;
      card.dataset.bound = '1';
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const ev = upcoming.find(u => String(u.id) === String(id));
        if (ev) {
          const eventToStore = { ...ev, weekday: ev.date };
          sessionStorage.setItem('currentEvent', JSON.stringify(eventToStore));
          window.location.href = `event-detail.html?id=${id}`;
        }
      });
    });

    if (upcomingLoadMore && upcomingCollapseBtn) {
      const hasMore = state.upcomingShown < filtered.length;
      const isExpanded = state.upcomingShown > UPCOMING_PAGE_SIZE;
      upcomingLoadMore.style.display = hasMore ? '' : 'none';
      upcomingCollapseBtn.style.display = isExpanded ? '' : 'none';
    }
  }

  function loadMoreUpcoming() {
    const filtered = filterAndSort(upcoming);
    if (state.upcomingShown < filtered.length) {
      state.upcomingShown = Math.min(state.upcomingShown + UPCOMING_PAGE_SIZE, filtered.length);
      renderUpcoming();
    }
  }

  function collapseUpcoming() {
    state.upcomingShown = UPCOMING_PAGE_SIZE;
    renderUpcoming();
  }

  // Создаём кнопку «свернуть» для ближайших
  const upcomingWrapper = upcomingLoadMore?.parentElement;
  if (upcomingWrapper && !document.getElementById('upcomingCollapseBtn')) {
    upcomingCollapseBtn = document.createElement('button');
    upcomingCollapseBtn.id = 'upcomingCollapseBtn';
    upcomingCollapseBtn.className = 'mer__collapse-btn';
    upcomingCollapseBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 5L12 19M12 5L5 12M12 5L19 12" stroke="#0178FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    upcomingCollapseBtn.title = 'свернуть';
    upcomingCollapseBtn.style.display = 'none';
    upcomingCollapseBtn.style.width = '48px';
    upcomingCollapseBtn.style.height = '48px';
    upcomingCollapseBtn.style.borderRadius = '50%';
    upcomingCollapseBtn.style.backgroundColor = 'white';
    upcomingCollapseBtn.style.border = 'none';
    upcomingCollapseBtn.style.cursor = 'pointer';
    upcomingCollapseBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    upcomingCollapseBtn.style.display = 'inline-flex';
    upcomingCollapseBtn.style.alignItems = 'center';
    upcomingCollapseBtn.style.justifyContent = 'center';
    upcomingCollapseBtn.style.marginLeft = '12px';
    upcomingCollapseBtn.style.verticalAlign = 'middle';
    upcomingWrapper.appendChild(upcomingCollapseBtn);
  } else {
    upcomingCollapseBtn = document.getElementById('upcomingCollapseBtn');
  }

  if (upcomingLoadMore) {
    upcomingLoadMore.removeEventListener('click', loadMoreUpcoming);
    upcomingLoadMore.addEventListener('click', loadMoreUpcoming);
  }
  if (upcomingCollapseBtn) {
    upcomingCollapseBtn.removeEventListener('click', collapseUpcoming);
    upcomingCollapseBtn.addEventListener('click', collapseUpcoming);
  }

  // ── ОБНОВЛЕНИЕ ФИЛЬТРОВ ──────────────────────────────────────────────────────
  function updateFiltersAndSort() {
    // Сбрасываем количество показанных карточек до начального
    state.permanentShown = PAGE_SIZE;
    state.upcomingShown = UPCOMING_PAGE_SIZE;
    renderPermanent();
    renderUpcoming();
    renderActiveTags();
    updateFilterBtnBadge();
  }

  // ── ГЛОБАЛЬНЫЙ ПОИСК ─────────────────────────────────────────────────────────
  function performGlobalSearch() {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      if (permanentHeading) permanentHeading.style.display = '';
      if (permanentContainer) permanentContainer.style.display = '';
      if (permanentLoadMore && permanentLoadMore.parentElement) permanentLoadMore.parentElement.style.display = '';
      if (permanentCollapseBtn) permanentCollapseBtn.style.display = 'none';
      if (upcomingHeading) upcomingHeading.style.display = '';
      if (upcomingGrid) upcomingGrid.style.display = '';
      if (upcomingLoadMore && upcomingLoadMore.parentElement) upcomingLoadMore.parentElement.style.display = '';
      if (upcomingCollapseBtn) upcomingCollapseBtn.style.display = 'none';
      if (searchHeading) searchHeading.style.display = 'none';
      if (searchGrid) searchGrid.style.display = 'none';
      updateFiltersAndSort();
      return;
    }

    if (permanentHeading) permanentHeading.style.display = 'none';
    if (permanentContainer) permanentContainer.style.display = 'none';
    if (permanentLoadMore && permanentLoadMore.parentElement) permanentLoadMore.parentElement.style.display = 'none';
    if (permanentCollapseBtn) permanentCollapseBtn.style.display = 'none';
    if (upcomingHeading) upcomingHeading.style.display = 'none';
    if (upcomingGrid) upcomingGrid.style.display = 'none';
    if (upcomingLoadMore && upcomingLoadMore.parentElement) upcomingLoadMore.parentElement.style.display = 'none';
    if (upcomingCollapseBtn) upcomingCollapseBtn.style.display = 'none';
    if (searchHeading) searchHeading.style.display = '';
    if (searchGrid) searchGrid.style.display = '';

    const allEvents = [...events, ...upcoming];
    const filtered = allEvents.filter(ev => {
      return ev.name.toLowerCase().includes(query) ||
             ev.leader.toLowerCase().includes(query) ||
             (ev.description || '').toLowerCase().includes(query) ||
             (ev.category || '').toLowerCase().includes(query);
    });

    searchGrid.innerHTML = '';
    if (!filtered.length) {
      searchGrid.innerHTML = '<div class="mer__state-msg">ничего не найдено :(</div>';
      return;
    }
    searchGrid.insertAdjacentHTML('beforeend', filtered.map(cardHTML).join(''));

    searchGrid.querySelectorAll('.mer-card').forEach(card => {
      if (card.dataset.bound) return;
      card.dataset.bound = '1';
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        let ev = events.find(e => String(e.id) === String(id));
        if (!ev) ev = upcoming.find(u => String(u.id) === String(id));
        if (ev) {
          const eventToStore = { ...ev };
          if (!eventToStore.weekday && eventToStore.date) eventToStore.weekday = eventToStore.date;
          sessionStorage.setItem('currentEvent', JSON.stringify(eventToStore));
          window.location.href = `event-detail.html?id=${id}`;
        }
      });
    });
  }

  let searchDebounce;
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      performGlobalSearch();
    }, 300);
  });

  // ── АКТИВНЫЕ ТЕГИ И БЕЙДЖ ────────────────────────────────────────────────────
  function updateFilterBtnBadge() {
    if (!filtersBtn) return;
    const count = state.weekdays.length + state.categories.length + (state.priceType ? 1 : 0);
    let badge = filtersBtn.querySelector('.mer__filter-badge');
    if (!count) { badge?.remove(); return; }
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'mer__filter-badge';
      filtersBtn.appendChild(badge);
    }
    badge.textContent = count;
  }

  function renderActiveTags() {
    if (!activeFiltersBar) return;
    const tags = [];
    state.weekdays.forEach(day =>
      tags.push(`<span class="mer__active-tag">${escapeHtml(day)}<button data-type="weekday" data-val="${escapeHtml(day)}">×</button></span>`)
    );
    state.categories.forEach(cat =>
      tags.push(`<span class="mer__active-tag">${escapeHtml(cat)}<button data-type="category" data-val="${escapeHtml(cat)}">×</button></span>`)
    );
    if (state.priceType) {
      const label = state.priceType === 'free' ? 'бесплатно' : 'платные';
      tags.push(`<span class="mer__active-tag">${label}<button data-type="priceType" data-val="">×</button></span>`);
    }
    activeFiltersBar.innerHTML = tags.join('');
    activeFiltersBar.hidden = !tags.length;
  }

  activeFiltersBar?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-type]');
    if (!btn) return;
    if (btn.dataset.type === 'weekday')   state.weekdays   = state.weekdays.filter(d => d !== btn.dataset.val);
    if (btn.dataset.type === 'category')  state.categories = state.categories.filter(c => c !== btn.dataset.val);
    if (btn.dataset.type === 'priceType') state.priceType  = '';
    syncChips();
    updateFiltersAndSort();
  });

  // ── ПОПАП ФИЛЬТРОВ ────────────────────────────────────────────────────────────
  const availableWeekdays  = [...new Set(events.filter(e => e.weekday).map(e => e.weekday))];
  const availableCategories = [...new Set([...events, ...upcoming].map(e => e.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
  const hasFree = [...events, ...upcoming].some(e => e.price === 0);
  const hasPaid = [...events, ...upcoming].some(e => e.price > 0);

  const popup = document.createElement('div');
  popup.className = 'mer__filter-popup';
  popup.id = 'afishaFilterPopup';
  popup.innerHTML = `
    <div class="mer__filter-popup-head">
      <span>фильтры</span>
      <button class="mer__filter-popup-close" id="afishaFilterClose">×</button>
    </div>
    <div class="mer__filter-group">
      <span class="mer__filter-group-label">тип мероприятия</span>
      <div class="mer__chips">
        ${availableCategories.map(cat => `<button class="mer__chip" data-group="category" data-value="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`).join('')}
      </div>
    </div>
    <div class="mer__filter-group">
      <span class="mer__filter-group-label">день недели</span>
      <div class="mer__chips">
        ${availableWeekdays.map(day => `<button class="mer__chip" data-group="weekday" data-value="${escapeHtml(day)}">${escapeHtml(day)}</button>`).join('')}
      </div>
    </div>
    ${(hasFree || hasPaid) ? `
    <div class="mer__filter-group">
      <span class="mer__filter-group-label">цена</span>
      <div class="mer__chips">
        ${hasFree ? `<button class="mer__chip" data-group="priceType" data-value="free">бесплатно</button>` : ''}
        ${hasPaid ? `<button class="mer__chip" data-group="priceType" data-value="paid">платные</button>` : ''}
      </div>
    </div>` : ''}
    <div class="mer__filter-popup-footer">
      <button class="mer__filter-reset" id="afishaFilterReset">сбросить</button>
      <button class="mer__filter-apply" id="afishaFilterApply">показать</button>
    </div>
  `;

  if (filtersBtn) {
    const wrap = document.createElement('div');
    wrap.className = 'mer__filters-wrap';
    filtersBtn.parentElement.insertBefore(wrap, filtersBtn);
    wrap.appendChild(filtersBtn);
    wrap.appendChild(popup);
  }

  function syncChips() {
    popup.querySelectorAll('.mer__chip[data-group="weekday"]').forEach(c =>
      c.classList.toggle('active', state.weekdays.includes(c.dataset.value))
    );
    popup.querySelectorAll('.mer__chip[data-group="category"]').forEach(c =>
      c.classList.toggle('active', state.categories.includes(c.dataset.value))
    );
    popup.querySelectorAll('.mer__chip[data-group="priceType"]').forEach(c =>
      c.classList.toggle('active', state.priceType === c.dataset.value)
    );
  }

  function openPopup()  {
    syncChips();
    popup.classList.add('active');
    filtersBtn.classList.add('active');
    setTimeout(() => document.addEventListener('click', outsideClick), 0);
    document.addEventListener('keydown', escKey);
  }
  function closePopup() {
    popup.classList.remove('active');
    filtersBtn.classList.remove('active');
    document.removeEventListener('click', outsideClick);
    document.removeEventListener('keydown', escKey);
  }
  function outsideClick(e) {
    const wrap = filtersBtn?.closest('.mer__filters-wrap');
    if (!wrap?.contains(e.target)) closePopup();
  }
  function escKey(e) { if (e.key === 'Escape') closePopup(); }

  filtersBtn?.addEventListener('click', e => {
    e.stopPropagation();
    popup.classList.contains('active') ? closePopup() : openPopup();
  });

  popup.querySelector('#afishaFilterClose')?.addEventListener('click', closePopup);
  popup.addEventListener('click', e => {
    const chip = e.target.closest('.mer__chip');
    if (!chip) return;
    const { group, value } = chip.dataset;
    if (group === 'weekday') {
      state.weekdays = state.weekdays.includes(value)
        ? state.weekdays.filter(d => d !== value)
        : [...state.weekdays, value];
    }
    if (group === 'category') {
      state.categories = state.categories.includes(value)
        ? state.categories.filter(c => c !== value)
        : [...state.categories, value];
    }
    if (group === 'priceType') {
      state.priceType = state.priceType === value ? '' : value;
    }
    syncChips();
  });
  popup.querySelector('#afishaFilterReset')?.addEventListener('click', () => {
    state.weekdays = [];
    state.categories = [];
    state.priceType = '';
    state.sort = 'default';
    if (sortSelect) sortSelect.value = 'default';
    syncChips();
    updateFiltersAndSort();
    closePopup();
  });
  popup.querySelector('#afishaFilterApply')?.addEventListener('click', () => {
    updateFiltersAndSort();
    closePopup();
  });

  // ── СОРТИРОВКА (кастомный dropdown) ─────────────────────────────────────────
  const sortWrap = document.getElementById('merSortWrap');
  const sortTrigger = document.getElementById('merSortTrigger');
  const sortDropdown = document.getElementById('merSortDropdown');
  const sortHidden = document.getElementById('merSortSelect');

  if (sortWrap && sortTrigger && sortDropdown) {
    sortTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      sortWrap.classList.toggle('open');
    });

    sortDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.mer__custom-select-option');
      if (!option) return;
      const value = option.dataset.value;
      sortHidden.value = value;
      state.sort = value;
      sortTrigger.textContent = option.textContent;
      sortDropdown.querySelectorAll('.mer__custom-select-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      sortWrap.classList.remove('open');
      updateFiltersAndSort();
    });

    document.addEventListener('click', () => sortWrap.classList.remove('open'));
  }

  // ── СТАРТ ────────────────────────────────────────────────────────────────────
  renderPermanent();
  renderUpcoming();
});