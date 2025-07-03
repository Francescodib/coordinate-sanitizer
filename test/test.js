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
        console.log('Running Coordinate Sanitizer Tests\n');
        
        for (const { description, fn } of this.tests) {
            try {
                await fn();
                console.log(`+ ${description}`);
                this.passed++;
            } catch (error) {
                console.log(`- ${description}`);
                console.log(`   Error: ${error.message}\n`);
                this.failed++;
            }
        }

        console.log(`\nTest Results: ${this.passed} passed, ${this.failed} failed`);
        
        if (this.failed > 0) {
            process.exit(1);
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
}

// Test suite
const runner = new TestRunner();

// Basic functionality tests
runner.test('Should create sanitizer with default options', () => {
    const sanitizer = new CoordinateSanitizer();
    runner.assert(sanitizer.options.outputFormat === 'aladin', 'Default output format should be aladin');
    runner.assert(sanitizer.options.precision === 6, 'Default precision should be 6');
    runner.assert(sanitizer.options.validateRanges === true, 'Default validateRanges should be true');
});

runner.test('Should create sanitizer with custom options', () => {
    const sanitizer = new CoordinateSanitizer({
        outputFormat: 'decimal',
        precision: 4,
        validateRanges: false
    });
    runner.assert(sanitizer.options.outputFormat === 'decimal', 'Custom output format should be set');
    runner.assert(sanitizer.options.precision === 4, 'Custom precision should be set');
    runner.assert(sanitizer.options.validateRanges === false, 'Custom validateRanges should be set');
});

// Input validation tests
runner.test('Should reject null input', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates(null);
    runner.assert(!result.isValid, 'Should reject null input');
    runner.assertContains(result.error, 'non-empty string', 'Should provide appropriate error message');
});

runner.test('Should reject undefined input', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates(undefined);
    runner.assert(!result.isValid, 'Should reject undefined input');
    runner.assertContains(result.error, 'non-empty string', 'Should provide appropriate error message');
});

runner.test('Should reject empty string input', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('');
    runner.assert(!result.isValid, 'Should reject empty string');
});

runner.test('Should reject whitespace-only input', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('   ');
    runner.assert(!result.isValid, 'Should reject whitespace-only input');
});

// Object name tests
runner.test('Should pass through simple object names unchanged', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('M31');
    runner.assert(result.isValid, 'Should accept object names');
    runner.assertEqual(result.coordinates, 'M31', 'Should pass through object names unchanged');
    runner.assert(result.metadata.inputFormat === 'object-name', 'Should detect as object name');
});

runner.test('Should pass through NGC objects unchanged', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('NGC 1234');
    runner.assert(result.isValid, 'Should accept NGC objects');
    runner.assertEqual(result.coordinates, 'NGC 1234', 'Should pass through NGC objects unchanged');
    runner.assert(result.metadata.inputFormat === 'object-name', 'Should detect as object name');
});

runner.test('Should pass through IC objects unchanged', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('IC 1396');
    runner.assert(result.isValid, 'Should accept IC objects');
    runner.assertEqual(result.coordinates, 'IC 1396', 'Should pass through IC objects unchanged');
});

// HMS/DMS coordinate parsing tests
runner.test('Should parse standard HMS/DMS format correctly', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12h 34m 56.78s, +12° 34\' 56.78"');
    runner.assert(result.isValid, 'Should parse HMS/DMS format');
    runner.assertContains(result.coordinates, '12 34 56.780', 'Should format RA correctly');
    runner.assertContains(result.coordinates, '+12 34 56.780', 'Should format DEC correctly');
    runner.assert(result.metadata.inputFormat === 'coordinates', 'Should detect as coordinates');
});

runner.test('Should parse colon-separated coordinates', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12:34:56.78, +12:34:56.78');
    runner.assert(result.isValid, 'Should parse colon-separated format');
    runner.assertContains(result.coordinates, '12 34 56.780', 'Should format RA correctly');
    runner.assertContains(result.coordinates, '+12 34 56.780', 'Should format DEC correctly');
});

