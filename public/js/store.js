(() => {
  const KEY = 'glowLiteCart';
  const money = value => `PKR ${Number(value || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
  const read = () => {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  };
  const write = cart => {
    localStorage.setItem(KEY, JSON.stringify(cart));
    updateCount(cart);
  };
  const updateCount = (cart = read()) => {
    const count = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    document.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = String(count); });
  };

  document.querySelectorAll('[data-nav-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const nav = document.querySelector('[data-nav]');
      if (nav) nav.classList.toggle('open');
    });
  });

  document.querySelectorAll('[data-add-to-cart]').forEach(button => {
    button.addEventListener('click', () => {
      const qtyInput = document.querySelector('[data-product-qty]');
      const stock = Math.max(0, Number(button.dataset.productStock || 0));
      const qty = Math.max(1, Math.min(stock, Number(qtyInput?.value || 1)));
      const cart = read();
      const existing = cart.find(item => item.id === button.dataset.productId);
      if (existing) existing.qty = Math.min(stock, existing.qty + qty);
      else cart.push({
        id: button.dataset.productId,
        name: button.dataset.productName,
        price: Number(button.dataset.productPrice || 0),
        image: button.dataset.productImage,
        stock,
        qty
      });
      write(cart);
      const message = document.querySelector('[data-cart-message]');
      if (message) message.textContent = 'Added to cart.';
    });
  });

  function buildCartRow(item, editable) {
    const row = document.createElement('div');
    row.className = 'cart-item';
    const img = document.createElement('img');
    img.src = item.image || '/images/placeholder.svg';
    img.alt = '';
    const info = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = item.name;
    const price = document.createElement('p');
    price.textContent = money(item.price);
    info.append(name, price);
    const controls = document.createElement('div');
    controls.className = 'cart-controls';
    if (editable) {
      const qty = document.createElement('input');
      qty.type = 'number'; qty.min = '1'; qty.max = String(Math.min(99, item.stock || 99)); qty.value = String(item.qty);
      qty.addEventListener('change', () => {
        const cart = read();
        const target = cart.find(row => row.id === item.id);
        if (target) target.qty = Math.max(1, Math.min(Number(qty.max), Number(qty.value || 1)));
        write(cart); renderCart();
      });
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'link-button danger'; remove.textContent = 'Remove';
      remove.addEventListener('click', () => { write(read().filter(row => row.id !== item.id)); renderCart(); });
      controls.append(qty, remove);
    } else {
      controls.textContent = `Qty ${item.qty}`;
    }
    const total = document.createElement('strong');
    total.textContent = money(item.price * item.qty);
    row.append(img, info, controls, total);
    return row;
  }

  function renderCart() {
    const host = document.querySelector('[data-cart-items]');
    if (!host) return;
    const cart = read();
    host.innerHTML = '';
    if (!cart.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state'; empty.textContent = 'Your cart is empty.'; host.append(empty);
    } else cart.forEach(item => host.append(buildCartRow(item, true)));
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const totalEl = document.querySelector('[data-cart-subtotal]');
    if (totalEl) totalEl.textContent = money(subtotal);
    const checkout = document.querySelector('[data-checkout-link]');
    if (checkout) {
      checkout.classList.toggle('disabled', !cart.length);
      checkout.setAttribute('aria-disabled', cart.length ? 'false' : 'true');
      checkout.onclick = cart.length ? null : event => event.preventDefault();
    }
  }

  function renderCheckout() {
    const host = document.querySelector('[data-checkout-items]');
    const input = document.querySelector('[data-cart-input]');
    if (!host || !input) return;
    const cart = read();
    host.innerHTML = '';
    cart.forEach(item => host.append(buildCartRow(item, false)));
    if (!cart.length) {
      const empty = document.createElement('div'); empty.className = 'empty-state'; empty.textContent = 'Your cart is empty.'; host.append(empty);
    }
    input.value = JSON.stringify(cart.map(item => ({ id: item.id, qty: item.qty })));
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const totalEl = document.querySelector('[data-checkout-total]');
    if (totalEl) totalEl.textContent = money(total);
    const submit = document.querySelector('[data-place-order]');
    if (submit) submit.disabled = !cart.length;
  }

  document.querySelectorAll('[data-clear-cart]').forEach(button => {
    button.addEventListener('click', () => {
      localStorage.removeItem(KEY);
      window.location.href = '/products';
    });
  });

  updateCount();
  renderCart();
  renderCheckout();
})();
