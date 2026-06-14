// =====================================================
// СПОКОЙНЫЙ РЕЖИМ (пониженная сенсорная нагрузка)
// Кнопка закреплена справа внизу
// =====================================================

(function() {
  const STORAGE_KEY = 'vmeste_low_sensory';
  const CLASS_NAME = 'low-sensory';

  // Получить сохранённое состояние
  function getStoredState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'true' ? true : false;
  }

  // Применить или убрать режим
  function applyLowSensory(enable) {
    if (enable) {
      document.body.classList.add(CLASS_NAME);
    } else {
      document.body.classList.remove(CLASS_NAME);
    }
    localStorage.setItem(STORAGE_KEY, enable);
    updateToggleButton(enable);
  }

  // Переключить
  function toggleLowSensory() {
    const isActive = document.body.classList.contains(CLASS_NAME);
    applyLowSensory(!isActive);
  }

  // Обновить текст и aria-метку кнопки
  function updateToggleButton(isActive) {
    const btn = document.getElementById('low-sensory-toggle');
    if (!btn) return;

    if (isActive) {
      btn.innerHTML = 'Обычный режим';
      btn.setAttribute('aria-label', 'Выключить спокойный режим, вернуть обычные цвета');
    } else {
      btn.innerHTML = 'Спокойный режим';
      btn.setAttribute('aria-label', 'Включить спокойный режим (приглушённые цвета, снижение сенсорной нагрузки)');
    }
  }

  // Создать закреплённую кнопку, если её ещё нет
  function createFixedButton() {
    if (document.getElementById('low-sensory-toggle')) return;

    const btn = document.createElement('button');
    btn.id = 'low-sensory-toggle';
    btn.className = 'low-sensory-fixed-btn';
    btn.setAttribute('aria-label', 'Включить спокойный режим');
    btn.innerHTML = '🌿 Спокойный режим';
    document.body.appendChild(btn);
    return btn;
  }

  // Навесить обработчик
  function bindEvents() {
    const btn = document.getElementById('low-sensory-toggle');
    if (btn) {
      btn.removeEventListener('click', toggleLowSensory);
      btn.addEventListener('click', toggleLowSensory);
    }
  }

  // Инициализация
  function init() {
    const enabled = getStoredState();
    if (enabled) document.body.classList.add(CLASS_NAME);
    createFixedButton();
    updateToggleButton(enabled);
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();