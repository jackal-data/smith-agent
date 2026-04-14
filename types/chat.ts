export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  createdAt: string;
  toolName?: string;
  toolOutput?: string;
}

export interface ChatSession {
  id: string;
  status: "ACTIVE" | "HANDED_OFF" | "CLOSED" | "ARCHIVED";
  intentScore: number;
  handoffTriggered: boolean;
  messages: ChatMessage[];
}

export interface IntentSignal {
  label: string;
  weight: number;
  detected: boolean;
}

export interface StreamChunk {
  type: "text" | "tool_call" | "handoff" | "done" | "error" | "handoff_triggered" | "handoff_complete" | "tool_result";
  content?: string;
  toolName?: string;
  toolInput?: string;
  toolResult?: unknown;
  handoffPayload?: unknown;
  error?: string;
  intentScore?: number;
}

export interface FinancingScenario {
  termMonths: number;
  apr: number;
  monthlyPayment: number;
  totalCost: number;
  downPayment: number;
  lender: string;
}
