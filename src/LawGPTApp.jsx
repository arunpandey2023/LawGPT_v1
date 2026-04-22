import React, { useState } from "react";
import axios from "axios";

const LawGPTApp = () => {
  const [messages, setMessages] = useState([
    { type: "bot", text: "Welcome to LawGPT! How can I assist you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const currentInput = input.trim();
    const userMessage = { type: "user", text: currentInput };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await axios.post(
        "https://mailabs.app.n8n.cloud/webhook/query",
        { message: currentInput }
      );

      console.log("Query API response:", response.data);

      const payload = Array.isArray(response.data)
        ? response.data[0]
        : response.data;

      const botMessage =
        payload?.answer ||
        payload?.message?.content ||
        payload?.content ||
        payload?.response ||
        "Sorry, I couldn't understand that.";

      setMessages((prev) => [...prev, { type: "bot", text: botMessage }]);
    } catch (error) {
      console.error("Error fetching response:", error);
      setMessages((prev) => [
        ...prev,
        { type: "bot", text: "There was an error processing your request." },
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
      { type: "user", text: `Uploaded: ${file.name}` },
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

      console.log("Summary API response:", response.data);

      const payload = Array.isArray(response.data)
        ? response.data[0]
        : response.data;

      const botMessage =
        payload?.answer ||
        payload?.content ||
        payload?.message?.content ||
        payload?.response ||
        "File uploaded. Processing completed.";

      setMessages((prev) => [...prev, { type: "bot", text: botMessage }]);
    } catch (error) {
      console.error("File upload failed:", error);
      setMessages((prev) => [
        ...prev,
        { type: "bot", text: "Error uploading file." },
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
          <button className="w-full rounded-lg bg-gray-800 px-4 py-3 text-left hover:bg-gray-700">
            + New Chat
          </button>
          <button className="w-full rounded-lg bg-gray-800 px-4 py-3 text-left hover:bg-gray-700">
            Search Chat
          </button>
          <button className="w-full rounded-lg bg-gray-800 px-4 py-3 text-left hover:bg-gray-700">
            Library
          </button>
          <button className="w-full rounded-lg bg-gray-800 px-4 py-3 text-left hover:bg-gray-700">
            Case Repository
          </button>
        </div>

        <div className="mt-auto border-t border-gray-700 pt-4 text-sm text-gray-300">
          arunpandey2023 (Free Plan)
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
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