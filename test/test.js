#!/usr/bin/env node

const { test } = require('node:test');
const assert = require('node:assert/strict');
const CoordinateSanitizer = require('../src/index.js');

// Assertion helpers not covered by node:assert
function assertContains(haystack, needle, message) {
    assert.ok(
        haystack.includes(needle),
        `${message || 'String not found'}: "${needle}" not found in "${haystack}"`
    );
}


// Basic constructor tests
test('Should create sanitizer with default options', () => {
    const sanitizer = new CoordinateSanitizer();
    assert.ok(sanitizer.options.outputFormat === 'aladin');
    assert.ok(sanitizer.options.precision === 6);
    assert.ok(sanitizer.options.validateRanges === true);
    assert.ok(sanitizer.options.strictMode === false);
});

test('Should create sanitizer with custom options', () => {
    const sanitizer = new CoordinateSanitizer({
        outputFormat: 'decimal',
        precision: 4,
        validateRanges: false,
        strictMode: true
    });
    assert.ok(sanitizer.options.outputFormat === 'decimal');
    assert.ok(sanitizer.options.precision === 4);
    assert.ok(sanitizer.options.validateRanges === false);
    assert.ok(sanitizer.options.strictMode === true);
});

// Input validation tests
test('Should reject null input', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates(null);
    assert.ok(!result.isValid);
    assertContains(result.error, 'non-empty string');
});

test('Should reject undefined input', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates(undefined);
    assert.ok(!result.isValid);
    assertContains(result.error, 'non-empty string');
});

test('Should reject empty string input', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('');
    assert.ok(!result.isValid);
});

test('Should reject non-string input', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates(123);
    assert.ok(!result.isValid);
});

// Security tests
test('Should reject malicious HTML content', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('<script>alert("xss")</script>');
    assert.ok(!result.isValid);
    assertContains(result.error, 'malicious');
});

test('Should reject JavaScript protocol', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('javascript:alert(1)');
    assert.ok(!result.isValid);
    assertContains(result.error, 'malicious');
});

// Object name tests
test('Should pass through Messier objects', () => {
    const sanitizer = new CoordinateSanitizer();
    const inputs = ['M31', 'M 42', 'M1', 'M110'];
    
    inputs.forEach(input => {
        const result = sanitizer.sanitizeCoordinates(input);
        assert.ok(result.isValid);
        assert.strictEqual(result.coordinates, input);
        assert.ok(result.metadata.inputFormat === 'object-name');
    });
});

test('Should pass through NGC objects', () => {
    const sanitizer = new CoordinateSanitizer();
    const inputs = ['NGC 1234', 'NGC1234', 'NGC 7000'];
    
    inputs.forEach(input => {
        const result = sanitizer.sanitizeCoordinates(input);
        assert.ok(result.isValid);
        assert.strictEqual(result.coordinates, input);
        assert.ok(result.metadata.inputFormat === 'object-name');
    });
});

test('Should pass through other catalog objects', () => {
    const sanitizer = new CoordinateSanitizer();
    const inputs = ['IC 1396', 'HD 209458', 'HIP 27989', 'SAO 123456'];
    
    inputs.forEach(input => {
        const result = sanitizer.sanitizeCoordinates(input);
        assert.ok(result.isValid);
        assert.strictEqual(result.coordinates, input);
        assert.ok(result.metadata.inputFormat === 'object-name');
    });
});

test('Should pass through named stars', () => {
    const sanitizer = new CoordinateSanitizer();
    const inputs = ['ALPHA CENTAURI', '51 Eri', 'R And', 'Polaris'];
    
    inputs.forEach(input => {
        const result = sanitizer.sanitizeCoordinates(input);
        assert.ok(result.isValid);
        assert.strictEqual(result.coordinates, input);
        assert.ok(result.metadata.inputFormat === 'object-name');
    });
});

// HMS/DMS coordinate parsing tests
test('Should parse standard HMS/DMS format', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12h 34m 56.78s, +12° 34\' 56.78"');
    assert.ok(result.isValid);
    assertContains(result.coordinates, '12 34 56.780');
    assertContains(result.coordinates, '+12 34 56.780');
    assert.ok(result.metadata.inputFormat === 'coordinates');
});

test('Should parse colon-separated coordinates', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12:34:56.78, +12:34:56.78');
    assert.ok(result.isValid);
    assertContains(result.coordinates, '12 34 56.780');
    assertContains(result.coordinates, '+12 34 56.780');
});

test('Should parse decimal coordinates', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12.5, -45.75');
    assert.ok(result.isValid);
    assert.ok(result.metadata.inputFormat === 'coordinates');
});

test('Should parse space-separated coordinates', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12 34 56.7 -45 12 34.5');
    assert.ok(result.isValid);
    assert.ok(result.metadata.inputFormat === 'coordinates');
});

test('Should parse compact coordinates', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('123456, -123456');
    assert.ok(result.isValid);
    assert.ok(result.metadata.inputFormat === 'coordinates');
});

// Range validation tests
test('Should reject RA > 24 hours', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('25h 00m 00s, +00° 00\' 00"');
    assert.ok(!result.isValid);
    assertContains(result.error, 'RA out of range');
});

test('Should reject negative RA', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('-1h 00m 00s, +00° 00\' 00"');
    assert.ok(!result.isValid, 'Should reject negative RA');
    assert.ok(result.error && result.error.length > 0, 'Should provide error message');
});

test('Should reject DEC > 90 degrees', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12h 00m 00s, +95° 00\' 00"');
    assert.ok(!result.isValid);
    assertContains(result.error, 'DEC out of range');
});

test('Should reject DEC < -90 degrees', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12h 00m 00s, -95° 00\' 00"');
    assert.ok(!result.isValid);
    assertContains(result.error, 'DEC out of range');
});

test('Should accept valid coordinate ranges', () => {
    const sanitizer = new CoordinateSanitizer();
    
    const result1 = sanitizer.sanitizeCoordinates('0h 00m 00s, +90° 00\' 00"');
    assert.ok(result1.isValid);
    
    const result2 = sanitizer.sanitizeCoordinates('23h 59m 59s, -90° 00\' 00"');
    assert.ok(result2.isValid);
});

