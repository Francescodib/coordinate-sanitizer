#!/usr/bin/env node

const CoordinateSanitizer = require('../src/index.js');

// Simple test framework
class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(description, fn) {
        this.tests.push({ description, fn });
    }

    async run() {
        console.log('Running Coordinate Sanitizer Tests');
        console.log('='.repeat(50));
        
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

        console.log('\n' + '='.repeat(50));
        console.log(`Test Results: ${this.passed} passed, ${this.failed} failed`);
        
        if (this.failed > 0) {
            console.log(`\nFailed tests: ${this.failed}`);
            process.exit(1);
        } else {
            console.log('\nAll tests passed!');
        }
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }

    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(`${message || 'Values not equal'}: expected "${expected}", got "${actual}"`);
        }
    }

    assertContains(haystack, needle, message) {
        if (!haystack.includes(needle)) {
            throw new Error(`${message || 'String not found'}: "${needle}" not found in "${haystack}"`);
        }
    }

    assertNotEqual(actual, expected, message) {
        if (actual === expected) {
            throw new Error(`${message || 'Values should not be equal'}: got "${actual}"`);
        }
    }
}

// Test suite
const runner = new TestRunner();

// Basic constructor tests
runner.test('Should create sanitizer with default options', () => {
    const sanitizer = new CoordinateSanitizer();
    runner.assert(sanitizer.options.outputFormat === 'aladin');
    runner.assert(sanitizer.options.precision === 6);
    runner.assert(sanitizer.options.validateRanges === true);
    runner.assert(sanitizer.options.strictMode === false);
});

runner.test('Should create sanitizer with custom options', () => {
    const sanitizer = new CoordinateSanitizer({
        outputFormat: 'decimal',
        precision: 4,
        validateRanges: false,
        strictMode: true
    });
    runner.assert(sanitizer.options.outputFormat === 'decimal');
    runner.assert(sanitizer.options.precision === 4);
    runner.assert(sanitizer.options.validateRanges === false);
    runner.assert(sanitizer.options.strictMode === true);
});

// Input validation tests
runner.test('Should reject null input', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates(null);
    runner.assert(!result.isValid);
    runner.assertContains(result.error, 'non-empty string');
});

runner.test('Should reject undefined input', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates(undefined);
    runner.assert(!result.isValid);
    runner.assertContains(result.error, 'non-empty string');
});

runner.test('Should reject empty string input', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('');
    runner.assert(!result.isValid);
});

runner.test('Should reject non-string input', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates(123);
    runner.assert(!result.isValid);
});

// Security tests
runner.test('Should reject malicious HTML content', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('<script>alert("xss")</script>');
    runner.assert(!result.isValid);
    runner.assertContains(result.error, 'malicious');
});

runner.test('Should reject JavaScript protocol', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('javascript:alert(1)');
    runner.assert(!result.isValid);
    runner.assertContains(result.error, 'malicious');
});

// Object name tests
runner.test('Should pass through Messier objects', () => {
    const sanitizer = new CoordinateSanitizer();
    const inputs = ['M31', 'M 42', 'M1', 'M110'];
    
    inputs.forEach(input => {
        const result = sanitizer.sanitizeCoordinates(input);
        runner.assert(result.isValid);
        runner.assertEqual(result.coordinates, input);
        runner.assert(result.metadata.inputFormat === 'object-name');
    });
});

runner.test('Should pass through NGC objects', () => {
    const sanitizer = new CoordinateSanitizer();
    const inputs = ['NGC 1234', 'NGC1234', 'NGC 7000'];
    
    inputs.forEach(input => {
        const result = sanitizer.sanitizeCoordinates(input);
        runner.assert(result.isValid);
        runner.assertEqual(result.coordinates, input);
        runner.assert(result.metadata.inputFormat === 'object-name');
    });
});

