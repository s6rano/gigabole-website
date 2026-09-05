import { deliveryDays, formatMonthlyPrice, loadActivePlans } from './plans.js';

const $ = (selector) => document.querySelector(selector);

function renderPlans(plans) {
  const list = $('#home-plans-list');
  list.replaceChildren();
  const template = $('#home-plan-template');
  for (const plan of plans) {
    const item = template.content.cloneNode(true);
    item.querySelector('.plan-name').textContent = plan.name;
    item.querySelector('.plan-price').textContent = `${formatMonthlyPrice(plan)} / mois`;
    item.querySelector('.plan-days').textContent = `Contes déposés le ${deliveryDays(plan)}.`;
    list.append(item);
  }
}

async function loadHomePlans() {
  const loading = $('#home-plans-loading');
  const empty = $('#home-plans-empty');
  const error = $('#home-plans-error');
  try {
    const plans = await loadActivePlans();
    loading.hidden = true;
    if (!plans.length) {
      empty.hidden = false;
      return;
    }
    renderPlans(plans);
  } catch {
    loading.hidden = true;
    error.hidden = false;
  }
}

loadHomePlans();