test('Should skip range validation when disabled', () => {
    const sanitizer = new CoordinateSanitizer({ validateRanges: false });
    const result = sanitizer.sanitizeCoordinates('25h 00m 00s, +95° 00\' 00"');
    assert.ok(result.isValid);
});

// Output format tests
test('Should output Aladin format by default', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12h 00m 00s, +12° 00\' 00"');
    assert.ok(result.isValid);
    assert.strictEqual(result.coordinates, '12 00 00.000, +12 00 00.000');
});

test('Should output decimal format when requested', () => {
    const sanitizer = new CoordinateSanitizer({ outputFormat: 'decimal' });
    const result = sanitizer.sanitizeCoordinates('12h 00m 00s, +12° 00\' 00"');
    assert.ok(result.isValid);
    // Decimal output is in degrees: RA 12h = 180°
    assertContains(result.coordinates, '180.000000');
    assertContains(result.coordinates, '12.000000');
});

test('Should output HMS/DMS format when requested', () => {
    const sanitizer = new CoordinateSanitizer({ outputFormat: 'hms-dms' });
    const result = sanitizer.sanitizeCoordinates('180, +12');
    assert.ok(result.isValid);
    // RA 180° = 12h
    assertContains(result.coordinates, '12h');
    assertContains(result.coordinates, '12°');
});

test('Should respect custom precision', () => {
    const sanitizer = new CoordinateSanitizer({ 
        outputFormat: 'decimal', 
        precision: 2 
    });
    const result = sanitizer.sanitizeCoordinates('12h 34m 56.123s, +12° 34\' 56.123"');
    assert.ok(result.isValid);
    // RA 12h34m56.123s = 188.73° at 2-digit precision; DEC = 12.58°
    assertContains(result.coordinates, '188.73');
    assertContains(result.coordinates, '12.58');
});

// Edge cases
test('Should handle negative declinations correctly', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12h 00m 00s, -12° 00\' 00"');
    assert.ok(result.isValid);
    assertContains(result.coordinates, '-12 00 00.000');
});

test('Should handle negative declination with -00 degrees correctly', () => {
    const sanitizer = new CoordinateSanitizer();
    // Test case from bug report
    const result = sanitizer.sanitizeCoordinates('16 37 13.000, -00 58 20.000');
    assert.ok(result.isValid, 'Should parse coordinates with -00 degrees');
    assertContains(result.coordinates, '16 37 13.000', 'RA should be correct');
    assertContains(result.coordinates, '-00 58 20.000', 'DEC should preserve negative sign');
    assert.ok(result.coordinates.includes('-00') || result.coordinates.includes('- 00'), 'Should contain negative sign for -00 degrees');
});

test('Should handle negative declination -00 in various formats', () => {
    const sanitizer = new CoordinateSanitizer();

    // Space-separated format
    const result1 = sanitizer.sanitizeCoordinates('16 37 13, -00 58 20');
    assert.ok(result1.isValid);
    assert.ok(result1.metadata.dec.decimal < 0, 'Decimal should be negative');

    // HMS/DMS format with symbols
    const result2 = sanitizer.sanitizeCoordinates('16h 37m 13s, -00° 58\' 20"');
    assert.ok(result2.isValid);
    assert.ok(result2.metadata.dec.decimal < 0, 'Decimal should be negative');

    // Colon-separated format
    const result3 = sanitizer.sanitizeCoordinates('16:37:13, -00:58:20');
    assert.ok(result3.isValid);
    assert.ok(result3.metadata.dec.decimal < 0, 'Decimal should be negative');
});

test('Should handle zero coordinates', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('0h 00m 00s, +00° 00\' 00"');
    assert.ok(result.isValid);
    assertContains(result.coordinates, '00 00 00.000');
    assertContains(result.coordinates, '+00 00 00.000');
});

test('Should handle various separators', () => {
    const sanitizer = new CoordinateSanitizer();
    const separators = [',', ';', '·', '•'];
    
    separators.forEach(sep => {
        const input = `12h 00m 00s${sep} +12° 00' 00"`;
        const result = sanitizer.sanitizeCoordinates(input);
        assert.ok(result.isValid, `Should handle separator: ${sep}`);
    });
});

test('Should handle Unicode symbols', () => {
    const sanitizer = new CoordinateSanitizer();
    const inputs = [
        '12h 34m 56s · +12° 34′ 56″',
        '12h 34m 56s • +12° 34′ 56″',
        '12h 34m 56s, +12° 34′ 56″'
    ];
    
    inputs.forEach(input => {
        const result = sanitizer.sanitizeCoordinates(input);
        assert.ok(result.isValid, `Should handle Unicode in: ${input}`);
    });
});

// Static method tests
test('Should provide supported formats', () => {
    const formats = CoordinateSanitizer.getSupportedFormats();
    assert.ok(Array.isArray(formats.input));
    assert.ok(Array.isArray(formats.output));
    assert.ok(formats.output.includes('aladin'));
    assert.ok(formats.output.includes('decimal'));
    assert.ok(formats.output.includes('hms-dms'));
});

test('Should create presets correctly', () => {
    const aladinPreset = CoordinateSanitizer.createPreset('aladin');
    assert.strictEqual(aladinPreset.options.outputFormat, 'aladin');
    assert.ok(aladinPreset.options.validateRanges === true);
    
    const decimalPreset = CoordinateSanitizer.createPreset('decimal');
    assert.strictEqual(decimalPreset.options.outputFormat, 'decimal');
    assert.strictEqual(decimalPreset.options.precision, 6);
    
    const loosePreset = CoordinateSanitizer.createPreset('loose');
    assert.ok(loosePreset.options.validateRanges === false);
    
    const strictPreset = CoordinateSanitizer.createPreset('strict');
    assert.ok(strictPreset.options.strictMode === true);
});

// Performance test
test('Should handle large number of coordinates efficiently', () => {
    const sanitizer = new CoordinateSanitizer();
    const testCoords = [
        '12h 34m 56s, +12° 34\' 56"',
        'M31',
        '188.5, +12.25',
        '05h 35m 17.3s, -05° 23\' 14"'
    ];
    
    const iterations = 250; // Total 1000 operations
    const start = Date.now();
    
    for (let i = 0; i < iterations; i++) {
        testCoords.forEach(coord => {
            sanitizer.sanitizeCoordinates(coord);
        });
    }
    
    const elapsed = Date.now() - start;
    const totalOps = iterations * testCoords.length;
    
    assert.ok(elapsed < 2000, `Should process ${totalOps} coordinates in <2s (took ${elapsed}ms)`);
    console.log(`  Performance: ${elapsed}ms for ${totalOps} coordinates`);
});