runner.test('Should pass through other catalog objects', () => {
    const sanitizer = new CoordinateSanitizer();
    const inputs = ['IC 1396', 'HD 209458', 'HIP 27989', 'SAO 123456'];
    
    inputs.forEach(input => {
        const result = sanitizer.sanitizeCoordinates(input);
        runner.assert(result.isValid);
        runner.assertEqual(result.coordinates, input);
        runner.assert(result.metadata.inputFormat === 'object-name');
    });
});

runner.test('Should pass through named stars', () => {
    const sanitizer = new CoordinateSanitizer();
    const inputs = ['ALPHA CENTAURI', '51 Eri', 'R And', 'Polaris'];
    
    inputs.forEach(input => {
        const result = sanitizer.sanitizeCoordinates(input);
        runner.assert(result.isValid);
        runner.assertEqual(result.coordinates, input);
        runner.assert(result.metadata.inputFormat === 'object-name');
    });
});

// HMS/DMS coordinate parsing tests
runner.test('Should parse standard HMS/DMS format', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12h 34m 56.78s, +12° 34\' 56.78"');
    runner.assert(result.isValid);
    runner.assertContains(result.coordinates, '12 34 56.780');
    runner.assertContains(result.coordinates, '+12 34 56.780');
    runner.assert(result.metadata.inputFormat === 'coordinates');
});

runner.test('Should parse colon-separated coordinates', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12:34:56.78, +12:34:56.78');
    runner.assert(result.isValid);
    runner.assertContains(result.coordinates, '12 34 56.780');
    runner.assertContains(result.coordinates, '+12 34 56.780');
});

runner.test('Should parse decimal coordinates', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12.5, -45.75');
    runner.assert(result.isValid);
    runner.assert(result.metadata.inputFormat === 'coordinates');
});

runner.test('Should parse space-separated coordinates', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12 34 56.7 -45 12 34.5');
    runner.assert(result.isValid);
    runner.assert(result.metadata.inputFormat === 'coordinates');
});

runner.test('Should parse compact coordinates', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('123456, -123456');
    runner.assert(result.isValid);
    runner.assert(result.metadata.inputFormat === 'coordinates');
});

// Range validation tests
runner.test('Should reject RA > 24 hours', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('25h 00m 00s, +00° 00\' 00"');
    runner.assert(!result.isValid);
    runner.assertContains(result.error, 'RA out of range');
});

runner.test('Should reject negative RA', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('-1h 00m 00s, +00° 00\' 00"');
    runner.assert(!result.isValid, 'Should reject negative RA');
    runner.assert(result.error && result.error.length > 0, 'Should provide error message');
});

runner.test('Should reject DEC > 90 degrees', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12h 00m 00s, +95° 00\' 00"');
    runner.assert(!result.isValid);
    runner.assertContains(result.error, 'DEC out of range');
});

runner.test('Should reject DEC < -90 degrees', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12h 00m 00s, -95° 00\' 00"');
    runner.assert(!result.isValid);
    runner.assertContains(result.error, 'DEC out of range');
});

runner.test('Should accept valid coordinate ranges', () => {
    const sanitizer = new CoordinateSanitizer();
    
    const result1 = sanitizer.sanitizeCoordinates('0h 00m 00s, +90° 00\' 00"');
    runner.assert(result1.isValid);
    
    const result2 = sanitizer.sanitizeCoordinates('23h 59m 59s, -90° 00\' 00"');
    runner.assert(result2.isValid);
});

runner.test('Should skip range validation when disabled', () => {
    const sanitizer = new CoordinateSanitizer({ validateRanges: false });
    const result = sanitizer.sanitizeCoordinates('25h 00m 00s, +95° 00\' 00"');
    runner.assert(result.isValid);
});

// Output format tests
runner.test('Should output Aladin format by default', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12h 00m 00s, +12° 00\' 00"');
    runner.assert(result.isValid);
    runner.assertEqual(result.coordinates, '12 00 00.000, +12 00 00.000');
});

