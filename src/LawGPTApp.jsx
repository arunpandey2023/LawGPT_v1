import React, { useEffect, useState } from "react";
import axios from "axios";
import { supabase } from "./supabase";

const getWelcomeMessage = () => ({
  id: Date.now(),
  type: "bot",
  text: "Welcome to LawGPT! How can I assist you today?",
});

const makeChatTitle = (text) => {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return "New Chat";
  return clean.length > 40 ? `${clean.slice(0, 40)}...` : clean;
};

const LawGPTApp = () => {
  const [messages, setMessages] = useState([getWelcomeMessage()]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState(Date.now());
  const [sessions, setSessions] = useState([]);

  const loadSessions = async () => {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error loading sessions:", error);
      return;
    }

    setSessions(data || []);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleOpenChat = async (sessionId) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading chat messages:", error);
      return;
    }

    const formattedMessages =
      data?.map((msg, index) => ({
        id: msg.id || `${msg.created_at}-${index}`,
        type: msg.sender,
        text: msg.message_text,
      })) || [];

    window.currentSessionId = sessionId;
    setChatId(Date.now());
    setMessages(
      formattedMessages.length > 0 ? formattedMessages : [getWelcomeMessage()]
    );
    setInput("");
    setLoading(false);
  };

  const handleNewChat = async () => {
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert([
        {
          user_id: "test-user",
          title: "New Chat",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating chat:", error);
      alert("Error creating chat session");
      return;
    }

    const sessionId = data.id;
    window.currentSessionId = sessionId;

    setChatId(Date.now());
    setMessages([getWelcomeMessage()]);
    setInput("");
    setLoading(false);

    await loadSessions();

    console.log("Created session:", sessionId);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const currentInput = input.trim();
    const sessionId = window.currentSessionId;

    if (!sessionId) {
      alert("Please click + New Chat first");
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: "user",
      text: currentInput,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const { error: userMessageError } = await supabase
      .from("chat_messages")
      .insert([
        {
          session_id: sessionId,
          sender: "user",
          message_text: currentInput,
        },
      ]);

    if (userMessageError) {
      console.error("Error saving user message:", userMessageError);
    }

    const { data: existingMessages, error: existingMessagesError } = await supabase
      .from("chat_messages")
      .select("id")
      .eq("session_id", sessionId)
      .eq("sender", "user");

    if (existingMessagesError) {
      console.error("Error checking existing messages:", existingMessagesError);
    }

    if (existingMessages && existingMessages.length === 1) {
      const newTitle = makeChatTitle(currentInput);

      const { error: titleUpdateError } = await supabase
        .from("chat_sessions")
        .update({
          title: newTitle,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (titleUpdateError) {
        console.error("Error updating chat title:", titleUpdateError);
      }
    } else {
      await supabase
        .from("chat_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", sessionId);
    }

    await loadSessions();

    try {
      const response = await axios.post(
        "https://mailabs.app.n8n.cloud/webhook/query",
        { message: currentInput }
      );

      const payload = Array.isArray(response.data)
        ? response.data[0]
        : response.data;

      const botMessage =
        payload?.answer ||
        payload?.message?.content ||
        payload?.content ||
        payload?.response ||
        "Sorry, I couldn't understand that.";

      const { error: botMessageError } = await supabase
        .from("chat_messages")
        .insert([
          {
            session_id: sessionId,
            sender: "bot",
            message_text: botMessage,
          },
        ]);

      if (botMessageError) {
        console.error("Error saving bot message:", botMessageError);
      }

      await supabase
        .from("chat_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", sessionId);

      await loadSessions();

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: "bot",
          text: botMessage,
        },
      ]);
    } catch (error) {
      console.error("Error fetching response:", error);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: "bot",
          text: "There was an error processing your request.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || loading) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "user",
        text: `Uploaded: ${file.name}`,
      },
    ]);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        "https://mailabs.app.n8n.cloud/webhook-test/summary",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const payload = Array.isArray(response.data)
        ? response.data[0]
        : response.data;

      const botMessage =
        payload?.answer ||
        payload?.content ||
        payload?.message?.content ||
        payload?.response ||
        "File uploaded. Processing completed.";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: "bot",
          text: botMessage,
        },
      ]);
    } catch (error) {
      console.error("File upload failed:", error);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: "bot",
          text: "Error uploading file.",
        },
      ]);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
      <aside className="w-72 bg-gray-900 text-white p-5 flex flex-col">
        <h1 className="text-2xl font-bold mb-6">LawGPT</h1>

        <div className="space-y-3">
          <button
            onClick={handleNewChat}
            className="w-full rounded-lg bg-gray-800 px-4 py-3 text-left hover:bg-gray-700"
          >
            + New Chat
          </button>

          <button
            disabled
            className="w-full cursor-not-allowed rounded-lg bg-gray-800 px-4 py-3 text-left opacity-50"
          >
            Search Chat (Coming Soon)
          </button>

          <button className="w-full rounded-lg bg-gray-800 px-4 py-3 text-left hover:bg-gray-700">
            Case Repository
          </button>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto">
          <div className="mb-2 text-xs uppercase tracking-wide text-gray-400">
            Recent Chats
          </div>

          <div className="space-y-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleOpenChat(session.id)}
                className="w-full rounded-lg bg-gray-800 px-3 py-2 text-left text-sm hover:bg-gray-700"
              >
                {session.title || "New Chat"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto border-t border-gray-700 pt-4 text-sm text-gray-300">
          arunpandey2023 (Free Plan)
        </div>
      </aside>

      <main key={chatId} className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-3xl rounded-2xl px-4 py-3 whitespace-pre-wrap shadow-sm ${
                msg.type === "user"
                  ? "ml-auto bg-blue-600 text-white"
                  : "mr-auto bg-white text-gray-900"
              }`}
            >
              {msg.text}
            </div>
          ))}

          {loading && (
            <div className="mr-auto max-w-3xl rounded-2xl bg-white px-4 py-3 text-gray-500 shadow-sm">
              LawGPT is typing...
            </div>
          )}
        </div>

        <div className="border-t bg-white p-4">
          <div className="flex items-center gap-3">
            <label className="cursor-pointer rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">
              Upload PDF
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <textarea
              className="flex-1 resize-none rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Ask LawGPT about a case..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <button
              onClick={handleSend}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>

          <div className="mt-3 flex gap-3 text-sm text-gray-500">
            <button className="rounded-lg border px-3 py-2 hover:bg-gray-50">
              Tools
            </button>
            <button className="rounded-lg border px-3 py-2 hover:bg-gray-50">
              Voice
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LawGPTApp;