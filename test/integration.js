#!/usr/bin/env node

/**
 * Integration tests for coordinate-sanitizer
 *
 * These tests verify:
 *   1. Round-trip idempotency  – the output of any format can be re-parsed and
 *      is detected as already-valid, returning an identical string.
 *   2. Cross-format consistency – the same input parsed through all three output
 *      formats encodes the same sky position within floating-point tolerance.
 *   3. Known-object accuracy   – a curated set of real astronomical objects is
 *      parsed correctly and matches independently computed values.
 *   4. Negative DEC round-trips – coordinates with negative declination (including
 *      the -00° edge case) survive all output-format round-trips without sign loss.
 *   5. strictMode round-trips  – strictMode does not break idempotency.
 */

'use strict';

const CoordinateSanitizer = require('../src/index.js');

// ─── Minimal test runner ──────────────────────────────────────────────────────

class TestRunner {
    constructor() {
        this.tests  = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(description, fn) {
        this.tests.push({ description, fn });
    }

    async run() {
        console.log('Integration Tests – Coordinate Sanitizer');
        console.log('='.repeat(60));

        for (const { description, fn } of this.tests) {
            try {
                await fn();
                console.log(`+ ${description}`);
                this.passed++;
            } catch (error) {
                console.log(`- ${description}`);
                console.log(`  Error: ${error.message}`);
                this.failed++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`Results: ${this.passed} passed, ${this.failed} failed`);

        if (this.failed > 0) {
            console.log(`\nFailed: ${this.failed}`);
            process.exit(1);
        } else {
            console.log('\nAll integration tests passed!');
        }
    }

    assert(condition, message) {
        if (!condition) throw new Error(message || 'Assertion failed');
    }

    assertEqual(actual, expected, message) {
        if (actual !== expected)
            throw new Error(
                `${message || 'Values not equal'}: expected "${expected}", got "${actual}"`
            );
    }

    assertNear(actual, expected, tolerance, message) {
        const diff = Math.abs(actual - expected);
        if (diff > tolerance)
            throw new Error(
                `${message || 'Values not near enough'}: ` +
                `expected ${expected} ± ${tolerance}, got ${actual} (diff: ${diff})`
            );
    }
}

// ─── Output-string parsers ────────────────────────────────────────────────────

/**
 * Parse an aladin-format string "HH MM SS.SSS, ±DD MM SS.SSS"
 * @returns {{ ra_h: number, dec_deg: number }}
 */
function parseAladin(str) {
    const m = str.match(
        /^(\d{2})\s(\d{2})\s(\d{2}\.\d+),\s([+-])(\d{2})\s(\d{2})\s(\d{2}\.\d+)$/
    );
    if (!m) throw new Error(`Cannot parse aladin string: "${str}"`);
    const ra_h    = parseInt(m[1]) + parseInt(m[2]) / 60 + parseFloat(m[3]) / 3600;
    const sign    = m[4] === '-' ? -1 : 1;
    const dec_deg = sign * (parseInt(m[5]) + parseInt(m[6]) / 60 + parseFloat(m[7]) / 3600);
    return { ra_h, dec_deg };
}

/**
 * Parse a decimal-format string "RA_hours, DEC_degrees"
 * @returns {{ ra_h: number, dec_deg: number }}
 */
function parseDecimal(str) {
    const parts = str.split(',').map(s => s.trim());
    if (parts.length !== 2) throw new Error(`Cannot parse decimal string: "${str}"`);
    return { ra_h: parseFloat(parts[0]), dec_deg: parseFloat(parts[1]) };
}

/**
 * Parse an hms-dms-format string "HHh MMm SS.SSSs, ±DD° MM' SS.SSS\""
 * @returns {{ ra_h: number, dec_deg: number }}
 */
function parseHmsDms(str) {
    const m = str.match(
        /^(\d{2})h\s(\d{2})m\s(\d{2}\.\d+)s,\s([+-])(\d{2})°\s(\d{2})'\s(\d{2}\.\d+)"$/
    );
    if (!m) throw new Error(`Cannot parse hms-dms string: "${str}"`);
    const ra_h    = parseInt(m[1]) + parseInt(m[2]) / 60 + parseFloat(m[3]) / 3600;
    const sign    = m[4] === '-' ? -1 : 1;
    const dec_deg = sign * (parseInt(m[5]) + parseInt(m[6]) / 60 + parseFloat(m[7]) / 3600);
    return { ra_h, dec_deg };
}

/** Extract {ra_h, dec_deg} from the string produced by the given output format */
function extractCoords(str, fmt) {
    switch (fmt) {
        case 'aladin':  return parseAladin(str);
        case 'decimal': return parseDecimal(str);
        case 'hms-dms': return parseHmsDms(str);
        default: throw new Error(`Unknown format: ${fmt}`);
    }
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Maximum allowed deviation between independently computed values.
// The aladin/hms-dms formats display 3 decimal-place seconds, which gives a
// worst-case rounding of 0.0005″ ≈ 1.4e-7°. Using 1e-4° is generous.
const TOLERANCE_DEG = 1e-4;

const OUTPUT_FORMATS = ['aladin', 'decimal', 'hms-dms'];

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * Representative input formats used to exercise parsers.
 * All rows encode the same position: approximately RA=5h 35m 17.3s, DEC=-5° 23' 28"
 */
const INPUT_VARIANTS = [
    { label: 'HMS/DMS symbols',   value: "05h 35m 17.30s, -05° 23' 28.00\"" },
    { label: 'colon-separated',   value: '05:35:17.30, -05:23:28.00' },
    { label: 'decimal hours/deg', value: '5.5882, -5.3911' },
    { label: 'space-separated',   value: '05 35 17.30 -05 23 28.00' },
];

/**
 * Real astronomical objects with independently computed expected coordinates.
 * Expected values are computed directly from the HMS/DMS input strings using
 * the standard conversion formula, so the test verifies mathematical correctness
 * of the library's own conversion, not external catalog agreement.
 */
const KNOWN_OBJECTS = [
    {
        name:    'M42 – Orion Nebula',
        input:   "05h 35m 17.30s, -05° 23' 28.00\"",
        // RA:  5 + 35/60 + 17.30/3600  = 5.588139 h
        // DEC: -(5 + 23/60 + 28.00/3600) = -5.391111°
        ra_h:    5.588139,
        dec_deg: -5.391111,
    },
    {
        name:    'M31 – Andromeda Galaxy',
        input:   "00h 42m 44.30s, +41° 16' 09.00\"",
        // RA:  0 + 42/60 + 44.30/3600  = 0.712306 h
        // DEC: 41 + 16/60 + 9.00/3600  = 41.269167°
        ra_h:    0.712306,
        dec_deg: 41.269167,
    },
    {
        name:    'Polaris – North Star',
        input:   "02h 31m 49.09s, +89° 15' 50.80\"",
        // RA:  2 + 31/60 + 49.09/3600  = 2.530303 h
        // DEC: 89 + 15/60 + 50.80/3600 = 89.264111°
        ra_h:    2.530303,
        dec_deg: 89.264111,
    },
    {
        name:    'Vega',
        input:   "18h 36m 56.34s, +38° 47' 01.28\"",
        // RA:  18 + 36/60 + 56.34/3600  = 18.615650 h
        // DEC: 38 + 47/60 + 1.28/3600   = 38.783689°
        ra_h:    18.615650,
        dec_deg: 38.783689,
    },
    {
        name:    'Sirius',
        input:   "06h 45m 08.92s, -16° 42' 58.02\"",
        // RA:  6 + 45/60 + 8.92/3600    = 6.752478 h
        // DEC: -(16 + 42/60 + 58.02/3600) = -16.716117°
        ra_h:    6.752478,
        dec_deg: -16.716117,
    },
    {
        name:    'Betelgeuse',
        input:   "05h 55m 10.31s, +07° 24' 25.43\"",
        // RA:  5 + 55/60 + 10.31/3600   = 5.919531 h
        // DEC: 7 + 24/60 + 25.43/3600   = 7.407064°
        ra_h:    5.919531,
        dec_deg: 7.407064,
    },
    {
        name:    'Celestial South Pole',
        input:   "00h 00m 00.00s, -90° 00' 00.00\"",
        ra_h:    0.0,
        dec_deg: -90.0,
    },
    {
        name:    'Vernal Equinox',
        input:   "00h 00m 00.00s, +00° 00' 00.00\"",
        ra_h:    0.0,
        dec_deg: 0.0,
    },
];

/** Negative DEC cases that exercise the sign-preservation logic */
const NEG_DEC_CASES = [
    { label: '-00° edge case',  input: "16h 37m 13.00s, -00° 58' 20.00\"" },
    { label: '-45° mid-range',  input: "12h 00m 00.00s, -45° 30' 00.00\"" },
    { label: '-90° south pole', input: "00h 00m 00.00s, -90° 00' 00.00\"" },
];

// ─── Test suite ───────────────────────────────────────────────────────────────

const runner = new TestRunner();

// 1. Round-trip idempotency ---------------------------------------------------

for (const fmt of OUTPUT_FORMATS) {
    for (const { label, value } of INPUT_VARIANTS) {
        runner.test(`Round-trip [${fmt}]: ${label}`, () => {
            const sanitizer = new CoordinateSanitizer({ outputFormat: fmt });

            const first = sanitizer.sanitizeCoordinates(value);
            runner.assert(first.isValid,
                `First parse failed: ${first.error}`);
            runner.assert(
                first.metadata.inputFormat === 'coordinates' ||
                first.metadata.inputFormat === 'already-valid',
                `Expected "coordinates" or "already-valid", got "${first.metadata.inputFormat}"`
            );

            const second = sanitizer.sanitizeCoordinates(first.coordinates);
            runner.assert(second.isValid,
                `Re-parse of "${first.coordinates}" failed: ${second.error}`);
            runner.assertEqual(second.metadata.inputFormat, 'already-valid',
                `Re-parsed output should be "already-valid" for format "${fmt}", ` +
                `got "${second.metadata.inputFormat}" for input "${first.coordinates}"`);
            runner.assertEqual(second.coordinates, first.coordinates,
                `Round-trip not stable for format "${fmt}": ` +
                `"${first.coordinates}" → "${second.coordinates}"`);
        });
    }
}

// 2. Cross-format mathematical consistency ------------------------------------

for (const { label, value } of INPUT_VARIANTS) {
    runner.test(`Cross-format consistency: ${label}`, () => {
        const results = {};
        for (const fmt of OUTPUT_FORMATS) {
            const r = new CoordinateSanitizer({ outputFormat: fmt })
                .sanitizeCoordinates(value);
            runner.assert(r.isValid, `Parse failed for format "${fmt}": ${r.error}`);
            results[fmt] = extractCoords(r.coordinates, fmt);
        }

        // All three formats must encode the same RA
        runner.assertNear(results['aladin'].ra_h, results['decimal'].ra_h,
            TOLERANCE_DEG, `RA: aladin vs decimal (${label})`);
        runner.assertNear(results['aladin'].ra_h, results['hms-dms'].ra_h,
            TOLERANCE_DEG, `RA: aladin vs hms-dms (${label})`);

        // All three formats must encode the same DEC
        runner.assertNear(results['aladin'].dec_deg, results['decimal'].dec_deg,
            TOLERANCE_DEG, `DEC: aladin vs decimal (${label})`);
        runner.assertNear(results['aladin'].dec_deg, results['hms-dms'].dec_deg,
            TOLERANCE_DEG, `DEC: aladin vs hms-dms (${label})`);
    });
}

// 3. Known-object accuracy ----------------------------------------------------

for (const { name, input, ra_h, dec_deg } of KNOWN_OBJECTS) {
    runner.test(`Known object: ${name}`, () => {
        const sanitizer = new CoordinateSanitizer({ outputFormat: 'aladin' });
        const result = sanitizer.sanitizeCoordinates(input);
        runner.assert(result.isValid, `Parse failed: ${result.error}`);

        const computed = parseAladin(result.coordinates);
        runner.assertNear(computed.ra_h,    ra_h,    TOLERANCE_DEG,
            `${name}: RA (hours)`);
        runner.assertNear(computed.dec_deg, dec_deg, TOLERANCE_DEG,
            `${name}: DEC (degrees)`);
    });
}

// 4. Negative DEC round-trips -------------------------------------------------

for (const { label, input } of NEG_DEC_CASES) {
    runner.test(`Negative DEC round-trip: ${label}`, () => {
        for (const fmt of OUTPUT_FORMATS) {
            const sanitizer = new CoordinateSanitizer({ outputFormat: fmt });

            const first = sanitizer.sanitizeCoordinates(input);
            runner.assert(first.isValid,
                `First parse failed for format "${fmt}": ${first.error}`);
            runner.assert(first.metadata.dec.decimal < 0,
                `DEC should be negative (${label}, ${fmt}): ` +
                `got ${first.metadata.dec.decimal}`);

            const second = sanitizer.sanitizeCoordinates(first.coordinates);
            runner.assert(second.isValid,
                `Re-parse failed for format "${fmt}": ${second.error}`);
            runner.assertEqual(second.coordinates, first.coordinates,
                `Round-trip not stable for format "${fmt}" with ${label}`);

            // Verify sign is preserved in re-parsed output
            const coords = extractCoords(second.coordinates, fmt);
            runner.assert(coords.dec_deg < 0,
                `DEC sign lost after round-trip (${label}, ${fmt}): ` +
                `got ${coords.dec_deg}`);
        }
    });
}

// 5. strictMode round-trips ---------------------------------------------------

runner.test('strictMode: round-trip idempotency for all output formats', () => {
    const input = "12h 34m 56.78s, +12° 34' 56.78\"";
    for (const fmt of OUTPUT_FORMATS) {
        const sanitizer = new CoordinateSanitizer({ outputFormat: fmt, strictMode: true });

        const first = sanitizer.sanitizeCoordinates(input);
        runner.assert(first.isValid,
            `strictMode first parse failed (${fmt}): ${first.error}`);
        runner.assertEqual(first.metadata.inputFormat, 'coordinates',
            `Expected "coordinates", got "${first.metadata.inputFormat}" (${fmt})`);

        const second = sanitizer.sanitizeCoordinates(first.coordinates);
        runner.assert(second.isValid,
            `strictMode re-parse failed (${fmt}): ${second.error}`);
        runner.assertEqual(second.metadata.inputFormat, 'already-valid',
            `strictMode: re-parsed output should be "already-valid" (${fmt})`);
        runner.assertEqual(second.coordinates, first.coordinates,
            `strictMode: round-trip not stable (${fmt})`);
    }
});

// 6. Cross-format: metadata decimal values match formatted output --------------
//    Verifies that the .metadata.ra.decimal / .metadata.dec.decimal values
//    stored internally are consistent with the string that was formatted.

runner.test('Metadata decimal values consistent with formatted output', () => {
    const input = "05h 35m 17.30s, -05° 23' 28.00\"";
    for (const fmt of OUTPUT_FORMATS) {
        const sanitizer = new CoordinateSanitizer({ outputFormat: fmt });
        const result    = sanitizer.sanitizeCoordinates(input);
        runner.assert(result.isValid, `Parse failed (${fmt}): ${result.error}`);

        const meta    = result.metadata;
        const fromStr = extractCoords(result.coordinates, fmt);

        runner.assertNear(meta.ra.decimal, fromStr.ra_h, TOLERANCE_DEG,
            `RA metadata vs formatted string (${fmt})`);
        runner.assertNear(meta.dec.decimal, fromStr.dec_deg, TOLERANCE_DEG,
            `DEC metadata vs formatted string (${fmt})`);
    }
});

// ─── Run ──────────────────────────────────────────────────────────────────────

runner.run().catch(error => {
    console.error('Integration test runner failed:', error);
    process.exit(1);
});
