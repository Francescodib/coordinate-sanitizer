/**
 * Coordinate Sanitization Library
 * Handles various coordinate formats and converts them to standardized formats
 *
 * Based on the Voyager CoordinateSanitizer implementation
 *
 * @version 1.0.4
 * @author Francesco di Biase
 * @license MIT
 */

class CoordinateSanitizer {
  constructor(options = {}) {
    // Configuration options
    this.options = {
      outputFormat: "aladin", // 'aladin' | 'decimal' | 'hms-dms'
      precision: 6,
      validateRanges: true,
      strictMode: false,
      ...options,
    };

    // Regex patterns for different coordinate formats
    this.patterns = {
      // RA patterns (hours, minutes, seconds) - more flexible with spaces
      raHMS:
        /^(\d{1,2})\s*[h:\s]\s*(\d{1,2})\s*[m:'"′\s]\s*(\d{1,2}(?:\.\d+)?)\s*[s"'″\s]*$/i,
      raHMSCompact: /^(\d{2})(\d{2})(\d{2}(?:\.\d+)?)$/,
      raDecimal: /^(\d{1,3}(?:\.\d+)?)(?:[d°])?$/,

      // DEC patterns (degrees, minutes, seconds) - more flexible with spaces
      decDMS:
        /^([+-]?\d{1,2})\s*[d°:\s]\s*(\d{1,2})\s*[m:'"′\s]\s*(\d{1,2}(?:\.\d+)?)\s*[s"'″\s]*$/i,
      decDMSCompact: /^([+-]?\d{2})(\d{2})(\d{2}(?:\.\d+)?)$/,
      decDecimal: /^([+-]?\d{1,3}(?:\.\d+)?)(?:[d°])?$/,

      // Combined coordinate patterns - more flexible
      combinedPattern: /^(.+?)\s*[,;·•]\s*(.+)$/,

      // Aladin expected format: "HH MM SS.SSS, ±DD MM SS.SSS"
      // Requires explicit decimal part and sign so ambiguous space-separated inputs are not misidentified
      aladinFormat:
        /^\d{2}\s\d{2}\s\d{2}\.\d+,\s[+-]\d{2}\s\d{2}\s\d{2}\.\d+$/,
    };

    // Common catalog patterns for object identification
    this.catalogPatterns = [
      /^M\s?\d+$/i, // Messier objects
      /^NGC\s?\d+$/i, // NGC catalog
      /^IC\s?\d+$/i, // IC catalog
      /^UGC\s?\d+$/i, // UGC catalog
      /^PGC\s?\d+$/i, // PGC catalog
      /^HIP\s?\d+$/i, // Hipparcos catalog
      /^HD\s?\d+$/i, // Henry Draper catalog
      /^SAO\s?\d+$/i, // SAO catalog
      /^Sh2[-\s]?\d+$/i, // Sharpless nebulae
      /^Barnard\s?\d+$/i, // Barnard objects
      /^PK\s?[\d+\-.\+]+$/i, // PK planetary nebulae
      /^LBN\s?\d+$/i, // Lynds' bright nebulae
      /^[A-Z]{2,}\s+[A-Z]{2,}$/i, // Named stars (ALPHA CENTAURI)
      /^\d+\s+[A-Z]{2,}$/i, // e.g. "51 Eri"
      /^[A-Z]\s+[A-Z]{2,}$/i, // e.g. "R And"
    ];
  }

  /**
   * Main sanitization method
   * @param {string} input - Raw coordinate input
   * @returns {Object} Result object with isValid, coordinates, error, and metadata
   */
  sanitizeCoordinates(input) {
    // Input validation
    if (!input || typeof input !== "string") {
      return this.createResult(false, "", "Input must be a non-empty string");
    }

    // Security check on raw input before any transformation
    if (this.containsMaliciousContent(input)) {
      return this.createResult(
        false,
        "",
        "Input contains potentially malicious content"
      );
    }

    // Check if already in valid format before cleaning (preserves original)
    if (this.isValidFormat(input)) {
      return this.createResult(true, input, null, {
        inputFormat: "already-valid",
        outputFormat: this.options.outputFormat,
      });
    }

    const cleanInput = this.cleanInput(input);

    // Check if it looks like coordinates
    if (!this.looksLikeCoordinates(cleanInput)) {
      return this.createResult(true, cleanInput, null, {
        inputFormat: "object-name",
        outputFormat: "passthrough",
      });
    }

    // Try to parse as combined coordinates (explicit separator)
    const combinedMatch = cleanInput.match(this.patterns.combinedPattern);
    if (combinedMatch) {
      return this.parseCombinedCoordinates(
        combinedMatch[1].trim(),
        combinedMatch[2].trim()
      );
    }

    // Space-separated coordinates are ambiguous; disabled in strict mode
    if (this.options.strictMode) {
      return this.createResult(
        false,
        "",
        "Strict mode: use an explicit separator (comma or semicolon) between RA and DEC"
      );
    }

    // Try to parse as space-separated coordinates
    const spaceMatch = this.parseSpaceSeparatedCoordinates(cleanInput);
    if (spaceMatch.isValid) {
      return spaceMatch;
    }

    // If no separator found, assume it's an object name
    return this.createResult(true, cleanInput, null, {
      inputFormat: "object-name",
      outputFormat: "passthrough",
    });
  }