// Real astronomical coordinates
test('Should handle real astronomical coordinates', () => {
    const sanitizer = new CoordinateSanitizer();
    
    const realCoords = [
        { name: 'M31', coord: '00h 42m 44.3s, +41° 16\' 09"' },
        { name: 'M42', coord: '05h 35m 17.3s, -05° 23\' 14"' },
        { name: 'Polaris', coord: '02h 31m 49s, +89° 15\' 51"' },
        { name: 'Vega', coord: '18h 36m 56.3s, +38° 47\' 01"' }
    ];
    
    realCoords.forEach(({ name, coord }) => {
        const result = sanitizer.sanitizeCoordinates(coord);
        assert.ok(result.isValid, `Should parse ${name} coordinates`);
        assert.ok(result.metadata.inputFormat === 'coordinates');
    });
});

// Error handling
test('Should provide meaningful error messages', () => {
    const sanitizer = new CoordinateSanitizer();
    
    // Test for invalid RA/DEC ranges
    const result1 = sanitizer.sanitizeCoordinates('25h 00m 00s, +00° 00\' 00"');
    assert.ok(!result1.isValid, 'Should reject invalid RA > 24h');
    assert.ok(result1.error && result1.error.length > 0, 'Should provide error message');
    
    const result2 = sanitizer.sanitizeCoordinates('12h 00m 00s, +95° 00\' 00"');
    assert.ok(!result2.isValid, 'Should reject invalid DEC > 90°');
    assert.ok(result2.error && result2.error.length > 0, 'Should provide error message');
    
    // Test with malicious input
    const result3 = sanitizer.sanitizeCoordinates('<script>alert("test")</script>');
    assert.ok(!result3.isValid, 'Should reject malicious input');
    assert.ok(result3.error && result3.error.length > 0, 'Should provide error message');
});

// Integration tests
test('Should work with mixed coordinate formats', () => {
    const sanitizer = new CoordinateSanitizer();
    
    const mixedInputs = [
        '12h 34m 56s, +12:34:56',
        '12:34:56, +12° 34\' 56"',
        '12.5, +12° 30\' 00"'
    ];
    
    mixedInputs.forEach(input => {
        const result = sanitizer.sanitizeCoordinates(input);
        assert.ok(result.isValid, `Should handle mixed format: ${input}`);
    });
});

// strictMode tests
test('strictMode: should reject space-separated coordinates', () => {
    const sanitizer = new CoordinateSanitizer({ strictMode: true });
    const result = sanitizer.sanitizeCoordinates('12 34 56.7 -45 12 34.5');
    assert.ok(!result.isValid, 'Strict mode should reject space-separated coordinates');
    assertContains(result.error, 'Strict mode');
});

test('strictMode: should reject compact HMS/DMS format', () => {
    const sanitizer = new CoordinateSanitizer({ strictMode: true });
    const result = sanitizer.sanitizeCoordinates('123456, -123456');
    assert.ok(!result.isValid, 'Strict mode should reject compact format');
});

test('strictMode: should accept standard HMS/DMS format', () => {
    const sanitizer = new CoordinateSanitizer({ strictMode: true });
    const result = sanitizer.sanitizeCoordinates('12h 34m 56.78s, +12° 34\' 56.78"');
    assert.ok(result.isValid, 'Strict mode should accept HMS/DMS with explicit separator');
    assert.strictEqual(result.metadata.inputFormat, 'coordinates');
});

test('strictMode: should accept colon-separated format', () => {
    const sanitizer = new CoordinateSanitizer({ strictMode: true });
    const result = sanitizer.sanitizeCoordinates('12:34:56.78, +12:34:56.78');
    assert.ok(result.isValid, 'Strict mode should accept colon-separated format');
});

test('strictMode: should accept decimal format', () => {
    const sanitizer = new CoordinateSanitizer({ strictMode: true });
    const result = sanitizer.sanitizeCoordinates('12.5, -45.75');
    assert.ok(result.isValid, 'Strict mode should accept decimal format');
    assert.strictEqual(result.metadata.inputFormat, 'coordinates');
});

test('strictMode: preset should enable strict mode', () => {
    const sanitizer = CoordinateSanitizer.createPreset('strict');
    assert.ok(sanitizer.options.strictMode === true, 'Strict preset should set strictMode');
    assert.ok(sanitizer.options.validateRanges === true, 'Strict preset should enable validation');
    const result = sanitizer.sanitizeCoordinates('12 34 56.7 -45 12 34.5');
    assert.ok(!result.isValid, 'Strict preset should reject space-separated coordinates');
});

// Floating point precision tests
test('Should not produce seconds >= 60 due to floating point', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('23h 59m 59.9999s, +89° 59\' 59.9999"');
    assert.ok(result.isValid, 'Should parse edge case coordinates');
    assert.ok(
        !result.coordinates.includes(' 60.'),
        'Seconds should not overflow to 60 in output: ' + result.coordinates
    );
});

test('Should handle decimal-to-HMS conversion without FP artifacts', () => {
    const sanitizer = new CoordinateSanitizer({ outputFormat: 'decimal' });
    const result = sanitizer.sanitizeCoordinates('12h 00m 00s, +45° 00\' 00"');
    assert.ok(result.isValid);
    assertContains(result.coordinates, '180.000000');
    assertContains(result.coordinates, '45.000000');
});

// isValidFormat for non-aladin output formats
test('Should detect already-valid decimal format', () => {
    const sanitizer = new CoordinateSanitizer({ outputFormat: 'decimal' });
    const result = sanitizer.sanitizeCoordinates('12.500000, -45.750000');
    assert.ok(result.isValid, 'Should accept already-valid decimal format');
    assert.strictEqual(result.metadata.inputFormat, 'already-valid');
    assert.strictEqual(result.coordinates, '12.500000, -45.750000');
});

