#!/usr/bin/env node

const CoordinateSanitizer = require('../src/index.js');

console.log('Coordinate Sanitizer Examples\n');

// Example 1: Basic usage with default options
console.log('Example 1: Basic usage (Aladin format output)');
const sanitizer = new CoordinateSanitizer();

const testInputs = [
    'M31',
    'NGC 1234',
    'IC 1396',
    '12h 34m 56.78s, +12° 34\' 56.78"',
    '12:34:56.78, +12:34:56.78',
    '123.456, -12.345',
    '123456, -123456',
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
        console.log(`  Input Format: ${result.metadata.inputFormat}`);
        console.log(`  Output Format: ${result.metadata.outputFormat}`);
    }
    console.log('  ---');
});

// Example 2: Different output formats
console.log('\nExample 2: Different output formats');

const formats = ['aladin', 'decimal', 'hms-dms'];
const testCoord = '12h 34m 56.78s, +12° 34\' 56.78"';

console.log(`Input coordinate: ${testCoord}`);
formats.forEach(format => {
    const formatSanitizer = new CoordinateSanitizer({ outputFormat: format });
    const result = formatSanitizer.sanitizeCoordinates(testCoord);
    console.log(`  ${format.toUpperCase()}: ${result.coordinates}`);
});

// Example 3: Custom precision
console.log('\nExample 3: Custom precision for decimal output');

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
console.log('\nExample 4: Range validation');

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
    console.log('  ---');
});

console.log('Testing with validation disabled:');
const noValidationSanitizer = new CoordinateSanitizer({ validateRanges: false });
invalidCoords.forEach(coord => {
    const result = noValidationSanitizer.sanitizeCoordinates(coord);
    console.log(`  Input: "${coord}"`);
    console.log(`  Valid: ${result.isValid}`);
    console.log(`  Output: "${result.coordinates}"`);
    if (result.error) console.log(`  Error: ${result.error}`);
    console.log('  ---');
});

// Example 5: Integration with existing systems
console.log('\nExample 5: Integration example');

class AstronomyApp {
    constructor() {
        this.sanitizer = new CoordinateSanitizer({
            outputFormat: 'aladin',
            validateRanges: true
        });
    }

    searchObject(input) {
        const result = this.sanitizer.sanitizeCoordinates(input);
        
        if (!result.isValid) {
            throw new Error(`Invalid coordinates: ${result.error}`);
        }

        // Simulate API call or telescope control
        console.log(`  Searching for: ${result.coordinates}`);
        console.log(`  Input type: ${result.metadata.inputFormat}`);
        
        return {
            searchTerm: result.coordinates,
            inputType: result.metadata.inputFormat,
            success: true
        };
    }
}

const app = new AstronomyApp();

const testTargets = [
    'M31',
    '12h 34m 56s, +12° 34\' 56"',
    'NGC 7000',
    '00h 42m 44.3s, +41° 16\' 09"'
];

console.log('Testing successful searches:');
testTargets.forEach(target => {
    try {
        console.log(`Target: "${target}"`);
        const result = app.searchObject(target);
        console.log(`  Success: ${result.success}`);
        console.log('  ---');
    } catch (error) {
        console.log(`  Error: ${error.message}`);
        console.log('  ---');
    }
});

console.log('Testing invalid coordinate (should fail):');
try {
    console.log('Target: "25h 00m 00s, +00° 00\' 00""');
    const result = app.searchObject('25h 00m 00s, +00° 00\' 00"');
    console.log('  This should not print');
} catch (error) {
    console.log(`  Expected error: ${error.message}`);
}

// Example 6: Batch processing
console.log('\nExample 6: Batch processing');

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
const batchResults = batchInputs.map(input => {
    const result = sanitizer.sanitizeCoordinates(input);
    return {
        input: input,
        valid: result.isValid,
        output: result.coordinates,
        type: result.metadata?.inputFormat || 'unknown',
        error: result.error || null
    };
});

console.log('\nBatch processing results:');
batchResults.forEach((result, index) => {
    console.log(`${index + 1}. Input: "${result.input}"`);
    console.log(`   Valid: ${result.valid}`);
    console.log(`   Output: "${result.output}"`);
    console.log(`   Type: ${result.type}`);
    if (result.error) console.log(`   Error: ${result.error}`);
    console.log('   ---');
});

// Example 7: Performance measurement
console.log('\nExample 7: Performance test');

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

// Example 8: Real astronomical objects
console.log('\nExample 8: Real astronomical objects');

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
    console.log('    ---');
});

// Example 9: Different coordinate separators
console.log('\nExample 9: Different coordinate separators');

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
    console.log('  ---');
});

// Example 10: Error handling patterns
console.log('\nExample 10: Error handling patterns');

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
    console.log('  ---');
});

// Example 11: Static methods
console.log('\nExample 11: Static methods and utilities');

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

console.log('\nExamples completed!');
console.log('The coordinate sanitizer is ready for integration into your astronomy applications.');