# Coordinate Sanitizer

[![npm version](https://badge.fury.io/js/coordinate-sanitizer.svg)](https://badge.fury.io/js/coordinate-sanitizer)
[![npm downloads](https://img.shields.io/npm/dm/coordinate-sanitizer.svg)](https://www.npmjs.com/package/coordinate-sanitizer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Support](https://img.shields.io/node/v/coordinate-sanitizer.svg)](https://nodejs.org)

<p align="center">
    <img src="https://raw.githubusercontent.com/Francescodib/coordinate-sanitizer/main/assets/CoordinateSanitizerLogo_web.jpg"
  alt="coordinate-sanitizer" width="100%" />
</p>

A flexible and robust JavaScript library for parsing and sanitizing astronomical coordinates. Handles various coordinate formats and converts them to standardized formats suitable for astronomical applications.

## Installation

```bash
npm install coordinate-sanitizer
```

[![NPM](https://nodei.co/npm/coordinate-sanitizer.png?downloads=true&downloadRank=true&stars=true)](https://www.npmjs.com/package/coordinate-sanitizer)

## Features

- **Multiple Input Formats**: Supports HMS/DMS, decimal, and compact coordinate formats
- **Flexible Output**: Configurable output formats (Aladin, decimal, HMS/DMS)
- **Range Validation**: Optional validation of RA (0-24h) and DEC (-90°/+90°) ranges
- **Input hardening**: Rejects control characters and markup in input
- **Object Recognition**: Automatically detects and passes through astronomical object names
- **Unicode Support**: Handles various Unicode symbols and separators
- **High Performance**: Optimized for batch processing
- **Zero Dependencies**: Lightweight with no external dependencies
- **Universal**: Works in Node.js and browsers (via `<script>` or a bundler)
- **TypeScript Support**: Includes complete TypeScript definitions

## Quick Start

```javascript
const CoordinateSanitizer = require('coordinate-sanitizer');

const sanitizer = new CoordinateSanitizer();

// Parse various coordinate formats
const result1 = sanitizer.sanitizeCoordinates('12h 34m 56s, +12° 34\' 56"');
console.log(result1.coordinates); // "12 34 56.000, +12 34 56.000"

const result2 = sanitizer.sanitizeCoordinates('M31');
console.log(result2.coordinates); // "M31" (passed through as object name)

const result3 = sanitizer.sanitizeCoordinates('123.456, -12.345');
console.log(result3.coordinates); // "08 13 49.440, -12 20 42.000"
```

## Package Information

| Property | Value |
|----------|--------|
| **Package Name** | [`coordinate-sanitizer`](https://www.npmjs.com/package/coordinate-sanitizer) |
| **Version** | ![npm version](https://img.shields.io/npm/v/coordinate-sanitizer.svg) |
| **Weekly Downloads** | ![npm downloads](https://img.shields.io/npm/dw/coordinate-sanitizer.svg) |
| **Bundle Size** | ![npm bundle size](https://img.shields.io/bundlephobia/min/coordinate-sanitizer.svg) |
| **License** | ![License](https://img.shields.io/npm/l/coordinate-sanitizer.svg) |
| **Node.js Support** | ![Node.js](https://img.shields.io/node/v/coordinate-sanitizer.svg) |

## Supported Input Formats

### Coordinate Formats
- **HMS/DMS**: `12h 34m 56.78s, +12° 34' 56.78"`
- **Colon separated**: `12:34:56.78, +12:34:56.78`
- **Decimal degrees**: `123.456, -12.345` (RA in degrees by default; set `raDecimalUnit: 'hours'` to interpret it as hours)
- **Decimal with unit suffix**: `12.5h, 45` or `187.5d, 45` (an explicit `h`/`d`/`°` suffix overrides `raDecimalUnit`)
- **Without seconds**: `12 30, +45 30`, `12h 30.5m, -05° 23'` (requires an explicit separator)
- **IAU J2000 designations** (opt-in, `parseDesignations: true`): `J053517.3-052328`, `SDSS J053517.30-052328.0`, `2MASS J05351730-0523280`
- **Compact**: `123456, -123456`
- **Space separated**: `12 34 56.7 -45 12 34.5`
- **Labeled**: `RA 12 34 56.7 DEC -45 12 34.5`, `RA: 12:34:56, DEC: -45:12:34`
- **Mixed formats**: `12h 34m 56s, +12:34:56`
- **Decimal comma**: `05 35 16,82 -05 23 15,36`, `05h35m16,8s, +41d16m09,5s` (as written by software on European locales; see [Separators](#separators))

### Object Names
- **Messier objects**: `M31`, `M42`
- **NGC objects**: `NGC 1234`, `NGC 7000`
- **IC objects**: `IC 1396`
- **Other catalogs**: `HD 209458`, `HIP 27989`, `SAO 123456`
- **Named stars**: `Polaris`, `Vega`, `51 Eri`

Object names are returned as typed (trimmed, repeated whitespace collapsed). Input made only of digits, signs, separators and unit markers is never treated as an object name: if it cannot be parsed (e.g. `1234`, `12h 30m`) an error is returned.

### Separators
Supports multiple separators between RA and DEC:
- Comma: `,`
- Semicolon: `;`
- Middle dot: `·`
- Bullet: `•`

A comma is read as a separator first, so `10,20` means RA 10°, DEC 20°. Only when the input does not parse that way is a comma between two digits read as a decimal comma (`05 35 16,820 -05 23 15,36`, `83,82, -5,38`).

## API Reference

### Constructor

```javascript
const sanitizer = new CoordinateSanitizer(options);
```

**Options:**
- `outputFormat` (string): Output format - `'aladin'`, `'decimal'`, `'hms-dms'` (default: `'aladin'`)
- `precision` (number): Decimal precision for output, integer between `0` and `20` (default: `6`)
- `validateRanges` (boolean): Enable range validation (default: `true`)
- `strictMode` (boolean): Enable strict parsing mode (default: `false`). In strict mode, compact 6-digit formats and space-separated coordinates without an explicit separator are rejected; only unambiguous formats are accepted (HMS/DMS with markers, colon-separated, decimal, labeled).
- `parseDesignations` (boolean): Parse IAU-style J2000 designations as coordinates instead of passing them through as object names (default: `false`). Designations are truncated, not rounded, so the position is only as accurate as the last digit given.
- `raDecimalUnit` (string): Unit of a bare decimal RA input and of decimal RA output - `'degrees'` or `'hours'` (default: `'degrees'`, the astronomical convention for decimal coordinates)

The constructor throws a `TypeError` for an unknown `outputFormat` or `raDecimalUnit`, a non-boolean `parseDesignations`, and a `RangeError` for an invalid `precision`. The resolved `options` object is frozen.

Note: regardless of `validateRanges`, sexagesimal minutes and seconds must always be in the 0-59 range; `12h 99m 00s` is rejected as malformed notation.

### Methods

#### `sanitizeCoordinates(input)`

Main method for sanitizing coordinates.

**Parameters:**
- `input` (string): Input coordinate string

**Returns:**
```javascript
{
  isValid: boolean,      // Whether the input was successfully parsed
  coordinates: string,   // Sanitized coordinate string
  error: string|null,    // Error message if parsing failed
  metadata: {            // Additional information about the parsing
    inputFormat: string, // 'coordinates', 'object-name', 'already-valid'
    outputFormat: string,// Output format used
    ra: object,          // RA parsing details (if coordinates or already-valid)
    dec: object          // DEC parsing details (if coordinates or already-valid)
  }
}
```

`inputFormat` is `'already-valid'` when the input is identical to the canonical output for the configured format (e.g. `'12 34 56.000, +12 34 56.000'` with `aladin`). The input is still fully parsed and range-validated.

#### `parse(input)`

Parses coordinates and returns plain numeric values, without string formatting. Returns `null` when the input is invalid or an object name.

```javascript
const sanitizer = new CoordinateSanitizer();
const parsed = sanitizer.parse('05h 35m 17.30s, -05° 23\' 28.00"');
console.log(parsed);
// { raHours: 5.588139, raDegrees: 83.822083, decDegrees: -5.391111 }

sanitizer.parse('M31'); // null (object name, no numeric coordinates)
```

#### `parseRightAscension(input)` / `parseDeclination(input)`

Parse a single value when RA and DEC come in separate fields (forms, telescope software). They return decimal hours and decimal degrees, or `null` when the text is invalid or, with `validateRanges`, out of range. A comma between digits is always a decimal comma here.

```javascript
const sanitizer = new CoordinateSanitizer();
sanitizer.parseRightAscension('05 35 16,820'); // 5.588006 (hours)
sanitizer.parseRightAscension('83.82');        // 5.588 (bare decimals follow raDecimalUnit)
sanitizer.parseDeclination('-05 23 15,36');    // -5.3876 (degrees)
sanitizer.parseDeclination('95');              // null (out of range)
```

#### `isValidFormat(input)`

Returns `true` if `sanitizeCoordinates(input)` would return the input unchanged: valid, in range, and in the exact layout and precision of the configured output format.

#### `looksLikeCoordinates(input)`

Heuristic used to decide between coordinate parsing and object-name passthrough. Returns `false` for known catalog designations (`M31`, `NGC 1976`, ...).

#### Static Methods

##### `getSupportedFormats()`

Returns information about supported input and output formats.

##### `createPreset(preset)`

Creates a sanitizer with predefined configurations:
- `'aladin'`: Aladin format with range validation
- `'decimal'`: Decimal format with high precision
- `'loose'`: Aladin format without range validation
- `'strict'`: Aladin format with strict parsing and validation

Throws an `Error` if an unknown preset name is provided.

## Usage Examples

### Different Output Formats

```javascript
// Aladin format (default)
const aladinSanitizer = new CoordinateSanitizer({ outputFormat: 'aladin' });
const result1 = aladinSanitizer.sanitizeCoordinates('12h 34m 56s, +12° 34\' 56"');
console.log(result1.coordinates); // "12 34 56.000, +12 34 56.000"

// Decimal format (degrees for both RA and DEC)
const decimalSanitizer = new CoordinateSanitizer({ outputFormat: 'decimal' });
const result2 = decimalSanitizer.sanitizeCoordinates('12h 34m 56s, +12° 34\' 56"');
console.log(result2.coordinates); // "188.733333, 12.582222"

// HMS/DMS format (decimal input is in degrees: RA 187.5° = 12.5h)
const hmsSanitizer = new CoordinateSanitizer({ outputFormat: 'hms-dms' });
const result3 = hmsSanitizer.sanitizeCoordinates('187.5, 12.5');
console.log(result3.coordinates); // "12h 30m 00.000s, +12° 30' 00.000""
```

### Using Presets

```javascript
// Quick setup with presets
const aladinSanitizer  = CoordinateSanitizer.createPreset('aladin');
const decimalSanitizer = CoordinateSanitizer.createPreset('decimal');
const looseSanitizer   = CoordinateSanitizer.createPreset('loose');
const strictSanitizer  = CoordinateSanitizer.createPreset('strict');

const result = aladinSanitizer.sanitizeCoordinates('12h 34m 56s, +12° 34\' 56"');

// createPreset throws for unknown names
try {
  CoordinateSanitizer.createPreset('unknown');
} catch (e) {
  console.error(e.message); // "Unknown preset: "unknown". Available presets: aladin, decimal, loose, strict"
}
```

### Strict Mode

Strict mode accepts only unambiguous coordinate formats and requires an explicit separator between RA and DEC:

```javascript
const strict = new CoordinateSanitizer({ strictMode: true });

// Accepted: HMS/DMS with markers, colon-separated, decimal
strict.sanitizeCoordinates('12h 34m 56s, +12° 34\' 56"').isValid; // true
strict.sanitizeCoordinates('12:34:56, +12:34:56').isValid;         // true
strict.sanitizeCoordinates('12.5, -45.75').isValid;                // true

// Rejected: compact format, space-separated without explicit separator
strict.sanitizeCoordinates('123456, -123456').isValid;       // false
strict.sanitizeCoordinates('12 34 56 -45 12 34').isValid;    // false
```

### Range Validation

```javascript
const sanitizer = new CoordinateSanitizer({ validateRanges: true });

// Valid coordinates
const valid = sanitizer.sanitizeCoordinates('12h 00m 00s, +45° 00\' 00"');
console.log(valid.isValid); // true

// Invalid RA (> 24h)
const invalid = sanitizer.sanitizeCoordinates('25h 00m 00s, +45° 00\' 00"');
console.log(invalid.isValid); // false
console.log(invalid.error); // "RA out of range: 25 (must be 0-24 hours)"
```

### Batch Processing

```javascript
const sanitizer = new CoordinateSanitizer();

const inputs = [
  'M31',
  'NGC 1234',
  '12h 34m 56s, +12° 34\' 56"',
  '13:45:12.34, -23:45:12.34'
];

const results = inputs.map(input => {
  const result = sanitizer.sanitizeCoordinates(input);
  return {
    input,
    valid: result.isValid,
    output: result.coordinates,
    type: result.metadata?.inputFormat
  };
});

console.table(results);
```

### Integration with Telescope Control

```javascript
class TelescopeController {
  constructor() {
    this.sanitizer = new CoordinateSanitizer({
      outputFormat: 'aladin',
      validateRanges: true
    });
  }

  gotoTarget(target) {
    const result = this.sanitizer.sanitizeCoordinates(target);
    
    if (!result.isValid) {
      throw new Error(`Invalid target: ${result.error}`);
    }

    // Send to telescope
    this.sendToTelescope(result.coordinates);
    
    return {
      target: result.coordinates,
      inputType: result.metadata.inputFormat
    };
  }
}
```

### Error Handling

```javascript
const sanitizer = new CoordinateSanitizer();

function safeSearch(input) {
  try {
    const result = sanitizer.sanitizeCoordinates(input);
    
    if (!result.isValid) {
      return {
        success: false,
        error: result.error,
        suggestion: 'Please check coordinate format'
      };
    }

    return {
      success: true,
      coordinates: result.coordinates,
      inputType: result.metadata.inputFormat
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      suggestion: 'Please contact support'
    };
  }
}
```

## Browser Usage

The library is plain JavaScript with no Node.js-specific APIs, so it can run client-side, e.g. to validate coordinates typed into a form before passing them to Aladin Lite or a backend. There are two supported ways to load it in a browser.

### Script Tag

Loaded as a classic script, the library defines a global `CoordinateSanitizer`. Pin an exact version in production (`@2` follows the latest 2.x release):

```html
<script src="https://unpkg.com/coordinate-sanitizer@2/src/index.js"></script>
<script>
  const sanitizer = new CoordinateSanitizer();
  const result = sanitizer.sanitizeCoordinates('M31');
  console.log(result.coordinates);
</script>
```

### Bundlers (webpack, Vite, Rollup, esbuild)

In a bundled frontend project, install the package and import it; the bundler resolves it through the `exports` map and includes it in your bundle:

```javascript
import CoordinateSanitizer from 'coordinate-sanitizer';

const sanitizer = new CoordinateSanitizer();
const result = sanitizer.sanitizeCoordinates('12h 34m 56s, +12° 34\' 56"');
```

### Native `<script type="module">` (not supported)

Importing the package directly in the browser without a bundler does **not** work:

```html
<!-- Fails: "The requested module './index.js' does not provide an export named 'default'" -->
<script type="module">
  import CoordinateSanitizer from 'https://unpkg.com/coordinate-sanitizer@2/src/index.mjs';
</script>
```

The ESM entry point (`src/index.mjs`) re-exports the CommonJS implementation, which Node.js and bundlers can convert but browsers cannot. Use the classic script tag or a bundler instead.

## ES Modules in Node.js

The package ships an ESM entry point, so `import` works out of the box in Node.js (`.mjs` files or `"type": "module"` projects):

```javascript
import CoordinateSanitizer from 'coordinate-sanitizer';
```

## TypeScript Support

The library includes complete TypeScript definitions. Types are exposed in the `CoordinateSanitizer` namespace:

```typescript
import CoordinateSanitizer from 'coordinate-sanitizer';

const options: CoordinateSanitizer.CoordinateSanitizerOptions = {
  outputFormat: 'decimal',
  precision: 4,
  validateRanges: true
};

const sanitizer = new CoordinateSanitizer(options);
const result: CoordinateSanitizer.SanitizationResult = sanitizer.sanitizeCoordinates('M31');
```

## Performance

The library is optimized for high-performance applications:

- **10,000+ coordinates/second** on modern hardware
- **Zero dependencies** - no external libraries
- **Efficient regex patterns** for fast parsing
- **Minimal memory footprint**
- **Batch processing support**

## Security

The library rejects input containing control characters, HTML tags, or the `javascript:` protocol, and never uses `eval()` or dynamic code execution.

This is input hardening, not output encoding: object names are passed through as typed (trimmed), so **always escape the returned string for the context you render it in** (HTML, SQL, shell, etc.).

## Error Handling

The library provides detailed error messages for debugging:

```javascript
const result = sanitizer.sanitizeCoordinates('25h 00m 00s, +00 00 00');
if (!result.isValid) {
  console.log(`Error: ${result.error}`);
  // Handle error appropriately
}
```

Common error types:
- Invalid coordinate format (including unparseable numeric input)
- Out of range values (RA > 24h, DEC > ±90°)
- Malformed sexagesimal components (minutes/seconds outside 0-59)
- Extra components or unexpected text in space-separated input
- Rejected input (control characters, HTML tags, `javascript:`)

Invalid constructor options throw instead of returning an error result.

## Testing

```bash
# Unit tests (92 tests)
npm test

# Integration tests – round-trip, cross-format consistency, known objects (33 tests)
npm run test:integration

# Full suite
npm run test:all

# Watch mode and coverage (built-in node:test runner)
npm run test:watch
npm run test:coverage

# Lint and type definitions check
npm run lint
npm run typecheck

# Run examples
npm run example
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development Setup

```bash
# Clone the repository
git clone https://github.com/Francescodib/coordinate-sanitizer.git
cd coordinate-sanitizer

# Install dependencies
npm install

# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run full suite
npm run test:all

# Run examples
npm run example
```

## Stats

- **Lines of code**: ~940
- **Unit tests**: 92
- **Integration tests**: 33 (round-trip, cross-format, known objects)
- **Performance**: 10,000+ coordinates/second
- **Bundle size**: Minimal (zero dependencies)
- **Formats supported**: 15+ input variations

## Changelog

### Unreleased
- Decimal commas: `05 35 16,820 -05 23 15,36` is accepted; a comma stays the RA/DEC separator when the input parses that way
- New `parseRightAscension()` and `parseDeclination()` for RA and DEC in separate fields

### 2.2.0
- Inputs without seconds (`12 30, +45 30`), decimal RA with an explicit unit suffix (`12.5h`, `187.5d`)
- Opt-in parsing of IAU J2000 designations (`parseDesignations: true`)
- Fixed: `Sh 2-155` was rejected as malformed coordinates (regression in 2.1.0)
- Fixed: plain `<script>` loading threw `module is not defined`; it now defines a global
- Fixed: typographic quotes are normalized correctly; whitespace after a sign (`- 45 00 00`) is accepted; no more negative zero (`-0.000000`, `-00 00 00.000`)

### 2.1.1
- `package.json` is exposed in the `exports` map (`require('coordinate-sanitizer/package.json')` no longer throws)

### 2.1.0
- **Breaking**: minimum Node.js version raised to 20 (18 is end-of-life)
- **Breaking**: the constructor throws on unknown `outputFormat` / `raDecimalUnit` and on a `precision` that is not an integer between 0 and 20; `options` is frozen
- **Breaking**: purely numeric input that cannot be parsed (e.g. `1234`, `12h 30m`) now returns an error instead of being passed through as an object name
- Unsigned decimal pairs (`10, 20`, `180, 45`) are now parsed as coordinates instead of being passed through as object names
- RA values rounding up to 24h now wrap to `00 00 00.000` / `0.000000` instead of `24 00 00.000` / `360.000000`
- The "already-valid" shortcut no longer skips range validation or ignores `precision`; already-valid results now include `ra`/`dec` metadata
- Space-separated input with extra components, trailing text, or a signed RA is rejected instead of silently truncated
- Object names are returned as typed (trimmed) instead of with normalized quotes/separators; `on...=` text is no longer flagged as malicious
- Tests migrated to the built-in `node:test` runner (`nodemon` removed)

### 2.0.0
- **Breaking**: bare decimal RA input is now interpreted as degrees (the documented astronomical convention), no longer as hours; the `decimal` output format emits RA in degrees. Use the new `raDecimalUnit: 'hours'` option to restore the previous behaviour
- Sexagesimal minutes/seconds components are now validated (`12h 99m 00s` is rejected)
- Native ESM entry point: `import CoordinateSanitizer from 'coordinate-sanitizer'` works in Node.js
- Fixed `exports` map ordering so TypeScript `node16`/`bundler` resolution finds the type definitions
- New labeled input format (`RA 05 35 17.30 DEC -05 23 28.00`) and new `parse()` method returning numeric values
- Rewritten TypeScript definitions (previous ones did not compile), ESLint and type checks added to CI
- Minimum Node.js version raised to 18

### 1.0.4
- Implemented `strictMode` option (was documented but had no effect)
- Fixed floating point carry overflow in `decimalToHMS` / `decimalToDMS` and in formatting functions
- Fixed `isValidFormat` to detect already-valid input for all output formats, not only `aladin`
- Fixed `formatHMSDMS` zero-padding for hours, minutes, and degree components
- `createPreset` now throws a descriptive `Error` for unknown preset names
- Updated TypeScript definitions: added `strictMode`, `createPreset` signature, fixed exports
- Added 29 integration tests (round-trip idempotency, cross-format consistency, known objects)

See [CHANGELOG.md](CHANGELOG.md) for the full history.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Projects

- [Aladin Lite](https://aladin.u-strasbg.fr/AladinLite/) - Sky atlas for the web
- [Astropy](https://www.astropy.org/) - Python astronomy library

## Links

- **npm Package**: https://www.npmjs.com/package/coordinate-sanitizer
- **Documentation**: https://github.com/Francescodib/coordinate-sanitizer#readme
- **Issues**: https://github.com/Francescodib/coordinate-sanitizer/issues
- **Discussions**: https://github.com/Francescodib/coordinate-sanitizer/discussions

## Support

- [Documentation](https://github.com/Francescodib/coordinate-sanitizer#readme)
- [Issue Tracker](https://github.com/Francescodib/coordinate-sanitizer/issues)
- [Discussions](https://github.com/Francescodib/coordinate-sanitizer/discussions)

## Author

**Francesco di Biase**
- GitHub: [@Francescodib](https://github.com/Francescodib)
- Project: [coordinate-sanitizer](https://github.com/Francescodib/coordinate-sanitizer)
