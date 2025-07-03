/**
 * Coordinate Sanitization Library
 * Handles various coordinate formats and converts them to standardized formats
 * 
 * @version 1.0.0
 * @author Your Name
 * @license MIT
 */

class CoordinateSanitizer {
    constructor(options = {}) {
        // Configuration options
        this.options = {
            outputFormat: 'aladin', // 'aladin' | 'decimal' | 'hms-dms'
            precision: 6,
            validateRanges: true,
            ...options
        };

        // Regex patterns for different coordinate formats
        this.patterns = {
            // RA patterns (hours, minutes, seconds)
            raHMS: /^(\d{1,2})\s*[h:\s]\s*(\d{1,2})\s*[m:'"′\s]\s*(\d{1,2}(?:\.\d+)?)\s*[s"'″\s]*$/i,
            raHMSCompact: /^(\d{2})(\d{2})(\d{2}(?:\.\d+)?)$/,
            raDecimal: /^(\d{1,3}(?:\.\d+)?)(?:[d°])?$/, 
            
            // DEC patterns (degrees, minutes, seconds)
            decDMS: /^([+-]?\d{1,2})\s*[d°:\s]\s*(\d{1,2})\s*[m:'"′\s]\s*(\d{1,2}(?:\.\d+)?)\s*[s"'″\s]*$/i,
            decDMSCompact: /^([+-]?\d{2})(\d{2})(\d{2}(?:\.\d+)?)$/,
            decDecimal: /^([+-]?\d{1,3}(?:\.\d+)?)(?:[d°])?$/,
            
            // Combined coordinate patterns
            combinedPattern: /^(.+?)\s*[,;·•]\s*(.+)$/,
            
            // Aladin format validation
            aladinFormat: /^\d{2}\s\d{2}\s\d{2}(?:\.\d+)?,\s[+-]?\d{2}\s\d{2}\s\d{2}(?:\.\d+)?$/
        };
    }

    /**
     * Main sanitization method
     * @param {string} input - Raw coordinate input
     * @returns {Object} Result object with isValid, coordinates, error, and metadata
     */
    sanitizeCoordinates(input) {
        if (!input || typeof input !== 'string') {
            return this.createResult(false, '', 'Input must be a non-empty string');
        }

        const cleanInput = input.trim();
        
        // Check if already in valid format
        if (this.isValidFormat(cleanInput)) {
            return this.createResult(true, cleanInput, null, { 
                inputFormat: 'already-valid',
                outputFormat: this.options.outputFormat
            });
        }

        // Check if it looks like coordinates
        if (!this.looksLikeCoordinates(cleanInput)) {
            return this.createResult(true, cleanInput, null, { 
                inputFormat: 'object-name',
                outputFormat: 'passthrough'
            });
        }

        // Try to parse as combined coordinates
        const combinedMatch = cleanInput.match(this.patterns.combinedPattern);
        if (combinedMatch) {
            return this.parseCombinedCoordinates(combinedMatch[1].trim(), combinedMatch[2].trim());
        }

        // If no separator found, assume it's an object name
        return this.createResult(true, cleanInput, null, { 
            inputFormat: 'object-name',
            outputFormat: 'passthrough'
        });
    }

    /**
     * Parse combined coordinates (RA and DEC)
     * @private
     */
    parseCombinedCoordinates(raPart, decPart) {
        const raResult = this.parseRA(raPart);
        const decResult = this.parseDEC(decPart);

        if (!raResult.isValid || !decResult.isValid) {
            return this.createResult(false, '', 
                `Invalid coordinates: ${raResult.error || decResult.error}`);
        }

        if (this.options.validateRanges) {
            const raError = this.validateRA(raResult.decimal);
            const decError = this.validateDEC(decResult.decimal);
            
            if (raError || decError) {
                return this.createResult(false, '', raError || decError);
            }
        }

        const formatted = this.formatOutput(raResult, decResult);
        return this.createResult(true, formatted, null, {
            inputFormat: 'coordinates',
            outputFormat: this.options.outputFormat,
            ra: raResult,
            dec: decResult
        });
    }

