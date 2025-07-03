# Coordinate Sanitizer

[![npm version](https://badge.fury.io/js/coordinate-sanitizer.svg)](https://badge.fury.io/js/coordinate-sanitizer)
[![npm downloads](https://img.shields.io/npm/dm/coordinate-sanitizer.svg)](https://www.npmjs.com/package/coordinate-sanitizer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Support](https://img.shields.io/node/v/coordinate-sanitizer.svg)](https://nodejs.org)

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
- **Security**: Built-in protection against malicious input
- **Object Recognition**: Automatically detects and passes through astronomical object names
- **Unicode Support**: Handles various Unicode symbols and separators
- **High Performance**: Optimized for batch processing
- **Zero Dependencies**: Lightweight with no external dependencies
- **Universal**: Works in Node.js and browsers
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
- **Decimal**: `123.456, -12.345`
- **Compact**: `123456, -123456`
- **Space separated**: `12 34 56.7 -45 12 34.5`
- **Mixed formats**: `12h 34m 56s, +12:34:56`

### Object Names
- **Messier objects**: `M31`, `M42`
- **NGC objects**: `NGC 1234`, `NGC 7000`
- **IC objects**: `IC 1396`
- **Other catalogs**: `HD 209458`, `HIP 27989`, `SAO 123456`
- **Named stars**: `Polaris`, `Vega`, `51 Eri`

### Separators
Supports multiple separators between RA and DEC:
- Comma: `,`
- Semicolon: `;`
- Middle dot: `·`
- Bullet: `•`

## API Reference

### Constructor

```javascript
const sanitizer = new CoordinateSanitizer(options);
```

**Options:**
- `outputFormat` (string): Output format - `'aladin'`, `'decimal'`, `'hms-dms'` (default: `'aladin'`)
- `precision` (number): Decimal precision for output (default: `6`)
- `validateRanges` (boolean): Enable range validation (default: `true`)
- `strictMode` (boolean): Enable strict parsing mode (default: `false`)

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
    ra: object,          // RA parsing details (if coordinates)
    dec: object          // DEC parsing details (if coordinates)
  }
}
```

#### Static Methods

##### `getSupportedFormats()`

Returns information about supported input and output formats.

##### `createPreset(preset)`

Creates a sanitizer with predefined configurations:
- `'aladin'`: Aladin format with range validation
- `'decimal'`: Decimal format with high precision
- `'loose'`: Aladin format without range validation
- `'strict'`: Aladin format with strict parsing and validation

## Usage Examples

### Different Output Formats

```javascript
// Aladin format (default)
const aladinSanitizer = new CoordinateSanitizer({ outputFormat: 'aladin' });
const result1 = aladinSanitizer.sanitizeCoordinates('12h 34m 56s, +12° 34\' 56"');
console.log(result1.coordinates); // "12 34 56.000, +12 34 56.000"

// Decimal format
const decimalSanitizer = new CoordinateSanitizer({ outputFormat: 'decimal' });
const result2 = decimalSanitizer.sanitizeCoordinates('12h 34m 56s, +12° 34\' 56"');
console.log(result2.coordinates); // "12.582222, 12.582222"

// HMS/DMS format
const hmsSanitizer = new CoordinateSanitizer({ outputFormat: 'hms-dms' });
const result3 = hmsSanitizer.sanitizeCoordinates('12.5, 12.5');
console.log(result3.coordinates); // "12h 30m 0.000s, +12° 30' 0.000""
```

### Using Presets

```javascript
// Quick setup with presets
const aladinSanitizer = CoordinateSanitizer.createPreset('aladin');
const decimalSanitizer = CoordinateSanitizer.createPreset('decimal');
const looseSanitizer = CoordinateSanitizer.createPreset('loose');

const result = aladinSanitizer.sanitizeCoordinates('12h 34m 56s, +12° 34\' 56"');
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

### Script Tag

```html
<script src="path/to/coordinate-sanitizer.js"></script>
<script>
  const sanitizer = new CoordinateSanitizer();
  const result = sanitizer.sanitizeCoordinates('M31');
  console.log(result.coordinates);
</script>
```

### ES6 Modules

```javascript
import CoordinateSanitizer from 'coordinate-sanitizer';

const sanitizer = new CoordinateSanitizer();
const result = sanitizer.sanitizeCoordinates('12h 34m 56s, +12° 34\' 56"');
```

## TypeScript Support

The library includes complete TypeScript definitions:

```typescript
import CoordinateSanitizer, { 
  CoordinateSanitizerOptions, 
  SanitizationResult 
} from 'coordinate-sanitizer';

const options: CoordinateSanitizerOptions = {
  outputFormat: 'decimal',
  precision: 4,
  validateRanges: true
};

const sanitizer = new CoordinateSanitizer(options);
const result: SanitizationResult = sanitizer.sanitizeCoordinates('M31');
```

## Performance

The library is optimized for high-performance applications:

- **10,000+ coordinates/second** on modern hardware
- **Zero dependencies** - no external libraries
- **Efficient regex patterns** for fast parsing
- **Minimal memory footprint**
- **Batch processing support**

## Security

The library includes built-in security features:

- **Input sanitization** prevents script injection
- **Malicious content detection** blocks dangerous patterns
- **Safe parsing** with input validation
- **No eval() or dynamic code execution**

## Error Handling

The library provides detailed error messages for debugging:

```javascript
const result = sanitizer.sanitizeCoordinates('invalid input');
if (!result.isValid) {
  console.log(`Error: ${result.error}`);
  // Handle error appropriately
}
```

Common error types:
- Invalid coordinate format
- Out of range values (RA > 24h, DEC > ±90°)
- Malformed input strings
- Security violations

## Testing

Run the test suite:

```bash
npm test
```

Run examples:

```bash
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

# Run tests
npm test

# Run examples
npm run example
```

## Stats

- **Lines of code**: ~800
- **Test coverage**: 37 comprehensive tests
- **Performance**: 10,000+ coordinates/second
- **Bundle size**: Minimal (zero dependencies)
- **Formats supported**: 15+ input variations

## Changelog

### 1.0.1
- Initial release
- Support for multiple coordinate formats
- Range validation
- Security features
- TypeScript support
- Comprehensive test suite

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Projects

- [Aladin Lite](https://aladin.u-strasbg.fr/AladinLite/) - Sky atlas for the web
- [Voyager](https://www.starkeeper.it/) - Advanced astronomy software
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