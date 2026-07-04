// Wraith marketing site — fetches live plans from the platform API.

const API = 'https://api.neithlogic.com';

// Set this to your bot's WhatsApp number link, e.g. https://wa.me/2547XXXXXXXX
const WHATSAPP_LINK = 'https://wa.me/254737327387';

document.getElementById('cta-whatsapp').href = WHATSAPP_LINK;

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
  const grid = document.getElementById('plans');
  const errEl = document.getElementById('plans-error');
  try {
    const res = await fetch(`${API}/public/plans`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { plans } = await res.json();
    if (!plans.length) throw new Error('no plans');

    grid.innerHTML = plans.map((p) => `
      <div class="plan">
        <span class="plan-name">${esc(p.name)}</span>
        <div class="plan-price">${formatAmount(p.amount, p.currency)}</div>
        <div class="plan-duration">${humanDuration(p.durationMinutes)} of access</div>
        ${p.description ? `<div class="plan-desc">${esc(p.description)}</div>` : ''}
      </div>
    `).join('');
  } catch {
    grid.innerHTML = '';
    errEl.hidden = false;
  }
}

loadPlans();