    /**
     * Parse Right Ascension
     * @private
     */
    parseRA(raPart) {
        // Try HMS format first
        let match = raPart.match(this.patterns.raHMS);
        if (match) {
            const hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            const seconds = parseFloat(match[3]);
            const decimal = this.hmsToDecimal(hours, minutes, seconds);
            return { isValid: true, decimal, hours, minutes, seconds, format: 'hms' };
        }

        // Try compact HMS format
        match = raPart.match(this.patterns.raHMSCompact);
        if (match) {
            const hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            const seconds = parseFloat(match[3]);
            const decimal = this.hmsToDecimal(hours, minutes, seconds);
            return { isValid: true, decimal, hours, minutes, seconds, format: 'hms-compact' };
        }

        // Try decimal format
        match = raPart.match(this.patterns.raDecimal);
        if (match) {
            const decimal = parseFloat(match[1]);
            const { hours, minutes, seconds } = this.decimalToHMS(decimal);
            return { isValid: true, decimal, hours, minutes, seconds, format: 'decimal' };
        }

        return { isValid: false, error: `Invalid RA format: ${raPart}` };
    }

    /**
     * Parse Declination
     * @private
     */
    parseDEC(decPart) {
        // Try DMS format first
        let match = decPart.match(this.patterns.decDMS);
        if (match) {
            const degrees = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            const seconds = parseFloat(match[3]);
            const decimal = this.dmsToDecimal(degrees, minutes, seconds);
            return { isValid: true, decimal, degrees, minutes, seconds, format: 'dms' };
        }

        // Try compact DMS format
        match = decPart.match(this.patterns.decDMSCompact);
        if (match) {
            const degrees = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            const seconds = parseFloat(match[3]);
            const decimal = this.dmsToDecimal(degrees, minutes, seconds);
            return { isValid: true, decimal, degrees, minutes, seconds, format: 'dms-compact' };
        }

        // Try decimal format
        match = decPart.match(this.patterns.decDecimal);
        if (match) {
            const decimal = parseFloat(match[1]);
            const { degrees, minutes, seconds } = this.decimalToDMS(decimal);
            return { isValid: true, decimal, degrees, minutes, seconds, format: 'decimal' };
        }

        return { isValid: false, error: `Invalid DEC format: ${decPart}` };
    }

    /**
     * Format output according to specified format
     * @private
     */
    formatOutput(raResult, decResult) {
        switch (this.options.outputFormat) {
            case 'aladin':
                return this.formatAladin(raResult, decResult);
            case 'decimal':
                return this.formatDecimal(raResult, decResult);
            case 'hms-dms':
                return this.formatHMSDMS(raResult, decResult);
            default:
                return this.formatAladin(raResult, decResult);
        }
    }

    /**
     * Format for Aladin: "HH MM SS.SSS, ±DD MM SS.SSS"
     * @private
     */
    formatAladin(raResult, decResult) {
        const raFormatted = `${raResult.hours.toString().padStart(2, '0')} ${raResult.minutes.toString().padStart(2, '0')} ${raResult.seconds.toFixed(3).padStart(6, '0')}`;
        const decSign = decResult.decimal >= 0 ? '+' : '';
        const decFormatted = `${decSign}${decResult.degrees.toString().padStart(2, '0')} ${Math.abs(decResult.minutes).toString().padStart(2, '0')} ${Math.abs(decResult.seconds).toFixed(3).padStart(6, '0')}`;
        
        return `${raFormatted}, ${decFormatted}`;
    }

    /**
     * Format as decimal degrees
     * @private
     */
    formatDecimal(raResult, decResult) {
        return `${raResult.decimal.toFixed(this.options.precision)}, ${decResult.decimal.toFixed(this.options.precision)}`;
    }

