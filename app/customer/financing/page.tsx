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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              SM
            </div>
            <span className="font-semibold text-gray-900">Smith Motors</span>
          </div>
          <Link href="/customer/dashboard" className="text-sm text-blue-600 font-medium hover:underline">
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financing</h1>
          <p className="text-gray-700 text-sm mt-1">Estimate your monthly payments and manage your application</p>
        </div>

        <FinancingCalculator />

        {latestApp && (
          <DocumentChecklist
            applicationId={latestApp.id}
            uploadedDocuments={latestApp.documents}
          />
        )}

        {!latestApp && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Ready to apply?</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Start a financing application to upload your documents and get pre-approved faster.
                </p>
                <form action="/api/financing/applications" method="POST">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Start Application
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
