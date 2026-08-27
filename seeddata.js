/**
 * Seed Data Script — Customer Management System
 *
 * Usage:
 *   node seed-data.js
 *   node seed-data.js --api http://localhost:8080
 *   node seed-data.js --api https://your-railway-url.railway.app
 *
 * Requires admin credentials. Edit ADMIN_USER / ADMIN_PASS below.
 * Creates 20 customers + 180 orders spread over the last 12 months.
 */

const API = process.argv.includes('--api')
  ? process.argv[process.argv.indexOf('--api') + 1]
  : 'http://localhost:8080';

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

// ── helpers ──────────────────────────────────────────────────────────────────

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  // Backend expects LocalDateTime format: 2026-06-16T10:30:00
  const iso = d.toISOString(); // 2026-06-16T10:30:00.000Z
  return iso.split('.')[0]; // 2026-06-16T10:30:00
}

// ── seed data ─────────────────────────────────────────────────────────────────

const FIRST_NAMES = ['Alice','Bob','Carol','David','Emma','Frank','Grace','Henry','Iris','Jack',
  'Karen','Leo','Mary','Nathan','Olivia','Paul','Quinn','Rachel','Steve','Tina'];
const LAST_NAMES  = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis',
  'Wilson','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Moore','Lee','Clark'];

const PRODUCTS = [
  { name: 'Laptop Pro 15"',    price: 1299.99 },
  { name: 'Wireless Keyboard', price:   79.99 },
  { name: 'USB-C Hub 7-in-1',  price:   49.99 },
  { name: 'Monitor 27" 4K',    price:  699.99 },
  { name: 'Webcam HD 1080p',   price:   89.99 },
  { name: 'Standing Desk',     price:  399.99 },
  { name: 'Ergonomic Chair',   price:  549.99 },
  { name: 'Noise-Cancel Headphones', price: 299.99 },
  { name: 'External SSD 1TB',  price:  129.99 },
  { name: 'Smart Speaker',     price:   99.99 },
  { name: 'Tablet 10"',        price:  449.99 },
  { name: 'Smartphone Case',   price:   24.99 },
  { name: 'LED Desk Lamp',     price:   44.99 },
  { name: 'Cable Management Kit', price: 19.99 },
  { name: 'Portable Charger 20000mAh', price: 59.99 },
];

const STATUSES = ['PENDING','SHIPPED','DELIVERED','DELIVERED','DELIVERED','CANCELLED'];
const TYPES    = ['INDIVIDUAL','INDIVIDUAL','INDIVIDUAL','COMPANY'];

const customers = FIRST_NAMES.map((fn, i) => ({
  firstName:    fn,
  lastName:     LAST_NAMES[i],
  email:        `${fn.toLowerCase()}.${LAST_NAMES[i].toLowerCase()}@example.com`,
  phone:        `+1-555-${String(randInt(1000000, 9999999))}`,
  customerType: pick(TYPES),
}));

// 180 orders spread across last 365 days, weighted toward recent months
function buildOrders(customerIds) {
  const orders = [];
  // Recent 90 days: heavier traffic (≈100 orders)
  for (let i = 0; i < 100; i++) {
    const product = pick(PRODUCTS);
    orders.push({
      customerId:  pick(customerIds),
      productName: product.name,
      price:       product.price,
      quantity:    randInt(1, 4),
      status:      pick(STATUSES),
      date:        daysAgo(randInt(1, 90)),
    });
  }
  // 91-180 days ago (≈50 orders)
  for (let i = 0; i < 50; i++) {
    const product = pick(PRODUCTS);
    orders.push({
      customerId:  pick(customerIds),
      productName: product.name,
      price:       product.price,
      quantity:    randInt(1, 3),
      status:      pick(['DELIVERED','DELIVERED','CANCELLED']),
      date:        daysAgo(randInt(91, 180)),
    });
  }
  // 181-365 days ago (≈30 orders)
  for (let i = 0; i < 30; i++) {
    const product = pick(PRODUCTS);
    orders.push({
      customerId:  pick(customerIds),
      productName: product.name,
      price:       product.price,
      quantity:    randInt(1, 2),
      status:      'DELIVERED',
      date:        daysAgo(randInt(181, 365)),
    });
  }
  return orders;
}

// ── API calls ─────────────────────────────────────────────────────────────────

async function login() {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.token;
}

async function post(token, path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`POST ${path} failed: ${res.status} ${txt}`);
  }
  return res.json();
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🌱  Seed script starting — target: ${API}\n`);

  // 1. login
  console.log('🔐  Logging in as admin...');
  const token = await login();
  console.log('    ✅  Authenticated\n');

  // 2. create customers
  console.log(`👥  Creating ${customers.length} customers...`);
  const customerIds = [];
  for (const c of customers) {
    try {
      const created = await post(token, '/api/customers', c);
      customerIds.push(created.id);
      process.stdout.write('.');
    } catch (e) {
      console.error(`\n    ⚠️  ${e.message}`);
    }
    await sleep(50);
  }
  console.log(`\n    ✅  ${customerIds.length} customers created\n`);

  if (customerIds.length === 0) {
    console.error('❌  No customers created — aborting order seeding.');
    process.exit(1);
  }

  // 3. create orders
  const orders = buildOrders(customerIds);
  console.log(`📦  Creating ${orders.length} orders...`);
  let ok = 0;
  for (const o of orders) {
    try {
      await post(token, '/api/orders', o);
      ok++;
      process.stdout.write('.');
    } catch (e) {
      console.error(`\n    ⚠️  ${e.message}`);
    }
    await sleep(30);
  }
  console.log(`\n    ✅  ${ok} orders created\n`);

  console.log('🎉  Seed complete! Refresh the dashboard to see real data.\n');
}

main().catch(e => {
  console.error('\n❌  Fatal error:', e.message);
  process.exit(1);
});
