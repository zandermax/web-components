# @zandermax/web-components

Zander's custom web components - drop-in UI components built with native Web Components.

## Components

### `<dial-selector>`

A beautiful dial-based selector component with smooth animations and customizable options.

## Installation

### Via CDN (Recommended for quick use)

```html
<script type="module" src="https://unpkg.com/@zandermax/web-components/dial-selector.js"></script>
```

### Via npm

```bash
npm install @zandermax/web-components
```

```js
import '@zandermax/web-components/dial-selector.js';
```

## Usage

```html
<dial-selector value="STREAM">
  <dial-option value="AUX">AUX</dial-option>
  <dial-option value="CD">CD</dial-option>
  <dial-option value="PHONO-1">PHONO-1</dial-option>
  <dial-option value="PHONO-2">PHONO-2</dial-option>
  <dial-option value="STREAM">STREAM</dial-option>
  <dial-option value="TAPE">TAPE</dial-option>
  <dial-option value="TUNER">TUNER</dial-option>
  <dial-option value="TV">TV</dial-option>
</dial-selector>
```

## Attributes

| Attribute              | Description                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| `mode`                 | Layout mode. Use `"spokes"` for radial label positioning.                                    |
| `value`                | Initial selected value. Must match a child `<dial-option>` value.                            |
| `one-sided`            | Show options on one side only. Values: `"left"`, `"right"`, `"inline-start"`, `"inline-end"` |
| `time-selection-delay` | Delay before selection animation in milliseconds.                                            |
| `onchange`             | JavaScript code executed when selection changes.                                             |

## Events

```js
document.querySelector('dial-selector').addEventListener('change', (event) => {
  console.log('Selected:', event.detail.value);
});
```

## License

MIT

