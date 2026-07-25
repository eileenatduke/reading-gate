// Theme engine — ported from the Claude Design "Reading Gate Dashboard" prototype.
// 10 themes in two families (glass "Liquid pastel" + "Solid"). computeVars() turns a
// theme into the CSS custom properties the whole app reads. Kept in sync with the
// extension copy at extension/src/lib/themes.js.

export const THEMES = {
  glassPink:   { group:'glass', name:'Baby pink', swatch:'#e8608f', appBg:'radial-gradient(720px 520px at 14% 6%, #fbeef3 0%, #fbeef300 60%), radial-gradient(700px 560px at 92% 8%, #ffffff 0%, #ffffff00 58%), radial-gradient(760px 640px at 72% 100%, #f6e2ec 0%, #f6e2ec00 62%), linear-gradient(160deg,#fdf3f7 0%,#f8ecf1 100%)', surface:'rgba(253,238,246,.72)', surface2:'rgba(250,224,237,.6)', border:'rgba(255,255,255,.32)', text:'#4a2b39', muted:'#8a6b76', faint:'#bb9aa6', accent:'#e8608f', accentRgb:'232,96,143', accent2:'#a06ad6', grid:'rgba(74,43,57,.12)', shadow:'0 2px 5px -2px rgba(38,40,60,.14), 0 12px 24px -10px rgba(38,40,60,.22), 0 30px 56px -24px rgba(38,40,60,.30), inset 0 1.5px 0 rgba(255,255,255,.98), inset 0 0 0 1px rgba(255,255,255,.38), inset 0 16px 30px -18px rgba(255,255,255,.72), inset 0 -18px 30px -26px rgba(30,30,50,.12)', blur:'blur(6px) saturate(1.7)', tipBg:'rgba(255,255,255,.8)', tipText:'#4a2b39' },
  glassTeal:   { group:'glass', name:'Aqua', swatch:'#4fcbc4', appBg:'radial-gradient(720px 520px at 14% 6%, #e3f1ed 0%, #e3f1ed00 60%), radial-gradient(700px 560px at 92% 8%, #f4f6f5 0%, #f4f6f500 58%), radial-gradient(760px 640px at 72% 100%, #d6ece6 0%, #d6ece600 62%), linear-gradient(160deg,#eef5f3 0%,#e3ede9 100%)', surface:'rgba(178,234,225,.66)', surface2:'rgba(158,225,213,.56)', border:'rgba(255,255,255,.32)', text:'#12403b', muted:'#5c817d', faint:'#93b3af', accent:'#4fcbc4', accentRgb:'79,203,196', accent2:'#5fc9d8', grid:'rgba(18,64,59,.11)', shadow:'0 2px 5px -2px rgba(38,40,60,.14), 0 12px 24px -10px rgba(38,40,60,.22), 0 30px 56px -24px rgba(38,40,60,.30), inset 0 1.5px 0 rgba(255,255,255,.98), inset 0 0 0 1px rgba(255,255,255,.38), inset 0 16px 30px -18px rgba(255,255,255,.72), inset 0 -18px 30px -26px rgba(30,30,50,.12)', blur:'blur(6px) saturate(1.7)', tipBg:'rgba(255,255,255,.8)', tipText:'#12403b' },
  glassBlue:   { group:'glass', name:'Bright sky', swatch:'#71c4f0', appBg:'radial-gradient(720px 520px at 14% 6%, #e6eff5 0%, #e6eff500 60%), radial-gradient(700px 560px at 92% 8%, #f4f6f8 0%, #f4f6f800 58%), radial-gradient(760px 640px at 72% 100%, #dbe8f2 0%, #dbe8f200 62%), linear-gradient(160deg,#eef3f7 0%,#e3ebf1 100%)', surface:'rgba(186,224,249,.66)', surface2:'rgba(165,211,246,.56)', border:'rgba(255,255,255,.32)', text:'#1c2c4a', muted:'#5f708f', faint:'#97a6c2', accent:'#71c4f0', accentRgb:'113,196,240', accent2:'#8fb4f5', grid:'rgba(28,44,74,.11)', shadow:'0 2px 5px -2px rgba(38,40,60,.14), 0 12px 24px -10px rgba(38,40,60,.22), 0 30px 56px -24px rgba(38,40,60,.30), inset 0 1.5px 0 rgba(255,255,255,.98), inset 0 0 0 1px rgba(255,255,255,.38), inset 0 16px 30px -18px rgba(255,255,255,.72), inset 0 -18px 30px -26px rgba(30,30,50,.12)', blur:'blur(6px) saturate(1.7)', tipBg:'rgba(255,255,255,.8)', tipText:'#1c2c4a' },
  glassPurple: { group:'glass', name:'Blue violet', swatch:'#6c7ef0', appBg:'radial-gradient(720px 520px at 14% 6%, #eef0fe 0%, #eef0fe00 60%), radial-gradient(700px 560px at 92% 8%, #ffffff 0%, #ffffff00 58%), radial-gradient(760px 640px at 72% 100%, #dee2fd 0%, #dee2fd00 62%), linear-gradient(160deg,#f5f6ff 0%,#e9ecfe 100%)', surface:'rgba(222,226,253,.62)', surface2:'rgba(200,207,250,.5)', border:'rgba(255,255,255,.32)', text:'#28306a', muted:'#5a67a3', faint:'#97a1cf', accent:'#6c7ef0', accentRgb:'108,126,240', accent2:'#8a8ff2', grid:'rgba(40,48,106,.11)', shadow:'0 2px 5px -2px rgba(38,40,60,.14), 0 12px 24px -10px rgba(38,40,60,.22), 0 30px 56px -24px rgba(38,40,60,.30), inset 0 1.5px 0 rgba(255,255,255,.98), inset 0 0 0 1px rgba(255,255,255,.38), inset 0 16px 30px -18px rgba(255,255,255,.72), inset 0 -18px 30px -26px rgba(30,30,50,.12)', blur:'blur(6px) saturate(1.7)', tipBg:'rgba(255,255,255,.8)', tipText:'#28306a' },
  glassGreen:  { group:'glass', name:'Emerald', swatch:'#5ccf9c', appBg:'radial-gradient(720px 520px at 14% 6%, #e3f0e8 0%, #e3f0e800 60%), radial-gradient(700px 560px at 92% 8%, #f4f6f4 0%, #f4f6f400 58%), radial-gradient(760px 640px at 72% 100%, #d5ecdd 0%, #d5ecdd00 62%), linear-gradient(160deg,#eef4f0 0%,#e3ede7 100%)', surface:'rgba(182,231,207,.66)', surface2:'rgba(162,223,193,.56)', border:'rgba(255,255,255,.32)', text:'#1c4530', muted:'#5c8069', faint:'#96b8a2', accent:'#5ccf9c', accentRgb:'92,207,156', accent2:'#7ad0b5', grid:'rgba(28,69,48,.11)', shadow:'0 2px 5px -2px rgba(38,40,60,.14), 0 12px 24px -10px rgba(38,40,60,.22), 0 30px 56px -24px rgba(38,40,60,.30), inset 0 1.5px 0 rgba(255,255,255,.98), inset 0 0 0 1px rgba(255,255,255,.38), inset 0 16px 30px -18px rgba(255,255,255,.72), inset 0 -18px 30px -26px rgba(30,30,50,.12)', blur:'blur(6px) saturate(1.7)', tipBg:'rgba(255,255,255,.8)', tipText:'#1c4530' },

  // Solid themes trimmed to four roles (dominant / ink / brand / standout). Ink is a
  // neutral tuned to each theme (no competing third hue), `faint` is the muted secondary
  // data color, and `heatDark` keeps the heatmap ramp in the brand family.
  solidButter: { group:'solid', name:'Butter', swatch:'#ffedac', swatch2:'#B5661C', appBg:'linear-gradient(160deg,#fff2c2 0%,#ffedac 100%)', surface:'#fff7d6', surface2:'#ffe79a', border:'#e7d199', text:'#3E2723', muted:'#7c6a54', faint:'#d8bd84', accent:'#B5661C', accentRgb:'181,102,28', accent2:'#8f5015', grid:'rgba(62,39,35,.12)', heatDark:'#6E3D0C', shadow:'none', blur:'none', tipBg:'#fff7d6', tipText:'#3E2723' },
  solidHotpink:{ group:'solid', name:'Hot pink', swatch:'#ffe1ef', swatch2:'#ff2d8e', appBg:'#ffe1ef', surface:'#ffffff', surface2:'#ffd6ec', border:'#ffbdde', text:'#5a1236', muted:'#9e4f74', faint:'#f3a6c6', accent:'#ff2d8e', accentRgb:'255,45,142', accent2:'#d81f6f', grid:'rgba(90,18,54,.1)', heatDark:'#a5115b', shadow:'none', blur:'none', tipBg:'#ffffff', tipText:'#5a1236' },
  solidNavy:   { group:'solid', name:'Ice & blaze', swatch:'#bfedff', swatch2:'#fd6c01', appBg:'linear-gradient(160deg,#d4f2ff 0%,#bfedff 100%)', surface:'#eefaff', surface2:'#dceff9', border:'#a9dcef', text:'#123047', muted:'#4f7186', faint:'#a9cede', accent:'#fd6c01', accentRgb:'253,108,1', accent2:'#e35d00', grid:'rgba(18,48,71,.10)', heatDark:'#b24b00', shadow:'none', blur:'none', tipBg:'#ffffff', tipText:'#123047' },
  solidMono:   { group:'solid', name:'Mono', swatch:'#ffffff', swatch2:'#3f3f3f', appBg:'#f7f7f5', surface:'#ffffff', surface2:'#f0f0ee', border:'#e3e3e0', text:'#161615', muted:'#6a6a66', faint:'#a3a39e', accent:'#161615', accentRgb:'22,22,21', accent2:'#8a8a85', grid:'rgba(0,0,0,.08)', shadow:'none', blur:'none', tipBg:'#ffffff', tipText:'#161615' },
};

