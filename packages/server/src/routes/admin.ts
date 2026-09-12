import { Hono } from 'hono';
import type { DatabaseAdapter, StoreFeatures } from '@tillkit/core';
import type { SearchService } from '@tillkit/integration-search';

export interface AdminConfig {
  database: DatabaseAdapter;
  basePath: string;
  features?: StoreFeatures;
  searchService?: SearchService;
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
    <!-- Sidebar -->
    <nav class="w-64 bg-slate-900 text-white flex-shrink-0">
      <div class="p-6">
        <h2 class="text-lg font-bold tracking-tight">TillKit Admin</h2>
      </div>
      <div class="px-3">
        <a href="/admin" class="block px-4 py-2.5 rounded-lg mb-1 transition ${navActive === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}">
          📊 Dashboard
        </a>
        <a href="/admin/orders" class="block px-4 py-2.5 rounded-lg mb-1 transition ${navActive === 'orders' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}">
          📦 Orders
        </a>
        <a href="/admin/products" class="block px-4 py-2.5 rounded-lg transition ${navActive === 'products' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}">
          🏷️ Products
        </a>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="flex-1 p-8 overflow-auto">
      ${content}
    </main>
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
    const [ordersResult, productsResult] = await Promise.all([
      db.orders.list({ limit: 100 }),
      db.products.list({ limit: 1 }),
    ]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysOrders = ordersResult.items.filter((o: any) => new Date(o.createdAt) >= today);
    const revenue = todaysOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);

