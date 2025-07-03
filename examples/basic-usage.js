#!/usr/bin/env node

const CoordinateSanitizer = require('../src/index.js');

console.log('Coordinate Sanitizer Examples');
console.log('='.repeat(50));

// Example 1: Basic usage with default options
console.log('\n1. Basic usage (Aladin format output)');
console.log('-'.repeat(40));

const sanitizer = new CoordinateSanitizer();

const testInputs = [
    'M31',
    'NGC 1234',
    'IC 1396',
    '12h 34m 56.78s, +12° 34\' 56.78"',
    '12:34:56.78, +12:34:56.78',
    '123.456, -12.345',
    'Andromeda Galaxy',
    '00h 42m 44.3s, +41° 16\' 09"',
    'Invalid input with no coordinates'
];

testInputs.forEach(input => {
    const result = sanitizer.sanitizeCoordinates(input);
    console.log(`Input: "${input}"`);
    console.log(`  Valid: ${result.isValid}`);
    console.log(`  Output: "${result.coordinates}"`);
    if (result.error) console.log(`  Error: ${result.error}`);
    if (result.metadata) {
        console.log(`  Format: ${result.metadata.inputFormat} -> ${result.metadata.outputFormat}`);
    }
    console.log();
});

// Example 2: Different output formats
console.log('\n2. Different output formats');
console.log('-'.repeat(40));

const formats = ['aladin', 'decimal', 'hms-dms'];
const testCoord = '12h 34m 56.78s, +12° 34\' 56.78"';

console.log(`Input coordinate: ${testCoord}`);
formats.forEach(format => {
    const formatSanitizer = new CoordinateSanitizer({ outputFormat: format });
    const result = formatSanitizer.sanitizeCoordinates(testCoord);
    console.log(`  ${format.toUpperCase()}: ${result.coordinates}`);
});

// Example 3: Custom precision
console.log('\n3. Custom precision for decimal output');
console.log('-'.repeat(40));

const precisions = [2, 4, 6, 8];
const precisionTestCoord = '12h 34m 56.123456s, +12° 34\' 56.123456"';

console.log(`Input coordinate: ${precisionTestCoord}`);
precisions.forEach(precision => {
    const precisionSanitizer = new CoordinateSanitizer({ 
        outputFormat: 'decimal', 
        precision 
    });
    const result = precisionSanitizer.sanitizeCoordinates(precisionTestCoord);
    console.log(`  Precision ${precision}: ${result.coordinates}`);
});

// Example 4: Range validation
console.log('\n4. Range validation');
console.log('-'.repeat(40));

const invalidCoords = [
    '25h 00m 00s, +00° 00\' 00"',  // RA > 24h
    '12h 00m 00s, +95° 00\' 00"',  // DEC > 90°
    '12h 00m 00s, -95° 00\' 00"',  // DEC < -90°
    '-1h 00m 00s, +45° 00\' 00"'   // RA < 0h
];

console.log('Testing invalid coordinates (should fail):');
invalidCoords.forEach(coord => {
    const result = sanitizer.sanitizeCoordinates(coord);
    console.log(`  Input: "${coord}"`);
    console.log(`  Valid: ${result.isValid}`);
    console.log(`  Error: ${result.error}`);
    console.log();
});

console.log('Testing with validation disabled:');
const noValidationSanitizer = new CoordinateSanitizer({ validateRanges: false });
invalidCoords.forEach(coord => {
    const result = noValidationSanitizer.sanitizeCoordinates(coord);
    console.log(`  Input: "${coord}"`);
    console.log(`  Valid: ${result.isValid}`);
    console.log(`  Output: "${result.coordinates}"`);
    if (result.error) console.log(`  Error: ${result.error}`);
    console.log();
});

// Example 5: Using presets
console.log('\n5. Using presets');
console.log('-'.repeat(40));

const presets = ['aladin', 'decimal', 'loose', 'strict'];
const presetTestCoord = '12h 34m 56s, +12° 34\' 56"';

console.log(`Input coordinate: ${presetTestCoord}`);
presets.forEach(preset => {
    const presetSanitizer = CoordinateSanitizer.createPreset(preset);
    const result = presetSanitizer.sanitizeCoordinates(presetTestCoord);
    console.log(`  ${preset.toUpperCase()}: ${result.coordinates}`);
});

// Example 6: Integration with existing systems
console.log('\n6. Integration example');
console.log('-'.repeat(40));

class TelescopeController {
    constructor() {
        this.sanitizer = new CoordinateSanitizer({
            outputFormat: 'aladin',
            validateRanges: true
        });
    }

