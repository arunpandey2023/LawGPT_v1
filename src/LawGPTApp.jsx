import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { supabase } from "./supabase";
import Auth from "./Auth";

const USER_NAME = "arunpandey2023";
const USER_PLAN = "Free Plan";

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

const userMenuItems = [
  { key: "upgrade", label: "Upgrade Plan" },
  { key: "profile", label: "Profile" },
  { key: "settings", label: "Settings" },
  { key: "help", label: "Help" },
  { key: "logout", label: "Log out" },
];

const faqs = [
  ["What is LawGPT?", "LawGPT is an AI legal assistant for Indian law research, summaries, drafting, and case-law assistance."],
  ["Is LawGPT a lawyer?", "No. LawGPT is an AI assistant and does not replace professional legal advice."],
  ["Which courts does LawGPT support?", "Currently it focuses on Supreme Court content, with High Courts and District Courts planned."],
  ["Can I upload PDFs?", "Yes, you can upload legal PDFs for summarization and analysis."],
  ["Can LawGPT summarize cases?", "Yes, it can summarize facts, issues, holdings, reasoning, and citations when available."],
  ["Does LawGPT provide citations?", "Yes, where retrieved legal sections are available."],
  ["Can I draft petitions?", "Drafting support can be added progressively based on your workflow."],
  ["Can I search previous chats?", "Yes, use the search box in the left panel."],
  ["Are my chats saved?", "Yes, chats are saved in Supabase."],
  ["Can I delete chats?", "This can be added next."],
  ["What is Plus plan?", "Plus gives higher usage limits and better legal research capacity."],
  ["What is Unlimited plan?", "Unlimited is for heavy users needing extended usage and priority features."],
  ["Can lawyers use LawGPT?", "Yes, lawyers can use it for research acceleration and drafting support."],
  ["Can judges use LawGPT?", "It can assist with research, summaries, and document review support."],
  ["Can startups use LawGPT?", "Yes, startups can use it for basic legal research and contract understanding."],
  ["Does LawGPT work in Indian law only?", "The product is currently focused on the Indian legal ecosystem."],
  ["Can LawGPT hallucinate?", "Yes, like any AI system. Always verify important legal outputs."],
  ["Can I change answer style?", "This can be added later in Settings."],
  ["How do I upgrade?", "Use the Upgrade Plan screen."],
  ["How do I get support?", "Use the Help section or contact LawGPT support."],
];

