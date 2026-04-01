# Graph Editor

## Tech Stack

- **Backend**: Node.js + Express (CommonJS), port 4001
- **Frontend**: React 19 + Vite (ESM), port 5174
- **Styling**: Plain CSS files with CSS custom properties, no CSS-in-JS
- **HTTP Client**: Axios
- **Data**: File-based JSON storage (no database)

## Styling Guide

This app uses a Discord-inspired dark theme. All colors come from CSS variables defined in `client/src/index.css`. Never use hardcoded hex values in component CSS — always reference variables.

### Color Palette (CSS Variables)

#### Backgrounds — 6-level depth hierarchy

| Variable | Hex | Use for |
|---|---|---|
| `--bg-near-black` | #111214 | Top-level chrome: titlebars, sidebars, tooltips |
| `--bg-darkest` | #1e1f22 | Panels, modal bodies, column containers |
| `--bg-dark` | #2b2d31 | Main content areas, drop zones |
| `--bg-medium` | #313338 | Page body, cards, list items |
| `--bg-lighter` | #383a40 | Buttons, input fields, interactive surfaces |
| `--bg-lightest` | #404249 | Hover states on interactive elements |

**Rule**: Nested elements get progressively lighter backgrounds. A card (`--bg-medium`) sitting inside a column (`--bg-darkest`) sitting inside a board (`--bg-dark`). Parent is always darker than child.

#### Text — 3-tier hierarchy

| Variable | Hex | Use for |
|---|---|---|
| `--text-primary` | #f2f3f5 | Headings, titles, main content, active items |
| `--text-secondary` | #b5bac1 | Labels, descriptions, button text, inactive items |
| `--text-muted` | #949ba4 | Hints, placeholders, timestamps, empty states, separators |

#### Accent / Interactive

| Variable | Hex | Use for |
|---|---|---|
| `--accent-brand` | #5865f2 | Primary CTAs, focus borders, active indicators, badges |
| `--accent-brand-hover` | #4752c4 | Hover state on brand-colored buttons |
| `--accent-link` | #00a8fc | Text links, empty-state links |

#### Semantic

| Variable | Hex | Use for |
|---|---|---|
| `--color-success` | #23a559 | Add/create actions, positive indicators |
| `--color-warning` | #f0b232 | Warnings, unsaved indicators |
| `--color-danger` | #da373c | Delete buttons, destructive actions, error states |

#### Borders

| Variable | Hex | Use for |
|---|---|---|
| `--border-subtle` | #3f4147 | Default borders on cards, columns, inputs at rest |
| `--border-strong` | #4e5058 | Emphasized borders, input defaults in modals |

#### Scrollbar

| Variable | Hex |
|---|---|
| `--scrollbar-track` | #2b2d31 |
| `--scrollbar-thumb` | #4e5058 |
| `--scrollbar-thumb-hover` | #686d75 |

### Borders

- **Default width**: `1px solid` for cards, columns, list items
- **Input/textarea borders**: `1.5px solid` for better visibility
- **Active indicators**: `2px solid` for tabs, progress bars
- **Special emphasis**: `3px solid` for blockquote left borders

**Border radius scale**:
- `50%` — Circular: icon buttons, avatars, close buttons
- `16px` — Large rounded rect: active icon morphing
- `12px` — Modals, column containers
- `8px` — Tooltips, image attachments, option groups
- `6px` — Standard: inputs, buttons, small containers
- `4px` — Small: badges, code blocks
- `3px` — Scrollbar thumb

**Border color states**:
- Rest: `var(--border-subtle)`
- Focus/active: `var(--accent-brand)`
- Error: `#e74c3c`
- Danger hover: `rgba(218, 55, 60, 0.15)` background

### Shadows

All shadows use `rgba(0, 0, 0, ...)` — pure black at varying opacity. Higher elevation = larger blur + higher opacity.

| Element | box-shadow |
|---|---|
| Small UI (tooltips, code btns) | `0 2px 4px rgba(0, 0, 0, 0.3)` |
| Toasts, context menus | `0 4px 12px rgba(0, 0, 0, 0.4)` |
| Tooltips | `0 8px 16px rgba(0, 0, 0, 0.5)` |
| Modals | `0 8px 32px rgba(0, 0, 0, 0.4)` |
| Lightbox / image preview | `0 8px 40px rgba(0, 0, 0, 0.6)` |

**Colored shadows** (rare, for emphasis): `0 4px 12px rgba(88, 101, 242, 0.2)` — brand-colored glow on hover.

