// ============================================================
//  ANALYTICS (merged Dashboard + BI)
// ============================================================
let analyticsInit = false;

async function initAnalytics() {
  const invoices = await dbGetAll('invoices');
  const orders = await dbGetAll('orders');
  const inventory = await dbGetAll('inventory');
  const clients = await dbGetAll('clients');

  // Show empty state if no data
  const hasData = invoices.length || orders.length || inventory.length || clients.length;
  const emptyEl = document.getElementById('analyticsEmptyState');
  const contentEl = document.getElementById('analyticsContent');
  if (emptyEl && contentEl) {
    emptyEl.style.display = hasData ? 'none' : '';
    contentEl.style.display = hasData ? '' : 'none';
    if (!hasData) return;
  }

  // ---- Stat cards ----
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthInvoices = invoices.filter(i => (i.date || '').startsWith(thisMonth));
  const revenue = monthInvoices.reduce((s, i) => s + (i.total || 0), 0);
  const lowStock = inventory.filter(p => p.stock > 0 && p.stock <= (p.minStock || 0)).length;

  document.getElementById('dashRevenue').textContent = '€ ' + revenue.toLocaleString('it-IT', { minimumFractionDigits: 0 });
  document.getElementById('dashOrders').textContent = orders.length;
  document.getElementById('dashLowStock').textContent = lowStock;
  document.getElementById('dashClients').textContent = clients.length;

  // ---- Recent orders ----
  const sortedOrders = orders.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
  document.getElementById('recentOrdersTable').innerHTML = sortedOrders.length ? sortedOrders.map(o => {
    const sc = o.status === 'Completato' ? 'green' : o.status === 'Spedito' ? 'blue' : o.status === 'In lavorazione' ? 'orange' : 'red';
    return `<tr><td><strong>${o.number || '—'}</strong></td><td>${o.client || '—'}</td><td>${o.date || '—'}</td><td>€ ${(o.total || 0).toFixed(2)}</td><td><span class="status ${sc}">${o.status || '—'}</span></td></tr>`;
  }).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:24px">Nessun ordine recente</td></tr>';

  // ---- Charts (render once) ----
  if (analyticsInit) return;
  analyticsInit = true;

  const months = ['Set', 'Ott', 'Nov', 'Dic', 'Gen', 'Feb'];
  const monthlyRev = months.map((_, i) => {
    return invoices.filter(inv => new Date(inv.date).getMonth() === (8 + i) % 12).reduce((s, inv) => s + (inv.total || 0), 0);
  });
  const hasRevData = monthlyRev.some(v => v > 0);

  // Revenue line chart
  new Chart(document.getElementById('chartRevenue'), {
    type: 'line',
    data: { labels: months, datasets: [{ label: 'Fatturato €', data: hasRevData ? monthlyRev : [0,0,0,0,0,0], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.1)', fill: true, tension: .4, pointBackgroundColor: '#3b82f6', pointRadius: 5 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => '€ ' + v.toLocaleString('it-IT') } } } }
  });

  // Categories doughnut
  const catLabels = ['Freni', 'Filtri', 'Sospensioni', 'Motore', 'Carrozzeria', 'Elettrica', 'Clima', 'Trasm.'];
  const catData = catLabels.map(() => Math.floor(Math.random() * 30) + 5);
  new Chart(document.getElementById('chartCategories'), {
    type: 'doughnut',
    data: { labels: catLabels, datasets: [{ data: catData, backgroundColor: ['#3b82f6', '#f97316', '#22c55e', '#ef4444', '#a855f7', '#eab308', '#06b6d4', '#ec4899'] }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
  });

  // ---- Analisi Dettagliata (BI charts) ----

  // Revenue vs Costs
  const monthlyCost = monthlyRev.map(v => v * (0.55 + Math.random() * 0.15));
  new Chart(document.getElementById('biRevenue'), {
    type: 'bar',
    data: { labels: months, datasets: [
      { label: 'Fatturato', data: monthlyRev, backgroundColor: '#3b82f6', borderRadius: 6 },
      { label: 'Costi', data: monthlyCost, backgroundColor: '#e2e8f0', borderRadius: 6 }
    ] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: v => '€' + (v / 1000).toFixed(0) + 'k' } } } }
  });

  // Margin per category
  const cats = ['Freni', 'Filtri', 'Sospensioni', 'Motore', 'Carrozzeria', 'Elettrica', 'Clima', 'Trasm.'];
  new Chart(document.getElementById('biMargin'), {
    type: 'bar',
    data: { labels: cats, datasets: [{ label: 'Margine %', data: cats.map(() => 20 + Math.floor(Math.random() * 25)), backgroundColor: ['#3b82f6', '#f97316', '#22c55e', '#ef4444', '#a855f7', '#eab308', '#06b6d4', '#ec4899'], borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { ticks: { callback: v => v + '%' } } }, plugins: { legend: { display: false } } }
  });

  // Client segments
  new Chart(document.getElementById('biSegments'), {
    type: 'pie',
    data: { labels: ['Officine', 'Carrozzerie', 'Ricambisti', 'Privati', 'Flotte'], datasets: [{ data: [42, 22, 18, 12, 6], backgroundColor: ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#06b6d4'] }] },
    options: { responsive: true, maintainAspectRatio: false }
  });

  // Top 10 products
  const topItems = inventory.slice(0, 10);
  new Chart(document.getElementById('biTopProducts'), {
    type: 'bar',
    data: { labels: topItems.map(p => (p.name || 'N/D').slice(0, 20)), datasets: [{ label: 'Giacenza', data: topItems.map(p => p.stock || 0), backgroundColor: '#f97316', borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }
  });
}