runner.test('Should output decimal format when requested', () => {
    const sanitizer = new CoordinateSanitizer({ outputFormat: 'decimal' });
    const result = sanitizer.sanitizeCoordinates('12h 00m 00s, +12° 00\' 00"');
    runner.assert(result.isValid);
    runner.assertContains(result.coordinates, '12.000000');
    runner.assertContains(result.coordinates, '12.000000');
});

runner.test('Should output HMS/DMS format when requested', () => {
    const sanitizer = new CoordinateSanitizer({ outputFormat: 'hms-dms' });
    const result = sanitizer.sanitizeCoordinates('12, +12');
    runner.assert(result.isValid);
    runner.assertContains(result.coordinates, '12h');
    runner.assertContains(result.coordinates, '12°');
});

runner.test('Should respect custom precision', () => {
    const sanitizer = new CoordinateSanitizer({ 
        outputFormat: 'decimal', 
        precision: 2 
    });
    const result = sanitizer.sanitizeCoordinates('12h 34m 56.123s, +12° 34\' 56.123"');
    runner.assert(result.isValid);
    runner.assertContains(result.coordinates, '12.58');
});

// Edge cases
runner.test('Should handle negative declinations correctly', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12h 00m 00s, -12° 00\' 00"');
    runner.assert(result.isValid);
    runner.assertContains(result.coordinates, '-12 00 00.000');
});

runner.test('Should handle negative declination with -00 degrees correctly', () => {
    const sanitizer = new CoordinateSanitizer();
    // Test case from bug report
    const result = sanitizer.sanitizeCoordinates('16 37 13.000, -00 58 20.000');
    runner.assert(result.isValid, 'Should parse coordinates with -00 degrees');
    runner.assertContains(result.coordinates, '16 37 13.000', 'RA should be correct');
    runner.assertContains(result.coordinates, '-00 58 20.000', 'DEC should preserve negative sign');
    runner.assert(result.coordinates.includes('-00') || result.coordinates.includes('- 00'), 'Should contain negative sign for -00 degrees');
});

runner.test('Should handle negative declination -00 in various formats', () => {
    const sanitizer = new CoordinateSanitizer();

    // Space-separated format
    const result1 = sanitizer.sanitizeCoordinates('16 37 13, -00 58 20');
    runner.assert(result1.isValid);
    runner.assert(result1.metadata.dec.decimal < 0, 'Decimal should be negative');

    // HMS/DMS format with symbols
    const result2 = sanitizer.sanitizeCoordinates('16h 37m 13s, -00° 58\' 20"');
    runner.assert(result2.isValid);
    runner.assert(result2.metadata.dec.decimal < 0, 'Decimal should be negative');

    // Colon-separated format
    const result3 = sanitizer.sanitizeCoordinates('16:37:13, -00:58:20');
    runner.assert(result3.isValid);
    runner.assert(result3.metadata.dec.decimal < 0, 'Decimal should be negative');
});

runner.test('Should handle zero coordinates', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('0h 00m 00s, +00° 00\' 00"');
    runner.assert(result.isValid);
    runner.assertContains(result.coordinates, '00 00 00.000');
    runner.assertContains(result.coordinates, '+00 00 00.000');
});

runner.test('Should handle various separators', () => {
    const sanitizer = new CoordinateSanitizer();
    const separators = [',', ';', '·', '•'];
    
    separators.forEach(sep => {
        const input = `12h 00m 00s${sep} +12° 00' 00"`;
        const result = sanitizer.sanitizeCoordinates(input);
        runner.assert(result.isValid, `Should handle separator: ${sep}`);
    });
});

runner.test('Should handle Unicode symbols', () => {
    const sanitizer = new CoordinateSanitizer();
    const inputs = [
        '12h 34m 56s · +12° 34′ 56″',
        '12h 34m 56s • +12° 34′ 56″',
        '12h 34m 56s, +12° 34′ 56″'
    ];
    
    inputs.forEach(input => {
        const result = sanitizer.sanitizeCoordinates(input);
        runner.assert(result.isValid, `Should handle Unicode in: ${input}`);
    });
});

