"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@/hooks/useChat";
import { useHandoff } from "@/hooks/useHandoff";
import { MessageBubble } from "./MessageBubble";
import { HandoffBanner } from "./HandoffBanner";
import { cn } from "@/components/ui/cn";

const SUGGESTED_QUESTIONS = [
  "What SUVs do you have under $40,000?",
  "What are my financing options?",
  "Do you have any hybrid or electric vehicles?",
  "Can I schedule a test drive?",
];

export function ChatWindow() {
  const { messages, sessionId, isLoading, isHandedOff, handoffMessage, sendMessage } = useChat();
  const { salespersonName } = useHandoff(sessionId);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-3 bg-white">
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
          SM
        </div>
        <div>
          <p className="font-semibold text-sm">Smith Motors Assistant</p>
          <p className="text-xs text-green-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            Online
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
              <span className="text-3xl">🚗</span>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Welcome to Smith Motors</h2>
              <p className="text-sm text-gray-700 mt-1">
                I can help you find your perfect vehicle, explore financing options, and more.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-sm bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg px-3 py-2 text-gray-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isHandedOff && (
          <HandoffBanner
            salespersonName={salespersonName}
            message={handoffMessage}
            className="my-4"
          />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3 bg-white">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about our vehicles, financing, or anything else..."
            rows={1}
            className={cn(
              "flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "max-h-32 overflow-y-auto"
            )}
            style={{ minHeight: "42px" }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={cn(
              "flex-shrink-0 w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center",
              "hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            )}
          >
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-1.5 text-center">
          Smith Motors • Powered by AI
        </p>
      </div>
    </div>
  );
}
