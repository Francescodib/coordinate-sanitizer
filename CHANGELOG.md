# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2026-10-14

### Added
- Decimal commas, as written by software running on European locales: `05 35 16,820 -05 23 15,36`, `05h35m16,8s, +41d16m09,5s`, `83,82, -5,38`. A comma is still read as the RA/DEC separator first (`10,20` stays RA 10°, DEC 20°); the decimal reading is tried only when the input does not parse otherwise, so no input valid in 2.2.0 changes meaning.
- `parseRightAscension(input)` and `parseDeclination(input)`: parse a single RA or DEC value (decimal hours / decimal degrees, or `null`), for coordinates that come in separate fields. A comma between digits is always a decimal comma here; ranges are checked when `validateRanges` is on.

## [2.2.0] - 2026-10-13

### Added
- Coordinates without seconds: `12 30, +45 30`, `12h 30m, -05d 23m`, with optional decimal minutes (`12h 30.5m`). An explicit RA/DEC separator is required.
- Explicit unit suffix on decimal RA: `12.5h` is always hours and `187.5d` / `187.5°` always degrees, regardless of `raDecimalUnit`.
- `parseDesignations` option (default `false`): parses IAU-style J2000 designations such as `J053517.3-052328`, `SDSS J053517.30-052328.0` and `2MASS J05351730-0523280` (implied decimals) as coordinates. Designations are truncated, not rounded, so the position is only as accurate as the last digit.
- When loaded as a plain browser `<script>`, the library defines a global `CoordinateSanitizer`.

### Fixed
- Regression in 2.1.0: `Sh 2-155` (and any name whose letters are only h/m/s/d) was treated as malformed coordinates and rejected. Unit letters now count only right after a digit; the Sharpless catalog pattern also accepts the space form.
- Loading `src/index.js` as a plain `<script>` threw `ReferenceError: module is not defined`. The README example also pointed to a file that does not exist in the package.
- Input normalization used ASCII quotes where typographic quotes were intended, so `’` and `”` were not recognized as minute/second markers and every `'` was rewritten to `"`.
- Whitespace between a sign and its value (`- 45 00 00`, `− 45 00 00` with a Unicode minus) is now accepted.
- Values that round to zero no longer print a negative sign (`-0.000000`, `-00 00 00.000`).

## [2.1.1] - 2026-10-13

### Fixed
- `package.json` is now exposed in the `exports` map, so `require('coordinate-sanitizer/package.json')` no longer throws `ERR_PACKAGE_PATH_NOT_EXPORTED` (used by tooling to read the package version).

## [2.1.0] - 2026-10-13

### Changed (breaking)
- Minimum supported Node.js version raised from 18 (end-of-life) to 20; CI now tests Node 20, 22 and 24.
- The constructor validates its options: unknown `outputFormat` or `raDecimalUnit` throws a `TypeError`, a `precision` that is not an integer between 0 and 20 throws a `RangeError` (previously `toFixed` failed later, or an unknown format silently fell back to `aladin`). `options` is now frozen, matching its `readonly` type.
- Purely numeric input that cannot be parsed as coordinates (e.g. `1234`, `12h 30m`, `12.5h, 45`) now returns an error instead of being passed through as an object name.

### Fixed
- Unsigned decimal pairs such as `10, 20`, `10.5, 20` or `180, 45` were not recognized as coordinates and were returned as (mangled) object names with `isValid: true`.
- RA values rounding up to 24h (e.g. `23h 59m 59.9999s`, `359.9999999`) produced `24 00 00.000` / `360.000000`; they now wrap to `00 00 00.000` / `0.000000`.
- The "already-valid" shortcut bypassed range validation (`12 34 56.000, +95 34 56.000` was accepted) and ignored `precision` for decimal output. Input is now always fully parsed; `inputFormat: 'already-valid'` is reported when the canonical output equals the input, and such results now include `ra`/`dec` metadata. `isValidFormat()` follows the same rule.
- Space-separated parsing used the first six numbers and ignored the rest (`12 34 56.1 +12 34 56.7 garbage 99` was accepted). Extra components, non-unit text, and a signed RA are now rejected.
- Object names are returned as typed (trimmed, whitespace collapsed) instead of with quotes and separators rewritten by the internal normalization.
- Removed the `on\w+=` "event handler" pattern from the malicious-content check: it produced false positives and gave no real protection. Output must be escaped by the consumer regardless (see README, Security).

### Changed
- Internal refactoring: shared sexagesimal component parsing, carry normalization and formatting between RA/DEC and between the `aladin`/`hms-dms` formats.
- Tests migrated from a custom runner to the built-in `node:test` runner; added `test:watch` and `test:coverage` scripts and removed the `nodemon` dev dependency. 12 new regression tests.
- Publish workflow: removed OIDC debug steps, pinned npm to v11, added lint and type checks before publishing.
- The `version` script now stages only `CHANGELOG.md` instead of `git add -A`.

## [2.0.0] - 2026-06-11

### Changed (breaking)
- **Bare decimal RA input is now interpreted as degrees** (the astronomical convention and what the README always documented), no longer as hours. `'123.456, -12.345'` now correctly produces `"08 13 49.440, -12 20 42.000"`. Set the new `raDecimalUnit: 'hours'` option to restore the previous behaviour.
- **`decimal` output format now emits RA in degrees** (consistent with decimal input). With `raDecimalUnit: 'hours'` it emits hours, preserving round-trip stability in both configurations.
- Minimum supported Node.js version raised from 14 to 18 (matching the CI matrix).

### Fixed
- Sexagesimal minutes and seconds components are now validated: `12h 99m 99s` is rejected as malformed instead of being silently summed into the result. This applies to HMS/DMS, compact, and space-separated formats, regardless of the `validateRanges` option.
- Space-separated coordinate inputs that fail to parse (malformed components, out-of-range values) now return the parse error instead of being silently passed through as an "object name".
- `package.json` `exports` map: the `types` condition is now listed first, as required for TypeScript `moduleResolution: node16/nodenext/bundler` to pick up the definitions; the `module` field now points to a real ESM entry point.
- TypeScript definitions: `metadata` fields are now correctly optional, matching the runtime behaviour on error results.

### Added
- Native ESM entry point (`src/index.mjs`): `import CoordinateSanitizer from 'coordinate-sanitizer'` now works in Node.js without `createRequire`.
- `raDecimalUnit` option (`'degrees'` | `'hours'`) controlling the unit of bare decimal RA input/output.
- Labeled coordinate parsing: `RA 05 35 17.30 DEC -05 23 28.00`, `RA: 05:35:17, DEC: -05:23:28` (accepted in strict mode too, since labels are unambiguous).
- `parse(input)` method returning plain numeric values (`{ raHours, raDegrees, decDegrees }`) or `null`, for programmatic use without string formatting.
- ESLint (flat config) with `npm run lint`, now part of CI.
- TypeScript compile check of the type definitions (`npm run typecheck`), now part of CI; the previous definitions did not compile (illegal `export =` mixed with named exports) and have been rewritten using the canonical class + namespace pattern.
- 15 new unit tests and 4 new integration test rows covering all of the above.

## [1.0.5] - 2026-03-06

### Fixed
- Fixed `package.json` `exports` map: added `"import"`, `"node"`, and `"default"` conditions pointing to `./src/index.js` so modern bundlers (Turbopack, Vite, etc.) that resolve ESM conditions first can correctly locate the entry point.

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

## Planned
- Support for additional catalog formats
- Integration with popular astronomy libraries
- CLI tool for command-line usage
- Advanced coordinate system conversions (epochs, galactic frame)
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