// Static method tests
runner.test('Should provide supported formats', () => {
    const formats = CoordinateSanitizer.getSupportedFormats();
    runner.assert(Array.isArray(formats.input));
    runner.assert(Array.isArray(formats.output));
    runner.assert(formats.output.includes('aladin'));
    runner.assert(formats.output.includes('decimal'));
    runner.assert(formats.output.includes('hms-dms'));
});

runner.test('Should create presets correctly', () => {
    const aladinPreset = CoordinateSanitizer.createPreset('aladin');
    runner.assertEqual(aladinPreset.options.outputFormat, 'aladin');
    runner.assert(aladinPreset.options.validateRanges === true);
    
    const decimalPreset = CoordinateSanitizer.createPreset('decimal');
    runner.assertEqual(decimalPreset.options.outputFormat, 'decimal');
    runner.assertEqual(decimalPreset.options.precision, 6);
    
    const loosePreset = CoordinateSanitizer.createPreset('loose');
    runner.assert(loosePreset.options.validateRanges === false);
    
    const strictPreset = CoordinateSanitizer.createPreset('strict');
    runner.assert(strictPreset.options.strictMode === true);
});

// Performance test
runner.test('Should handle large number of coordinates efficiently', () => {
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
    
    runner.assert(elapsed < 2000, `Should process ${totalOps} coordinates in <2s (took ${elapsed}ms)`);
    console.log(`  Performance: ${elapsed}ms for ${totalOps} coordinates`);
});

// Real astronomical coordinates
runner.test('Should handle real astronomical coordinates', () => {
    const sanitizer = new CoordinateSanitizer();
    
    const realCoords = [
        { name: 'M31', coord: '00h 42m 44.3s, +41° 16\' 09"' },
        { name: 'M42', coord: '05h 35m 17.3s, -05° 23\' 14"' },
        { name: 'Polaris', coord: '02h 31m 49s, +89° 15\' 51"' },
        { name: 'Vega', coord: '18h 36m 56.3s, +38° 47\' 01"' }
    ];
    
    realCoords.forEach(({ name, coord }) => {
        const result = sanitizer.sanitizeCoordinates(coord);
        runner.assert(result.isValid, `Should parse ${name} coordinates`);
        runner.assert(result.metadata.inputFormat === 'coordinates');
    });
});

// Error handling
runner.test('Should provide meaningful error messages', () => {
    const sanitizer = new CoordinateSanitizer();
    
    // Test for invalid RA/DEC ranges
    const result1 = sanitizer.sanitizeCoordinates('25h 00m 00s, +00° 00\' 00"');
    runner.assert(!result1.isValid, 'Should reject invalid RA > 24h');
    runner.assert(result1.error && result1.error.length > 0, 'Should provide error message');
    
    const result2 = sanitizer.sanitizeCoordinates('12h 00m 00s, +95° 00\' 00"');
    runner.assert(!result2.isValid, 'Should reject invalid DEC > 90°');
    runner.assert(result2.error && result2.error.length > 0, 'Should provide error message');
    
    // Test with malicious input
    const result3 = sanitizer.sanitizeCoordinates('<script>alert("test")</script>');
    runner.assert(!result3.isValid, 'Should reject malicious input');
    runner.assert(result3.error && result3.error.length > 0, 'Should provide error message');
});

// Integration tests
runner.test('Should work with mixed coordinate formats', () => {
    const sanitizer = new CoordinateSanitizer();
    
    const mixedInputs = [
        '12h 34m 56s, +12:34:56',
        '12:34:56, +12° 34\' 56"',
        '12.5, +12° 30\' 00"'
    ];
    
    mixedInputs.forEach(input => {
        const result = sanitizer.sanitizeCoordinates(input);
        runner.assert(result.isValid, `Should handle mixed format: ${input}`);
    });
});

// Run all tests
runner.run().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
});