test('Should detect already-valid hms-dms format', () => {
    const sanitizer = new CoordinateSanitizer({ outputFormat: 'hms-dms' });
    const result = sanitizer.sanitizeCoordinates('12h 34m 56.780s, +12° 34\' 56.780"');
    assert.ok(result.isValid, 'Should accept already-valid hms-dms format');
    assert.strictEqual(result.metadata.inputFormat, 'already-valid');
});

// formatHMSDMS padding
test('formatHMSDMS should zero-pad single-digit components', () => {
    const sanitizer = new CoordinateSanitizer({ outputFormat: 'hms-dms' });
    const result = sanitizer.sanitizeCoordinates('1h 5m 3s, +1° 5\' 3"');
    assert.ok(result.isValid, 'Should parse single-digit coordinate components');
    assertContains(result.coordinates, '01h', 'Hours should be zero-padded');
    assertContains(result.coordinates, '05m', 'Minutes should be zero-padded');
    assertContains(result.coordinates, '+01°', 'DEC degrees should be zero-padded');
    assertContains(result.coordinates, "05'", 'DEC minutes should be zero-padded');
});

// createPreset error handling
test('createPreset should throw for unknown preset name', () => {
    let threw = false;
    try {
        CoordinateSanitizer.createPreset('nonexistent');
    } catch (e) {
        threw = true;
        assertContains(e.message, 'Unknown preset');
        assertContains(e.message, 'nonexistent');
    }
    assert.ok(threw, 'createPreset should throw an Error for unknown preset');
});

test('createPreset should list available presets in error message', () => {
    let errorMessage = '';
    try {
        CoordinateSanitizer.createPreset('bad');
    } catch (e) {
        errorMessage = e.message;
    }
    assert.ok(errorMessage.includes('aladin'), 'Error should list available presets');
    assert.ok(errorMessage.includes('strict'), 'Error should list available presets');
});

// Decimal RA unit tests
test('Decimal RA should be interpreted as degrees by default', () => {
    const sanitizer = new CoordinateSanitizer();
    // README example: 123.456° = 8h 13m 49.44s
    const result = sanitizer.sanitizeCoordinates('123.456, -12.345');
    assert.ok(result.isValid, `Should accept decimal degrees RA: ${result.error}`);
    assert.strictEqual(result.coordinates, '08 13 49.440, -12 20 42.000');
});

test('Decimal RA up to 360 degrees should be accepted', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('359.999, +00 00 00');
    assert.ok(result.isValid, `Should accept RA near 360°: ${result.error}`);

    const outOfRange = sanitizer.sanitizeCoordinates('360.5, +00 00 00');
    assert.ok(!outOfRange.isValid, 'Should reject RA >= 360°');
});

test('raDecimalUnit "hours" should interpret decimal RA as hours', () => {
    const sanitizer = new CoordinateSanitizer({ raDecimalUnit: 'hours' });
    const result = sanitizer.sanitizeCoordinates('12.5, -45.75');
    assert.ok(result.isValid);
    assertContains(result.coordinates, '12 30 00.000');
});

test('raDecimalUnit "hours" decimal output should round-trip', () => {
    const sanitizer = new CoordinateSanitizer({
        outputFormat: 'decimal',
        raDecimalUnit: 'hours'
    });
    const result = sanitizer.sanitizeCoordinates('12h 30m 00s, -45° 45\' 00"');
    assert.ok(result.isValid);
    assertContains(result.coordinates, '12.500000');
});

// Sexagesimal component validation tests
test('Should reject minutes >= 60 in RA', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12h 60m 00s, +12° 00\' 00"');
    assert.ok(!result.isValid, 'Should reject 60 minutes in RA');
    assertContains(result.error, 'minutes out of range');
});

test('Should reject seconds >= 60 in DEC', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12h 00m 00s, +12° 00\' 75"');
    assert.ok(!result.isValid, 'Should reject 75 seconds in DEC');
    assertContains(result.error, 'seconds out of range');
});

test('Should reject invalid components in space-separated format', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12 99 99 +12 99 99');
    assert.ok(!result.isValid, 'Should reject 99 minutes/seconds');
});

test('Should reject invalid components even with validateRanges disabled', () => {
    const sanitizer = new CoordinateSanitizer({ validateRanges: false });
    const result = sanitizer.sanitizeCoordinates('12h 75m 00s, +12° 00\' 00"');
    assert.ok(!result.isValid, '75 minutes is malformed notation, not a range issue');
});

// Labeled RA/DEC format tests
test('Should parse labeled coordinates without separator', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('RA 05 35 17.30 DEC -05 23 28.00');
    assert.ok(result.isValid, `Should parse labeled format: ${result.error}`);
    assertContains(result.coordinates, '05 35 17.300');
    assertContains(result.coordinates, '-05 23 28.000');
});

test('Should parse labeled coordinates with colons and comma', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('RA: 05:35:17.30, DEC: -05:23:28.00');
    assert.ok(result.isValid, `Should parse labeled colon format: ${result.error}`);
    assertContains(result.coordinates, '05 35 17.300');
    assertContains(result.coordinates, '-05 23 28.000');
});

test('Labeled coordinates should be accepted in strict mode', () => {
    const sanitizer = new CoordinateSanitizer({ strictMode: true });
    const result = sanitizer.sanitizeCoordinates('RA 05 35 17.30 DEC -05 23 28.00');
    assert.ok(result.isValid, 'Labels are unambiguous, allowed in strict mode');
});

// parse() method tests
test('parse() should return numeric coordinate values', () => {
    const sanitizer = new CoordinateSanitizer();
    const parsed = sanitizer.parse('05h 35m 17.30s, -05° 23\' 28.00"');
    assert.ok(parsed !== null, 'parse() should not return null for valid coordinates');
    assert.ok(Math.abs(parsed.raHours - 5.588139) < 1e-4, `raHours: ${parsed.raHours}`);
    assert.ok(Math.abs(parsed.raDegrees - 83.822083) < 1e-3, `raDegrees: ${parsed.raDegrees}`);
    assert.ok(Math.abs(parsed.decDegrees - (-5.391111)) < 1e-4, `decDegrees: ${parsed.decDegrees}`);
});

test('parse() should return null for object names', () => {
    const sanitizer = new CoordinateSanitizer();
    assert.ok(sanitizer.parse('M31') === null, 'Object name should return null');
});

