// PII detection and redaction utilities
// Handles SSN, credit card numbers, driver's license patterns

const PII_PATTERNS: Array<{ name: string; pattern: RegExp; replacement: string }> = [
  {
    name: "ssn",
    pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
    replacement: "[SSN REDACTED]",
  },
  {
    name: "credit_card",
    pattern: /\b(?:\d[ -]?){13,19}\b/g,
    replacement: "[CARD NUMBER REDACTED]",
  },
  {
    name: "routing_number",
    pattern: /\b\d{9}\b/g,
    replacement: "[ROUTING NUMBER REDACTED]",
  },
  {
    name: "drivers_license",
    // Matches common US DL formats: letter(s) + digits
    pattern: /\b[A-Z]{1,2}\d{6,8}\b/g,
    replacement: "[DL REDACTED]",
  },
  {
    name: "phone",
    pattern: /\b(?:\+1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
    replacement: "[PHONE REDACTED]",
  },
];

export function redactPII(text: string): string {
  let redacted = text;
  for (const { pattern, replacement } of PII_PATTERNS) {
    redacted = redacted.replace(pattern, replacement);
  }
  return redacted;
}

export function containsPII(text: string): boolean {
  return PII_PATTERNS.some(({ pattern }) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

export function detectPIITypes(text: string): string[] {
  return PII_PATTERNS.filter(({ pattern }) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  }).map(({ name }) => name);
}