    gotoTarget(input) {
        const result = this.sanitizer.sanitizeCoordinates(input);
        
        if (!result.isValid) {
            throw new Error(`Invalid target: ${result.error}`);
        }

        // Simulate telescope slewing
        console.log(`  Slewing to: ${result.coordinates}`);
        console.log(`  Input type: ${result.metadata.inputFormat}`);
        
        return {
            target: result.coordinates,
            inputType: result.metadata.inputFormat,
            success: true
        };
    }
}

const telescope = new TelescopeController();

const testTargets = [
    'M31',
    '12h 34m 56s, +12° 34\' 56"',
    'NGC 7000',
    '00h 42m 44.3s, +41° 16\' 09"'
];

console.log('Testing successful telescope commands:');
testTargets.forEach(target => {
    try {
        console.log(`Target: "${target}"`);
        const result = telescope.gotoTarget(target);
        console.log(`  Success: ${result.success}`);
        console.log();
    } catch (error) {
        console.log(`  Error: ${error.message}`);
        console.log();
    }
});

console.log('Testing invalid coordinate (should fail):');
try {
    console.log('Target: "25h 00m 00s, +00° 00\' 00""');
    const result = telescope.gotoTarget('25h 00m 00s, +00° 00\' 00"');
    console.log('  This should not print');
} catch (error) {
    console.log(`  Expected error: ${error.message}`);
}

// Example 7: Batch processing
console.log('\n7. Batch processing');
console.log('-'.repeat(40));

const batchInputs = [
    'M31',
    'NGC 1234',
    'IC 1396',
    '12h 34m 56s, +12° 34\' 56"',
    '13:45:12.34, -23:45:12.34',
    '188.5, +12.25',
    'Orion Nebula',
    '05h 35m 17.3s, -05° 23\' 14"',
    'Invalid coordinates format',
    '25h 00m 00s, +00° 00\' 00"'
];

console.log('Processing batch of coordinates:');
const batchResults = batchInputs.map((input, index) => {
    const result = sanitizer.sanitizeCoordinates(input);
    return {
        id: index + 1,
        input: input,
        valid: result.isValid,
        output: result.coordinates,
        type: result.metadata?.inputFormat || 'unknown',
        error: result.error || null
    };
});

console.log('\nBatch processing results:');
batchResults.forEach(result => {
    console.log(`${result.id}. Input: "${result.input}"`);
    console.log(`   Valid: ${result.valid}`);
    console.log(`   Output: "${result.output}"`);
    console.log(`   Type: ${result.type}`);
    if (result.error) console.log(`   Error: ${result.error}`);
    console.log();
});

// Example 8: Performance measurement
console.log('\n8. Performance test');
console.log('-'.repeat(40));

const performanceTest = () => {
    const testCoords = [
        '12h 34m 56.78s, +12° 34\' 56.78"',
        'M31',
        '188.5, +12.25',
        '05h 35m 17.3s, -05° 23\' 14"'
    ];
    
    const iterations = 2500; // 2500 * 4 = 10000 total operations
    
    console.log(`Testing performance with ${iterations * testCoords.length} total operations:`);
    
    const start = Date.now();
    for (let i = 0; i < iterations; i++) {
        testCoords.forEach(coord => {
            sanitizer.sanitizeCoordinates(coord);
        });
    }
    const elapsed = Date.now() - start;
    
    const totalOps = iterations * testCoords.length;
    console.log(`  Processed ${totalOps} coordinates in ${elapsed}ms`);
    console.log(`  Average: ${(elapsed / totalOps).toFixed(4)}ms per coordinate`);
    console.log(`  Rate: ${Math.round(totalOps / elapsed * 1000)} coordinates/second`);
};

performanceTest();

// Example 9: Real astronomical objects
console.log('\n9. Real astronomical objects');
console.log('-'.repeat(40));

const realObjects = [
    { name: 'Andromeda Galaxy (M31)', coords: '00h 42m 44.3s, +41° 16\' 09"' },
    { name: 'Orion Nebula (M42)', coords: '05h 35m 17.3s, -05° 23\' 14"' },
    { name: 'Pleiades (M45)', coords: '03h 47m 29s, +24° 07\' 00"' },
    { name: 'Polaris (North Star)', coords: '02h 31m 49s, +89° 15\' 51"' },
    { name: 'Vega', coords: '18h 36m 56.3s, +38° 47\' 01"' },
    { name: 'Betelgeuse', coords: '05h 55m 10.3s, +07° 24\' 25"' }
];

