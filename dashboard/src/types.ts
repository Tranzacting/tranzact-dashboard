export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: { name: string; status: "running" | "done" }[];
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  isPinned?: boolean;
}