    const content = `
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-2xl font-bold text-slate-900">Dashboard</h1>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white rounded-xl p-6 shadow-sm">
          <div class="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">Today's Revenue</div>
          <div class="text-3xl font-bold text-slate-900">${formatCurrency(revenue)}</div>
        </div>
        <div class="bg-white rounded-xl p-6 shadow-sm">
          <div class="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">Today's Orders</div>
          <div class="text-3xl font-bold text-slate-900">${todaysOrders.length}</div>
        </div>
        <div class="bg-white rounded-xl p-6 shadow-sm">
          <div class="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">Total Products</div>
          <div class="text-3xl font-bold text-slate-900">${productsResult.total}</div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-200">
          <h3 class="font-semibold text-slate-900">Recent Orders</h3>
        </div>
        <table class="w-full">
          <thead><tr class="border-t border-slate-200"><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Order</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th></tr></thead>
          <tbody>
            ${ordersResult.items.slice(0, 5).map((o: any) => `
              <tr class="border-t border-slate-200">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900"><a href="/admin/orders/${o.id}">${o.orderNumber || o.id}</a></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">${o.email || 'Guest'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
  o.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
  o.status === 'paid' ? 'bg-green-100 text-green-800' :
  o.status === 'fulfilled' ? 'bg-blue-100 text-blue-800' :
  o.status === 'cancelled' ? 'bg-red-100 text-red-800' :
  'bg-slate-100 text-slate-800'
}">${o.status}</span></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">${formatCurrency(o.total || 0)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">${new Date(o.createdAt).toLocaleDateString()}</td>
              </tr>
            `).join('')}
            ${ordersResult.items.length === 0 ? '<tr class="border-t border-slate-200"><td colspan="5" class="text-slate-500">No orders yet</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    `;
    return c.html(adminLayout('Dashboard', content, 'dashboard'));
  });

  // Orders list
  app.get('/orders', async (c) => {
    const status = c.req.query('status');
    const result = await db.orders.list({
      limit: 50,
      filters: status ? { status } : undefined,
    });
    const content = `
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-slate-900">Orders</h1>
      </div>
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-200">
          <form method="get" class="flex items-center gap-2">
            <select name="status" onchange="this.form.submit()" class="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Statuses</option>
              <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="paid" ${status === 'paid' ? 'selected' : ''}>Paid</option>
              <option value="fulfilled" ${status === 'fulfilled' ? 'selected' : ''}>Fulfilled</option>
              <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </form>
        </div>
        <table class="w-full">
          <thead><tr class="border-t border-slate-200"><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Order</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th></tr></thead>
          <tbody>
            ${result.items.map((o: any) => `
              <tr class="border-t border-slate-200">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">${o.orderNumber || o.id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">${o.email || 'Guest'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
  o.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
  o.status === 'paid' ? 'bg-green-100 text-green-800' :
  o.status === 'fulfilled' ? 'bg-blue-100 text-blue-800' :
  o.status === 'cancelled' ? 'bg-red-100 text-red-800' :
  'bg-slate-100 text-slate-800'
}">${o.status}</span></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">${formatCurrency(o.total || 0)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">${new Date(o.createdAt).toLocaleDateString()}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900"><a href="/admin/orders/${o.id}">View</a></td>
              </tr>
            `).join('')}
            ${result.items.length === 0 ? '<tr class="border-t border-slate-200"><td colspan="6" class="text-slate-500">No orders found</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    `;
    return c.html(adminLayout('Orders', content, 'orders'));
  });

  // Single order
  app.get('/orders/:id', async (c) => {
    const id = c.req.param('id');
    const order = await db.orders.get(id);
    if (!order) return c.notFound();

    const content = `
      <div class="topbar">
        <h1>Order ${order.orderNumber || order.id}</h1>
        <a class="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800" href="/admin/orders">Back to Orders</a>
      </div>
      <div class="card">
        <p><strong>Customer:</strong> ${order.email || 'Guest'}</p>
        <p><strong>Status:</strong> <span class="badge badge-${order.status}">${order.status}</span></p>
        <p><strong>Total:</strong> ${formatCurrency(order.total || 0)}</p>
        <p><strong>Subtotal:</strong> ${formatCurrency(order.subtotal || 0)}</p>
        <p><strong>Currency:</strong> ${order.currency}</p>
        <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
      </div>
      <div class="card">
        <h3>Update Status</h3>
        <form method="post" action="/admin/orders/${order.id}/status">
          <div class="form-group">
            <label>Status</label>
            <select name="status">
              <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="paid" ${order.status === 'paid' ? 'selected' : ''}>Paid</option>
              <option value="fulfilled" ${order.status === 'fulfilled' ? 'selected' : ''}>Fulfilled</option>
              <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </div>
          <button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800">Update Status</button>
        </form>
      </div>
    `;
    return c.html(adminLayout('Order Details', content, 'orders'));
  });

  // Update order status
  app.post('/orders/:id/status', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.parseBody();
    const newStatus = body.status as string | undefined;
    if (!newStatus) return c.json({ error: 'Status required' }, 400);
    try {
      await db.orders.updateStatus(id, newStatus as any);
    } catch {
      return c.json({ error: 'Order not found' }, 404);
    }
    return c.redirect('/admin/orders');
  });

  // Products list
  app.get('/products', async (c) => {
    const page = parseInt(c.req.query('page') || '1');
    const q = c.req.query('q');
    let result;
    if (q && q.trim()) {
      if (searchService) {
        try {
          const searchResult = await searchService.search(q, { page, perPage: 20 });
          result = searchResult;
        } catch (err) {
          console.error('Admin product search failed:', err);
          result = await db.products.list({ limit: 20, offset: (page - 1) * 20 });
        }
      } else {
        const products = await db.products.search(q);
        result = { items: products, total: products.length, page, perPage: 20 };
      }
    } else {
      result = await db.products.list({ limit: 20, offset: (page - 1) * 20 });
    }
    const content = `
      <div class="topbar">
        <h1>Products</h1>
        <a class="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800" href="/admin/products/new">Create Product</a>
      </div>
      <div class="card">
        <form method="get" class="filters" action="/admin/products" style="margin-bottom:16px;">
          <input type="search" name="q" value="${q || ''}" placeholder="Search products..." />
          <button type="submit" class="px-3 py-1.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800">Search</button>
          ${q ? '<a href="/admin/products" class="px-3 py-1.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800">Clear</a>' : ''}
        </form>
        <table>
          <thead><tr class="border-t border-slate-200"><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Slug</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th></tr></thead>
          <tbody>
            ${result.items.map((p: any) => `
              <tr class="border-t border-slate-200">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900"><strong>${p.name}</strong></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">${p.slug}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">${formatCurrency(p.price || 0)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
  p.status === 'active' ? 'bg-green-100 text-green-800' :
  p.status === 'draft' ? 'bg-slate-100 text-slate-800' :
  p.status === 'archived' ? 'bg-red-100 text-red-800' :
  'bg-slate-100 text-slate-800'
}">${p.status}</span></td>
                <td class="actions">
                  <a href="/admin/products/${p.id}/edit">Edit</a>
                  <button class="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg" hx-delete="/admin/products/${p.id}" hx-confirm="Delete ${p.name}?" hx-target="closest tr" hx-swap="outerHTML">Delete</button>
                </td>
              </tr>
            `).join('')}
            ${result.items.length === 0 ? '<tr class="border-t border-slate-200"><td colspan="5" class="text-slate-500">No products yet</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    `;
    return c.html(adminLayout('Products', content, 'products'));
  });

  // Product new form
  app.get('/products/new', async (c) => {
    const showVariants = features.variants;
    const showInventory = features.inventoryTracking;
    const content = `
      <div class="topbar">
        <h1>Create Product</h1>
        <a class="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800" href="/admin/products">Back to Products</a>
      </div>
      <form method="post" action="/admin/products" class="card">
        <div class="row">
          <div class="form-group">
            <label>Name</label>
            <input type="text" name="name" placeholder="Product name" required />
          </div>
          <div class="form-group">
            <label>Slug</label>
            <input type="text" name="slug" placeholder="product-slug" required />
          </div>
        </div>
        <div class="row">
          <div class="form-group">
            <label>Price (cents)</label>
            <input type="number" name="price" placeholder="1999" required />
          </div>
          <div class="form-group">
            <label>Status</label>
            <select name="status">
              <option value="draft">Draft</option>
              <option value="active" selected>Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea name="description" placeholder="Product description..."></textarea>
        </div>
        ${showInventory ? `
        <div class="row">
          <div class="form-group">
            <label>Stock Quantity</label>
            <input type="number" name="stock" placeholder="100" />
          </div>
          <div class="form-group">
            <label>Track Inventory</label>
            <select name="trackInventory">
              <option value="true" selected>Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
        ` : ''}
        ${showVariants ? `
        <div class="card" style="margin-top: 16px;">
          <h3>Variants</h3>
          <p style="color:#666; font-size:0.85rem;">Variants are enabled. Define them after creation.</p>
        </div>
        ` : ''}
        <button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800">Create Product</button>
      </form>
    `;
    return c.html(adminLayout('Create Product', content, 'products'));
  });

  // Product create
  app.post('/products', async (c) => {
    const body = await c.req.parseBody();
    const data: any = {
      name: body.name,
      slug: body.slug,
      price: parseInt(body.price as string) || 0,
      status: body.status || 'draft',
      description: body.description,
    };
    if (features.inventoryTracking && body.stock) {
      data.inventory = {
        available: parseInt(body.stock as string) || 0,
        quantity: parseInt(body.stock as string) || 0,
        allowOutOfStock: false,
      };
    }
    try {
      const product = await db.products.create(data);
      if (searchService) {
        try { await searchService.sync(product, 'create'); } catch (e) { console.error('Search sync (create) failed:', e); }
      }
      return c.redirect('/admin/products');
    } catch {
      return c.json({ error: 'Failed to create product' }, 500);
    }
  });

  // Product edit form
  app.get('/products/:id/edit', async (c) => {
    const id = c.req.param('id');
    const product = await db.products.get(id);
    if (!product) return c.notFound();
    const showVariants = features.variants;
    const showInventory = features.inventoryTracking;
    const content = `
      <div class="topbar">
        <h1>Edit Product</h1>
        <a class="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800" href="/admin/products">Back to Products</a>
      </div>
      <form method="post" action="/admin/products/${product.id}" class="card">
        <div class="row">
          <div class="form-group">
            <label>Name</label>
            <input type="text" name="name" value="${product.name || ''}" required />
          </div>
          <div class="form-group">
            <label>Slug</label>
            <input type="text" name="slug" value="${product.slug || ''}" required />
          </div>
        </div>
        <div class="row">
          <div class="form-group">
            <label>Price (cents)</label>
            <input type="number" name="price" value="${product.price || 0}" required />
          </div>
          <div class="form-group">
            <label>Status</label>
            <select name="status">
              <option value="draft" ${product.status === 'draft' ? 'selected' : ''}>Draft</option>
              <option value="active" ${product.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="archived" ${product.status === 'archived' ? 'selected' : ''}>Archived</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea name="description">${product.description || ''}</textarea>
        </div>
        ${showInventory ? `
        <div class="form-group">
          <label>Stock Quantity</label>
          <input type="number" name="stock" value="${product.inventory?.available || 0}" />
        </div>
        ` : ''}
        ${showVariants && product.variants?.length ? `
        <div class="card" style="margin-top: 16px;">
          <h3>Variants (${product.variants.length})</h3>
          <table>
            <thead><tr class="border-t border-slate-200"><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Options</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th></tr></thead>
            <tbody>
              ${product.variants.map((v: any) => `
                <tr class="border-t border-slate-200">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">${v.sku || '-'}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">${JSON.stringify(v.options)}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">${formatCurrency(v.price || product.price || 0)}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">${v.inventory?.available ?? '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
        ${showVariants && (!product.variants || product.variants.length === 0) ? `
        <div class="card" style="margin-top: 16px;">
          <h3>Variants</h3>
          <p style="color:#666; font-size:0.85rem;">No variants yet. Variants can be added via API.</p>
        </div>
        ` : ''}
        <button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800">Update Product</button>
      </form>
    `;
    return c.html(adminLayout('Edit Product', content, 'products'));
  });

  // Product update
  app.post('/products/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.parseBody();
    const data: any = {
      name: body.name,
      slug: body.slug,
      price: parseInt(body.price as string) || 0,
      status: body.status || 'draft',
      description: body.description,
    };
    if (features.inventoryTracking && body.stock !== undefined) {
      data.inventory = {
        available: parseInt(body.stock as string) || 0,
        quantity: parseInt(body.stock as string) || 0,
        allowOutOfStock: false,
      };
    }
    try {
      const product = await db.products.update(id, data);
      if (searchService) {
        try { await searchService.sync(product, 'update'); } catch (e) { console.error('Search sync (update) failed:', e); }
      }
      return c.redirect('/admin/products');
    } catch {
      return c.json({ error: 'Failed to update product' }, 500);
    }
  });

  // Product delete (HTMX)
  app.delete('/products/:id', async (c) => {
    const id = c.req.param('id');
    try {
      await db.products.delete(id);
      if (searchService) {
        try { await searchService.sync({ id } as any, 'delete'); } catch (e) { console.error('Search sync (delete) failed:', e); }
      }
      c.header('HX-Redirect', '/admin/products');
      return c.body('');
    } catch {
      return c.json({ error: 'Failed to delete product' }, 500);
    }
  });

  return app;
}
