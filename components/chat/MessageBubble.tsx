"use client";

import { cn } from "@/components/ui/cn";
import type { ChatMessage } from "@/types/chat";
import { formatDistanceToNow } from "date-fns";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSalesperson = message.role === "salesperson";

  if (isUser) {
    return (
      <div className="flex w-full mb-4 justify-end">
        <div className="max-w-[75%] flex flex-col items-end">
          <div className="rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-blue-600 text-white">
            {message.content}
          </div>
          <span className="text-xs text-gray-600 mt-1">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 text-xs font-bold ml-2">
          You
        </div>
      </div>
    );
  }

  if (isSalesperson) {
    const initial = message.senderName ? message.senderName[0].toUpperCase() : "S";
    return (
      <div className="flex w-full mb-4 justify-start">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold mr-2">
          {initial}
        </div>
        <div className="max-w-[75%] flex flex-col items-start">
          {message.senderName && (
            <p className="text-xs text-green-700 font-medium mb-0.5">{message.senderName}</p>
          )}
          <div className="rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-green-600 text-white">
            {message.content}
          </div>
          <span className="text-xs text-gray-600 mt-1">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>
    );
  }

  // AI assistant
  return (
    <div className="flex w-full mb-4 justify-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold mr-2">
        A
      </div>
      <div className="max-w-[75%] flex flex-col items-start">
        <div className="rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-gray-100 text-gray-900">
          {message.content || (
            <span className="inline-flex gap-1 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
            </span>
          )}
        </div>
        <span className="text-xs text-gray-600 mt-1">
          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}
