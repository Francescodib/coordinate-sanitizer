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
    for (const input of ['1234', '12h 30m', '12.5h, 45']) {
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