### Interactive States

**General pattern** for all interactive elements:

```
Rest    → subtle border, medium/lighter bg, secondary text
Hover   → lightest bg or brand bg, stronger border, primary text
Focus   → brand border, no outline
Active  → brand border, lighter bg, primary text
Disabled → opacity 0.6, cursor: not-allowed
```

**Buttons**:
- Primary (CTA): `background: var(--accent-brand)`, `color: #fff`, hover → `var(--accent-brand-hover)`
- Secondary (cancel): `background: var(--bg-lighter)`, `color: var(--text-secondary)`, `border: 1px solid var(--border-subtle)`
- Danger: `background: var(--color-danger)`, `color: #fff`, hover → `#b52e32`
- Warning: `background: var(--color-warning)`, `color: #000`, hover → `#d4981f`
- Ghost/add: `border: 1px dashed var(--text-muted)`, hover → brand bg + solid border

**Inputs & Textareas**:
- Background: `var(--bg-lighter)`
- Border: `1.5px solid var(--border-strong)` at rest
- Focus: `border-color: var(--accent-brand)`, `outline: none`
- Placeholder color: `var(--text-muted)`
- Font: inherit `var(--font-family)`, `0.95rem`
- Padding: `8px 10px`
- Border-radius: `6px`

**List items** (sidebar, selectable rows):
- Rest: `background: var(--bg-medium)`, `border: 1px solid transparent`
- Hover: `background: var(--bg-lighter)`, `border-color: var(--border-subtle)`
- Active/selected: `background: var(--bg-lighter)`, `border-color: var(--accent-brand)`

**Cards**:
- Rest: `background: var(--bg-medium)`, `border: 1px solid var(--border-subtle)`
- Hover: `border-color: var(--accent-brand)`

### Modals & Overlays

- Backdrop: `background: rgba(0, 0, 0, 0.6)`, z-index 1000
- Content: `background: var(--bg-darkest)`, `border-radius: 12px`, `box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4)`
- Padding: `32px 24px 24px`
- Width: 480px typical, max-width 90vw
- Close button: circular 28px, `background: var(--color-danger)`, `color: #fff`, top-right corner
- Footer actions: `display: flex`, `gap: 8px`, `justify-content: flex-end`

### Transitions & Animations

**Standard durations**:
- Color/background: `0.15s–0.2s ease`
- Borders: `0.2s ease`
- Transforms: `0.1s linear`
- Opacity: `0.1s–0.3s ease`

**Card enter animation**: `0.25s cubic-bezier(.4,1.4,.6,1)` — fade in + slide up 12px + scale from 0.98

**Toasts**: slide in from right `0.3s ease-out`, fade out after 2.7s

**Spinners**: `border: 2.5px solid var(--border-strong)`, `border-top-color: var(--accent-brand)`, rotate 360deg in `0.7s linear infinite`

### Semantic Color Patterns

**Success (green)**: Use for add/create button text by default, fill bg on hover. Pattern: `color: var(--color-success)` → hover: `background: var(--color-success)`, `color: var(--text-primary)`

**Warning (amber)**: Text badges with semi-transparent bg. Pattern: `color: var(--color-warning)`, `background: rgba(240, 178, 50, 0.15)`, `border: 1px solid rgba(240, 178, 50, 0.4)`

**Danger (red)**: Solid bg for delete/close buttons (`background: var(--color-danger)`, `color: #fff`). For list items, use subtle bg on hover: `background: rgba(218, 55, 60, 0.15)`, `color: var(--color-danger)`

### Spacing Scale

- `4px` — tight: small gaps between inline elements
- `6px` — compact: scrollbar width, small gaps
- `8px` — standard: button padding, small gaps
- `10px`–`12px` — comfortable: input padding, medium gaps
- `16px` — spacious: content padding, column gaps
- `24px` — large: modal horizontal padding
- `32px` — extra: modal top padding

### Typography

- Font stack: `'Inter', 'Segoe UI', Arial, sans-serif`
- Body text: `0.95rem`
- Small text (badges, hints): `0.8rem–0.85rem`
- Headings in modals: `1.1rem–1.2rem`
- Code font: `'Consolas', 'Monaco', 'Courier New', monospace`
- Code text color: `#e8b86d` (golden) for inline code, `var(--text-primary)` inside code blocks
- Code background: `#1a1b1e`

### Z-Index Scale

- `1000` — Modal backdrops
- `2000` — Image lightbox
- `10000` — Tooltips
