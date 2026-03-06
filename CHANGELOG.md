# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.4] - 2026-03-06

### Fixed
- Implemented `strictMode` option that was previously documented but had no effect. In strict mode, compact (6-digit) HMS/DMS formats and space-separated coordinates without an explicit RA/DEC separator are rejected, requiring unambiguous input.
- Fixed floating point carry overflow in `decimalToHMS` and `decimalToDMS`: seconds could previously evaluate to `60.000` in edge cases, producing invalid output strings.
- `isValidFormat` now correctly detects already-valid input for all configured output formats (`decimal`, `hms-dms`), not only `aladin`. This avoids unnecessary re-parsing of valid strings.
- `formatHMSDMS` now zero-pads hours, minutes, and degree components for consistent output (e.g. `01h 05m 03.000s` instead of `1h 5m 3.000s`).
- `createPreset` now throws a descriptive `Error` when an unknown preset name is provided, instead of silently falling back to default options.
- Removed redundant nested conditional in `parseSpaceSeparatedCoordinates`.
- Removed misleading `"import"` field from `package.json` exports: the module uses CommonJS (`module.exports`) and is not an ES module.

### Changed
- TypeScript definitions updated: added `strictMode` to `CoordinateSanitizerOptions`, added `createPreset` static method signature with typed preset union and `@throws` annotation, resolved conflicting `export default` / `export =` declarations (now uses only `export =` for correct CommonJS interop).

### Added
- Comprehensive tests for `strictMode` behaviour across all affected code paths.
- Tests for floating point precision edge cases.
- Tests for `isValidFormat` with `decimal` and `hms-dms` output formats.
- Tests for `formatHMSDMS` zero-padding.
- Tests for `createPreset` error handling.

## [1.0.3] - 2025-01-03

### Fixed
- Fixed bug where negative declination coordinates starting with -00 (e.g., `-00 58 20.000`) would lose their negative sign and be converted to positive coordinates. The sign is now correctly preserved in all cases.
- Improved sign handling in coordinate formatting functions to ensure negative values are always correctly displayed.

### Changed
- Enhanced `dmsToDecimal` function to accept an optional `isNegative` parameter for explicit sign control.
- Updated `parseDEC` function to detect negative sign from the original string before parsing.
- Modified `formatAladin` and `formatHMSDMS` functions to always display explicit sign (+ or -) for declination values.

### Added
- Added comprehensive test cases for negative declination with -00 degrees in various formats.

## [1.0.0] - 2025-01-03

### Added
- Initial release of coordinate-sanitizer library
- Support for multiple coordinate input formats:
  - HMS/DMS format (`12h 34m 56s, +12° 34' 56"`)
  - Colon-separated format (`12:34:56, +12:34:56`)
  - Decimal format (`123.456, -12.345`)
  - Compact format (`123456, -123456`)
  - Space-separated format (`12 34 56 +12 34 56`)
  - Mixed formats
- Support for astronomical object names (M31, NGC 1234, etc.)
- Multiple output formats:
  - Aladin format (`12 34 56.000, +12 34 56.000`)
  - Decimal format (`12.582222, 12.582222`)
  - HMS/DMS format (`12h 34m 56.000s, +12° 34' 56.000"`)
- Range validation for RA (0-24h) and DEC (-90°/+90°)
- Security features:
  - Input sanitization
  - Malicious content detection
  - XSS prevention
- Unicode support for various symbols and separators
- Configurable precision for decimal output
- Preset configurations for common use cases
- Comprehensive error handling with detailed messages
- High-performance parsing optimized for batch processing
- Zero external dependencies
- Complete TypeScript definitions
- Full test coverage with 50+ test cases
- Extensive documentation and examples
- Browser and Node.js compatibility

### Security
- Protection against HTML/JavaScript injection
- Input validation and sanitization
- Safe parsing without eval() or dynamic code execution

### Performance
- Optimized regex patterns for fast parsing
- Efficient coordinate conversion algorithms
- Minimal memory footprint
- Batch processing support

### Documentation
- Complete API documentation
- 13 comprehensive usage examples
- TypeScript definitions
- Security guidelines
- Performance benchmarks

## [Unreleased]

### Planned
- Support for additional catalog formats
- Integration with popular astronomy libraries
- CLI tool for command-line usage
- Advanced coordinate system conversions
- Web-based coordinate converter tool
- Additional output formats (JSON, XML)
- Coordinate validation rules customization
- Logging and debugging features

---

## Release Notes

### Version 1.0.0

This is the initial stable release of the coordinate-sanitizer library. It provides a robust, secure, and performant solution for parsing and sanitizing astronomical coordinates in JavaScript applications.

**Key Highlights:**
- **Universal compatibility**: Works in both Node.js and browser environments
- **Security-first**: Built-in protection against common security vulnerabilities
- **Performance optimized**: Handles 10,000+ coordinates per second
- **Developer-friendly**: Complete TypeScript support and comprehensive documentation
- **Flexible**: Multiple input/output formats and configurable options

**Breaking Changes:**
- None (initial release)

**Migration Guide:**
- This is the first release, no migration required

**Known Issues:**
- None reported

**Dependencies:**
- Zero runtime dependencies
- Development dependencies: nodemon (for testing)

**Supported Environments:**
- Node.js: 14.0.0+
- Browsers: All modern browsers with ES6 support
- TypeScript: 4.0+

**Installation:**
```bash
npm install coordinate-sanitizer
```

**Basic Usage:**
```javascript
const CoordinateSanitizer = require('coordinate-sanitizer');
const sanitizer = new CoordinateSanitizer();
const result = sanitizer.sanitizeCoordinates('M31');
```

For detailed usage instructions, see the [README.md](README.md) file.