// Theme engine for the extension gate — mirrors dashboard/src/lib/themes.js.
// The gate reads the user's chosen theme from profiles.theme and applies it so the
// blocker screen matches the dashboard.

export const THEMES = {
  glassPink:   { group:'glass', name:'Baby pink', appBg:'radial-gradient(720px 520px at 14% 6%, #fbeef3 0%, #fbeef300 60%), radial-gradient(700px 560px at 92% 8%, #ffffff 0%, #ffffff00 58%), radial-gradient(760px 640px at 72% 100%, #f6e2ec 0%, #f6e2ec00 62%), linear-gradient(160deg,#fdf3f7 0%,#f8ecf1 100%)', surface:'rgba(253,238,246,.72)', surface2:'rgba(250,224,237,.6)', border:'rgba(255,255,255,.32)', text:'#4a2b39', muted:'#8a6b76', faint:'#bb9aa6', accent:'#e8608f', accentRgb:'232,96,143', accent2:'#a06ad6', shadow:'0 30px 56px -24px rgba(38,40,60,.30)', blur:'blur(6px) saturate(1.7)' },
  glassTeal:   { group:'glass', name:'Aqua', appBg:'radial-gradient(720px 520px at 14% 6%, #e3f1ed 0%, #e3f1ed00 60%), radial-gradient(760px 640px at 72% 100%, #d6ece6 0%, #d6ece600 62%), linear-gradient(160deg,#eef5f3 0%,#e3ede9 100%)', surface:'rgba(178,234,225,.66)', surface2:'rgba(158,225,213,.56)', border:'rgba(255,255,255,.32)', text:'#12403b', muted:'#5c817d', faint:'#93b3af', accent:'#4fcbc4', accentRgb:'79,203,196', accent2:'#5fc9d8', shadow:'0 30px 56px -24px rgba(38,40,60,.30)', blur:'blur(6px) saturate(1.7)' },
  glassBlue:   { group:'glass', name:'Bright sky', appBg:'radial-gradient(720px 520px at 14% 6%, #e6eff5 0%, #e6eff500 60%), radial-gradient(760px 640px at 72% 100%, #dbe8f2 0%, #dbe8f200 62%), linear-gradient(160deg,#eef3f7 0%,#e3ebf1 100%)', surface:'rgba(186,224,249,.66)', surface2:'rgba(165,211,246,.56)', border:'rgba(255,255,255,.32)', text:'#1c2c4a', muted:'#5f708f', faint:'#97a6c2', accent:'#71c4f0', accentRgb:'113,196,240', accent2:'#8fb4f5', shadow:'0 30px 56px -24px rgba(38,40,60,.30)', blur:'blur(6px) saturate(1.7)' },
  glassPurple: { group:'glass', name:'Blue violet', appBg:'radial-gradient(720px 520px at 14% 6%, #eef0fe 0%, #eef0fe00 60%), radial-gradient(760px 640px at 72% 100%, #dee2fd 0%, #dee2fd00 62%), linear-gradient(160deg,#f5f6ff 0%,#e9ecfe 100%)', surface:'rgba(222,226,253,.62)', surface2:'rgba(200,207,250,.5)', border:'rgba(255,255,255,.32)', text:'#28306a', muted:'#5a67a3', faint:'#97a1cf', accent:'#6c7ef0', accentRgb:'108,126,240', accent2:'#8a8ff2', shadow:'0 30px 56px -24px rgba(38,40,60,.30)', blur:'blur(6px) saturate(1.7)' },
  glassGreen:  { group:'glass', name:'Emerald', appBg:'radial-gradient(720px 520px at 14% 6%, #e3f0e8 0%, #e3f0e800 60%), radial-gradient(760px 640px at 72% 100%, #d5ecdd 0%, #d5ecdd00 62%), linear-gradient(160deg,#eef4f0 0%,#e3ede7 100%)', surface:'rgba(182,231,207,.66)', surface2:'rgba(162,223,193,.56)', border:'rgba(255,255,255,.32)', text:'#1c4530', muted:'#5c8069', faint:'#96b8a2', accent:'#5ccf9c', accentRgb:'92,207,156', accent2:'#7ad0b5', shadow:'0 30px 56px -24px rgba(38,40,60,.30)', blur:'blur(6px) saturate(1.7)' },

  solidButter: { group:'solid', name:'Butter', appBg:'linear-gradient(160deg,#fff2c2 0%,#ffedac 100%)', surface:'#fff7d6', surface2:'#ffe79a', border:'#e7d199', text:'#3E2723', muted:'#7c6a54', faint:'#d8bd84', accent:'#B5661C', accentRgb:'181,102,28', accent2:'#8f5015', shadow:'0 20px 40px -24px rgba(62,39,35,.25)', blur:'none' },
  solidHotpink:{ group:'solid', name:'Hot pink', appBg:'#ffe1ef', surface:'#ffffff', surface2:'#ffd6ec', border:'#ffbdde', text:'#5a1236', muted:'#9e4f74', faint:'#f3a6c6', accent:'#ff2d8e', accentRgb:'255,45,142', accent2:'#d81f6f', shadow:'0 20px 40px -24px rgba(90,18,54,.22)', blur:'none' },
  solidNavy:   { group:'solid', name:'Ice & blaze', appBg:'linear-gradient(160deg,#d4f2ff 0%,#bfedff 100%)', surface:'#eefaff', surface2:'#dceff9', border:'#a9dcef', text:'#123047', muted:'#4f7186', faint:'#a9cede', accent:'#fd6c01', accentRgb:'253,108,1', accent2:'#e35d00', shadow:'0 20px 40px -24px rgba(18,48,71,.22)', blur:'none' },
  solidMono:   { group:'solid', name:'Mono', appBg:'#f7f7f5', surface:'#ffffff', surface2:'#f0f0ee', border:'#e3e3e0', text:'#161615', muted:'#6a6a66', faint:'#a3a39e', accent:'#161615', accentRgb:'22,22,21', accent2:'#8a8a85', shadow:'0 20px 40px -24px rgba(0,0,0,.18)', blur:'none' },
};

// New users default to Mono (black & white) on the gate, matching the dashboard.
// Once a user picks a theme in the dashboard, it's saved to their account and the
// gate follows it (shared via auth metadata).
export const DEFAULT_THEME = 'solidMono';

// Apply a theme's CSS variables to the document and mark the theme group.
export function applyTheme(key) {
  const t = THEMES[key] || THEMES[DEFAULT_THEME];
  const glass = t.group === 'glass';
  const mix = (a, pct, b) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;
  const vars = {
    '--app-bg': t.appBg, '--surface': t.surface, '--surface-2': t.surface2, '--border': t.border,
    '--text': t.text, '--muted': t.muted, '--faint': t.faint,
    '--accent': t.accent, '--accent-rgb': t.accentRgb, '--accent2': t.accent2,
    '--accent-weak': `rgba(${t.accentRgb},.14)`,
    '--shadow': t.shadow, '--blur': glass ? t.blur : 'none',
  };
  const root = document.documentElement;
  for (const k in vars) root.style.setProperty(k, vars[k]);
  root.setAttribute('data-theme', key);
  root.setAttribute('data-theme-group', t.group);
}
