/**
 * Coordinate Sanitization Library TypeScript Definitions
 * @version 1.0.4
 */

export interface CoordinateSanitizerOptions {
  /** Output format for coordinates */
  outputFormat?: 'aladin' | 'decimal' | 'hms-dms';
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
}

export interface CoordinateComponent {
  /** Whether the component was successfully parsed */
  isValid: boolean;
  /** Decimal representation */
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

export interface SanitizationResult {
  /** Whether the input was successfully processed */
  isValid: boolean;
  /** Sanitized coordinate string */
  coordinates: string;
  /** Error message if processing failed */
  error?: string | null;
  /** Additional metadata about the processing */
  metadata?: {
    /** Type of input detected */
    inputFormat: 'coordinates' | 'object-name' | 'already-valid';
    /** Output format used */
    outputFormat: string;
    /** RA parsing details (if coordinates) */
    ra?: CoordinateComponent;
    /** DEC parsing details (if coordinates) */
    dec?: CoordinateComponent;
  };
}

export interface SupportedFormats {
  /** Supported input formats */
  input: string[];
  /** Supported output formats */
  output: string[];
}

/**
 * Coordinate Sanitizer Class
 * Handles various coordinate formats and converts them to standardized formats
 */
declare class CoordinateSanitizer {
  /** Configuration options */
  readonly options: Required<CoordinateSanitizerOptions>;

  /**
   * Create a new CoordinateSanitizer instance
   * @param options Configuration options
   */
  constructor(options?: CoordinateSanitizerOptions);

  /**
   * Main sanitization method
   * @param input Raw coordinate input
   * @returns Result object with validation status and sanitized coordinates
   */
  sanitizeCoordinates(input: string): SanitizationResult;

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
  static getSupportedFormats(): SupportedFormats;

  /**
   * Create a sanitizer instance with a predefined configuration preset
   * @param preset Preset name: 'aladin', 'decimal', 'loose', or 'strict'
   * @returns A new CoordinateSanitizer configured with the chosen preset
   * @throws {Error} If an unknown preset name is provided
   */
  static createPreset(preset: 'aladin' | 'decimal' | 'loose' | 'strict'): CoordinateSanitizer;
}

export = CoordinateSanitizer;
