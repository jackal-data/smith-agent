import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { FinancingCalculator } from "@/components/financing/FinancingCalculator";
import { DocumentChecklist } from "@/components/financing/DocumentChecklist";
import Link from "next/link";

export default async function FinancingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const applications = await prisma.financingApplication.findMany({
    where: { customerId: session.user.id },
    include: { documents: { select: { type: true, fileName: true, verified: true } } },
    orderBy: { createdAt: "desc" },
    take: 1,
  });

  const latestApp = applications[0];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/customer/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Dashboard
          </Link>
          <h1 className="font-bold text-xl text-gray-900">Financing</h1>
        </div>

        <FinancingCalculator />

        {latestApp && (
          <DocumentChecklist
            applicationId={latestApp.id}
            uploadedDocuments={latestApp.documents}
          />
        )}

        {!latestApp && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <p className="text-gray-700 text-sm mb-3">
              Ready to apply? Start a financing application to upload your documents.
            </p>
            <button
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              onClick={async () => {
                "use server";
                await prisma.financingApplication.create({
                  data: { customerId: session!.user.id },
                });
              }}
            >
              Start Application
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
