"use client";

import { useState } from "react";

const REQUIRED_DOCUMENTS = [
  { type: "DRIVERS_LICENSE", label: "Driver's License", description: "Front and back" },
  { type: "PROOF_OF_INCOME", label: "Proof of Income", description: "Last 2 pay stubs or tax return" },
  { type: "PROOF_OF_INSURANCE", label: "Proof of Insurance", description: "Current insurance card" },
  { type: "TRADE_IN_TITLE", label: "Trade-in Title", description: "Required only if trading in a vehicle" },
] as const;

interface DocumentChecklistProps {
  applicationId: string;
  uploadedDocuments?: { type: string; fileName: string; verified: boolean }[];
}

export function DocumentChecklist({ applicationId, uploadedDocuments = [] }: DocumentChecklistProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [localDocs, setLocalDocs] = useState(uploadedDocuments);

  const uploadDoc = async (type: string, file: File) => {
    setUploading(type);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("applicationId", applicationId);
      formData.append("type", type);

      const res = await fetch("/api/financing/documents", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setLocalDocs((prev) => [...prev.filter((d) => d.type !== type), data.document]);
      }
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-1">Required Documents</h2>
      <p className="text-xs text-gray-500 mb-4">
        Upload these documents to speed up your financing approval.
      </p>

      <div className="space-y-3">
        {REQUIRED_DOCUMENTS.map((doc) => {
          const uploaded = localDocs.find((d) => d.type === doc.type);
          const isUploading = uploading === doc.type;

          return (
            <div key={doc.type} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  uploaded?.verified
                    ? "bg-green-100 text-green-600"
                    : uploaded
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-400"
                }`}>
                  {uploaded?.verified ? "✓" : uploaded ? "↑" : "○"}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{doc.label}</p>
                  <p className="text-xs text-gray-400">{doc.description}</p>
                  {uploaded && !uploaded.verified && (
                    <p className="text-xs text-blue-500">Uploaded: {uploaded.fileName}</p>
                  )}
                </div>
              </div>

              {!uploaded && (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadDoc(doc.type, file);
                    }}
                  />
                  <span className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${
                    isUploading
                      ? "bg-gray-100 text-gray-400 cursor-wait"
                      : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                  }`}>
                    {isUploading ? "Uploading..." : "Upload"}
                  </span>
                </label>
              )}
              {uploaded?.verified && (
                <span className="text-xs text-green-600 font-medium">Verified</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