console.log('Processing real astronomical coordinates:');
realObjects.forEach(obj => {
    const result = sanitizer.sanitizeCoordinates(obj.coords);
    console.log(`  ${obj.name}:`);
    console.log(`    Input: ${obj.coords}`);
    console.log(`    Valid: ${result.isValid}`);
    console.log(`    Aladin: ${result.coordinates}`);
    
    // Also show in decimal format
    const decimalSanitizer = new CoordinateSanitizer({ outputFormat: 'decimal' });
    const decimalResult = decimalSanitizer.sanitizeCoordinates(obj.coords);
    console.log(`    Decimal: ${decimalResult.coordinates}`);
    console.log();
});

// Example 10: Different coordinate separators
console.log('\n10. Different coordinate separators');
console.log('-'.repeat(40));

const separatorTests = [
    '12h 34m 56s, +12° 34\' 56"',   // comma
    '12h 34m 56s; +12° 34\' 56"',   // semicolon
    '12h 34m 56s · +12° 34\' 56"',  // middle dot
    '12h 34m 56s • +12° 34\' 56"'   // bullet
];

console.log('Testing different coordinate separators:');
separatorTests.forEach(coord => {
    const result = sanitizer.sanitizeCoordinates(coord);
    console.log(`  Input: "${coord}"`);
    console.log(`  Valid: ${result.isValid}`);
    console.log(`  Output: "${result.coordinates}"`);
    console.log();
});

// Example 11: Error handling patterns
console.log('\n11. Error handling patterns');
console.log('-'.repeat(40));

class RobustAstronomyApp {
    constructor() {
        this.sanitizer = new CoordinateSanitizer({
            outputFormat: 'aladin',
            validateRanges: true
        });
    }

    safeSearch(input) {
        try {
            const result = this.sanitizer.sanitizeCoordinates(input);
            
            if (!result.isValid) {
                return {
                    success: false,
                    error: `Invalid input: ${result.error}`,
                    suggestion: 'Please check coordinate format or object name'
                };
            }

            return {
                success: true,
                coordinates: result.coordinates,
                inputType: result.metadata.inputFormat,
                formatted: result.coordinates
            };
        } catch (error) {
            return {
                success: false,
                error: `Unexpected error: ${error.message}`,
                suggestion: 'Please contact support'
            };
        }
    }
}

const robustApp = new RobustAstronomyApp();

const errorTestInputs = [
    'M31',                              // Valid object
    '12h 34m 56s, +12° 34\' 56"',      // Valid coordinates
    '25h 00m 00s, +00° 00\' 00"',      // Invalid RA
    'completely invalid input',          // Invalid format
    null,                               // Null input
    ''                                  // Empty input
];

console.log('Testing robust error handling:');
errorTestInputs.forEach(input => {
    const result = robustApp.safeSearch(input);
    console.log(`  Input: ${input === null ? 'null' : `"${input}"`}`);
    console.log(`  Success: ${result.success}`);
    if (result.success) {
        console.log(`  Coordinates: ${result.coordinates}`);
        console.log(`  Type: ${result.inputType}`);
    } else {
        console.log(`  Error: ${result.error}`);
        console.log(`  Suggestion: ${result.suggestion}`);
    }
    console.log();
});

// Example 12: Static methods and utilities
console.log('\n12. Static methods and utilities');
console.log('-'.repeat(40));

console.log('Supported formats:');
const supportedFormats = CoordinateSanitizer.getSupportedFormats();
console.log('  Input formats:');
supportedFormats.input.forEach(format => {
    console.log(`    - ${format}`);
});
console.log('  Output formats:');
supportedFormats.output.forEach(format => {
    console.log(`    - ${format}`);
});

// Example 13: Mixed coordinate formats
console.log('\n13. Mixed coordinate formats');
console.log('-'.repeat(40));

const mixedFormats = [
    '12h 34m 56s, +12:34:56',        // HMS, colon-separated DEC
    '12:34:56, +12° 34\' 56"',       // colon-separated RA, DMS
    '12.5, +12° 30\' 00"',           // decimal RA, DMS
    '12h 30m 00s, +12.5'             // HMS, decimal DEC
];

console.log('Testing mixed coordinate formats:');
mixedFormats.forEach(coord => {
    const result = sanitizer.sanitizeCoordinates(coord);
    console.log(`  Input: "${coord}"`);
    console.log(`  Valid: ${result.isValid}`);
    if (result.isValid) {
        console.log(`  Output: "${result.coordinates}"`);
    } else {
        console.log(`  Error: ${result.error}`);
    }
    console.log();
});

console.log('\n' + '='.repeat(50));
console.log('Examples completed!');
console.log('The coordinate sanitizer is ready for integration into your astronomy applications.');
console.log('For more information, see the README.md file or visit the GitHub repository.');