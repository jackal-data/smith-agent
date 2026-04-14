export interface HandoffPayload {
  sessionId: string;
  customerId: string;
  summary: string;
  intentScore: number;
  vehiclesOfInterest: {
    vin: string;
    make: string;
    model: string;
    year: number;
    msrp: number;
    sentimentScore: number;
  }[];
  financingMentioned: boolean;
  tradeInMentioned: boolean;
  urgencySignals: string[];
  recommendedMarkup?: number;
  messageCount: number;
  sessionDurationMinutes: number;
}

export interface PricingRecommendation {
  openingMarkupPercent: number;
  rationale: string;
  confidenceLevel: "low" | "medium" | "high";
  negotiationFloor: number;
  talkingPoints: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}