test('parse() should return null for invalid input', () => {
    const sanitizer = new CoordinateSanitizer();
    assert.ok(sanitizer.parse('25h 00m 00s, +95° 00\' 00"') === null);
    assert.ok(sanitizer.parse('') === null);
});

test('parse() should work on already-valid input', () => {
    const sanitizer = new CoordinateSanitizer();
    const parsed = sanitizer.parse('12 30 00.000, +45 00 00.000');
    assert.ok(parsed !== null, 'Already-valid aladin string should be parseable');
    assert.ok(Math.abs(parsed.raHours - 12.5) < 1e-6, `raHours: ${parsed.raHours}`);
    assert.ok(Math.abs(parsed.decDegrees - 45) < 1e-6, `decDegrees: ${parsed.decDegrees}`);
});

// Regression: unsigned decimal pairs were passed through as object names
test('Should parse unsigned decimal pairs as coordinates', () => {
    const sanitizer = new CoordinateSanitizer({ outputFormat: 'decimal' });
    for (const [input, expected] of [
        ['10, 20', '10.000000, 20.000000'],
        ['10.5, 20', '10.500000, 20.000000'],
        ['180 , 45', '180.000000, 45.000000'],
    ]) {
        const result = sanitizer.sanitizeCoordinates(input);
        assert.ok(result.isValid, `${input}: ${result.error}`);
        assert.strictEqual(result.metadata.inputFormat, 'coordinates', input);
        assert.strictEqual(result.coordinates, expected, input);
    }
    assert.ok(!sanitizer.sanitizeCoordinates('360, 0').isValid, 'RA 360° is out of range');
});

test('Should reject purely numeric input that is not parseable', () => {
    const sanitizer = new CoordinateSanitizer();
    for (const input of ['1234', '12h 30m', '12 30 45', '1, 2, 3']) {
        const result = sanitizer.sanitizeCoordinates(input);
        assert.ok(!result.isValid, `${input} should not be passed through`);
    }
});

// Regression: RA rounding up to 24h produced "24 00 00.000" / "360.000000"
test('Should wrap RA rounding at 24h to 0h', () => {
    const aladin = new CoordinateSanitizer();
    const decimal = new CoordinateSanitizer({ outputFormat: 'decimal' });
    const hmsdms = new CoordinateSanitizer({ outputFormat: 'hms-dms' });
    for (const input of ['23h 59m 59.9999s, +00 00 00', '359.9999999, 0']) {
        assertContains(aladin.sanitizeCoordinates(input).coordinates, '00 00 00.000,', input);
        assertContains(hmsdms.sanitizeCoordinates(input).coordinates, '00h 00m 00.000s,', input);
        assertContains(decimal.sanitizeCoordinates(input).coordinates, '0.000000,', input);
    }
    const hours = new CoordinateSanitizer({ outputFormat: 'decimal', raDecimalUnit: 'hours' });
    assert.strictEqual(hours.sanitizeCoordinates('23.99999999, 0').coordinates, '0.000000, 0.000000');
});

// Regression: already-valid shortcut skipped range validation and precision
test('Already-valid detection should not bypass range validation', () => {
    const sanitizer = new CoordinateSanitizer();
    assert.ok(!sanitizer.sanitizeCoordinates('12 34 56.000, +95 34 56.000').isValid);
    const decimal = new CoordinateSanitizer({ outputFormat: 'decimal' });
    assert.ok(!decimal.sanitizeCoordinates('400.000000, 95.000000').isValid);
});

test('Already-valid detection should honour precision', () => {
    const sanitizer = new CoordinateSanitizer({ outputFormat: 'decimal', precision: 2 });
    const result = sanitizer.sanitizeCoordinates('1.123456, 2.123456');
    assert.strictEqual(result.coordinates, '1.12, 2.12');
    assert.strictEqual(result.metadata.inputFormat, 'coordinates');
    assert.strictEqual(sanitizer.sanitizeCoordinates('1.12, 2.12').metadata.inputFormat, 'already-valid');
});

test('Already-valid results should carry ra/dec metadata', () => {
    const result = new CoordinateSanitizer().sanitizeCoordinates('12 30 00.000, +45 00 00.000');
    assert.strictEqual(result.metadata.inputFormat, 'already-valid');
    assert.ok(Math.abs(result.metadata.ra.decimal - 12.5) < 1e-9);
    assert.ok(Math.abs(result.metadata.dec.decimal - 45) < 1e-9);
});

test('isValidFormat should require canonical, in-range input', () => {
    const sanitizer = new CoordinateSanitizer();
    assert.ok(sanitizer.isValidFormat('12 34 56.000, +12 34 56.000'));
    assert.ok(!sanitizer.isValidFormat('12 34 56, +12 34 56'));
    assert.ok(!sanitizer.isValidFormat('12 34 56.000, +95 34 56.000'));
});

// Regression: space-separated parsing silently dropped trailing components
test('Space-separated parsing should reject extra components and text', () => {
    const sanitizer = new CoordinateSanitizer();
    assert.ok(!sanitizer.sanitizeCoordinates('12 34 56.1 +12 34 56.7 99').isValid);
    assert.ok(!sanitizer.sanitizeCoordinates('12 34 56.1 +12 34 56.7 garbage').isValid);
    assert.ok(!sanitizer.sanitizeCoordinates('+05 35 17 -05 23 28').isValid, 'signed RA');
    assert.ok(sanitizer.sanitizeCoordinates('05h 35m 17.3s -05d 23m 28s').isValid);
});

// Security check false positives
test('Should not flag "on...=" text as malicious', () => {
    const result = new CoordinateSanitizer().sanitizeCoordinates('onion=1');
    assert.ok(result.isValid);
    assert.strictEqual(result.metadata.inputFormat, 'object-name');
});

test('Object names should be passed through as typed (trimmed)', () => {
    const sanitizer = new CoordinateSanitizer();
    assert.strictEqual(sanitizer.sanitizeCoordinates('  M   31 ').coordinates, 'M 31');
    assert.strictEqual(sanitizer.sanitizeCoordinates('Sh2-155').coordinates, 'Sh2-155');
});

test('Constructor should reject invalid options', () => {
    assert.throws(() => new CoordinateSanitizer({ precision: 101 }), RangeError);
    assert.throws(() => new CoordinateSanitizer({ precision: 1.5 }), RangeError);
    assert.throws(() => new CoordinateSanitizer({ outputFormat: 'foo' }), TypeError);
    assert.throws(() => new CoordinateSanitizer({ raDecimalUnit: 'radians' }), TypeError);
});

