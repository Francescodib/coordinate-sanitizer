/**
 * Compile-time smoke test for src/index.d.ts.
 * Run with: npm run typecheck
 * This file is never executed; it only has to compile under --strict.
 */

import CoordinateSanitizer = require("../src/index");

// Constructor with all options
const sanitizer = new CoordinateSanitizer({
  outputFormat: "decimal",
  precision: 4,
  validateRanges: true,
  strictMode: false,
  raDecimalUnit: "degrees",
  parseDesignations: false,
});

// Options are readable and fully resolved
const format: "aladin" | "decimal" | "hms-dms" = sanitizer.options.outputFormat;

// sanitizeCoordinates result shape
const result: CoordinateSanitizer.SanitizationResult =
  sanitizer.sanitizeCoordinates("12h 34m 56s, +12° 34' 56\"");
if (result.isValid && result.metadata && result.metadata.ra) {
  const hours: number | undefined = result.metadata.ra.hours;
  void hours;
}

// parse() returns numeric values or null
const parsed: CoordinateSanitizer.ParsedCoordinates | null =
  sanitizer.parse("12 30 00, +45 00 00");
if (parsed) {
  const sum: number = parsed.raHours + parsed.raDegrees + parsed.decDegrees;
  void sum;
}

// Instance helpers
const isCoords: boolean = sanitizer.looksLikeCoordinates("M31");
const isValid: boolean = sanitizer.isValidFormat("12 34 56.000, +12 34 56.000");

// Static methods
const preset: CoordinateSanitizer = CoordinateSanitizer.createPreset("strict");
const formats: CoordinateSanitizer.SupportedFormats =
  CoordinateSanitizer.getSupportedFormats();

void format;
void isCoords;
void isValid;
void preset;
void formats;

export {};
