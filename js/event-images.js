// event-images.js — маппинг event_id → путь к изображению
// Используется в CRM, ЛК и каталоге заказов как fallback
// когда в event_registrations нет сохранённого изображения.

(function () {
  const EVENT_IMG_BASE = 'https://mmbslfwzaxmxmaevbdse.supabase.co/storage/v1/object/public/event-images';

  const EVENT_IMAGE_MAP = {
    '0':  'domik.png',
    '1':  'manflowerblue.png',
    '2':  'prl.png',
    '3':  'stul.png',
    '4':  'nog.png',
    '5':  'book.png',
    '6':  'nog.png',
    '7':  'foto.png',
    '8':  'book.png',
    '9':  'book.png',
    'u1':  'book.png',
    'u2':  'book.png',
    'u3':  'foto.png',
    'u4':  'nog.png',
    'u5':  'book.png',
    'u6':  'foto.png',
    'u7':  'book.png',
    'u8':  'nog.png',
    'u9':  'stul.png',
    'u10': 'book.png',
    'u11': 'nog.png',
    'u12': 'foto.png',
    'u13': 'book.png',
    'u14': 'stul.png',
    'u15': 'stul.png',
    'u16': 'nog.png',
  };

  function vmesteEventRawUrl(storedImage, eventId) {
    if (storedImage && storedImage.trim()) {
      if (storedImage.startsWith('http')) return storedImage;
      const name = storedImage.replace(/^media\//, '');
      return `${EVENT_IMG_BASE}/${name}`;
    }
    if (!eventId) return '';
    const filename = EVENT_IMAGE_MAP[String(eventId)];
    if (!filename) return '';
    return `${EVENT_IMG_BASE}/${filename}`;
  }

  function vmesteEventImageUrl(storedImage, eventId) {
    const raw = vmesteEventRawUrl(storedImage, eventId);
    if (!raw) return '';
    if (window.vmesteProxyUrl) return window.vmesteProxyUrl(raw, { fit: 'contain', quality: 85 });
    return raw;
  }

  window.vmesteEventImageUrl = vmesteEventImageUrl;
})();