test('Options should be immutable after construction', () => {
    const sanitizer = new CoordinateSanitizer();
    assert.ok(Object.isFrozen(sanitizer.options));
});

// Package self-reference resolves through the "exports" map
test('package.json should be exposed in the exports map', () => {
    const pkg = require('coordinate-sanitizer/package.json');
    assert.strictEqual(pkg.name, 'coordinate-sanitizer');
    assert.strictEqual(require('coordinate-sanitizer'), CoordinateSanitizer);
});

// Regression (2.1.0): unit letters anywhere made "Sh 2-155" look numeric
test('Should pass through Sharpless names written with a space', () => {
    const sanitizer = new CoordinateSanitizer();
    for (const input of ['Sh 2-155', 'Sh2-155', 'Sh2 155', 'sh 2 155']) {
        const result = sanitizer.sanitizeCoordinates(input);
        assert.ok(result.isValid, `${input}: ${result.error}`);
        assert.strictEqual(result.metadata.inputFormat, 'object-name', input);
        assert.strictEqual(result.coordinates, input);
    }
});

test('Should accept typographic quotes as minute/second markers', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12h 34m 56s, +12° 34’ 56”');
    assert.strictEqual(result.coordinates, '12 34 56.000, +12 34 56.000');
});

test('Should accept whitespace between sign and value', () => {
    const sanitizer = new CoordinateSanitizer();
    assert.strictEqual(
        sanitizer.sanitizeCoordinates('12 30 00, - 45 00 00').coordinates,
        '12 30 00.000, -45 00 00.000'
    );
    assert.strictEqual(
        sanitizer.sanitizeCoordinates('12 30 00 − 45 00 00').coordinates,
        '12 30 00.000, -45 00 00.000'
    );
});

test('Should not print negative zero', () => {
    const decimal = new CoordinateSanitizer({ outputFormat: 'decimal' });
    assert.strictEqual(decimal.sanitizeCoordinates('10, -0.0000001').coordinates, '10.000000, 0.000000');
    const aladin = new CoordinateSanitizer();
    assert.strictEqual(aladin.sanitizeCoordinates('10, -0.0000001').coordinates, '00 40 00.000, +00 00 00.000');
    // Real small negative values keep their sign
    assert.strictEqual(aladin.sanitizeCoordinates('10, -0.5').coordinates, '00 40 00.000, -00 30 00.000');
    assert.strictEqual(decimal.sanitizeCoordinates('10, -0.5').coordinates, '10.000000, -0.500000');
});

test('Should parse coordinates without seconds (HH MM, DD MM)', () => {
    const sanitizer = new CoordinateSanitizer();
    for (const [input, expected] of [
        ['12 30, +45 30', '12 30 00.000, +45 30 00.000'],
        ['12h 30m, -05d 23m', '12 30 00.000, -05 23 00.000'],
        ['12:30, -00:30', '12 30 00.000, -00 30 00.000'],
        ['12h 30.5m, +45° 30.25\'', '12 30 30.000, +45 30 15.000'],
        ['12h30m, +45d', '12 30 00.000, +45 00 00.000'],
    ]) {
        const result = sanitizer.sanitizeCoordinates(input);
        assert.ok(result.isValid, `${input}: ${result.error}`);
        assert.strictEqual(result.coordinates, expected, input);
    }
    assert.ok(!sanitizer.sanitizeCoordinates('12 75, +45 30').isValid, 'minutes >= 60');
    assert.ok(!sanitizer.sanitizeCoordinates('12 30, +45 60').isValid, 'minutes >= 60');
});

test('Should honour an explicit unit suffix on decimal RA', () => {
    const degrees = new CoordinateSanitizer();
    const hours = new CoordinateSanitizer({ raDecimalUnit: 'hours' });
    for (const sanitizer of [degrees, hours]) {
        assert.strictEqual(sanitizer.sanitizeCoordinates('12.5h, 45').coordinates, '12 30 00.000, +45 00 00.000');
        assert.strictEqual(sanitizer.sanitizeCoordinates('187.5d, 45').coordinates, '12 30 00.000, +45 00 00.000');
        assert.strictEqual(sanitizer.sanitizeCoordinates('187.5°, 45').coordinates, '12 30 00.000, +45 00 00.000');
    }
    assert.ok(!degrees.sanitizeCoordinates('25h, 45').isValid, 'RA 25h out of range');
});

test('Designations should be object names unless parseDesignations is set', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('J053517.3-052328');
    assert.strictEqual(result.metadata.inputFormat, 'object-name');
    assert.strictEqual(result.coordinates, 'J053517.3-052328');
});

test('Should parse IAU J2000 designations when enabled', () => {
    const sanitizer = new CoordinateSanitizer({ parseDesignations: true });
    for (const [input, expected] of [
        ['J053517.3-052328', '05 35 17.300, -05 23 28.000'],
        ['SDSS J053517.30-052328.0', '05 35 17.300, -05 23 28.000'],
        ['2MASS J05351730-0523280', '05 35 17.300, -05 23 28.000'],
        ['J123000+450000', '12 30 00.000, +45 00 00.000'],
    ]) {
        const result = sanitizer.sanitizeCoordinates(input);
        assert.ok(result.isValid, `${input}: ${result.error}`);
        assert.strictEqual(result.coordinates, expected, input);
        assert.strictEqual(result.metadata.ra.format, 'designation');
    }
    assert.ok(!sanitizer.sanitizeCoordinates('J253517.3-052328').isValid, 'RA 25h');
    assert.strictEqual(sanitizer.sanitizeCoordinates('M31').metadata.inputFormat, 'object-name');
    assert.throws(() => new CoordinateSanitizer({ parseDesignations: 'yes' }), TypeError);
});

test('Should expose a global when loaded as a plain browser script', () => {
    const vm = require('node:vm');
    const fs = require('node:fs');
    const path = require('node:path');
    const context = vm.createContext({});
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/index.js'), 'utf8'), context);
    const result = vm.runInContext(
        "new globalThis.CoordinateSanitizer().sanitizeCoordinates('10, 20').coordinates",
        context
    );
    assert.strictEqual(result, '00 40 00.000, +20 00 00.000');
});