runner.test('Should parse decimal coordinates', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12.5, -45.75');
    runner.assert(result.isValid, 'Should parse decimal format');
    runner.assert(result.metadata.inputFormat === 'coordinates', 'Should detect as coordinates');
});

runner.test('Should parse compact coordinates', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('123456, -123456');
    runner.assert(result.isValid, 'Should parse compact format');
    runner.assert(result.metadata.inputFormat === 'coordinates', 'Should detect as coordinates');
});

// Range validation tests
runner.test('Should reject RA > 24 hours', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('25h 00m 00s, +00° 00\' 00"');
    runner.assert(!result.isValid, 'Should reject RA > 24 hours');
    runner.assertContains(result.error, 'RA out of range', 'Should provide RA range error');
});

runner.test('Should reject negative RA', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('-1h 00m 00s, +00° 00\' 00"');
    runner.assert(!result.isValid, 'Should reject negative RA');
    runner.assertContains(result.error, 'RA out of range', 'Should provide RA range error');
});

runner.test('Should reject DEC > 90 degrees', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12h 00m 00s, +95° 00\' 00"');
    runner.assert(!result.isValid, 'Should reject DEC > 90 degrees');
    runner.assertContains(result.error, 'DEC out of range', 'Should provide DEC range error');
});

runner.test('Should reject DEC < -90 degrees', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12h 00m 00s, -95° 00\' 00"');
    runner.assert(!result.isValid, 'Should reject DEC < -90 degrees');
    runner.assertContains(result.error, 'DEC out of range', 'Should provide DEC range error');
});

runner.test('Should accept valid coordinate ranges', () => {
    const sanitizer = new CoordinateSanitizer();
    const result1 = sanitizer.sanitizeCoordinates('0h 00m 00s, +90° 00\' 00"');
    runner.assert(result1.isValid, 'Should accept RA=0, DEC=+90');
    
    const result2 = sanitizer.sanitizeCoordinates('23h 59m 59s, -90° 00\' 00"');
    runner.assert(result2.isValid, 'Should accept RA=23h59m59s, DEC=-90');
});

runner.test('Should skip range validation when disabled', () => {
    const sanitizer = new CoordinateSanitizer({ validateRanges: false });
    const result = sanitizer.sanitizeCoordinates('25h 00m 00s, +95° 00\' 00"');
    runner.assert(result.isValid, 'Should accept invalid ranges when validation disabled');
});

// Different output format tests
runner.test('Should output decimal format when requested', () => {
    const sanitizer = new CoordinateSanitizer({ outputFormat: 'decimal' });
    const result = sanitizer.sanitizeCoordinates('12h 00m 00s, +12° 00\' 00"');
    runner.assert(result.isValid, 'Should parse coordinates');
    runner.assertContains(result.coordinates, '12.000000', 'Should output decimal RA');
    runner.assertContains(result.coordinates, '12.000000', 'Should output decimal DEC');
});

runner.test('Should output HMS/DMS format when requested', () => {
    const sanitizer = new CoordinateSanitizer({ outputFormat: 'hms-dms' });
    const result = sanitizer.sanitizeCoordinates('12, +12');
    runner.assert(result.isValid, 'Should parse coordinates');
    runner.assertContains(result.coordinates, '12h', 'Should output HMS format');
    runner.assertContains(result.coordinates, '12°', 'Should output DMS format');
});

runner.test('Should respect custom precision', () => {
    const sanitizer = new CoordinateSanitizer({ outputFormat: 'decimal', precision: 2 });
    const result = sanitizer.sanitizeCoordinates('12h 34m 56.123s, +12° 34\' 56.123"');
    runner.assert(result.isValid, 'Should parse coordinates');
    runner.assertContains(result.coordinates, '12.58', 'Should use custom precision');
});

// Edge cases and special handling
runner.test('Should handle negative declinations correctly', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('12h 00m 00s, -12° 00\' 00"');
    runner.assert(result.isValid, 'Should handle negative declinations');
    runner.assertContains(result.coordinates, '-12 00 00.000', 'Should preserve negative sign');
});