const LawGPTApp = () => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [messages, setMessages] = useState([getWelcomeMessage()]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState(Date.now());
  const [sessions, setSessions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeUserPanel, setActiveUserPanel] = useState(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return;

      if (error) {
        console.error("Error getting user:", error);
      }

      setUser(data?.user || null);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        setAuthLoading(false);
      }
    );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const closePanel = () => {
    setActiveUserPanel(null);
  };

  const loadSessions = async () => {
    if (!user?.id) {
      setSessions([]);
      return;
    }

    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error loading sessions:", error);
      return;
    }

    setSessions(data || []);
  };

  useEffect(() => {
    if (user?.id) {
      loadSessions();
    }
  }, [user]);

  const filteredSessions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return sessions;

    return sessions.filter((session) =>
      (session.title || "New Chat").toLowerCase().includes(term)
    );
  }, [sessions, searchTerm]);

  const handleOpenChat = async (sessionId) => {
    if (!user?.id) return;

    const selectedSession = sessions.find((session) => session.id === sessionId);
    if (!selectedSession || selectedSession.user_id !== user.id) {
      alert("You are not allowed to open this chat.");
      return;
    }

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
    setActiveUserPanel(null);
  };

  const handleNewChat = async () => {
    if (!user?.id) {
      alert("Please log in first");
      return;
    }

    const { data, error } = await supabase
      .from("chat_sessions")
      .insert([
        {
          user_id: user.id,
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

    window.currentSessionId = data.id;
    setChatId(Date.now());
    setMessages([getWelcomeMessage()]);
    setInput("");
    setLoading(false);
    setSearchTerm("");
    setActiveUserPanel(null);
    await loadSessions();
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.currentSessionId = null;
      setMessages([getWelcomeMessage()]);
      setActiveUserPanel(null);
      setShowUserMenu(false);
      setUser(null);
      setSessions([]);
      alert("Logged out successfully");
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Logout failed");
    }
  };

  const handleMenuClick = (key) => {
    if (key === "logout") {
      handleLogout();
      return;
    }

    setActiveUserPanel(key);
    setShowUserMenu(false);
  };

  const handleSave = () => {
    setActiveUserPanel(null);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const currentInput = input.trim();

    if (!user?.id) {
      alert("Please log in first");
      return;
    }

    const sessionId = window.currentSessionId;

    if (!sessionId) {
      alert("Please click + New Chat first");
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "user",
        text: currentInput,
      },
    ]);

    setInput("");
    setLoading(true);
    setActiveUserPanel(null);

    await supabase.from("chat_messages").insert([
      {
        session_id: sessionId,
        sender: "user",
        message_text: currentInput,
      },
    ]);

    const { data: existingMessages } = await supabase
      .from("chat_messages")
      .select("id")
      .eq("session_id", sessionId)
      .eq("sender", "user");

    if (existingMessages && existingMessages.length === 1) {
      await supabase
        .from("chat_sessions")
        .update({
          title: makeChatTitle(currentInput),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);
    } else {
      await supabase
        .from("chat_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", sessionId);
    }

    await loadSessions();

    try {
      const { data: attachments, error: attachmentsError } = await supabase
        .from("chat_attachments")
        .select("file_name, file_type, file_size, file_url")
        .eq("session_id", sessionId)
        .eq("user_id", user.id);

      if (attachmentsError) {
        console.error("Error loading attachments:", attachmentsError);
      }

      const response = await axios.post(
        import.meta.env.VITE_N8N_QUERY_URL,
        {
          message: currentInput,
          session_id: sessionId,
          user_id: user.id,
          attachments: attachments || [],
        },
        {
          headers: {
            "x-lawgpt-secret": import.meta.env.VITE_LAWGPT_WEBHOOK_SECRET,
          },
        }
      );

      const payload = Array.isArray(response.data)
        ? response.data[0]
        : response.data;

      const botMessage =
        payload?.contract ||
		payload?.answer ||
		payload?.message?.content ||
		payload?.content ||
		payload?.response ||
		payload?.text ||
		"Sorry, I couldn't understand that.";

      await supabase.from("chat_messages").insert([
        {
          session_id: sessionId,
          sender: "bot",
          message_text: botMessage,
        },
      ]);

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

    if (!user?.id) {
      alert("Please log in first");
      e.target.value = "";
      return;
    }

    const sessionId = window.currentSessionId;

    if (!sessionId) {
      alert("Please click + New Chat first before uploading a document");
      e.target.value = "";
      return;
    }

    if (file.type !== "application/pdf") {
      alert("Only PDF files are allowed");
      e.target.value = "";
      return;
    }

    const maxFileSizeMb = 20;
    const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

    if (file.size > maxFileSizeBytes) {
      alert(`File is too large. Maximum allowed size is ${maxFileSizeMb} MB.`);
      e.target.value = "";
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "user",
        text: `Attached document: ${file.name}`,
      },
    ]);

    setLoading(true);
    setActiveUserPanel(null);

    try {
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${user.id}/${sessionId}/${Date.now()}_${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("lawgpt-docs")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload failed:", uploadError);
        alert("File upload failed");
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("lawgpt-docs")
        .getPublicUrl(filePath);

      const fileUrl = publicUrlData?.publicUrl || null;

      const { error: attachmentError } = await supabase
        .from("chat_attachments")
        .insert([
          {
            user_id: user.id,
            session_id: sessionId,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            file_url: fileUrl,
          },
        ]);

      if (attachmentError) {
        console.error("Attachment metadata save failed:", attachmentError);
        alert("File uploaded but metadata save failed");
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: "bot",
          text: `${file.name} is attached to this chat. Ask a question and I will use it along with LawGPT retrieval.`,
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

  const PageShell = ({ title, children, showActions = false }) => (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <h2 className="text-3xl font-semibold">{title}</h2>
        <button
          onClick={closePanel}
          className="rounded-full px-3 py-1 text-3xl leading-none text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        >
          ×
        </button>
      </div>

      {children}

      {showActions && (
        <div className="mt-8 flex justify-end gap-3 border-t pt-4">
          <button
            onClick={closePanel}
            className="rounded-xl border px-5 py-2 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );

  const renderUserPanel = () => {
    if (activeUserPanel === "upgrade") {
      return (
        <PageShell title="Upgrade your LawGPT plan">
          <p className="mb-6 text-gray-600">
            Choose a plan based on your legal research usage.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-semibold">Plus</h3>
              <p className="mt-2 text-4xl font-bold">₹999</p>
              <p className="mb-5 text-sm text-gray-500">per month</p>
              <ul className="space-y-3 text-sm text-gray-700">
                <li>✓ Higher chat limits</li>
                <li>✓ Case-law summarization</li>
                <li>✓ PDF upload support</li>
                <li>✓ Saved chat history</li>
                <li>✓ Priority legal research features</li>
              </ul>
              <button className="mt-6 w-full rounded-xl bg-gray-900 px-4 py-3 text-white hover:bg-gray-800">
                Upgrade to Plus
              </button>
            </div>

            <div className="rounded-2xl border-2 border-blue-600 bg-white p-6 shadow-sm">
              <div className="mb-2 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                Best for heavy users
              </div>
              <h3 className="text-2xl font-semibold">Unlimited</h3>
              <p className="mt-2 text-4xl font-bold">₹1999</p>
              <p className="mb-5 text-sm text-gray-500">per month</p>
              <ul className="space-y-3 text-sm text-gray-700">
                <li>✓ Unlimited legal queries</li>
                <li>✓ Longer legal documents</li>
                <li>✓ Advanced case analysis</li>
                <li>✓ Priority response speed</li>
                <li>✓ Early access to new LawGPT features</li>
              </ul>
              <button className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-white hover:bg-blue-700">
                Upgrade to Unlimited
              </button>
            </div>
          </div>
        </PageShell>
      );
    }

    if (activeUserPanel === "profile") {
      return (
        <PageShell title="Profile" showActions>
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
                A
              </div>
              <div>
                <p className="text-xl font-semibold">{USER_NAME}</p>
                <p className="text-sm text-gray-500">{USER_PLAN}</p>
              </div>
            </div>
          </div>
        </PageShell>
      );
    }

    if (activeUserPanel === "settings") {
      return (
        <PageShell title="Settings" showActions>
          <div className="space-y-6">
            <section>
              <h3 className="mb-2 text-lg font-semibold">General</h3>
              <div className="divide-y rounded-xl border bg-white">
                <div className="flex items-center justify-between p-4">
                  <span>Theme</span>
                  <span className="text-sm text-gray-500">System default</span>
                </div>
                <div className="flex items-center justify-between p-4">
                  <span>Language</span>
                  <span className="text-sm text-gray-500">English</span>
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-lg font-semibold">LawGPT Preferences</h3>
              <div className="divide-y rounded-xl border bg-white">
                <div className="flex items-center justify-between p-4">
                  <span>Default jurisdiction</span>
                  <span className="text-sm text-gray-500">India</span>
                </div>
                <div className="flex items-center justify-between p-4">
                  <span>Preferred court</span>
                  <span className="text-sm text-gray-500">
                    Supreme Court of India
                  </span>
                </div>
                <div className="flex items-center justify-between p-4">
                  <span>Answer style</span>
                  <span className="text-sm text-gray-500">
                    Structured legal summary
                  </span>
                </div>
                <div className="flex items-center justify-between p-4">
                  <span>Citation mode</span>
                  <span className="text-sm text-gray-500">Enabled</span>
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-lg font-semibold">Data Controls</h3>
              <div className="divide-y rounded-xl border bg-white">
                <div className="flex items-center justify-between p-4">
                  <span>Chat history</span>
                  <span className="text-sm text-gray-500">Enabled</span>
                </div>
                <div className="flex items-center justify-between p-4">
                  <span>Uploaded document retention</span>
                  <span className="text-sm text-gray-500">Default</span>
                </div>
              </div>
            </section>
          </div>
        </PageShell>
      );
    }

    if (activeUserPanel === "help") {
      return (
        <PageShell title="LawGPT Help Center">
          <p className="mb-6 text-gray-600">
            Top questions about using LawGPT.
          </p>

          <div className="space-y-3">
            {faqs.map(([q, a], index) => (
              <details
                key={q}
                className="rounded-xl border bg-white p-4 shadow-sm"
              >
                <summary className="cursor-pointer font-medium">
                  {index + 1}. {q}
                </summary>
                <p className="mt-3 text-sm text-gray-600">{a}</p>
              </details>
            ))}
          </div>
        </PageShell>
      );
    }

    return null;
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-gray-600">
        Loading LawGPT...
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="flex h-screen bg-white text-gray-900">
      <aside className="flex w-72 flex-col bg-gray-950 text-white">
        <div className="p-4">
          <h1 className="mb-4 text-xl font-bold">LawGPT</h1>

          <button
            onClick={handleNewChat}
            className="mb-3 w-full rounded-lg bg-white px-4 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-200"
          >
            + New Chat
          </button>

          <input
            value={searchTerm}
            placeholder="Search chats"
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-400"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          <p className="mb-2 text-xs uppercase text-gray-500">Recent Chats</p>

          {filteredSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => handleOpenChat(session.id)}
              className="mb-2 w-full rounded-lg bg-gray-800 px-3 py-2 text-left text-sm hover:bg-gray-700"
            >
              {session.title || "New Chat"}
            </button>
          ))}

          {filteredSessions.length === 0 && (
            <p className="text-sm text-gray-500">No chats found</p>
          )}
        </div>

        <div className="relative border-t border-gray-800 p-3">
          {showUserMenu && (
            <div className="absolute bottom-20 left-3 right-3 z-50 rounded-2xl border border-gray-700 bg-gray-900 p-2 shadow-2xl">
              <div className="border-b border-gray-700 px-3 py-3">
                <p className="text-sm font-semibold">{USER_NAME}</p>
                <p className="text-xs text-gray-400">{USER_PLAN}</p>
              </div>

              <div className="py-2">
                {userMenuItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleMenuClick(item.key)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-800 ${
                      item.key === "logout" ? "text-red-300" : ""
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowUserMenu((prev) => !prev)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-gray-800"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
              A
            </div>
            <div>
              <p className="text-sm font-medium">{USER_NAME}</p>
              <p className="text-xs text-gray-400">{USER_PLAN}</p>
            </div>
          </button>
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          {activeUserPanel ? (
            renderUserPanel()
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-2xl px-4 py-3 ${
                    msg.type === "user"
                      ? "ml-auto max-w-xl bg-blue-600 text-white"
                      : "mr-auto max-w-xl bg-gray-100 text-gray-900"
                  }`}
                >
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {msg.text}
                  </pre>
                </div>
              ))}

              {loading && (
                <div className="mr-auto max-w-xl rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-600">
                  LawGPT is typing...
                </div>
              )}
            </div>
          )}
        </div>

        {!activeUserPanel && (
          <div className="border-t p-4">
            <div className="mx-auto flex max-w-3xl gap-3">
              <label className="cursor-pointer rounded-lg border px-4 py-3 text-sm hover:bg-gray-50">
                Upload PDF
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <textarea
                value={input}
                placeholder="Ask LawGPT..."
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[48px] flex-1 resize-none rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />

              <button
                onClick={handleSend}
                disabled={loading}
                className="rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Send
              </button>
            </div>

            <div className="mx-auto mt-3 flex max-w-3xl gap-3 text-sm text-gray-500">
              <button className="rounded-lg border px-3 py-2 hover:bg-gray-50">
                Tools
              </button>
              <button className="rounded-lg border px-3 py-2 hover:bg-gray-50">
                Voice
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LawGPTApp;