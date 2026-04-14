import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-blue-900 text-sm">
            SM
          </div>
          <span className="text-white font-bold text-lg">Smith Motors</span>
        </div>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm text-white border border-white/30 rounded-lg hover:bg-white/10 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm bg-white text-blue-900 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 text-center py-20">
        <div className="text-6xl mb-6">🚗</div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
          Find Your Perfect Vehicle<br />at Smith Motors
        </h1>
        <p className="text-lg text-blue-200 mb-10 max-w-xl">
          Chat with our AI assistant to browse inventory, explore financing options, and connect with a specialist — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/customer/chat"
            className="px-8 py-3.5 bg-white text-blue-900 rounded-xl font-semibold hover:bg-blue-50 transition-colors text-lg"
          >
            Chat with AI Assistant
          </Link>
          <Link
            href="/api/inventory"
            className="px-8 py-3.5 border-2 border-white/40 text-white rounded-xl font-semibold hover:bg-white/10 transition-colors text-lg"
          >
            Browse Inventory
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full">
          {[
            { icon: "💬", title: "AI-Powered Chat", desc: "Get instant answers about vehicles, pricing, and availability" },
            { icon: "💰", title: "Easy Financing", desc: "Calculate payments and get pre-approved in minutes" },
            { icon: "🤝", title: "Expert Specialists", desc: "Seamlessly connect with our team when you're ready" },
          ].map((f) => (
            <div key={f.title} className="bg-white/10 backdrop-blur rounded-xl p-5 text-left">
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className="font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-sm text-blue-200">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="px-8 py-6 text-center text-blue-300 text-sm">
        © 2024 Smith Motors. All rights reserved.
      </footer>
    </div>
  );
}
