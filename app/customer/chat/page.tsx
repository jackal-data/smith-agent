import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";

export default async function CustomerChatPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 max-w-2xl mx-auto w-full flex flex-col" style={{ height: "100dvh" }}>
        <ChatWindow />
      </div>
    </div>
  );
}