test('Should read decimal commas when the input does not parse otherwise', () => {
    const sanitizer = new CoordinateSanitizer();
    for (const [input, expected] of [
        ['05 35 16,820 -05 23 15,36', '05 35 16.820, -05 23 15.360'],
        ['05 35 16,820, -05 23 15,36', '05 35 16.820, -05 23 15.360'],
        ['05h35m16,8s +41d16m09,5s', '05 35 16.800, +41 16 09.500'],
        ['12 30,5, +45 30,5', '12 30 30.000, +45 30 30.000'],
        ['83,82, -5,38', '05 35 16.800, -05 22 48.000'],
    ]) {
        const result = sanitizer.sanitizeCoordinates(input);
        assert.ok(result.isValid, `${input}: ${result.error}`);
        assert.strictEqual(result.coordinates, expected, input);
    }
});

test('Should keep a comma between plain numbers as the RA/DEC separator', () => {
    const sanitizer = new CoordinateSanitizer({ outputFormat: 'decimal' });
    assert.strictEqual(sanitizer.sanitizeCoordinates('10,20').coordinates, '10.000000, 20.000000');
    assert.strictEqual(sanitizer.sanitizeCoordinates('10, 20').coordinates, '10.000000, 20.000000');
});

test('Should parse a single right ascension or declination', () => {
    const sanitizer = new CoordinateSanitizer();
    const close = (actual, expected, label) =>
        assert.ok(Math.abs(actual - expected) < 1e-9, `${label}: ${actual} != ${expected}`);
    close(sanitizer.parseRightAscension('05 35 16.82'), 5 + 35 / 60 + 16.82 / 3600, 'sexagesimal');
    close(sanitizer.parseRightAscension('05 35 16,82'), 5 + 35 / 60 + 16.82 / 3600, 'decimal comma');
    close(sanitizer.parseRightAscension('05h35m16.82s'), 5 + 35 / 60 + 16.82 / 3600, 'units');
    close(sanitizer.parseRightAscension('83.82'), 5.588, 'decimal degrees');
    close(sanitizer.parseRightAscension('5,588h'), 5.588, 'decimal hours');
    close(sanitizer.parseDeclination('-05 23 15,36'), -5.3876, 'decimal comma');
    close(sanitizer.parseDeclination('+41:16:09'), 41 + 16 / 60 + 9 / 3600, 'colons');
    close(sanitizer.parseDeclination('-00 30 00'), -0.5, 'negative zero degrees');
    assert.strictEqual(sanitizer.parseRightAscension('25 00 00'), null, 'RA out of range');
    assert.strictEqual(sanitizer.parseDeclination('95'), null, 'DEC out of range');
    assert.strictEqual(new CoordinateSanitizer({ validateRanges: false }).parseDeclination('95'), 95);
    assert.strictEqual(sanitizer.parseDeclination('1, 2'), null, 'two values');
    assert.strictEqual(sanitizer.parseRightAscension(''), null, 'empty');
    assert.strictEqual(sanitizer.parseRightAscension('<b>05</b>'), null, 'markup');
    assert.strictEqual(sanitizer.parseRightAscension(null), null, 'not a string');
});

// Hardening (security filter, input length, linear-time normalization)
test('Should reject markup, URL schemes and invisible characters', () => {
    const sanitizer = new CoordinateSanitizer();
    for (const input of [
        '<img src=x onerror=alert(1)//',
        'a > b',
        'javascript : alert(1)',
        'vbscript:msgbox(1)',
        'data:text/html,abc',
        'x\u0085y',
        '\u202Eabc',
        'M\u200B31',
    ]) {
        const result = sanitizer.sanitizeCoordinates(input);
        assert.ok(!result.isValid, JSON.stringify(input));
        assertContains(result.error, 'malicious');
    }
    assert.strictEqual(sanitizer.parseDeclination('-05 23 28\u200B'), null);
});

test('Should treat tab, line feed and carriage return as whitespace', () => {
    const sanitizer = new CoordinateSanitizer();
    assert.strictEqual(
        sanitizer.sanitizeCoordinates('\t05 35 17.3,\t-05 23 28\r\n').coordinates,
        '05 35 17.300, -05 23 28.000'
    );
    assert.strictEqual(
        sanitizer.sanitizeCoordinates('05\t35\t17.3\t-05\t23\t28').coordinates,
        '05 35 17.300, -05 23 28.000'
    );
    assert.strictEqual(sanitizer.sanitizeCoordinates('M31\r\n').coordinates, 'M31');
    assert.strictEqual(sanitizer.parseDeclination('-05 23 28\n'), -(5 + 23 / 60 + 28 / 3600));
});

test('Should parse a decimal pair separated only by whitespace', () => {
    const sanitizer = new CoordinateSanitizer();
    const expected = '05 35 16.800, -05 23 24.000';
    for (const input of ['83.82 -5.39', '83.82\t-5.39', '83.82   -5.39', '83,82 -5,39', '83,82\t-5,39',
        '5.588h -5.39', '83.82d -5.39d', '83.82\t-5.39\r\n']) {
        assert.strictEqual(sanitizer.sanitizeCoordinates(input).coordinates, expected, JSON.stringify(input));
    }
    assert.strictEqual(sanitizer.sanitizeCoordinates('83.82 5.39').coordinates, '05 35 16.800, +05 23 24.000');
    assert.strictEqual(sanitizer.sanitizeCoordinates('83 -5').coordinates, '05 32 00.000, -05 00 00.000');
    assert.strictEqual(
        new CoordinateSanitizer({ raDecimalUnit: 'hours' }).sanitizeCoordinates('5.588 -5.39').coordinates,
        expected
    );
    assertContains(sanitizer.sanitizeCoordinates('83.82 -95').error, 'DEC out of range');
});

test('Should reject two bare integers as ambiguous', () => {
    const sanitizer = new CoordinateSanitizer();
    for (const input of ['10 20', '12 30.5']) {
        const result = sanitizer.sanitizeCoordinates(input);
        assert.ok(!result.isValid, input);
        assertContains(result.error, 'Ambiguous');
    }
    // Explicit separator or sign removes the ambiguity
    assert.ok(sanitizer.sanitizeCoordinates('10, 20').isValid);
    assert.ok(sanitizer.sanitizeCoordinates('10 +20').isValid);
});

