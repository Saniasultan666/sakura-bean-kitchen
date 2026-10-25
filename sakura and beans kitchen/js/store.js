/* ===========================================================
   store.js: plain JavaScript for Sakura & Bean Kitchen
   Modules:
   1 Data and helpers      5 Details panel
   2 Cart storage          6 Cart logic
   3 Showing products     7 Cart page display
   4 Search, filter, sort  8 Form validation
                           9 Start-up
   jQuery code lives in ui.js. The two files talk through
   custom events sent by announce().
   =========================================================== */

/* ---------- 1. DATA AND HELPERS ---------- */
const CART_KEY = 'sakuraBeanCart';
const MAX_QTY = 20;
const DISCOUNT_LIMIT = 3000;   // orders at or above this amount get a discount
const DISCOUNT_RATE = 0.1;     // 10% off

const CATEGORY_NAMES = {
  starters: 'Starters',
  main: 'Main Course',
  desserts: 'Desserts',
  drinks: 'Drinks'
};

let allProducts = [];   // filled by setProducts() once ui.js has loaded the JSON

// Plain pink image shown when a dish photo fails to load
const PLACEHOLDER_IMAGE = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="320">' +
  '<rect width="100%" height="100%" fill="#F4C6D2"/>' +
  '<text x="50%" y="50%" text-anchor="middle" font-family="Georgia" ' +
  'font-size="28" fill="#4A2E35">Sakura &amp; Bean</text></svg>'
);

// Image errors do not bubble, so listen in the capture phase
document.addEventListener('error', (event) => {
  const img = event.target;
  if (img.tagName === 'IMG' && !img.dataset.fallbackUsed) {
    img.dataset.fallbackUsed = 'true';
    img.src = PLACEHOLDER_IMAGE;
  }
}, true);

// Sends a custom event that ui.js (jQuery) can react to
const announce = (name, detail = {}) => {
  document.dispatchEvent(new CustomEvent(name, { detail }));
};

// Rest parameter: takes any number of deductions (discount, coupon, ...)
const applyDeductions = (amount, ...deductions) => {
  const totalDeduction = deductions.reduce((sum, d) => sum + d, 0);
  return amount - totalDeduction;
};

/* ---------- 2. CART STORAGE (localStorage) ---------- */
const loadCart = () => {
  try {
    const saved = localStorage.getItem(CART_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    return [];   // storage blocked or data damaged: start with an empty cart
  }
};

const saveCart = () => {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (error) {
    console.warn('Could not save the cart.', error);
  }
};

let cart = loadCart();

/* ---------- 3. SHOWING PRODUCTS ---------- */
const stockBadge = (product) => {
  const cssClass = product.inStock ? 'in-stock' : 'out-of-stock';
  const text = product.inStock ? 'In stock' : 'Out of stock';
  return `<span class="stock-badge ${cssClass}">${text}</span>`;
};

const createProductCard = (product, withDetailsButton) => `
  <article class="product-card">
    <img src="${product.image}" alt="${product.name}">
    <div class="card-body">
      <h3>${product.name}</h3>
      <p class="category-tag">${CATEGORY_NAMES[product.category] || product.category}</p>
      <p class="price">Rs. ${product.price}</p>
      <p class="rating">⭐ ${product.rating}</p>
      ${stockBadge(product)}
      <div class="card-buttons">
        ${withDetailsButton
          ? `<button class="btn-small" data-action="details" data-id="${product.id}">Details</button>`
          : ''}
        <button class="btn-small" data-action="add" data-id="${product.id}"
          ${product.inStock ? '' : 'disabled'}>Add to Cart</button>
      </div>
    </div>
  </article>
`;

// Builds all the cards from an array and puts them in a container
const renderGrid = (container, list, withDetailsButton) => {
  container.innerHTML = list
    .map((product) => createProductCard(product, withDetailsButton))
    .join('');
  announce('productsRendered');
};

// Home page: the three best-rated dishes that are in stock
const renderFeatured = () => {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;
  const topDishes = [...allProducts]
    .filter((product) => product.inStock)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);
  renderGrid(grid, topDishes, false);
};

// Menu page: whatever matches the current search, filter and sort
const renderMenu = () => {
  const grid = document.getElementById('productGrid');
  if (!grid) return;
  const visible = getVisibleProducts();
  renderGrid(grid, visible, true);

  const status = document.getElementById('statusMessage');
  status.textContent = 'No dishes match your search.';
  status.hidden = visible.length > 0;
};

// Called by ui.js once products.json has loaded
const setProducts = (products) => {
  allProducts = products;
  renderFeatured();
  renderMenu();
};

/* ---------- 4. SEARCH, FILTER AND SORT ---------- */
const sortProducts = (list, sortBy) => {
  const sorted = [...list];   // spread makes a copy, so the original order is untouched
  switch (sortBy) {
    case 'price-asc':  return sorted.sort((a, b) => a.price - b.price);
    case 'price-desc': return sorted.sort((a, b) => b.price - a.price);
    case 'name':       return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'rating':     return sorted.sort((a, b) => b.rating - a.rating);
    default:           return sorted;
  }
};

