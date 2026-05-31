const VMESTE_CART_STORAGE_KEY = 'vmeste_cart_v1';

function cartRead() {
  try {
    const parsed = JSON.parse(localStorage.getItem(VMESTE_CART_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cartWrite(items) {
  localStorage.setItem(VMESTE_CART_STORAGE_KEY, JSON.stringify(items));
  cartUpdateCounters();
  window.dispatchEvent(new CustomEvent('vmeste:cart-updated', { detail: items }));
}

function cartItemKey(productId, size) {
  return `${productId}:${size || ''}`;
}

function cartUpdateCounters() {
  const count = cartRead().reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll('.nav-cart__count').forEach(element => {
    element.textContent = count;
  });
}

function cartAdd(product, size) {
  if (!product?.id) return;

  const items = cartRead();
  const key = cartItemKey(product.id, size);
  const existing = items.find(item => cartItemKey(item.productId, item.size) === key);

  if (existing) {
    existing.quantity += 1;
  } else {
    items.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: Number(product.price),
      imageUrl: product.image_url || '',
      size: size || null,
      quantity: 1,
    });
  }

  cartWrite(items);
}

function cartSetQuantity(productId, size, quantity) {
  const items = cartRead();
  const key = cartItemKey(productId, size);
  const item = items.find(entry => cartItemKey(entry.productId, entry.size) === key);
  if (!item) return;

  item.quantity = Math.max(1, Number(quantity) || 1);
  cartWrite(items);
}

function cartRemove(productId, size) {
  const key = cartItemKey(productId, size);
  cartWrite(cartRead().filter(item => cartItemKey(item.productId, item.size) !== key));
}

function cartClear() {
  cartWrite([]);
}

function cartNotify(message) {
  let toast = document.getElementById('cart-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'cart-toast';
    toast.className = 'cart-toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(cartNotify.timeout);
  cartNotify.timeout = setTimeout(() => toast.classList.remove('visible'), 1800);
}

window.vmesteCart = {
  add: cartAdd,
  clear: cartClear,
  getItems: cartRead,
  notify: cartNotify,
  remove: cartRemove,
  setQuantity: cartSetQuantity,
  updateCounters: cartUpdateCounters,
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', cartUpdateCounters);
} else {
  cartUpdateCounters();
}