test('Strict mode should still require a separator for decimal pairs', () => {
    const strict = new CoordinateSanitizer({ strictMode: true });
    assertContains(strict.sanitizeCoordinates('83.82 -5.39').error, 'Strict mode');
    assert.ok(strict.sanitizeCoordinates('83.82\t,\t-5.39').isValid);
});

test('Should accept a leading byte order mark', () => {
    const sanitizer = new CoordinateSanitizer();
    assert.strictEqual(sanitizer.sanitizeCoordinates('\uFEFFM31').coordinates, 'M31');
    assert.strictEqual(
        sanitizer.sanitizeCoordinates('\uFEFF05 35 17.3 -05 23 28').coordinates,
        '05 35 17.300, -05 23 28.000'
    );
});

test('Should reject input longer than maxLength', () => {
    const sanitizer = new CoordinateSanitizer();
    const long = 'M31' + ' '.repeat(300);
    assertContains(sanitizer.sanitizeCoordinates(long).error, 'maximum length');
    assert.strictEqual(sanitizer.parseRightAscension('1' + ' '.repeat(300)), null);
    const short = new CoordinateSanitizer({ maxLength: 10 });
    assert.ok(!short.sanitizeCoordinates('12 34 56, +12 34 56').isValid);
    const unlimited = new CoordinateSanitizer({ maxLength: Infinity });
    assert.strictEqual(unlimited.sanitizeCoordinates(long).coordinates, 'M31');
});

test('Normalization should run in linear time on long whitespace runs', () => {
    const sanitizer = new CoordinateSanitizer({ maxLength: Infinity });
    // Each took several seconds with the former quadratic regexes
    const inputs = [
        'RA' + ' '.repeat(100000) + 'x',
        '1' + ' '.repeat(100000) + 'x',
        '12' + ' :'.repeat(50000),
        '1' + ' ,'.repeat(50000),
        '<'.repeat(100000),
    ];
    const start = Date.now();
    for (const input of inputs) {
        sanitizer.sanitizeCoordinates(input);
        sanitizer.parseRightAscension(input);
    }
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 500, `took ${elapsed} ms`);
});

test('Should reject non-boolean flags and invalid limits', () => {
    for (const name of ['validateRanges', 'strictMode', 'parseDesignations', 'allowObjectNames']) {
        assert.throws(() => new CoordinateSanitizer({ [name]: 'no' }), TypeError, name);
    }
    assert.throws(() => new CoordinateSanitizer({ secondsPrecision: 7 }), RangeError);
    assert.throws(() => new CoordinateSanitizer({ secondsPrecision: -1 }), RangeError);
    assert.throws(() => new CoordinateSanitizer({ maxLength: 0 }), RangeError);
    assert.throws(() => new CoordinateSanitizer({ maxLength: 1.5 }), RangeError);
});

// Output and parsing options
test('Should honour secondsPrecision in sexagesimal output', () => {
    const input = '05 35 17.29992, -05 23 27.9996';
    const none = new CoordinateSanitizer({ secondsPrecision: 0 });
    assert.strictEqual(none.sanitizeCoordinates(input).coordinates, '05 35 17, -05 23 28');
    assert.strictEqual(
        none.sanitizeCoordinates('05 35 59.6, -05 23 59.6').coordinates,
        '05 36 00, -05 24 00',
        'carry into minutes'
    );
    const five = new CoordinateSanitizer({ secondsPrecision: 5 });
    assert.strictEqual(five.sanitizeCoordinates(input).coordinates, '05 35 17.29992, -05 23 27.99960');
    assert.ok(five.isValidFormat('05 35 17.29992, -05 23 27.99960'));
    const hmsDms = new CoordinateSanitizer({ outputFormat: 'hms-dms', secondsPrecision: 1 });
    assert.strictEqual(
        hmsDms.sanitizeCoordinates(input).coordinates,
        '05h 35m 17.3s, -05° 23\' 28.0"'
    );
    // Decimal input keeps sub-millisecond seconds
    const fromDecimal = five.sanitizeCoordinates('83.822083, -5.391111');
    assert.strictEqual(fromDecimal.coordinates, '05 35 17.29992, -05 23 27.99960');
});

test('Should reject object names when allowObjectNames is false', () => {
    const sanitizer = new CoordinateSanitizer({ allowObjectNames: false });
    const result = sanitizer.sanitizeCoordinates('M31');
    assert.ok(!result.isValid);
    assertContains(result.error, 'object names are disabled');
    assert.ok(sanitizer.sanitizeCoordinates('00 42 44.3, +41 16 09').isValid);
});

test('Should explain that sexagesimal RA is in hours', () => {
    const result = new CoordinateSanitizer().sanitizeCoordinates('12d 34m 56s, +12d 34m 56s');
    assert.ok(!result.isValid);
    assertContains(result.error, 'sexagesimal RA is in hours');
});

// Command-line interface
test('CLI should sanitize arguments and standard input', () => {
    const { spawnSync } = require('node:child_process');
    const path = require('node:path');
    const cli = path.join(__dirname, '..', 'src', 'cli.js');
    const run = (args, input) => spawnSync(process.execPath, [cli, ...args], { input, encoding: 'utf8' });

    let out = run(['05 35 17.3 -05 23 28', 'M31']);
    assert.strictEqual(out.status, 0);
    assert.strictEqual(out.stdout, '05 35 17.300, -05 23 28.000\nM31\n');

    out = run(['--format', 'decimal', '--no-names'], '83.82, -5.39\n\nNGC 1976\n');
    assert.strictEqual(out.status, 1);
    assert.strictEqual(out.stdout, '83.820000, -5.390000\n');
    assertContains(out.stderr, 'NGC 1976: Input is not a coordinate');

    out = run(['--json', '12h 30m, +45 30']);
    const parsed = JSON.parse(out.stdout);
    assert.strictEqual(parsed.input, '12h 30m, +45 30');
    assert.strictEqual(parsed.coordinates, '12 30 00.000, +45 30 00.000');

    assert.strictEqual(run(['--format', 'bogus', 'x']).status, 2);
    assert.strictEqual(run(['--unknown']).status, 2);
    assertContains(run(['--help']).stdout, 'Usage:');
});