export const THEME_GROUPS = [
  { label: 'Liquid pastel', keys: ['glassPink', 'glassTeal', 'glassBlue', 'glassPurple', 'glassGreen'] },
  { label: 'Solid', keys: ['solidButter', 'solidHotpink', 'solidNavy', 'solidMono'] },
];

// New users default to Mono (black & white); they can pick any theme in Settings.
export const DEFAULT_THEME = 'solidMono';
export function isValidTheme(k) { return Object.prototype.hasOwnProperty.call(THEMES, k); }

// Relative luminance (WCAG) of a #rrggbb color — used to tell a dark accent apart
// from a light/mid one when choosing a same-family link-hover color.
function luminance(hex) {
  const h = hex.replace('#', '');
  const ch = (i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4);
}

// ---- HSL helpers, used to keep the alert red separated from warm accents ----
function rgbToHsl(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let hue = 0;
  if (d) {
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue = hue * 60; if (hue < 0) hue += 360;
  }
  const l = (max + min) / 2;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return { h: hue, s, l };
}
function hslToHex(hue, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (hue < 60) { r = c; g = x; } else if (hue < 120) { r = x; g = c; }
  else if (hue < 180) { g = c; b = x; } else if (hue < 240) { g = x; b = c; }
  else if (hue < 300) { r = x; b = c; } else { r = c; b = x; }
  const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return '#' + to(r) + to(g) + to(b);
}

