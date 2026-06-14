const VMESTE_CACHE_PREFIX = 'vmeste_cache_v1:';
const VMESTE_CART_KEY = 'vmeste_cart_v1';

function vmesteCacheRead(key, fallback = null) {
  try {
    const value = localStorage.getItem(`${VMESTE_CACHE_PREFIX}${key}`);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function vmesteCacheWrite(key, value) {
  try {
    const storageKey = `${VMESTE_CACHE_PREFIX}${key}`;
    const serialized = JSON.stringify(value);
    if (localStorage.getItem(storageKey) === serialized) return false;
    localStorage.setItem(storageKey, serialized);
    return true;
  } catch {
    return false;
  }
}

function vmesteCacheRemove(key) {
  try {
    localStorage.removeItem(`${VMESTE_CACHE_PREFIX}${key}`);
  } catch {
    // Storage can be unavailable in restrictive browser modes.
  }
}

function vmesteCachedUserId() {
  try {
    const authKey = Object.keys(localStorage)
      .find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
    if (!authKey) return null;
    const data = JSON.parse(localStorage.getItem(authKey));
    if (!data?.user?.id) return null;
    if (data.expires_at && data.expires_at * 1000 < Date.now()) {
      localStorage.removeItem(authKey);
      return null;
    }
    return data.user.id;
  } catch {
    return null;
  }
}

function vmesteCartCount() {
  try {
    const items = JSON.parse(localStorage.getItem(VMESTE_CART_KEY) || '[]');
    return Array.isArray(items)
      ? items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
      : 0;
  } catch {
    return 0;
  }
}

function vmesteRenderCartCount() {
  const count = String(vmesteCartCount());
  document.querySelectorAll('.nav-cart__count').forEach(element => {
    if (element.textContent !== count) element.textContent = count;
  });
}

function vmesteRenderCachedProfile() {
  const userId = vmesteCachedUserId();
  const profile = userId && vmesteCacheRead(`profile:${userId}`);
  if (!profile) return;

  const [name = 'Гость', ...surnameParts] = (profile.fullName || '').split(' ').filter(Boolean);
  const nameElement = document.getElementById('profile-name');
  const surnameElement = document.getElementById('profile-surname');
  const avatarElement = document.querySelector('.user-card__img');
  const adminLink = document.getElementById('admin-panel-link');

  if (nameElement && nameElement.textContent !== name) nameElement.textContent = name;
  if (surnameElement && surnameElement.textContent !== surnameParts.join(' ')) {
    surnameElement.textContent = surnameParts.join(' ');
  }
  if (avatarElement && profile.avatarUrl && avatarElement.getAttribute('src') !== profile.avatarUrl) {
    avatarElement.src = profile.avatarUrl;
  }
  if (adminLink) adminLink.hidden = !profile.isAdmin;
}

function vmesteHydrateLocalUI() {
  vmesteRenderCartCount();
  vmesteRenderCachedProfile();
}

window.vmesteCache = {
  currentUserId: vmesteCachedUserId,
  read: vmesteCacheRead,
  remove: vmesteCacheRemove,
  write: vmesteCacheWrite,
};

const cartCounterObserver = new MutationObserver(vmesteHydrateLocalUI);
cartCounterObserver.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', () => {
  vmesteHydrateLocalUI();
  cartCounterObserver.disconnect();
});
window.addEventListener('storage', vmesteHydrateLocalUI);
