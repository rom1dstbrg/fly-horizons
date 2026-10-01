import { ChatClient } from "@/components/admin/ChatClient";
import { getChatSessions } from "@/lib/actions/chat";

export const metadata = { title: "Conversations assistant — Admin" };

export default async function AdminChatPage() {
  const sessions = await getChatSessions();

  return (
    <div className="pilote-studio space-y-5 font-sans text-st-text">
      <ChatClient sessions={sessions} />
    </div>
  );
}
