import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { MarketingOptInBanner } from "@/components/customer/MarketingOptInBanner";

export default async function CustomerDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const firstName = session.user.name?.split(" ")[0] ?? "there";

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { marketingOptIn: true },
  });
  const showOptInBanner = !dbUser?.marketingOptIn;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              SM
            </div>
            <span className="font-semibold text-gray-900">Smith Motors</span>
          </div>
          <Link
            href="/customer/settings"
            className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 transition-colors group"
            title="Account settings"
          >
            <span className="hidden sm:inline">{session.user.name || session.user.email}</span>
            <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-blue-50 border border-gray-200 group-hover:border-blue-300 flex items-center justify-center transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {firstName}</h1>
          <p className="text-gray-700 mt-1 text-sm">What would you like to do today?</p>
        </div>

        {showOptInBanner && <MarketingOptInBanner />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Chat with AI */}
          <Link href="/customer/chat">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h2 className="font-semibold text-gray-900 text-lg mb-1">Chat with Alex</h2>
              <p className="text-gray-700 text-sm">Ask questions, get recommendations, and book appointments with our AI assistant.</p>
            </div>
          </Link>

          {/* Browse Inventory */}
          <Link href="/customer/inventory">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="font-semibold text-gray-900 text-lg mb-1">Browse Inventory</h2>
              <p className="text-gray-700 text-sm">Explore our available vehicles, filter by make, model, and price.</p>
            </div>
          </Link>

          {/* Financing */}
          <Link href="/customer/financing">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="font-semibold text-gray-900 text-lg mb-1">Financing</h2>
              <p className="text-gray-700 text-sm">Calculate payments and manage your financing application and documents.</p>
            </div>
          </Link>

          {/* Car Match Quiz */}
          <Link href="/customer/quiz">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-yellow-400 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden">
              <div className="absolute top-3 right-3 text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">2 min</div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-yellow-200 transition-colors text-2xl">
                🎯
              </div>
              <h2 className="font-semibold text-gray-900 text-lg mb-1">Find My Perfect Car</h2>
              <p className="text-gray-700 text-sm">Answer 8 quick questions and we&apos;ll match you with cars from our real inventory.</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
