// CRM integration interface and adapters

export interface CRMCustomer {
  id: string;
  email: string;
  name: string;
  phone?: string;
}

export interface CRMOpportunity {
  id: string;
  customerId: string;
  vehicleVin?: string;
  stage: string;
  intentScore: number;
  summary: string;
}

export interface CRMAdapter {
  pushLead(customer: CRMCustomer, opportunity: CRMOpportunity): Promise<void>;
  updateOpportunity(opportunityId: string, update: Partial<CRMOpportunity>): Promise<void>;
  syncAppointment(opportunityId: string, scheduledAt: Date, type: string): Promise<void>;
}

// No-op adapter for dev / when CRM_PROVIDER=null
export class NullCRMAdapter implements CRMAdapter {
  async pushLead(): Promise<void> {
    console.log("[CRM] NullAdapter: pushLead called");
  }
  async updateOpportunity(): Promise<void> {
    console.log("[CRM] NullAdapter: updateOpportunity called");
  }
  async syncAppointment(): Promise<void> {
    console.log("[CRM] NullAdapter: syncAppointment called");
  }
}

export function getCRMAdapter(): CRMAdapter {
  const provider = process.env.CRM_PROVIDER ?? "null";
  switch (provider) {
    case "null":
    default:
      return new NullCRMAdapter();
  }
}
