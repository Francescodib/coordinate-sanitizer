# Coordinate Sanitizer

A flexible and robust JavaScript library for parsing and sanitizing astronomical coordinates. Handles various coordinate formats and converts them to standardized formats suitable for astronomical applications.

## Features

- **Multiple Input Formats**: Supports HMS/DMS, decimal, and compact coordinate formats
- **Flexible Output**: Configurable output formats (Aladin, decimal, HMS/DMS)
- **Range Validation**: Optional validation of RA (0-24h) and DEC (-90°/+90°) ranges
- **Configurable**: Customizable precision and validation options
- **High Performance**: Optimized for batch processing
- **Zero Dependencies**: Lightweight with no external dependencies
- **Universal**: Works in Node.js and browsers

## Installation

```bash
npm install coordinate-sanitizer
```

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

## Supported Input Formats

### Coordinate Formats
- **HMS/DMS**: `12h 34m 56.78s, +12° 34' 56.78"`
- **Colon separated**: `12:34:56.78, +12:34:56.78`
- **Decimal**: `123.456, -12.345`
- **Compact**: `123456, -123456`

### Object Names
- **Messier objects**: `M31`, `M42`
- **NGC objects**: `NGC 1234`, `NGC 7000`
- **Any string**: Passed through unchanged if not recognized as coordinates

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

#### `static getSupportedFormats()`

Returns information about supported input and output formats.

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

### Custom Precision

```javascript
const sanitizer = new CoordinateSanitizer({ 
  outputFormat: 'decimal', 
  precision: 2 
});

const result = sanitizer.sanitizeCoordinates('12h 34m 56.123s, +12° 34\' 56.123"');
console.log(result.coordinates); // "12.58, 12.58"
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

### Integration with Astronomical Software

```javascript
class TelescopeController {
  constructor() {
    this.sanitizer = new CoordinateSanitizer({
      outputFormat: 'aladin',
      validateRanges: true
    });
  }

  goto(target) {
    const result = this.sanitizer.sanitizeCoordinates(target);
    
    if (!result.isValid) {
      throw new Error(`Invalid target: ${result.error}`);
    }

    // Send to telescope
    this.sendToTelescope(result.coordinates);
  }

  sendToTelescope(coordinates) {
    // Implementation depends on telescope API
    console.log(`Slewing to: ${coordinates}`);
  }
}
```

## Browser Usage

```html
<script src="path/to/coordinate-sanitizer.js"></script>
<script>
  const sanitizer = new CoordinateSanitizer();
  const result = sanitizer.sanitizeCoordinates('M31');
  console.log(result.coordinates);
</script>
```

Or with ES6 modules:

```javascript
import CoordinateSanitizer from 'coordinate-sanitizer';

const sanitizer = new CoordinateSanitizer();
const result = sanitizer.sanitizeCoordinates('12h 34m 56s, +12° 34\' 56"');
```

## Performance

The library is optimized for high-performance applications:

- **~10,000 coordinates/second** on modern hardware
- **Zero dependencies** - no external libraries
- **Efficient regex patterns** for fast parsing
- **Minimal memory footprint**

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
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Related Projects

- [Aladin Lite](https://aladin.u-strasbg.fr/AladinLite/) - Sky atlas for the web
- [Voyager](https://www.starkeeper.it/) - Advanced astronomy software
- [Astropy](https://www.astropy.org/) - Python astronomy library

## Support

- [Documentation](https://github.com/yourusername/coordinate-sanitizer#readme)
- [Issue Tracker](https://github.com/yourusername/coordinate-sanitizer/issues)
- [Discussions](https://github.com/yourusername/coordinate-sanitizer/discussions)