// Is the accent itself warm (red / orange / pink)? Those hues sit next to the alert red,
// so a warm accent can't also carry the "resisting" bars without the whole chart reading
// as one warm blob. Near-grey accents (Mono) count as neutral, not warm.
function isWarmAccent(hex) {
  const { h, s } = rgbToHsl(hex);
  if (s < 0.15) return false;
  return h >= 330 || h <= 50;
}

// The two "resisting" shades for the Resisting-the-impulse chart — kept reading (strong)
// and closed tab (soft). They must group together AND sit far from the alert red. When the
// accent is cool it's already far from red, so reuse the accent-derived bar colors. When the
// accent is warm it would blur into the red, so swap the pair to two shades of the accent's
// cool complement (e.g. orange → blue) — as far from red as the wheel allows.
function resistColors(t, barMain) {
  if (!isWarmAccent(t.accent)) return { strong: barMain, soft: t.faint };
  const comp = (rgbToHsl(t.accent).h + 180) % 360;
  return { strong: hslToHex(comp, 0.52, 0.46), soft: hslToHex(comp, 0.46, 0.73) };
}

// Circular swatch background (two-tone for solids that define swatch2).
export function swatchBg(key) {
  const t = THEMES[key];
  return t.swatch2
    ? `linear-gradient(135deg, ${t.swatch} 0 50%, ${t.swatch2} 50% 100%)`
    : t.swatch;
}

