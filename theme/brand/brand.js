import { $$ } from '../core/utils.js';
export function initBrand() {
  const favicon = document.createElement('link'); favicon.rel = 'icon'; favicon.type = 'image/png'; favicon.href = '/themes/onepay-id/assets/favicon-32.png?v=2';
  document.head.querySelectorAll('link[rel~="icon"]').forEach(n => n.remove()); document.head.append(favicon);
  const apple = document.createElement('link'); apple.rel = 'apple-touch-icon'; apple.href = '/themes/onepay-id/assets/favicon-180.png?v=2'; document.head.append(apple);
  const replaceVisibleText = root => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode(node) {
      if (!node.nodeValue || !/pterodactyl/i.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
      const p = node.parentElement;
      if (!p || p.closest('input,textarea,code,pre,[contenteditable="true"],.xterm,.monaco-editor,[data-user-content],a[href^="/server/"],[data-file-name],[data-server-name],.op-file-name,.file-name,[data-testid*="server"],[data-testid*="file"]')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }});
    const nodes=[]; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => { n.nodeValue = n.nodeValue.replace(/pterodactyl/ig, 'Onepay-ID'); });
  };
  const run = () => { replaceVisibleText(document.querySelector('#app') || document.body); const admin = document.querySelector('body.vsg-admin'); if (admin) replaceVisibleText(admin); };
  run(); let timer; new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(run, 80); }).observe(document.body, { childList:true, subtree:true, characterData:true });
  const setTitle = () => {
    const server = location.pathname.match(/^\/server\/([^/]+)/)?.[1];
    const page = location.pathname.split('/').filter(Boolean).pop() || 'Servers';
    document.title = `${page} • ${server || 'Workspace'} • Onepay-ID`;
  };
  setTitle(); window.addEventListener('popstate', setTitle); window.addEventListener('op:navigate', setTitle);
  // Brand artwork is always loaded locally; no remote assets or trackers.
  document.documentElement.style.setProperty('--op-logo', 'url("/themes/onepay-id/assets/logo-48.webp?v=2")');
}
