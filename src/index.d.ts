/**
 * Coordinate Sanitization Library TypeScript Definitions
 */

declare class CoordinateSanitizer {
  /** Configuration options */
  readonly options: Required<CoordinateSanitizer.CoordinateSanitizerOptions>;

  /**
   * Create a new CoordinateSanitizer instance
   * @param options Configuration options
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
   * Check if input looks like coordinates
   * @param input Input string to check
   * @returns True if input appears to be coordinates
   */
  looksLikeCoordinates(input: string): boolean;

  /**
   * Check if input is already in valid format for the configured output
   * @param input Input string to check
   * @returns True if input is already in the target format
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
    /** Decimal precision for output */
    precision?: number;
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
    /** Error message if processing failed */
    error?: string | null;
    /** Additional metadata about the processing (empty object on error) */
    metadata?: {
      /** Type of input detected */
      inputFormat?: "coordinates" | "object-name" | "already-valid";
      /** Output format used */
      outputFormat?: string;
      /** RA parsing details (if coordinates) */
      ra?: CoordinateComponent;
      /** DEC parsing details (if coordinates) */
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
