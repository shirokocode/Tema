import { initChrome } from './chrome/chrome.js';
import { initBrand } from './brand/brand.js';
import { initPages } from './pages/pages.js';
import { installRouteHook } from './core/utils.js';
import { initWorkbench } from './workbench/workbench.js';
import { initUI } from './core/ui.js';
import { initSupport } from './chrome/support.js';

const context = { version: '1.4.3', brand: 'Onepay-ID' };
function boot() {
  if (!document.querySelector('#app') || window.__onepayId) return;
  window.__onepayId = true;
  installRouteHook();
  initBrand(context);
  initChrome(context);
  initUI();
  initPages(context);
  initWorkbench(context);
  initSupport();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
