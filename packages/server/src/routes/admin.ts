import { Hono } from 'hono';
import type { DatabaseAdapter, StoreFeatures } from '@tillkit/core';
import type { SearchService } from '@tillkit/integration-search';

export interface AdminConfig {
  database: DatabaseAdapter;
  basePath: string;
  features?: StoreFeatures;
  searchService?: SearchService;
}

function badgeClass(status: string): string {
  const classes: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    fulfilled: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    active: 'bg-green-100 text-green-800',
    draft: 'bg-slate-100 text-slate-800',
    archived: 'bg-red-100 text-red-800',
  };
  return classes[status] || 'bg-slate-100 text-slate-800';
}

function adminLayout(title: string, content: string, navActive?: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — TillKit Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/htmx.org@1.9.12"></script>
</head>
<body class="bg-slate-50">
  <div class="flex min-h-screen">
    <nav class="w-64 bg-slate-900 text-white flex-shrink-0">
      <div class="p-6"><h2 class="text-lg font-bold tracking-tight">TillKit Admin</h2></div>
      <div class="px-3">
        <a href="/admin" class="block px-4 py-2.5 rounded-lg mb-1 transition ${navActive === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}">📊 Dashboard</a>
        <a href="/admin/orders" class="block px-4 py-2.5 rounded-lg mb-1 transition ${navActive === 'orders' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}">📦 Orders</a>
        <a href="/admin/products" class="block px-4 py-2.5 rounded-lg transition ${navActive === 'products' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}">🏷️ Products</a>
      </div>
    </nav>
    <main class="flex-1 p-8 overflow-auto">${content}</main>
  </div>
</body>
</html>`;
}

function formatCurrency(cents: number): string {
  return '$' + (cents / 100).toFixed(2);
}

export function createAdminRoutes(config: AdminConfig) {
  const { database: db, features = { variants: true, collections: false, inventoryTracking: true, subscriptions: false, multiCurrency: false }, searchService } = config;
  const app = new Hono();

  // Dashboard
  app.get('/', async (c) => {
    const [ordersResult, productsResult] = await Promise.all([db.orders.list({ limit: 100 }), db.products.list({ limit: 1 })]);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todaysOrders = ordersResult.items.filter((o: any) => new Date(o.createdAt) >= today);
    const revenue = todaysOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);

    const content = `
      <div class="flex items-center justify-between mb-8"><h1 class="text-2xl font-bold text-slate-900">Dashboard</h1></div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white rounded-xl p-6 shadow-sm"><div class="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">Today's Revenue</div><div class="text-3xl font-bold text-slate-900">${formatCurrency(revenue)}</div></div>
        <div class="bg-white rounded-xl p-6 shadow-sm"><div class="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">Today's Orders</div><div class="text-3xl font-bold text-slate-900">${todaysOrders.length}</div></div>
        <div class="bg-white rounded-xl p-6 shadow-sm"><div class="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">Total Products</div><div class="text-3xl font-bold text-slate-900">${productsResult.total}</div></div>
      </div>
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-200"><h3 class="font-semibold text-slate-900">Recent Orders</h3></div>
        <table class="w-full">
          <thead><tr><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Order</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th></tr></thead>
          <tbody>
            ${ordersResult.items.slice(0, 5).map((o: any) => `<tr class="border-t border-slate-200">
              <td class="px-6 py-4 text-sm text-slate-900"><a href="/admin/orders/${o.id}" class="text-blue-600 hover:underline">${o.orderNumber || o.id}</a></td>
              <td class="px-6 py-4 text-sm text-slate-900">${o.email || 'Guest'}</td>
              <td class="px-6 py-4 text-sm"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass(o.status)}">${o.status}</span></td>
              <td class="px-6 py-4 text-sm text-slate-900">${formatCurrency(o.total || 0)}</td>
              <td class="px-6 py-4 text-sm text-slate-500">${new Date(o.createdAt).toLocaleDateString()}</td>
            </tr>`).join('')}
            ${ordersResult.items.length === 0 ? '<tr><td colspan="5" class="px-6 py-8 text-center text-slate-500">No orders yet</td></tr>' : ''}
          </tbody>
        </table>
      </div>`;
    return c.html(adminLayout('Dashboard', content, 'dashboard'));
  });

  // Orders list
  app.get('/orders', async (c) => {
    const status = c.req.query('status');
    const result = await db.orders.list({ limit: 50, filters: status ? { status } : undefined });
    const content = `
      <div class="flex items-center justify-between mb-6"><h1 class="text-2xl font-bold text-slate-900">Orders</h1></div>
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-200">
          <form method="get"><select name="status" onchange="this.form.submit()" class="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Statuses</option>
            <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="paid" ${status === 'paid' ? 'selected' : ''}>Paid</option>
            <option value="fulfilled" ${status === 'fulfilled' ? 'selected' : ''}>Fulfilled</option>
            <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select></form>
        </div>
        <table class="w-full">
          <thead><tr><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Order</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th></tr></thead>
          <tbody>
            ${result.items.map((o: any) => `<tr class="border-t border-slate-200">
              <td class="px-6 py-4 text-sm text-slate-900">${o.orderNumber || o.id}</td>
              <td class="px-6 py-4 text-sm text-slate-900">${o.email || 'Guest'}</td>
              <td class="px-6 py-4 text-sm"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass(o.status)}">${o.status}</span></td>
              <td class="px-6 py-4 text-sm text-slate-900">${formatCurrency(o.total || 0)}</td>
              <td class="px-6 py-4 text-sm text-slate-500">${new Date(o.createdAt).toLocaleDateString()}</td>
              <td class="px-6 py-4 text-sm"><a href="/admin/orders/${o.id}" class="px-3 py-1.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800">View</a></td>
            </tr>`).join('')}
            ${result.items.length === 0 ? '<tr><td colspan="6" class="px-6 py-8 text-center text-slate-500">No orders found</td></tr>' : ''}
          </tbody>
        </table>
      </div>`;
    return c.html(adminLayout('Orders', content, 'orders'));
  });

  // Single order
  app.get('/orders/:id', async (c) => {
    const id = c.req.param('id');
    const order = await db.orders.get(id);
    if (!order) return c.notFound();
    const content = `
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-slate-900">Order ${order.orderNumber || order.id}</h1>
        <a href="/admin/orders" class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">← Back</a>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
        <p class="mb-2"><strong class="text-slate-700">Customer:</strong> ${order.email || 'Guest'}</p>
        <p class="mb-2"><strong class="text-slate-700">Status:</strong> <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass(order.status)}">${order.status}</span></p>
        <p class="mb-2"><strong class="text-slate-700">Total:</strong> ${formatCurrency(order.total || 0)}</p>
        <p class="mb-2"><strong class="text-slate-700">Subtotal:</strong> ${formatCurrency(order.subtotal || 0)}</p>
        <p class="mb-2"><strong class="text-slate-700">Currency:</strong> ${order.currency}</p>
        <p><strong class="text-slate-700">Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-6">
        <h3 class="font-semibold text-slate-900 mb-4">Update Status</h3>
        <form method="post" action="/admin/orders/${order.id}/status">
          <div class="mb-4"><label class="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <select name="status" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="paid" ${order.status === 'paid' ? 'selected' : ''}>Paid</option>
              <option value="fulfilled" ${order.status === 'fulfilled' ? 'selected' : ''}>Fulfilled</option>
              <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </div>
          <button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Update Status</button>
        </form>
      </div>`;
    return c.html(adminLayout('Order Details', content, 'orders'));
  });

  // Update order status
  app.post('/orders/:id/status', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.parseBody();
    const newStatus = body.status as string | undefined;
    if (!newStatus) return c.json({ error: 'Status required' }, 400);
    try { await db.orders.updateStatus(id, newStatus as any); } catch { return c.json({ error: 'Order not found' }, 404); }
    return c.redirect('/admin/orders');
  });

  // Products list
  app.get('/products', async (c) => {
    const page = parseInt(c.req.query('page') || '1');
    const q = c.req.query('q');
    let result;
    if (q && q.trim()) {
      if (searchService) { try { const sr = await searchService.search(q, { page, perPage: 20 }); result = sr; } catch { result = await db.products.list({ limit: 20, offset: (page - 1) * 20 }); } }
      else { const products = await db.products.search(q); result = { items: products, total: products.length, page, perPage: 20 }; }
    } else { result = await db.products.list({ limit: 20, offset: (page - 1) * 20 }); }
    const content = `
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-slate-900">Products</h1>
        <a href="/admin/products/new" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Create Product</a>
      </div>
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-200">
          <form method="get" action="/admin/products" class="flex items-center gap-2">
            <input type="search" name="q" value="${q || ''}" placeholder="Search products..." class="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800">Search</button>
            ${q ? '<a href="/admin/products" class="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300">Clear</a>' : ''}
          </form>
        </div>
        <table class="w-full">
          <thead><tr><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Slug</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th></tr></thead>
          <tbody>
            ${result.items.map((p: any) => `<tr class="border-t border-slate-200">
              <td class="px-6 py-4 text-sm font-medium text-slate-900">${p.name}</td>
              <td class="px-6 py-4 text-sm text-slate-500">${p.slug}</td>
              <td class="px-6 py-4 text-sm text-slate-900">${formatCurrency(p.price || 0)}</td>
              <td class="px-6 py-4 text-sm"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass(p.status)}">${p.status}</span></td>
              <td class="px-6 py-4 text-sm flex items-center gap-2">
                <a href="/admin/products/${p.id}/edit" class="px-3 py-1.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800">Edit</a>
                <button class="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg" hx-delete="/admin/products/${p.id}" hx-confirm="Delete ${p.name}?" hx-target="closest tr" hx-swap="outerHTML">Delete</button>
              </td>
            </tr>`).join('')}
            ${result.items.length === 0 ? '<tr><td colspan="5" class="px-6 py-8 text-center text-slate-500">No products yet</td></tr>' : ''}
          </tbody>
        </table>
      </div>`;
    return c.html(adminLayout('Products', content, 'products'));
  });

  // Product new form
  app.get('/products/new', async (c) => {
    const showVariants = features.variants;
    const showInventory = features.inventoryTracking;
    const content = `
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-slate-900">Create Product</h1>
        <a href="/admin/products" class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">← Back</a>
      </div>
      <form method="post" action="/admin/products" class="bg-white rounded-xl shadow-sm p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div><label class="block text-sm font-medium text-slate-700 mb-2">Name</label><input type="text" name="name" placeholder="Product name" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label class="block text-sm font-medium text-slate-700 mb-2">Slug</label><input type="text" name="slug" placeholder="product-slug" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div><label class="block text-sm font-medium text-slate-700 mb-2">Price (cents)</label><input type="number" name="price" placeholder="1999" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label class="block text-sm font-medium text-slate-700 mb-2">Status</label><select name="status" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="draft">Draft</option><option value="active" selected>Active</option><option value="archived">Archived</option></select></div>
        </div>
        <div class="mb-6"><label class="block text-sm font-medium text-slate-700 mb-2">Description</label><textarea name="description" placeholder="Product description..." class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" rows="4"></textarea></div>
        ${showInventory ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6"><div><label class="block text-sm font-medium text-slate-700 mb-2">Stock Quantity</label><input type="number" name="stock" placeholder="100" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label class="block text-sm font-medium text-slate-700 mb-2">Track Inventory</label><select name="trackInventory" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="true" selected>Yes</option><option value="false">No</option></select></div></div>` : ''}
        ${showVariants ? `<div class="border-t border-slate-200 pt-6 mb-6"><h3 class="font-semibold text-slate-900 mb-2">Variants</h3><p class="text-slate-600 text-sm">Variants are enabled. Define them after creation.</p></div>` : ''}
        <button type="submit" class="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Create Product</button>
      </form>`;
    return c.html(adminLayout('Create Product', content, 'products'));
  });

  // Product create
  app.post('/products', async (c) => {
    const body = await c.req.parseBody();
    const data: any = { name: body.name, slug: body.slug, price: parseInt(body.price as string) || 0, status: body.status || 'draft', description: body.description };
    if (features.inventoryTracking && body.stock) { data.inventory = { available: parseInt(body.stock as string) || 0, quantity: parseInt(body.stock as string) || 0, allowOutOfStock: false }; }
    try { const product = await db.products.create(data); if (searchService) { try { await searchService.sync(product, 'create'); } catch (e) { console.error('Search sync failed:', e); } } return c.redirect('/admin/products'); } catch { return c.json({ error: 'Failed to create' }, 500); }
  });

  // Product edit form
  app.get('/products/:id/edit', async (c) => {
    const id = c.req.param('id');
    const product = await db.products.get(id);
    if (!product) return c.notFound();
    const showVariants = features.variants;
    const showInventory = features.inventoryTracking;
    const content = `
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-slate-900">Edit Product</h1>
        <a href="/admin/products" class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">← Back</a>
      </div>
      <form method="post" action="/admin/products/${product.id}" class="bg-white rounded-xl shadow-sm p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div><label class="block text-sm font-medium text-slate-700 mb-2">Name</label><input type="text" name="name" value="${product.name || ''}" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label class="block text-sm font-medium text-slate-700 mb-2">Slug</label><input type="text" name="slug" value="${product.slug || ''}" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div><label class="block text-sm font-medium text-slate-700 mb-2">Price (cents)</label><input type="number" name="price" value="${product.price || 0}" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label class="block text-sm font-medium text-slate-700 mb-2">Status</label><select name="status" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="draft" ${product.status === 'draft' ? 'selected' : ''}>Draft</option><option value="active" ${product.status === 'active' ? 'selected' : ''}>Active</option><option value="archived" ${product.status === 'archived' ? 'selected' : ''}>Archived</option></select></div>
        </div>
        <div class="mb-6"><label class="block text-sm font-medium text-slate-700 mb-2">Description</label><textarea name="description" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" rows="4">${product.description || ''}</textarea></div>
        ${showInventory ? `<div class="mb-6"><label class="block text-sm font-medium text-slate-700 mb-2">Stock Quantity</label><input type="number" name="stock" value="${product.inventory?.available || 0}" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>` : ''}
        ${showVariants && product.variants?.length ? `<div class="border-t border-slate-200 pt-6 mb-6"><h3 class="font-semibold text-slate-900 mb-4">Variants (${product.variants.length})</h3><table class="w-full"><thead><tr><th class="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">SKU</th><th class="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Options</th><th class="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Price</th><th class="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Stock</th></tr></thead><tbody>${product.variants.map((v: any) => `<tr class="border-t border-slate-200"><td class="px-4 py-3 text-sm">${v.sku || '-'}</td><td class="px-4 py-3 text-sm">${JSON.stringify(v.options)}</td><td class="px-4 py-3 text-sm">${formatCurrency(v.price || product.price || 0)}</td><td class="px-4 py-3 text-sm">${v.inventory?.available ?? '-'}</td></tr>`).join('')}</tbody></table></div>` : ''}
        <button type="submit" class="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Update Product</button>
      </form>`;
    return c.html(adminLayout('Edit Product', content, 'products'));
  });

  // Product update
  app.post('/products/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.parseBody();
    const data: any = { name: body.name, slug: body.slug, price: parseInt(body.price as string) || 0, status: body.status || 'draft', description: body.description };
    if (features.inventoryTracking && body.stock !== undefined) { data.inventory = { available: parseInt(body.stock as string) || 0, quantity: parseInt(body.stock as string) || 0, allowOutOfStock: false }; }
    try { const product = await db.products.update(id, data); if (searchService) { try { await searchService.sync(product, 'update'); } catch (e) { console.error('Search sync failed:', e); } } return c.redirect('/admin/products'); } catch { return c.json({ error: 'Failed to update' }, 500); }
  });

  // Product delete
  app.delete('/products/:id', async (c) => {
    const id = c.req.param('id');
    try { await db.products.delete(id); if (searchService) { try { await searchService.sync({ id } as any, 'delete'); } catch (e) { console.error('Search sync failed:', e); } } c.header('HX-Redirect', '/admin/products'); return c.body(''); } catch { return c.json({ error: 'Failed to delete' }, 500); }
  });

  return app;
}
