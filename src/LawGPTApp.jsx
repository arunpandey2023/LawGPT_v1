
import React, { useState, useRef } from "react";
import axios from "axios";

const LawGPTApp = () => {
  const [messages, setMessages] = useState([
    { type: "bot", text: "Welcome to LawGPT! How can I assist you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { type: "user", text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await axios.post("https://mailabs.app.n8n.cloud/webhook-test/query", {
        message: input
      });
      const botMessage = response.data?.output || "Sorry, I couldn't understand that.";
      setMessages(prev => [...prev, { type: "bot", text: botMessage }]);
    } catch (error) {
      console.error("Error fetching response:", error);
      setMessages(prev => [
        ...prev,
        { type: "bot", text: "There was an error processing your request." }
      ]);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post("https://mailabs.app.n8n.cloud/webhook-test/summary", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      alert("File uploaded successfully!");
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  const newChat = () => setMessages([{ type: "bot", text: "New chat started. How can I assist you?" }]);
  const searchChat = () => alert("Search chat functionality is under development.");
  const openLibrary = () => window.open("https://njdg.ecourts.gov.in/njdg_v3/", "_blank");
  const openRepository = () => alert("Case repository opening soon.");

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 p-4 flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-bold mb-4">LawGPT</h2>
          <ul className="space-y-2">
            <li className="cursor-pointer" onClick={newChat}>+ New Chat</li>
            <li className="cursor-pointer" onClick={searchChat}>🔍 Search Chat</li>
            <li className="cursor-pointer" onClick={openLibrary}>📚 Library</li>
            <li className="cursor-pointer" onClick={openRepository}>📁 Case Repository</li>
          </ul>
        </div>
        <div className="mt-4">
          <hr className="my-2 border-gray-600" />
          <p className="text-sm text-gray-400">arunpandey2023 (Free Plan)</p>
          <div className="mt-2 text-sm">
            <button className="text-blue-400 underline">Login with Google</button>
          </div>
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-3 rounded-md max-w-xl whitespace-pre-wrap ${
                msg.type === "user" ? "bg-white text-black self-end" : "bg-gray-700 self-start"
              }`}
            >
              {msg.text}
            </div>
          ))}
          {loading && <div className="text-gray-400">LawGPT is typing...</div>}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-700 flex items-center gap-2">
          {/* Upload Icon */}
          <button onClick={() => fileInputRef.current.click()} className="text-lg">➕</button>
          <input
            type="file"
            accept=".pdf"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button className="text-lg" title="Tools">🛠️</button>
          <button className="text-lg" title="Voice">🎙️</button>
          <button className="text-lg" title="Share">🔗</button>

          <input
            className="flex-1 p-2 rounded-md bg-gray-800 border border-gray-700 text-white"
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            className="px-4 py-2 rounded-md bg-white text-black hover:bg-gray-300"
            onClick={handleSend}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default LawGPTApp;
