/**
 * Coordinate Sanitization Library TypeScript Definitions
 */

declare class CoordinateSanitizer {
  /** Configuration options */
  readonly options: Required<CoordinateSanitizer.CoordinateSanitizerOptions>;

  /**
   * Create a new CoordinateSanitizer instance
   * @param options Configuration options
   * @throws {TypeError} If outputFormat or raDecimalUnit is unknown, or a
   *   boolean option is not a boolean
   * @throws {RangeError} If precision, secondsPrecision or maxLength is out
   *   of range
   */
  constructor(options?: CoordinateSanitizer.CoordinateSanitizerOptions);

  /**
   * Main sanitization method
   * @param input Raw coordinate input
   * @returns Result object with validation status and sanitized coordinates
   */
  sanitizeCoordinates(input: string): CoordinateSanitizer.SanitizationResult;

  /**
   * Parse coordinates and return numeric values without formatting
   * @param input Raw coordinate input
   * @returns Numeric coordinates, or null if the input is invalid or an object name
   */
  parse(input: string): CoordinateSanitizer.ParsedCoordinates | null;

  /**
   * Parse a single right ascension value ("05 35 17.3", "05h35m17s",
   * "83.82", "5.588h"). A comma between digits is read as a decimal point
   * ("05 35 16,820"). Bare decimals use `raDecimalUnit`.
   * @param input RA text, without the declination
   * @returns RA in decimal hours, or null if invalid (or out of range when
   *   `validateRanges` is on)
   */
  parseRightAscension(input: string): number | null;

  /**
   * Parse a single declination value ("-05 23 28", "+41°16'09\"",
   * "-5.3911"). A comma between digits is read as a decimal point
   * ("-05 23 15,36").
   * @param input DEC text, without the right ascension
   * @returns DEC in decimal degrees, or null if invalid (or out of range when
   *   `validateRanges` is on)
   */
  parseDeclination(input: string): number | null;

  /**
   * Check if input looks like coordinates
   * @param input Input string to check
   * @returns True if input appears to be coordinates
   */
  looksLikeCoordinates(input: string): boolean;

  /**
   * Check if input is already identical to the canonical output for the
   * configured format (valid, in range, same precision and layout)
   * @param input Input string to check
   * @returns True if sanitizing the input would return it unchanged
   */
  isValidFormat(input: string): boolean;

  /**
   * Get information about supported formats
   * @returns Object containing supported input and output formats
   */
  static getSupportedFormats(): CoordinateSanitizer.SupportedFormats;

  /**
   * Create a sanitizer instance with a predefined configuration preset
   * @param preset Preset name: 'aladin', 'decimal', 'loose', or 'strict'
   * @returns A new CoordinateSanitizer configured with the chosen preset
   * @throws {Error} If an unknown preset name is provided
   */
  static createPreset(
    preset: "aladin" | "decimal" | "loose" | "strict"
  ): CoordinateSanitizer;
}

declare namespace CoordinateSanitizer {
  interface CoordinateSanitizerOptions {
    /** Output format for coordinates */
    outputFormat?: "aladin" | "decimal" | "hms-dms";
    /** Decimals of the `decimal` output format (integer, 0-20, default 6) */
    precision?: number;
    /**
     * Decimals of the seconds in the `aladin` and `hms-dms` output formats
     * (integer, 0-6, default 3)
     */
    secondsPrecision?: number;
    /** Enable range validation */
    validateRanges?: boolean;
    /**
     * Enable strict parsing mode.
     * In strict mode, compact (6-digit) and space-separated formats are rejected;
     * an explicit separator (comma or semicolon) between RA and DEC is required.
     */
    strictMode?: boolean;
    /**
     * Unit of a bare decimal RA input (and of decimal RA output).
     * Defaults to 'degrees', the astronomical convention for decimal coordinates.
     */
    raDecimalUnit?: "degrees" | "hours";
    /**
     * Parse IAU-style J2000 designations ("J053517.3-052328",
     * "2MASS J05351730-0523280") as coordinates instead of passing them
     * through as object names. Designations are truncated, so the position
     * is only as accurate as the last digit. Defaults to false.
     */
    parseDesignations?: boolean;
    /**
     * Pass input that is not a coordinate through as an object name
     * (default true). When false, such input is returned as an error.
     */
    allowObjectNames?: boolean;
    /**
     * Longer input is rejected before any parsing (positive integer or
     * Infinity, default 256)
     */
    maxLength?: number;
  }

  interface CoordinateComponent {
    /** Whether the component was successfully parsed */
    isValid: boolean;
    /** Decimal representation (hours for RA, degrees for DEC) */
    decimal?: number;
    /** Error message if parsing failed */
    error?: string;
    /** Format used for input */
    format?: string;
    /** Hours component (for RA) */
    hours?: number;
    /** Minutes component */
    minutes?: number;
    /** Seconds component */
    seconds?: number;
    /** Degrees component (for DEC) */
    degrees?: number;
  }

  interface SanitizationResult {
    /** Whether the input was successfully processed */
    isValid: boolean;
    /** Sanitized coordinate string */
    coordinates: string;
    /**
     * Error message if processing failed, null otherwise. It may quote the
     * input: escape it before rendering.
     */
    error: string | null;
    /** Additional metadata about the processing (empty object on error) */
    metadata: {
      /** Type of input detected */
      inputFormat?: "coordinates" | "object-name" | "already-valid";
      /** Output format used */
      outputFormat?: string;
      /** RA parsing details (if coordinates or already-valid) */
      ra?: CoordinateComponent;
      /** DEC parsing details (if coordinates or already-valid) */
      dec?: CoordinateComponent;
    };
  }

  interface ParsedCoordinates {
    /** Right ascension in decimal hours (0-24) */
    raHours: number;
    /** Right ascension in decimal degrees (0-360) */
    raDegrees: number;
    /** Declination in decimal degrees (-90 to +90) */
    decDegrees: number;
  }

  interface SupportedFormats {
    /** Supported input formats */
    input: string[];
    /** Supported output formats */
    output: string[];
  }
}

export = CoordinateSanitizer;