const getVisibleProducts = () => {
  const term = document.getElementById('searchInput').value.trim().toLowerCase();
  const category = document.getElementById('categoryFilter').value;
  const sortBy = document.getElementById('sortSelect').value;

  const matches = allProducts
    .filter((product) => product.name.toLowerCase().includes(term))
    .filter((product) => category === 'all' || product.category === category);

  return sortProducts(matches, sortBy);
};

/* ---------- 5. DETAILS PANEL (uses find) ---------- */
const showDetails = (id) => {
  const product = allProducts.find((item) => item.id === id);
  const content = document.getElementById('detailsContent');
  if (!product || !content) return;

  document.getElementById('detailsPlaceholder').hidden = true;
  content.innerHTML = `
    <img src="${product.image}" alt="${product.name}">
    <h3>${product.name}</h3>
    <p class="category-tag">${CATEGORY_NAMES[product.category] || product.category}</p>
    <p>${product.description}</p>
    <p class="price">Rs. ${product.price}</p>
    <p class="rating">⭐ ${product.rating} / 5</p>
    ${stockBadge(product)}
    <div class="card-buttons">
      <button class="btn-small" data-action="add" data-id="${product.id}"
        ${product.inStock ? '' : 'disabled'}>Add to Cart</button>
    </div>
  `;

  // On small screens the panel sits below the grid, so bring it into view
  document.getElementById('detailsPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  announce('detailsShown');
};

/* ---------- 6. CART LOGIC ---------- */
const getCartCount = () => cart.reduce((count, item) => count + item.qty, 0);

const calculateTotals = () => {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discount = subtotal >= DISCOUNT_LIMIT ? Math.round(subtotal * DISCOUNT_RATE) : 0;
  const grandTotal = applyDeductions(subtotal, discount);
  return { subtotal, discount, grandTotal };
};

// Save, redraw the cart table (if this page has one) and tell ui.js
const updateCart = (message = null) => {
  saveCart();
  renderCart();
  announce('cartUpdated', { count: getCartCount(), message });
};

const addToCart = (id) => {
  const product = allProducts.find((item) => item.id === id);
  if (!product || !product.inStock) return;

  const existing = cart.find((item) => item.id === id);
  if (existing) {
    existing.qty = Math.min(existing.qty + 1, MAX_QTY);
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
  }
  updateCart(`${product.name} added to your cart`);
};

const removeFromCart = (id) => {
  cart = cart.filter((item) => item.id !== id);
  updateCart('Item removed from your cart');
};

const changeQuantity = (id, change) => {
  const item = cart.find((entry) => entry.id === id);
  if (!item) return;

  item.qty += change;
  if (item.qty < 1) {
    removeFromCart(id);
    return;
  }
  item.qty = Math.min(item.qty, MAX_QTY);
  updateCart();
};

/* ---------- 7. CART PAGE DISPLAY AND EVENT DELEGATION ---------- */
const renderCart = () => {
  const body = document.getElementById('cartBody');
  if (!body) return;   // not the cart page

  const isEmpty = cart.length === 0;
  document.getElementById('emptyMessage').hidden = !isEmpty;
  document.getElementById('cartTable').hidden = isEmpty;
  document.querySelector('.totals').hidden = isEmpty;

  body.innerHTML = cart.map((item) => `
    <tr>
      <td>${item.name}</td>
      <td>Rs. ${item.price}</td>
      <td>
        <div class="qty-controls">
          <button class="btn-small" data-action="decrease" data-id="${item.id}"
            aria-label="Decrease quantity of ${item.name}">−</button>
          <span>${item.qty}</span>
          <button class="btn-small" data-action="increase" data-id="${item.id}"
            aria-label="Increase quantity of ${item.name}">+</button>
        </div>
      </td>
      <td>Rs. ${item.price * item.qty}</td>
      <td><button class="btn-small" data-action="remove" data-id="${item.id}">Remove</button></td>
    </tr>
  `).join('');

  const totals = calculateTotals();
  document.getElementById('subtotal').textContent = totals.subtotal;
  document.getElementById('discount').textContent = totals.discount;
  document.getElementById('grandTotal').textContent = totals.grandTotal;
};

// Event delegation: one listener on the container handles every button inside it,
// including buttons that were added later by JavaScript
const handleProductClick = (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button || button.disabled) return;

  const id = Number(button.dataset.id);
  if (button.dataset.action === 'add') addToCart(id);
  if (button.dataset.action === 'details') showDetails(id);
};

const handleCartClick = (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const id = Number(button.dataset.id);
  switch (button.dataset.action) {
    case 'increase': changeQuantity(id, 1); break;
    case 'decrease': changeQuantity(id, -1); break;
    case 'remove':   removeFromCart(id); break;
  }
};

/* ---------- 8. FORM VALIDATION ---------- */
const isEmail = (text) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
const isPhone = (text) => /^[0-9]{11}$/.test(text);