    /**
     * Format as HMS/DMS with symbols
     * @private
     */
    formatHMSDMS(raResult, decResult) {
        const raFormatted = `${raResult.hours}h ${raResult.minutes}m ${raResult.seconds.toFixed(3)}s`;
        const decSign = decResult.decimal >= 0 ? '+' : '';
        const decFormatted = `${decSign}${decResult.degrees}° ${Math.abs(decResult.minutes)}' ${Math.abs(decResult.seconds).toFixed(3)}"`;
        
        return `${raFormatted}, ${decFormatted}`;
    }

    /**
     * Convert HMS to decimal hours
     * @private
     */
    hmsToDecimal(hours, minutes, seconds) {
        return hours + minutes / 60 + seconds / 3600;
    }

    /**
     * Convert decimal hours to HMS
     * @private
     */
    decimalToHMS(decimal) {
        const hours = Math.floor(decimal);
        const minutesDecimal = (decimal - hours) * 60;
        const minutes = Math.floor(minutesDecimal);
        const seconds = (minutesDecimal - minutes) * 60;
        
        return { hours, minutes, seconds };
    }

    /**
     * Convert DMS to decimal degrees
     * @private
     */
    dmsToDecimal(degrees, minutes, seconds) {
        const sign = degrees < 0 ? -1 : 1;
        return sign * (Math.abs(degrees) + minutes / 60 + seconds / 3600);
    }

    /**
     * Convert decimal degrees to DMS
     * @private
     */
    decimalToDMS(decimal) {
        const sign = decimal < 0 ? -1 : 1;
        const absDecimal = Math.abs(decimal);
        const degrees = Math.floor(absDecimal) * sign;
        const minutesDecimal = (absDecimal - Math.floor(absDecimal)) * 60;
        const minutes = Math.floor(minutesDecimal);
        const seconds = (minutesDecimal - minutes) * 60;
        
        return { degrees, minutes, seconds };
    }

    /**
     * Validate RA range (0-24 hours)
     * @private
     */
    validateRA(decimal) {
        if (decimal < 0 || decimal >= 24) {
            return `RA out of range: ${decimal} (must be 0-24 hours)`;
        }
        return null;
    }

    /**
     * Validate DEC range (-90 to +90 degrees)
     * @private
     */
    validateDEC(decimal) {
        if (decimal < -90 || decimal > 90) {
            return `DEC out of range: ${decimal} (must be -90 to +90 degrees)`;
        }
        return null;
    }

    /**
     * Check if input looks like coordinates
     * @private
     */
    looksLikeCoordinates(input) {
        // Contains coordinate separators
        if (this.patterns.combinedPattern.test(input)) return true;
        
        // Contains coordinate symbols
        if (/[hms°'"′″:]/i.test(input)) return true;
        
        // Contains multiple numbers
        if ((input.match(/\d+/g) || []).length >= 2) return true;
        
        return false;
    }

    /**
     * Check if input is already in valid format
     * @private
     */
    isValidFormat(input) {
        switch (this.options.outputFormat) {
            case 'aladin':
                return this.patterns.aladinFormat.test(input);
            default:
                return false;
        }
    }

    /**
     * Create standardized result object
     * @private
     */
    createResult(isValid, coordinates, error, metadata = {}) {
        return {
            isValid,
            coordinates,
            error,
            metadata
        };
    }

    /**
     * Static method to get supported formats
     * @static
     */
    static getSupportedFormats() {
        return {
            input: [
                'HMS/DMS (12h 34m 56.78s, +12° 34\' 56.78")',
                'Decimal (123.456, -12.345)',
                'Compact (123456.78, -123456.78)',
                'Mixed separators (12:34:56.78, +12°34\'56.78")'
            ],
            output: [
                'aladin', 'decimal', 'hms-dms'
            ]
        };
    }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoordinateSanitizer;
} else if (typeof window !== 'undefined') {
    window.CoordinateSanitizer = CoordinateSanitizer;
}

// Export as ES6 module
export default CoordinateSanitizer;