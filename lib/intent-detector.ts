// Buying intent scoring logic
// Scores user messages and accumulates session intent score

interface IntentSignal {
  pattern: RegExp;
  weight: number;
  label: string;
}

const INTENT_SIGNALS: IntentSignal[] = [
  // High intent signals
  { pattern: /\b(buy|purchase|get|take|want)\b.{0,20}\b(car|vehicle|this|it)\b/i, weight: 0.15, label: "purchase_intent" },
  { pattern: /\bhow much.{0,30}(finance|monthly|payment|down|deposit)/i, weight: 0.12, label: "financing_interest" },
  { pattern: /\b(trade.?in|trade\s+my|sell\s+my)\b/i, weight: 0.10, label: "trade_in" },
  { pattern: /\b(test\s*drive|come\s+in|visit|appointment|schedule)\b/i, weight: 0.12, label: "appointment_interest" },
  { pattern: /\b(this\s+week|today|tomorrow|weekend|asap|soon|right\s+away)\b/i, weight: 0.10, label: "urgency" },
  { pattern: /\bavailability|is\s+it\s+available|still\s+available|in\s+stock\b/i, weight: 0.08, label: "availability_check" },
  // Medium intent signals
  { pattern: /\b(color|trim|feature|option|package|upgrade)\b/i, weight: 0.05, label: "spec_inquiry" },
  { pattern: /\bcompare|vs\.|versus|difference\s+between\b/i, weight: 0.04, label: "comparison" },
  { pattern: /\b(vin|vehicle\s+identification)\b/i, weight: 0.06, label: "vin_inquiry" },
  { pattern: /\bwarranty|guarantee|coverage\b/i, weight: 0.04, label: "warranty_inquiry" },
  // Lower intent
  { pattern: /\bprice|cost|how\s+much|msrp\b/i, weight: 0.03, label: "price_inquiry" },
  { pattern: /\bmileage|mpg|fuel|gas\b/i, weight: 0.02, label: "spec_basic" },
];

export function scoreMessage(content: string): number {
  let score = 0;
  for (const signal of INTENT_SIGNALS) {
    if (signal.pattern.test(content)) {
      score += signal.weight;
    }
  }
  return Math.min(score, 0.3); // cap single message contribution
}

export function detectUrgencySignals(content: string): string[] {
  const signals: string[] = [];
  for (const signal of INTENT_SIGNALS) {
    if (signal.pattern.test(content)) {
      signals.push(signal.label);
    }
  }
  return signals;
}

export function computeSessionIntent(scores: number[]): number {
  if (scores.length === 0) return 0;
  // Use diminishing returns: early signals matter more
  let total = 0;
  for (let i = 0; i < scores.length; i++) {
    total += scores[i] * Math.pow(0.85, i);
  }
  return Math.min(total, 1.0);
}

export const HANDOFF_THRESHOLD = 0.72;