  /**
   * Clean and normalize input string
   * @private
   */
  cleanInput(input) {
    return input
      .replace(/[""'']/g, '"')
      .replace(/[°ºª]/g, "d")
      .replace(/[′']/g, "'")
      .replace(/[″"]/g, '"')
      .replace(/[\u2013\u2014\u2212]/g, "-")
      .replace(/[·•]/g, ",")
      .replace(/\s*[,;]\s*/g, ",")
      .replace(/\s*:\s*/g, ":")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Check for potentially malicious content
   * @private
   */
  containsMaliciousContent(input) {
    const dangerousPatterns = [
      /<[^>]*>/, // HTML tags
      /javascript:/i, // JavaScript protocol
      /on\w+\s*=/i, // Event handlers
      /[\x00-\x1F\x7F]/, // Control characters
    ];

    return dangerousPatterns.some((pattern) => pattern.test(input));
  }

  /**
   * Check if input looks like coordinates
   * @private
   */
  looksLikeCoordinates(input) {
    if (!input) return false;

    const cleanInput = input.toUpperCase();

    // Check for common object name patterns first
    if (this.catalogPatterns.some((pattern) => pattern.test(cleanInput))) {
      return false;
    }

    // Check if it contains coordinate-like patterns
    const coordinateIndicators = [
      /\d+[hH:]\s*\d+/, // Hours notation
      /\d+[dD°]\s*\d+/, // Degrees notation
      /[+-]\s*\d+/, // Signed numbers
      /\d+[mM'′]\s*\d+/, // Minutes notation
      /\d+[sS"″]/, // Seconds notation
      /\d+\.\d+.*,.*\d+\.\d+/, // Decimal pairs
      /RA|DEC|DECL/i, // Explicit RA/DEC labels
    ];

    return coordinateIndicators.some((pattern) => pattern.test(input));
  }

  /**
   * Parse combined coordinates (RA and DEC separated by comma, semicolon, etc.)
   * @private
   */
  parseCombinedCoordinates(raPart, decPart) {
    const raResult = this.parseRA(raPart);
    const decResult = this.parseDEC(decPart);

    if (!raResult.isValid || !decResult.isValid) {
      return this.createResult(
        false,
        "",
        `Invalid coordinates: ${raResult.error || decResult.error}`
      );
    }

    if (this.options.validateRanges) {
      const raError = this.validateRA(raResult.decimal);
      const decError = this.validateDEC(decResult.decimal);

      if (raError || decError) {
        return this.createResult(false, "", raError || decError);
      }
    }

    const formatted = this.formatOutput(raResult, decResult);
    return this.createResult(true, formatted, null, {
      inputFormat: "coordinates",
      outputFormat: this.options.outputFormat,
      ra: raResult,
      dec: decResult,
    });
  }

  /**
   * Parse space-separated coordinates (without comma/semicolon separator)
   * @private
   */
  parseSpaceSeparatedCoordinates(input) {
    // Match numbers including decimals and signs
    const numMatches = input.match(/([+-]?\d+(?:\.\d+)?)/g);

    if (!numMatches || numMatches.length < 6) {
      return this.createResult(false, "", "Insufficient coordinate components");
    }

    const raH = parseFloat(numMatches[0]);
    const raM = parseFloat(numMatches[1]);
    const raS = parseFloat(numMatches[2]);
    const decD = parseFloat(numMatches[3]);
    const decM = parseFloat(numMatches[4]);
    const decS = parseFloat(numMatches[5]);

    const raDecimal = this.hmsToDecimal(raH, raM, raS);
    // Check if original string had negative sign (handles -00 case)
    const isNegative = numMatches[3].trim().startsWith("-");
    const decDecimal = this.dmsToDecimal(decD, decM, decS, isNegative);

    if (this.options.validateRanges) {
      const raError = this.validateRA(raDecimal);
      const decError = this.validateDEC(decDecimal);

      if (raError || decError) {
        return this.createResult(false, "", raError || decError);
      }
    }

    const raResult = {
      decimal: raDecimal,
      hours: raH,
      minutes: raM,
      seconds: raS,
    };
    const decResult = {
      decimal: decDecimal,
      degrees: decD,
      minutes: decM,
      seconds: decS,
    };

    const formatted = this.formatOutput(raResult, decResult);
    return this.createResult(true, formatted, null, {
      inputFormat: "coordinates",
      outputFormat: this.options.outputFormat,
      ra: raResult,
      dec: decResult,
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

      // Check for negative values in HMS format
      if (hours < 0 || minutes < 0 || seconds < 0) {
        return {
          isValid: false,
          error: `Invalid RA format: ${raPart} (negative values not allowed in HMS)`,
        };
      }

      const decimal = this.hmsToDecimal(hours, minutes, seconds);
      return { isValid: true, decimal, hours, minutes, seconds, format: "hms" };
    }

    // Try compact HMS format (not available in strict mode)
    if (!this.options.strictMode) {
      match = raPart.match(this.patterns.raHMSCompact);
      if (match) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = parseFloat(match[3]);

        if (hours < 0 || minutes < 0 || seconds < 0) {
          return {
            isValid: false,
            error: `Invalid RA format: ${raPart} (negative values not allowed in HMS)`,
          };
        }

        const decimal = this.hmsToDecimal(hours, minutes, seconds);
        return {
          isValid: true,
          decimal,
          hours,
          minutes,
          seconds,
          format: "hms-compact",
        };
      }
    }

    // Try decimal format
    match = raPart.match(this.patterns.raDecimal);
    if (match) {
      const decimal = parseFloat(match[1]);
      const { hours, minutes, seconds } = this.decimalToHMS(decimal);
      return {
        isValid: true,
        decimal,
        hours,
        minutes,
        seconds,
        format: "decimal",
      };
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
      // Check if original string had negative sign (handles -00 case)
      const isNegative = match[1].trim().startsWith("-");
      const decimal = this.dmsToDecimal(degrees, minutes, seconds, isNegative);
      return {
        isValid: true,
        decimal,
        degrees,
        minutes,
        seconds,
        format: "dms",
      };
    }

    // Try compact DMS format (not available in strict mode)
    if (!this.options.strictMode) {
      match = decPart.match(this.patterns.decDMSCompact);
      if (match) {
        const degrees = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = parseFloat(match[3]);
        // Check if original string had negative sign (handles -00 case)
        const isNegative = match[1].trim().startsWith("-");
        const decimal = this.dmsToDecimal(degrees, minutes, seconds, isNegative);
        return {
          isValid: true,
          decimal,
          degrees,
          minutes,
          seconds,
          format: "dms-compact",
        };
      }
    }

    // Try decimal format
    match = decPart.match(this.patterns.decDecimal);
    if (match) {
      const decimal = parseFloat(match[1]);
      const { degrees, minutes, seconds } = this.decimalToDMS(decimal);
      return {
        isValid: true,
        decimal,
        degrees,
        minutes,
        seconds,
        format: "decimal",
      };
    }

    return { isValid: false, error: `Invalid DEC format: ${decPart}` };
  }

  /**
   * Format output according to specified format
   * @private
   */
  formatOutput(raResult, decResult) {
    switch (this.options.outputFormat) {
      case "aladin":
        return this.formatAladin(raResult, decResult);
      case "decimal":
        return this.formatDecimal(raResult, decResult);
      case "hms-dms":
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
    // Normalize to prevent seconds from rounding to 60 at 3 decimal places
    let raH = raResult.hours, raM = raResult.minutes;
    let raS = Math.round(raResult.seconds * 1000) / 1000;
    if (raS >= 60) { raS = 0; raM += 1; if (raM >= 60) { raM = 0; raH += 1; } }

    let decD = Math.abs(decResult.degrees), decM = Math.abs(decResult.minutes);
    let decS = Math.round(Math.abs(decResult.seconds) * 1000) / 1000;
    if (decS >= 60) { decS = 0; decM += 1; if (decM >= 60) { decM = 0; decD += 1; } }

    const raFormatted = `${raH.toString().padStart(2, "0")} ${raM.toString().padStart(2, "0")} ${raS.toFixed(3).padStart(6, "0")}`;
    const decSign = decResult.decimal >= 0 ? "+" : "-";
    const decFormatted = `${decSign}${decD.toString().padStart(2, "0")} ${decM.toString().padStart(2, "0")} ${decS.toFixed(3).padStart(6, "0")}`;

    return `${raFormatted}, ${decFormatted}`;
  }

  /**
   * Format as decimal degrees
   * @private
   */
  formatDecimal(raResult, decResult) {
    return `${raResult.decimal.toFixed(
      this.options.precision
    )}, ${decResult.decimal.toFixed(this.options.precision)}`;
  }

  /**
   * Format as HMS/DMS with symbols
   * @private
   */
  formatHMSDMS(raResult, decResult) {
    // Normalize to prevent seconds from rounding to 60 at 3 decimal places
    let raH = raResult.hours, raM = raResult.minutes;
    let raS = Math.round(raResult.seconds * 1000) / 1000;
    if (raS >= 60) { raS = 0; raM += 1; if (raM >= 60) { raM = 0; raH += 1; } }

    let decD = Math.abs(decResult.degrees), decM = Math.abs(decResult.minutes);
    let decS = Math.round(Math.abs(decResult.seconds) * 1000) / 1000;
    if (decS >= 60) { decS = 0; decM += 1; if (decM >= 60) { decM = 0; decD += 1; } }

    const raFormatted = `${raH.toString().padStart(2, "0")}h ${raM.toString().padStart(2, "0")}m ${raS.toFixed(3).padStart(6, "0")}s`;
    const decSign = decResult.decimal >= 0 ? "+" : "-";
    const decFormatted = `${decSign}${decD.toString().padStart(2, "0")}° ${decM.toString().padStart(2, "0")}' ${decS.toFixed(3).padStart(6, "0")}"`;

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
   * Handles floating point carry correctly.
   * @private
   */
  decimalToHMS(decimal) {
    let hours = Math.floor(decimal);
    const minutesDecimal = (decimal - hours) * 60;
    let minutes = Math.floor(minutesDecimal);
    let seconds = Math.round((minutesDecimal - minutes) * 60 * 1000) / 1000;

    // Carry over floating point overflow
    if (seconds >= 60) {
      seconds = 0;
      minutes += 1;
      if (minutes >= 60) {
        minutes = 0;
        hours += 1;
      }
    }

    return { hours, minutes, seconds };
  }

  /**
   * Convert DMS to decimal degrees
   * @private
   */
  dmsToDecimal(degrees, minutes, seconds, isNegative = null) {
    // If isNegative is explicitly provided, use it (handles -00 case)
    // Otherwise, determine sign from degrees value
    const sign = isNegative !== null ? (isNegative ? -1 : 1) : (degrees < 0 ? -1 : 1);
    return sign * (Math.abs(degrees) + minutes / 60 + seconds / 3600);
  }

  /**
   * Convert decimal degrees to DMS
   * Handles floating point carry correctly.
   * @private
   */
  decimalToDMS(decimal) {
    const sign = decimal < 0 ? -1 : 1;
    const absDecimal = Math.abs(decimal);
    let deg = Math.floor(absDecimal);
    const minutesDecimal = (absDecimal - deg) * 60;
    let minutes = Math.floor(minutesDecimal);
    let seconds = Math.round((minutesDecimal - minutes) * 60 * 1000) / 1000;

    // Carry over floating point overflow
    if (seconds >= 60) {
      seconds = 0;
      minutes += 1;
      if (minutes >= 60) {
        minutes = 0;
        deg += 1;
      }
    }

    const degrees = deg * sign;
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
   * Check if input is already in valid format for the configured output
   * @private
   */
  isValidFormat(input) {
    switch (this.options.outputFormat) {
      case "aladin":
        return this.patterns.aladinFormat.test(input);
      case "decimal":
        return /^\d+\.\d+,\s*[+-]?\d+\.\d+$/.test(input);
      case "hms-dms":
        return /^\d{2}h \d{2}m \d{2}\.\d{3}s, [+-]\d{2}° \d{2}' \d{2}\.\d{3}"$/.test(input);
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
      metadata,
    };
  }

  /**
   * Static method to get supported formats
   * @static
   */
  static getSupportedFormats() {
    return {
      input: [
        "HMS/DMS (12h 34m 56.78s, +12° 34' 56.78\")",
        "Decimal (123.456, -12.345)",
        "Compact (123456.78, -123456.78)",
        "Mixed separators (12:34:56.78, +12°34'56.78\")",
        "Object names (M31, NGC 1234, etc.)",
      ],
      output: ["aladin", "decimal", "hms-dms"],
    };
  }

  /**
   * Static method to create sanitizer with common presets
   * @param {string} preset - Preset name: 'aladin', 'decimal', 'loose', or 'strict'
   * @returns {CoordinateSanitizer}
   * @throws {Error} If an unknown preset name is provided
   * @static
   */
  static createPreset(preset) {
    const presets = {
      aladin: { outputFormat: "aladin", validateRanges: true },
      decimal: { outputFormat: "decimal", precision: 6, validateRanges: true },
      loose: { outputFormat: "aladin", validateRanges: false },
      strict: {
        outputFormat: "aladin",
        validateRanges: true,
        strictMode: true,
      },
    };

    if (!presets[preset]) {
      throw new Error(
        `Unknown preset: "${preset}". Available presets: ${Object.keys(presets).join(", ")}`
      );
    }

    return new CoordinateSanitizer(presets[preset]);
  }
}

// Export per CommonJS (Node.js)
module.exports = CoordinateSanitizer;