const showError = (id, message) => {
  const errorBox = document.getElementById(id + 'Error');
  if (errorBox) errorBox.textContent = message;
  const field = document.getElementById(id);
  if (field) field.classList.add('invalid');
};

const clearError = (id) => {
  const errorBox = document.getElementById(id + 'Error');
  if (errorBox) errorBox.textContent = '';
  const field = document.getElementById(id);
  if (field) field.classList.remove('invalid');
};

const clearAllErrors = (form) => {
  form.querySelectorAll('.error').forEach((box) => { box.textContent = ''; });
  form.querySelectorAll('.invalid').forEach((field) => field.classList.remove('invalid'));
  form.querySelector('.success-message').textContent = '';
};

// Each validate function returns a list of problems: [{ id, message }]
const validateCheckout = () => {
  const errors = [];
  const value = (id) => document.getElementById(id).value.trim();

  if (value('fullName').length < 3) {
    errors.push({ id: 'fullName', message: 'Please enter your full name (at least 3 characters).' });
  }
  if (!isEmail(value('email'))) {
    errors.push({ id: 'email', message: 'Please enter a valid email address.' });
  }
  if (!isPhone(value('phone'))) {
    errors.push({ id: 'phone', message: 'Phone must be 11 digits, e.g. 03001234567.' });
  }
  if (value('orderType') === '') {
    errors.push({ id: 'orderType', message: 'Please choose an order type.' });
  }

  const people = Number(value('people'));
  if (!Number.isInteger(people) || people < 1 || people > 20) {
    errors.push({ id: 'people', message: 'Enter a number of people between 1 and 20.' });
  }
  if (!document.querySelector('input[name="payment"]:checked')) {
    errors.push({ id: 'payment', message: 'Please select a payment method.' });
  }
  if (value('address').length < 10) {
    errors.push({ id: 'address', message: 'Please enter at least 10 characters.' });
  }
  if (!document.getElementById('terms').checked) {
    errors.push({ id: 'terms', message: 'Please confirm your order details.' });
  }
  if (cart.length === 0) {
    errors.push({ id: 'terms', message: 'Your cart is empty. Add dishes from the menu first.' });
  }
  return errors;
};

const validateContact = () => {
  const errors = [];
  const value = (id) => document.getElementById(id).value.trim();

  if (value('contactName').length < 3) {
    errors.push({ id: 'contactName', message: 'Please enter your name (at least 3 characters).' });
  }
  if (!isEmail(value('contactEmail'))) {
    errors.push({ id: 'contactEmail', message: 'Please enter a valid email address.' });
  }
  if (value('subject') === '') {
    errors.push({ id: 'subject', message: 'Please choose a subject.' });
  }
  if (value('contactMessage').length < 10) {
    errors.push({ id: 'contactMessage', message: 'Your message must be at least 10 characters.' });
  }
  return errors;
};

// Shared submit handler: stops the submission when the form is invalid
const handleFormSubmit = (form, validateFn, onValid) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearAllErrors(form);

    const errors = validateFn();
    if (errors.length > 0) {
      errors.forEach((error) => showError(error.id, error.message));
      announce('formInvalid');
      return;
    }
    onValid();
  });

  // Remove a field's error as soon as the user starts fixing it
  form.addEventListener('input', (event) => {
    clearError(event.target.id || event.target.name);
  });
};

const placeOrder = () => {
  const name = document.getElementById('fullName').value.trim();
  const { grandTotal } = calculateTotals();   // read the total before the cart is emptied

  cart = [];
  updateCart();
  document.getElementById('checkoutForm').reset();
  document.getElementById('orderSuccess').textContent =
    `Thank you, ${name}! Your order of Rs. ${grandTotal} has been placed.`;
};

const sendMessage = () => {
  const name = document.getElementById('contactName').value.trim();
  document.getElementById('contactForm').reset();
  document.getElementById('contactSuccess').textContent =
    `Thank you, ${name}! Your message has been sent. We will reply soon.`;
};

/* ---------- 9. START-UP (each part only runs on the page that needs it) ---------- */
const initProductsPage = () => {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  document.getElementById('searchInput').addEventListener('input', renderMenu);
  document.getElementById('categoryFilter').addEventListener('change', renderMenu);
  document.getElementById('sortSelect').addEventListener('change', renderMenu);
  grid.addEventListener('click', handleProductClick);
  document.getElementById('detailsContent').addEventListener('click', handleProductClick);
};

const initHomePage = () => {
  const grid = document.getElementById('featuredGrid');
  if (grid) grid.addEventListener('click', handleProductClick);
};

const initCartPage = () => {
  const body = document.getElementById('cartBody');
  if (!body) return;

  body.addEventListener('click', handleCartClick);
  renderCart();
  handleFormSubmit(document.getElementById('checkoutForm'), validateCheckout, placeOrder);
};

const initContactPage = () => {
  const form = document.getElementById('contactForm');
  if (form) handleFormSubmit(form, validateContact, sendMessage);
};

initHomePage();
initProductsPage();
initCartPage();
initContactPage();