// Compute the full CSS-variable map for a theme. Mirrors the prototype's applyVars(),
// using its $preview defaults for the glass rim light (rimLight 72, rimBR 56).
export function computeVars(key, { rimLight = 72, rimBR = 56 } = {}) {
  const t = THEMES[key] || THEMES[DEFAULT_THEME];
  const glass = t.group === 'glass';
  let shadow = t.shadow;
  const rim = {};

  if (glass) {
    const r = Math.max(0, Math.min(100, rimLight)) / 100;
    const bevelW = (1 + r * 2).toFixed(2), bevelA = (0.28 + r * 0.24).toFixed(2);
    rim['--rim-inset'] = (0.5 + r * 1).toFixed(2) + 'px';
    rim['--rim-w'] = (0.9 + r * 1.4).toFixed(2) + 'px';
    rim['--rim-a'] = (0.5 + r * 0.5).toFixed(2);
    rim['--rim-glow'] = (4 + r * 8).toFixed(1) + 'px';
    rim['--rim-glow-a'] = (0.3 + r * 0.4).toFixed(2);
    const br = Math.max(0, Math.min(100, rimBR)) / 100;
    rim['--rim-br-w'] = (br * 5).toFixed(2) + 'px';
    rim['--rim-br-a'] = (br * 1).toFixed(2);
    rim['--rim-br-glow'] = (br * 24).toFixed(1) + 'px';
    rim['--rim-br-glow-a'] = (br * 0.85).toFixed(2);
    const shY = Math.round(11 + r * 16), shB = Math.round(22 + r * 22), shA = (0.35 + r * 0.5).toFixed(2);
    shadow = '0 8px 20px -14px rgba(40,44,70,.14), 0 2px 6px -4px rgba(40,44,70,.08), '
      + 'inset 0 ' + bevelW + 'px 0 rgba(255,255,255,' + bevelA + '), '
      + 'inset 0 ' + shY + 'px ' + shB + 'px -18px rgba(255,255,255,' + shA + '), '
      + 'inset 0 -14px 26px -26px rgba(30,30,50,.1)';
  }

  const mix = (a, pct, b) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;

  // Link hover stays in the accent's own color family (never a hue jump to accent2).
  // Normally we darken the accent toward the heading/title color; but when the accent
  // is already very dark (≈ the title color), darkening is invisible, so we lighten it.
  const linkHover = luminance(t.accent) < 0.15
    ? mix(t.accent, 55, '#ffffff')
    : t.text;

  const barMain = glass ? `color-mix(in srgb, ${t.accent} 70%, ${t.text} 30%)` : t.accent;
  const resist = resistColors(t, barMain);

  return {
    '--app-bg': t.appBg,
    '--link-hover': linkHover,
    '--surface': t.surface, '--surface-2': t.surface2, '--border': t.border,
    '--text': t.text, '--muted': t.muted, '--faint': t.faint,
    '--accent': t.accent, '--accent-rgb': t.accentRgb, '--accent2': t.accent2,
    '--grid': t.grid, '--shadow': shadow, '--blur': t.blur,
    '--tip-bg': t.tipBg, '--tip-text': t.tipText,
    '--line': glass ? '#ffffff' : mix(t.accent, 34, '#ffffff'),
    '--dot': glass ? mix(t.accent, 22, '#ffffff') : '#ffffff',
    '--bar-main': barMain,
    // Resisting-the-impulse chart: the two "not the site" bars, kept in one cool family
    // that stays clear of the alert red (see resistColors).
    '--resist-strong': resist.strong,
    '--resist-soft': resist.soft,
    // Solid axis labels use the neutral ink (not the accent) to keep color minimal.
    '--axis-left': glass ? t.text : t.muted,
    '--axis-right': glass ? t.text : t.muted,
    '--hlabel': glass ? t.text : t.faint,
    // Solid genre tracks are a light tint of the brand so the bar stays one color.
    '--track': glass ? (key === 'glassPink' ? '#ffffff' : mix(t.accent, 12, '#ffffff')) : mix(t.accent, 14, '#ffffff'),
    '--xlabel': glass ? t.text : t.muted,
    // Heatmap ramp's dark endpoint: solid themes darken the accent (stay in one hue);
    // glass themes keep the heading color, as before.
    '--heat-dark': t.heatDark || t.text,
    ...rim,
  };
}

// Heatmap ramp: white -> accent (mid) -> heading color.
export function heatColor(key, r) {
  const t = THEMES[key] || THEMES[DEFAULT_THEME];
  r = Math.max(0, Math.min(1, r));
  if (r <= 0.5) return `color-mix(in srgb, ${t.accent} ${(r / 0.5 * 100).toFixed(1)}%, #ffffff)`;
  return `color-mix(in srgb, ${t.text} ${((r - 0.5) / 0.5 * 100).toFixed(1)}%, ${t.accent})`;
}
