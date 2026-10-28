#!/usr/bin/env node
/**
 * Command-line interface: sanitizes each argument, or each line of standard
 * input when no argument is given, and prints one result per line.
 * Exits with status 1 if any input is invalid.
 */

const { parseArgs } = require("node:util");
const readline = require("node:readline");
const CoordinateSanitizer = require("./index.js");

const USAGE = `Usage: coordinate-sanitizer [options] [input...]

Sanitizes each input (or each line of standard input) and prints the result.

Options:
  -f, --format <name>        aladin (default), decimal or hms-dms
  -p, --precision <n>        decimals of the decimal format (default 6)
  -s, --seconds <n>          decimals of the seconds (default 3)
      --hours                bare decimal RA is in hours, not degrees
      --strict               require an explicit RA/DEC separator
      --designations         parse IAU J2000 designations (J053517.3-052328)
      --no-names             reject object names instead of passing them through
      --json                 print the full result object as JSON
  -h, --help                 show this help`;

function main() {
  let parsed;
  try {
    parsed = parseArgs({
      allowPositionals: true,
      options: {
        format: { type: "string", short: "f" },
        precision: { type: "string", short: "p" },
        seconds: { type: "string", short: "s" },
        hours: { type: "boolean" },
        strict: { type: "boolean" },
        designations: { type: "boolean" },
        "no-names": { type: "boolean" },
        json: { type: "boolean" },
        help: { type: "boolean", short: "h" },
      },
    });
  } catch (error) {
    process.stderr.write(`${error.message}\n\n${USAGE}\n`);
    process.exit(2);
  }

  const { values, positionals } = parsed;
  if (values.help) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  let sanitizer;
  try {
    sanitizer = new CoordinateSanitizer({
      ...(values.format !== undefined && { outputFormat: values.format }),
      ...(values.precision !== undefined && { precision: Number(values.precision) }),
      ...(values.seconds !== undefined && { secondsPrecision: Number(values.seconds) }),
      raDecimalUnit: values.hours ? "hours" : "degrees",
      strictMode: Boolean(values.strict),
      parseDesignations: Boolean(values.designations),
      allowObjectNames: !values["no-names"],
    });
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(2);
  }

  let failed = false;
  const handle = (input) => {
    const result = sanitizer.sanitizeCoordinates(input);
    if (!result.isValid) failed = true;
    if (values.json) {
      process.stdout.write(`${JSON.stringify({ input, ...result })}\n`);
    } else if (result.isValid) {
      process.stdout.write(`${result.coordinates}\n`);
    } else {
      process.stderr.write(`${input}: ${result.error}\n`);
    }
  };

  if (positionals.length > 0) {
    positionals.forEach(handle);
    process.exitCode = failed ? 1 : 0;
    return;
  }

  const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  lines.on("line", (line) => {
    if (line.trim()) handle(line);
  });
  lines.on("close", () => {
    process.exitCode = failed ? 1 : 0;
  });
}

main();
