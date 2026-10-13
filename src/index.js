/**
 * Coordinate Sanitization Library
 * Handles various coordinate formats and converts them to standardized formats
 *
 * Based on the Voyager CoordinateSanitizer implementation
 *
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
      raDecimalUnit: "degrees", // 'degrees' | 'hours' — unit of a bare decimal RA input
      ...options,
    };
    this.validateOptions(this.options);
    Object.freeze(this.options);

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

      // Labeled coordinates: "RA 12 34 56 DEC +12 34 56", "RA: 12:34:56, DEC: -05:23:28"
      labeledPattern:
        /^RA\.?\s*[:=]?\s*(.+?)\s*[,;]?\s*DEC(?:L(?:INATION)?)?\.?\s*[:=]?\s*(.+)$/i,
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
      /^PK\s?[\d+\-.]+$/i, // PK planetary nebulae
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

    const cleanInput = this.cleanInput(input);

    // Object names are returned as typed, only trimmed and whitespace-collapsed
    const passthrough = () =>
      this.createResult(true, input.trim().replace(/\s+/g, " "), null, {
        inputFormat: "object-name",
        outputFormat: "passthrough",
      });

    if (!this.looksLikeCoordinates(cleanInput)) {
      return passthrough();
    }

    const result = this.parseCoordinates(cleanInput);
    if (result === null) {
      return passthrough();
    }

    // Input already identical to the canonical output
    if (result.isValid && result.coordinates === input) {
      result.metadata.inputFormat = "already-valid";
    }

    return result;
  }

  /**
   * Try every coordinate layout on a cleaned input.
   * @private
   * @returns {Object|null} Result object, or null if the input should be
   *   treated as an object name
   */
  parseCoordinates(cleanInput) {
    // Try labeled coordinates first ("RA ... DEC ..."): labels make the
    // input unambiguous, so this is allowed even in strict mode
    const labeledMatch = cleanInput.match(this.patterns.labeledPattern);
    if (labeledMatch) {
      return this.parseCombinedCoordinates(
        labeledMatch[1].trim(),
        labeledMatch[2].trim()
      );
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

    const spaceMatch = this.parseSpaceSeparatedCoordinates(cleanInput);
    if (spaceMatch.isValid) {
      return spaceMatch;
    }

    // Enough numeric components to be coordinates, but parsing failed:
    // report the error instead of falling back to object-name passthrough
    if (spaceMatch.error && !spaceMatch.error.includes("Insufficient")) {
      return spaceMatch;
    }

    // Purely numeric input cannot be an object name
    if (this.isNumericOnly(cleanInput)) {
      return this.createResult(
        false,
        "",
        `Unrecognized coordinate format: ${cleanInput}`
      );
    }

    return null;
  }

  /**
   * Parse coordinates and return numeric values without formatting.
   * @param {string} input - Raw coordinate input
   * @returns {{raHours: number, raDegrees: number, decDegrees: number}|null}
   *   Numeric coordinates, or null if the input is invalid or an object name
   */
  parse(input) {
    const result = this.sanitizeCoordinates(input);
    if (!result.isValid || !result.metadata) return null;

    const { metadata } = result;
    if (
      (metadata.inputFormat !== "coordinates" &&
        metadata.inputFormat !== "already-valid") ||
      !metadata.ra ||
      !metadata.dec
    ) {
      return null;
    }

    return {
      raHours: metadata.ra.decimal,
      raDegrees: metadata.ra.decimal * 15,
      decDegrees: metadata.dec.decimal,
    };
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
      // eslint-disable-next-line no-control-regex -- intentionally matches control characters
      /[\x00-\x1F\x7F]/,
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

    // Only digits, signs, separators and unit markers: e.g. "10, 20"
    if (this.isNumericOnly(input)) {
      return true;
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
   * Check if input is made only of digits, signs, separators and unit markers
   * @private
   */
  isNumericOnly(input) {
    return /\d/.test(input) && /^[\d\s.,;:+\-hmsd'"]+$/i.test(input);
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

    return this.finalizeCoordinates(raResult, decResult);
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

    if (numMatches.length > 6) {
      return this.createResult(
        false,
        "",
        `Too many coordinate components: expected 6, got ${numMatches.length}`
      );
    }

    // Anything left besides numbers must be separators or unit markers
    const residual = input.replace(/[+-]?\d+(?:\.\d+)?/g, "");
    if (!/^[\s:hmsd'"]*$/i.test(residual)) {
      return this.createResult(
        false,
        "",
        `Unexpected characters in coordinates: ${input}`
      );
    }

    if (/^[+-]/.test(numMatches[0])) {
      return this.createResult(
        false,
        "",
        `Invalid RA: sign not allowed on hours: ${numMatches[0]}`
      );
    }

    const raResult = this.buildRA(
      numMatches[0],
      numMatches[1],
      numMatches[2],
      "space-separated"
    );
    const decResult = this.buildDEC(
      numMatches[3],
      numMatches[4],
      numMatches[5],
      "space-separated"
    );

    return this.finalizeCoordinates(raResult, decResult);
  }

  /**
   * Validate parsed RA/DEC components and build the formatted result
   * @private
   */
  finalizeCoordinates(raResult, decResult) {
    if (!raResult.isValid || !decResult.isValid) {
      return this.createResult(false, "", raResult.error || decResult.error);
    }

    if (this.options.validateRanges) {
      const rangeError =
        this.validateRA(raResult.decimal) || this.validateDEC(decResult.decimal);
      if (rangeError) {
        return this.createResult(false, "", rangeError);
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
   * Build an RA component from sexagesimal string parts
   * @private
   */
  buildRA(h, m, s, format) {
    const hours = parseInt(h, 10);
    const minutes = parseInt(m, 10);
    const seconds = parseFloat(s);

    const componentError = this.validateSexagesimalComponents(
      minutes,
      seconds,
      "RA"
    );
    if (componentError) {
      return { isValid: false, error: componentError };
    }

    const decimal = this.hmsToDecimal(hours, minutes, seconds);
    return { isValid: true, decimal, hours, minutes, seconds, format };
  }

  /**
   * Build a DEC component from sexagesimal string parts
   * @private
   */
  buildDEC(d, m, s, format) {
    const degrees = parseInt(d, 10);
    const minutes = parseInt(m, 10);
    const seconds = parseFloat(s);

    const componentError = this.validateSexagesimalComponents(
      minutes,
      seconds,
      "DEC"
    );
    if (componentError) {
      return { isValid: false, error: componentError };
    }

    // Sign is taken from the string to handle the -00 case
    const isNegative = d.trim().startsWith("-");
    const decimal = this.dmsToDecimal(degrees, minutes, seconds, isNegative);
    return { isValid: true, decimal, degrees, minutes, seconds, format };
  }

  /**
   * Parse Right Ascension
   * @private
   */
  parseRA(raPart) {
    let match = raPart.match(this.patterns.raHMS);
    if (match) {
      return this.buildRA(match[1], match[2], match[3], "hms");
    }

    // Compact HMS is not available in strict mode
    if (!this.options.strictMode) {
      match = raPart.match(this.patterns.raHMSCompact);
      if (match) {
        return this.buildRA(match[1], match[2], match[3], "hms-compact");
      }
    }

    match = raPart.match(this.patterns.raDecimal);
    if (match) {
      const value = parseFloat(match[1]);
      // Bare decimal RA is in degrees by convention; convert to internal hours
      const decimal =
        this.options.raDecimalUnit === "hours" ? value : value / 15;
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
    let match = decPart.match(this.patterns.decDMS);
    if (match) {
      return this.buildDEC(match[1], match[2], match[3], "dms");
    }

    // Compact DMS is not available in strict mode
    if (!this.options.strictMode) {
      match = decPart.match(this.patterns.decDMSCompact);
      if (match) {
        return this.buildDEC(match[1], match[2], match[3], "dms-compact");
      }
    }

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
      case "decimal":
        return this.formatDecimal(raResult, decResult);
      case "hms-dms":
        return this.formatSexagesimal(raResult, decResult, ["h ", "m ", "s"], ["° ", "' ", '"']);
      default:
        return this.formatSexagesimal(raResult, decResult, [" ", " ", ""], [" ", " ", ""]);
    }
  }

  /**
   * Round seconds to 3 decimals and carry overflow into minutes and the
   * leading unit. A carry that reaches wrapAt wraps to 0 (24h == 0h).
   * @private
   */
  normalizeSexagesimal(lead, minutes, seconds, wrapAt = null) {
    let l = lead;
    let m = minutes;
    let s = Math.round(seconds * 1000) / 1000;
    if (s >= 60) {
      s = 0;
      m += 1;
    }
    if (m >= 60) {
      m = 0;
      l += 1;
      if (wrapAt !== null && l === wrapAt) l = 0;
    }
    return [l, m, s];
  }

  /**
   * Format as sexagesimal with the given unit suffixes, e.g. aladin
   * "HH MM SS.SSS, ±DD MM SS.SSS" or hms-dms "HHh MMm SS.SSSs, ±DD° MM' SS.SSS\""
   * @private
   */
  formatSexagesimal(raResult, decResult, raUnits, decUnits) {
    const pad = (n) => n.toString().padStart(2, "0");
    const sec = (n) => n.toFixed(3).padStart(6, "0");

    const [raH, raM, raS] = this.normalizeSexagesimal(
      raResult.hours,
      raResult.minutes,
      raResult.seconds,
      24
    );
    const [decD, decM, decS] = this.normalizeSexagesimal(
      Math.abs(decResult.degrees),
      Math.abs(decResult.minutes),
      Math.abs(decResult.seconds)
    );
    const decSign = decResult.decimal >= 0 ? "+" : "-";

    const ra = `${pad(raH)}${raUnits[0]}${pad(raM)}${raUnits[1]}${sec(raS)}${raUnits[2]}`;
    const dec = `${decSign}${pad(decD)}${decUnits[0]}${pad(decM)}${decUnits[1]}${sec(decS)}${decUnits[2]}`;
    return `${ra}, ${dec}`;
  }

  /**
   * Format as decimal values.
   * RA is output in the unit configured by raDecimalUnit (degrees by default)
   * so that decimal output round-trips through decimal input; DEC is always
   * in degrees.
   * @private
   */
  formatDecimal(raResult, decResult) {
    const { precision, raDecimalUnit } = this.options;
    const fullCircle = raDecimalUnit === "hours" ? 24 : 360;
    const raValue =
      raDecimalUnit === "hours" ? raResult.decimal : raResult.decimal * 15;

    // Rounding up to the full circle wraps to 0 (360° == 0°)
    let raFormatted = raValue.toFixed(precision);
    if (raValue < fullCircle && parseFloat(raFormatted) >= fullCircle) {
      raFormatted = (0).toFixed(precision);
    }

    return `${raFormatted}, ${decResult.decimal.toFixed(precision)}`;
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
        // A carry into hour 24 wraps to 0 (24h == 0h)
        if (hours === 24) hours = 0;
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
   * Validate sexagesimal minutes/seconds components (must be 0-59.999...).
   * Applied regardless of validateRanges: 99 minutes is malformed notation,
   * not an out-of-range value.
   * @private
   */
  validateSexagesimalComponents(minutes, seconds, axis) {
    if (minutes < 0 || minutes >= 60) {
      return `Invalid ${axis}: minutes out of range: ${minutes} (must be 0-59)`;
    }
    if (seconds < 0 || seconds >= 60) {
      return `Invalid ${axis}: seconds out of range: ${seconds} (must be 0-59.999)`;
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
   * Check if input is already identical to the canonical output for the
   * configured format (valid coordinates, same precision, same layout)
   */
  isValidFormat(input) {
    const result = this.sanitizeCoordinates(input);
    return result.isValid && result.metadata.inputFormat === "already-valid";
  }

  /**
   * Validate constructor options
   * @private
   * @throws {TypeError|RangeError} On unknown or out-of-range values
   */
  validateOptions(options) {
    const { outputFormat, precision, raDecimalUnit } = options;
    if (!["aladin", "decimal", "hms-dms"].includes(outputFormat)) {
      throw new TypeError(
        `Invalid outputFormat: "${outputFormat}" (expected aladin, decimal or hms-dms)`
      );
    }
    if (!Number.isInteger(precision) || precision < 0 || precision > 20) {
      throw new RangeError(
        `Invalid precision: ${precision} (expected an integer between 0 and 20)`
      );
    }
    if (!["degrees", "hours"].includes(raDecimalUnit)) {
      throw new TypeError(
        `Invalid raDecimalUnit: "${raDecimalUnit}" (expected degrees or hours)`
      );
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
        "Decimal degrees (123.456, -12.345)",
        "Compact (123456.78, -123456.78)",
        "Mixed separators (12:34:56.78, +12°34'56.78\")",
        "Labeled (RA 12 34 56.78 DEC +12 34 56.78)",
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