runner.test('Should handle zero coordinates correctly', () => {
    const sanitizer = new CoordinateSanitizer();
    const result = sanitizer.sanitizeCoordinates('0h 00m 00s, +00° 00\' 00"');
    runner.assert(result.isValid, 'Should handle zero coordinates');
    runner.assertContains(result.coordinates, '00 00 00.000', 'Should format zero RA correctly');
    runner.assertContains(result.coordinates, '+00 00 00.000', 'Should format zero DEC correctly');
});

runner.test('Should handle various coordinate separators', () => {
    const sanitizer = new CoordinateSanitizer();
    const separators = [',', ';', '·', '•'];
    
    separators.forEach(sep => {
        const input = `12h 00m 00s${sep} +12° 00' 00"`;
        const result = sanitizer.sanitizeCoordinates(input);
        runner.assert(result.isValid, `Should handle separator: ${sep}`);
        runner.assert(result.metadata.inputFormat === 'coordinates', 'Should detect as coordinates');
    });
});

runner.test('Should handle whitespace variations', () => {
    const sanitizer = new CoordinateSanitizer();
    const inputs = [
        '12h34m56s, +12°34\'56"',
        '12h  34m  56s,  +12°  34\'  56"',
        '  12h 34m 56s  ,  +12° 34\' 56"  '
    ];
    
    inputs.forEach(input => {
        const result = sanitizer.sanitizeCoordinates(input);
        runner.assert(result.isValid, `Should handle whitespace in: ${input}`);
        runner.assert(result.metadata.inputFormat === 'coordinates', 'Should detect as coordinates');
    });
});

// Static method tests
runner.test('Should provide supported formats information', () => {
    const formats = CoordinateSanitizer.getSupportedFormats();
    runner.assert(Array.isArray(formats.input), 'Should provide input formats array');
    runner.assert(Array.isArray(formats.output), 'Should provide output formats array');
    runner.assert(formats.output.includes('aladin'), 'Should include aladin format');
    runner.assert(formats.output.includes('decimal'), 'Should include decimal format');
    runner.assert(formats.output.includes('hms-dms'), 'Should include hms-dms format');
});

// Performance test
runner.test('Should handle large number of coordinates efficiently', () => {
    const sanitizer = new CoordinateSanitizer();
    const start = Date.now();
    
    for (let i = 0; i < 1000; i++) {
        sanitizer.sanitizeCoordinates('12h 34m 56s, +12° 34\' 56"');
    }
    
    const elapsed = Date.now() - start;
    runner.assert(elapsed < 2000, `Should process 1000 coordinates in <2s (took ${elapsed}ms)`);
    console.log(`   Performance: ${elapsed}ms for 1000 coordinates`);
});

// Error handling tests
runner.test('Should provide meaningful error messages', () => {
    const sanitizer = new CoordinateSanitizer();
    
    const result1 = sanitizer.sanitizeCoordinates('invalid, coordinates');
    runner.assert(!result1.isValid, 'Should reject invalid coordinates');
    runner.assert(result1.error.includes('Invalid'), 'Should provide descriptive error');
    
    const result2 = sanitizer.sanitizeCoordinates('12h 34m, invalid');
    runner.assert(!result2.isValid, 'Should reject partially invalid coordinates');
    runner.assert(result2.error.includes('Invalid'), 'Should provide descriptive error');
});

// Integration tests
runner.test('Should work with real astronomical coordinates', () => {
    const sanitizer = new CoordinateSanitizer();
    
    // Andromeda Galaxy
    const m31 = sanitizer.sanitizeCoordinates('00h 42m 44.3s, +41° 16\' 09"');
    runner.assert(m31.isValid, 'Should parse M31 coordinates');
    
    // Orion Nebula
    const m42 = sanitizer.sanitizeCoordinates('05h 35m 17.3s, -05° 23\' 14"');
    runner.assert(m42.isValid, 'Should parse M42 coordinates');
    
    // Polaris
    const polaris = sanitizer.sanitizeCoordinates('02h 31m 49s, +89° 15\' 51"');
    runner.assert(polaris.isValid, 'Should parse Polaris coordinates');
});

// Run all tests
runner.run().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
});