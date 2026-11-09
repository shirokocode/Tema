/* Highlighter ringan tanpa dependensi (tema "candy"). Mengembalikan HTML aman atau null bila tidak didukung. */
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const END = '(?![\\s\\S])';
const words = list => `\\b(?:${list.trim().split(/\s+/).join('|')})\\b`;
const R = {
  cmt: /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|(?![\s\S]))/.source,
  hash: /#[^\n]*/.source,
  str: /"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?/.source,
  tpl: /`(?:[^`\\]|\\[\s\S])*`?/.source,
  num: /\b0[xX][0-9a-fA-F]+\b|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/.source,
  lit: /\b(?:true|false|null|undefined|NaN|Infinity|None|True|False|nil)\b/.source,
  fn: /\b[A-Za-z_$][\w$]*(?=\s*\()/.source,
  type: /\b[A-Z][A-Za-z0-9_]*\b/.source,
  op: /=>|[=!<>]=?=?|&&|\|\||[+\-*\/%&|^~?]+/.source,
  variable: /\$\{[^}\n]*\}|\$[A-Za-z_]\w*/.source,
};
const KW = {
  js: words('break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return super switch this throw try typeof var void while with yield async await static get set interface type enum implements public private protected readonly namespace declare as'),
  py: words('and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield self'),
  php: words('abstract and array as break case catch class clone const continue declare default do echo else elseif empty enddeclare endfor endforeach endif endswitch endwhile extends final finally fn for foreach function global if implements include include_once instanceof interface isset list namespace new or print private protected public require require_once return static switch throw trait try unset use var while yield'),
  sh: words('if then else elif fi for while until do done case esac in function select time export local readonly return exit echo cd source alias unset set'),
  go: words('break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var'),
  java: words('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for if implements import instanceof int interface long native new package private protected public return short static super switch synchronized this throw throws try void volatile while'),
  sql: '\\b(?:select|from|where|insert|into|values|update|set|delete|create|table|alter|drop|index|join|left|right|inner|outer|on|group|by|order|having|limit|offset|and|or|not|null|as|distinct|union|primary|key|foreign|references|default|if|exists|database)\\b',
};
const TAG_RULES = [
  ['tag', /^<\/?[\w:.-]+/.source], ['tag', /\/?>$/.source],
  ['attr', /[\w:@.-]+(?=\s*=)/.source], ['str', /"[^"]*"?|'[^']*'?/.source],
];
function run(text, rules, flags = 'gm') {
  const re = new RegExp(rules.map(r => `(${r[1]})`).join('|'), flags);
  let out = '', last = 0, m;
  while ((m = re.exec(text))) {
    if (m[0] === '') { re.lastIndex++; continue; }
    if (m.index > last) out += esc(text.slice(last, m.index));
    let i = 1; while (m[i] === undefined) i++;
    const rule = rules[i - 1];
    out += rule[2] ? rule[2](m[0]) : `<span class="t-${rule[0]}">${esc(m[0])}</span>`;
    last = re.lastIndex;
  }
  return out + esc(text.slice(last));
}
const jsLike = kw => [['cmt', R.cmt], ['str', R.tpl], ['str', R.str], ['num', R.num], ['lit', R.lit], ['kw', kw], ['fn', R.fn], ['type', R.type], ['op', R.op]];
const SETS = {
  javascript: () => ({ rules: jsLike(KW.js) }),
  typescript: () => ({ rules: jsLike(KW.js) }),
  go: () => ({ rules: jsLike(KW.go) }),
  java: () => ({ rules: jsLike(KW.java) }),
  json: () => ({ rules: [['prop', /"(?:[^"\\\n]|\\.)*"(?=\s*:)/.source], ['str', R.str], ['num', R.num], ['lit', R.lit]] }),
  yaml: () => ({ rules: [['cmt', R.hash], ['prop', /^[ \t-]*(?:"[^"\n]*"|'[^'\n]*'|[\w.\/-]+)(?=[ \t]*:(?:\s|$))/.source], ['str', R.str], ['type', /[&*][\w-]+/.source], ['num', R.num], ['lit', /\b(?:true|false|null|yes|no|on|off)\b/i.source]] }),
  ini: () => ({ rules: [['cmt', R.hash], ['cmt', /^[ \t]*;[^\n]*/.source], ['prop', /^[ \t]*[\w.\-\[\]]+(?=[ \t]*=)/.source], ['variable', R.variable], ['str', R.str], ['num', R.num], ['lit', R.lit]] }),
  shell: () => ({ rules: [['cmt', R.hash], ['str', R.str], ['variable', R.variable], ['attr', /\B--?[A-Za-z][\w-]*/.source], ['num', R.num], ['lit', R.lit], ['kw', KW.sh], ['fn', R.fn], ['op', /[|&;<>]+/.source]] }),
  python: () => ({ rules: [['str', `"""[\\s\\S]*?(?:"""|${END})|'''[\\s\\S]*?(?:'''|${END})`], ['cmt', R.hash], ['str', R.str], ['num', R.num], ['lit', R.lit], ['kw', KW.py], ['at', /@[\w.]+/.source], ['fn', R.fn], ['type', R.type], ['op', R.op]] }),
  php: () => ({ rules: [['at', /<\?php|<\?=|\?>/.source], ['cmt', `${R.cmt}|${R.hash}`], ['str', R.str], ['variable', /\$[A-Za-z_]\w*/.source], ['num', R.num], ['lit', R.lit], ['kw', KW.php], ['fn', R.fn], ['type', R.type], ['op', R.op]] }),
  css: () => ({ rules: [['cmt', /\/\*[\s\S]*?(?:\*\/|(?![\s\S]))/.source], ['str', R.str], ['at', /@[\w-]+/.source], ['num', /#[0-9a-fA-F]{3,8}\b/.source], ['num', /\b\d+(?:\.\d+)?(?:px|r?em|vh|vw|ms|s|deg|fr|pt|%)?/.source], ['kw', /!important/.source], ['prop', /[\w-]+(?=\s*:[^{};]*[;}])/.source], ['fn', /[\w-]+(?=\()/.source], ['type', /[.#][A-Za-z_-][\w-]*/.source]] }),
  markdown: () => ({ rules: [['head', /^#{1,6}[^\n]*/.source], ['str', `^\`\`\`[\\s\\S]*?(?:^\`\`\`|${END})`], ['str', /`[^`\n]+`/.source], ['kw', /\*\*[^*\n]+\*\*/.source], ['fn', /\[[^\]\n]*\]\([^)\n]*\)/.source], ['op', /^[ \t]*(?:[-*+]|\d+\.)[ \t]/.source]] }),
  sql: () => ({ rules: [['cmt', /--[^\n]*|\/\*[\s\S]*?(?:\*\/|(?![\s\S]))/.source], ['str', R.str], ['num', R.num], ['kw', KW.sql], ['fn', R.fn], ['op', R.op]], flags: 'gmi' }),
  html: () => ({ rules: [['cmt', `<!--[\\s\\S]*?(?:-->|${END})`], ['at', /<![A-Za-z][^>]*>/.source], ['tag', /<\/?[A-Za-z][^>]*>?/.source, t => run(t, TAG_RULES, 'g')], ['at', /&[#\w]+;/.source]] }),
};
SETS.xml = SETS.html;
const cache = {};
export const MAX_HIGHLIGHT = 300000;
export function highlight(text, lang) {
  if (!SETS[lang] || text.length > MAX_HIGHLIGHT) return null;
  try { const s = cache[lang] || (cache[lang] = SETS[lang]()); return run(text, s.rules, s.flags || 'gm'); } catch { return null; }
}
