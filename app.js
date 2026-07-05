// Wraith product site — renders live plans from the Neithlogic platform API.

const API = 'https://api.neithlogic.com';

function humanDuration(minutes) {
  if (minutes % 43200 === 0) { const m = minutes / 43200; return m === 1 ? '1 month' : `${m} months`; }
  if (minutes % 10080 === 0) { const w = minutes / 10080; return w === 1 ? '1 week' : `${w} weeks`; }
  if (minutes % 1440 === 0) { const d = minutes / 1440; return d === 1 ? '1 day' : `${d} days`; }
  if (minutes % 60 === 0) { const h = minutes / 60; return h === 1 ? '1 hour' : `${h} hours`; }
  return `${minutes} min`;
}

function formatAmount(amount, currency) {
  try {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function esc(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

async function loadPlans() {
  const list = document.getElementById('plans');
  const errEl = document.getElementById('plans-error');
  try {
    const res = await fetch(`${API}/public/plans`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { plans } = await res.json();
    if (!plans.length) throw new Error('no plans');

    list.innerHTML = plans.map((p) => `
      <div class="plan-row">
        <span class="plan-name">${esc(p.name)}</span>
        <span class="plan-desc">${esc(p.description || '')}</span>
        <span class="plan-price">${formatAmount(p.amount, p.currency)} <small>/ ${humanDuration(p.durationMinutes)}</small></span>
      </div>
    `).join('');
  } catch {
    list.innerHTML = '';
    errEl.hidden = false;
  }
}

loadPlans();

// Industries — live from the platform's source registry
const INDUSTRY_LABELS = {
  banking: 'Banking & finance',
  insurance: 'Insurance',
  telecom: 'Telecom',
  energy: 'Energy & utilities',
  ngo: 'NGOs & development'
};
const COMING = ['Energy & utilities', 'NGOs & development'];

async function loadIndustries() {
  try {
    const res = await fetch(`${API}/public/industries`);
    if (!res.ok) return; // keep static fallback
    const { industries } = await res.json();
    if (!industries || !industries.length) return;

    const list = document.getElementById('industry-list');
    const liveNames = new Set();
    let html = '';
    for (const i of industries) {
      const label = INDUSTRY_LABELS[i.industry] || (i.industry.charAt(0).toUpperCase() + i.industry.slice(1));
      liveNames.add(label);
      const noun = i.industry === 'banking' ? 'institutions' : 'sources';
      html += `<li><span class="industry-name">${esc(label)}</span><span class="tag live">Live — ${i.sources} ${noun}</span></li>`;
    }
    for (const label of COMING) {
      if (liveNames.has(label)) continue;
      html += `<li><span class="industry-name">${esc(label)}</span><span class="tag">Coming</span></li>`;
    }
    html += `<li><span class="industry-name">Your industry</span><span class="tag ask"><a href="mailto:admin@neithlogic.com">Ask us</a></span></li>`;
    list.innerHTML = html;

    // keep the "sources live today" figure honest too
    const total = industries.reduce((s, i) => s + i.sources, 0);
    const fig = document.querySelector('.figures .figure strong');
    if (fig) fig.textContent = String(total);
  } catch { /* static fallback stays */ }
}

loadIndustries();
