/* ============================================================================
   THEME PRESETS
   Each theme maps directly onto the CSS custom properties defined in
   style.css. Switching themes = swapping these values on :root (or, for
   the admin preview, on a scoped wrapper element).
   ============================================================================ */
const THEMES = [
  {
    id: 'indigo-mill',
    name: 'Indigo Mill',
    blurb: 'Workshop ledger — muslin, dye-vat indigo, ochre thread.',
    vars: {
      'ink': '#232220', 'ink-soft': '#4A4740',
      'muslin': '#EDE8DE', 'paper': '#F8F5EF', 'line': '#D9D0BF',
      'indigo': '#33456B', 'indigo-deep': '#202E49', 'indigo-tint': '#E4E9F1',
      'ochre': '#B9822F', 'ochre-tint': '#F3E7D2',
      'thread-red': '#A23E3E', 'thread-red-tint': '#F3E1E1',
      'green-ok': '#4C6E4C', 'green-ok-tint': '#E4EBDF',
      'font-display': "'Fraunces', Georgia, serif",
      'font-body': "'IBM Plex Sans', -apple-system, sans-serif",
    },
  },
  {
    id: 'bone-rust',
    name: 'Bone & Rust',
    blurb: 'Raw linen and clay — soft, warm, artisanal.',
    vars: {
      'ink': '#2B2620', 'ink-soft': '#5C5346',
      'muslin': '#F1ECE2', 'paper': '#F8F4EC', 'line': '#DED2BD',
      'indigo': '#A1502B', 'indigo-deep': '#7A3A1D', 'indigo-tint': '#F1E0D2',
      'ochre': '#77855F', 'ochre-tint': '#E6EADC',
      'thread-red': '#9C3B2E', 'thread-red-tint': '#F1E0DA',
      'green-ok': '#5C7A4C', 'green-ok-tint': '#E4EBDD',
      'font-display': "'Cormorant', Georgia, serif",
      'font-body': "'Work Sans', -apple-system, sans-serif",
    },
  },
  {
    id: 'ink-selvage',
    name: 'Ink & Selvage',
    blurb: 'Dark newsprint — one bright thread of vermilion.',
    vars: {
      'ink': '#EDE8DE', 'ink-soft': '#B8B2A4',
      'muslin': '#1B1A17', 'paper': '#242320', 'line': '#3A3833',
      'indigo': '#E0532B', 'indigo-deep': '#B8431F', 'indigo-tint': '#3A2620',
      'ochre': '#C9A227', 'ochre-tint': '#37311A',
      'thread-red': '#D9614A', 'thread-red-tint': '#3A2620',
      'green-ok': '#7FA06B', 'green-ok-tint': '#25301F',
      'font-display': "'Bitter', Georgia, serif",
      'font-body': "'IBM Plex Sans', -apple-system, sans-serif",
    },
  },
  {
    id: 'raw-fiber',
    name: 'Raw Fiber',
    blurb: 'Undyed canvas and moss — organic, unbleached.',
    vars: {
      'ink': '#2B2A22', 'ink-soft': '#5A5748',
      'muslin': '#EFEAE0', 'paper': '#F7F4EC', 'line': '#DCD5C4',
      'indigo': '#4B5D3A', 'indigo-deep': '#38452B', 'indigo-tint': '#E3E8DA',
      'ochre': '#A9673D', 'ochre-tint': '#F0DFCF',
      'thread-red': '#A1483A', 'thread-red-tint': '#F0DFDA',
      'green-ok': '#4B5D3A', 'green-ok-tint': '#E3E8DA',
      'font-display': "'Frank Ruhl Libre', Georgia, serif",
      'font-body': "'Source Sans 3', -apple-system, sans-serif",
    },
  },
  {
    id: 'denim-ledger',
    name: 'Denim Ledger',
    blurb: 'Chambray blue and brass hardware — crisp, mercantile.',
    vars: {
      'ink': '#1F2733', 'ink-soft': '#55606E',
      'muslin': '#E9EDF2', 'paper': '#F5F7FA', 'line': '#CBD3DD',
      'indigo': '#274873', 'indigo-deep': '#16304F', 'indigo-tint': '#DEE6F0',
      'ochre': '#B8862C', 'ochre-tint': '#F1E5C9',
      'thread-red': '#A23E3E', 'thread-red-tint': '#F3E1E1',
      'green-ok': '#3F6E52', 'green-ok-tint': '#DFEBE3',
      'font-display': "'Domine', Georgia, serif",
      'font-body': "'Inter', -apple-system, sans-serif",
    },
  },
];

function getTheme(id) {
  return THEMES.find(t => t.id === id) || THEMES[0];
}

/** Apply a theme's variables onto any element (defaults to the document root). */
function applyTheme(id, target) {
  const theme = getTheme(id);
  const el = target || document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => {
    el.style.setProperty('--' + key, value);
  });
  return theme;
}
