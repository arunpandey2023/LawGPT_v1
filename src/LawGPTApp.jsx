import React, { useState, useRef } from "react";
import axios from "axios";

const LawGPTApp = () => {
  const [messages, setMessages] = useState([
    { type: "bot", text: "Welcome to LawGPT! How can I assist you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const fileInputRef = useRef(null);
  const shareRef = useRef(null);
  const toolsRef = useRef(null);
  const topbarRef = useRef(null);

  const authRef = useRef(null);
  const [showAuth, setShowAuth] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");


  const [recording, setRecording] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en-IN");
  const recognitionRef = useRef(null);

  const languageOptions = [
    { code: "en-IN", label: "English" },
    { code: "hi-IN", label: "Hindi" },
    { code: "bn-IN", label: "Bengali" },
    { code: "mr-IN", label: "Marathi" },
    { code: "te-IN", label: "Telugu" },
    { code: "ta-IN", label: "Tamil" },
    { code: "gu-IN", label: "Gujarati" },
    { code: "pa-IN", label: "Punjabi" },
    { code: "ml-IN", label: "Malayalam" },
    { code: "or-IN", label: "Odia" },
    { code: "kn-IN", label: "Kannada" }
  ];


  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { type: "user", text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await axios.post("https://mailabs.app.n8n.cloud/webhook/query", {
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
      await axios.post("https://mailabs.app.n8n.cloud/webhook/summary", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      alert("File uploaded successfully!");
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  const handleVoiceClick = async () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input is not supported in this browser. Try Chrome/Edge or switch to server STT.");
      return;
    }

    if (!recognitionRef.current) {
      const rec = new SR();
      rec.lang = selectedLanguage || "en-IN";
      rec.interimResults = true;
      rec.continuous = false;

      let finalTranscript = "";

      rec.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalTranscript += t;
          else interim += t;
        }
        // show interim/final text in input box
        const text = (finalTranscript + " " + interim).trim();
        if (text) setInput(text);
      };

      rec.onerror = (e) => {
        console.warn("Speech error:", e.error);
        setRecording(false);
      };

      rec.onend = () => {
        setRecording(false);
        // Optional auto-send when finished speaking:
        // if ((finalTranscript || "").trim()) handleSend();
      };

      recognitionRef.current = rec;
    }

    // Always refresh language before starting
    recognitionRef.current.lang = selectedLanguage || "en-IN";

    if (!recording) {
      try {
        setRecording(true);
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
        setRecording(false);
      }
    } else {
      recognitionRef.current.stop();
      setRecording(false);
    }
  };

  const newChat = () => setMessages([{ type: "bot", text: "New chat started. How can I assist you?" }]);
  const searchChat = () => alert("Search chat functionality is under development.");
  const openLibrary = () => window.open("https://njdg.ecourts.gov.in/njdg_v3/", "_blank");
  const openRepository = () => alert("Case repository opening soon.");
  const escapeHtml = (str = "") =>
    str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const handlePrintLast = () => {
    const last = [...messages].reverse().find(m => m && typeof m.text === "string" && m.text.trim().length > 0);
    if (!last) {
      alert("No messages to print yet.");
      return;
    }
    const w = window.open("", "_blank", "width=800,height=600");
    if (!w) return;
    const html = `<!doctype html><html><head><title>Print Chat</title>
      <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;}
      pre{white-space:pre-wrap;word-break:break-word;font-size:14px;}</style>
      </head><body>
      <h2>Last Chat Message (${last.type === "user" ? "You" : "LawGPT"})</h2>
      <pre>${escapeHtml(last.text)}</pre>
      <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 400); }<\/script>
      </body></html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const handleSaveSession = () => {
    if (!messages || !messages.length) {
      alert("No messages to save yet.");
      return;
    }
    const text = messages.map((m, i) => `${m.type === "user" ? "You" : "LawGPT"}: ${m.text}`).join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0,19).replace(/[T:]/g,"-");
    a.href = url;
    a.download = `lawgpt_session_${stamp}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const getLastShareText = () => {
    const last = [...messages].reverse().find(m => m && typeof m.text === "string" && m.text.trim().length > 0);
    return last ? last.text : "";
  };

  const closeMenus = () => {
    setShowShare(false);
    setShowTools(false);
  };

  const handleShareSlack = () => {
    const text = encodeURIComponent(getLastShareText() || "Shared from LawGPT");
    // Attempt to open Slack app; fallback to web
    const appUrl = "slack://open";
    const webUrl = "https://slack.com/app_redirect?";
    // Try app first
    let opened = false;
    try {
      const w = window.open(appUrl, "_blank");
      opened = !!w;
    } catch (e) {}
    if (!opened) window.open(webUrl, "_blank");
    closeMenus();
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(getLastShareText() || "Shared from LawGPT");
    const url = `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
    closeMenus();
  };

  const handleShareEmailGmail = () => {
    const subject = encodeURIComponent("LawGPT Share");
    const body = encodeURIComponent(getLastShareText() || "");
    const url = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&su=${subject}&body=${body}`;
    window.open(url, "_blank");
    closeMenus();
  };

  const handleShareDrive = () => {
    // We cannot upload programmatically without OAuth; open Drive so user can create/upload a file
    const url = "https://drive.google.com/drive/my-drive";
    window.open(url, "_blank");
    closeMenus();
  };
  const startLogin = (provider) => {
    // Placeholder: open provider login page (without actual OAuth callback)
    const map = {
      google: "https://accounts.google.com/signin",
      github: "https://github.com/login",
      microsoft: "https://login.microsoftonline.com/",
      linkedin: "https://www.linkedin.com/login"
    };
    const url = map[provider];
    if (url) window.open(url, "_blank");
    // Simulate success
    setLoggedIn(true);
    setUserName(provider.charAt(0).toUpperCase() + provider.slice(1));
    setShowAuth(false);
  };

  const doLogout = () => {
    setLoggedIn(false);
    setUserName("");
    setShowAuth(false);
  };




  
  React.useEffect(() => {
    const onDocClick = (e) => {
      const target = e.target;
      const inShare = shareRef.current && shareRef.current.contains(target);
      const inTools = toolsRef.current && toolsRef.current.contains(target);
      const inTopbar = topbarRef.current && topbarRef.current.contains(target);
      const inAuth = authRef.current && authRef.current.contains(target);
      if (!inShare && !inTools && !inTopbar && !inAuth) {
        setShowShare(false);
        setShowTools(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);
return (
    <div className="flex h-screen bg-gray-900 text-white relative">
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
          <div className="mt-2 text-sm text-gray-500">Use the top-right Login menu.</div>
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col relative">
        {/* Top Bar */}
        <div ref={topbarRef} className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
          <div className="text-sm text-gray-400">LawGPT Assistant</div>
          <div className="flex items-center gap-2">
            <button
              className="text-sm px-2 py-1 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700"
              title="Share"
              onClick={() => { setShowShare(!showShare); setShowAuth(false); }}
            >
              🔗 Share
            </button>
            <button
              className="text-sm px-2 py-1 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700"
              title="Login/Logout"
              onClick={() => { setShowAuth(!showAuth); setShowShare(false); }}
            >
              {loggedIn ? `👤 ${userName}` : "🔐 Login/Logout"}
            </button>
          </div>
        </div>

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

        {/* Tool Popup */}
        {showTools && (
          <div ref={toolsRef} className="absolute bottom-20 left-20 bg-gray-800 border border-gray-700 p-3 rounded z-10">
            <ul className="space-y-2 text-sm">
              <li className="cursor-pointer" onClick={handlePrintLast}>🖨️ Print last chat</li>
              <li className="cursor-pointer" onClick={handleSaveSession}>💾 Save session as .txt</li>
            </ul>
          </div>
        )}

        {/* Share Popup */}
        {showShare && (
          <div ref={shareRef} className="absolute top-12 right-4 bg-gray-800 border border-gray-700 p-3 rounded z-20 shadow-lg">
            <ul className="space-y-2 text-sm">
              <li className="cursor-pointer" onClick={handleShareSlack}>💬 Slack</li>
              <li className="cursor-pointer" onClick={handleShareWhatsApp}>📱 WhatsApp</li>
              <li className="cursor-pointer" onClick={handleShareEmailGmail}>✉️ Gmail</li>
              <li className="cursor-pointer" onClick={handleShareDrive}>📤 Drive</li>
            </ul>
          </div>
        )}
        {/* Auth Popup */}
        {showAuth && (
          <div ref={authRef} className="absolute top-12 right-4 bg-gray-800 border border-gray-700 p-3 rounded z-30 shadow-lg mt-2">
            <ul className="space-y-2 text-sm">
              {!loggedIn && (
                <>
                  <li className="cursor-pointer" onClick={() => startLogin('google')}>🔵 Login with Google</li>
                  <li className="cursor-pointer" onClick={() => startLogin('github')}>⚫ Login with GitHub</li>
                  <li className="cursor-pointer" onClick={() => startLogin('microsoft')}>🟣 Login with Microsoft</li>
                  <li className="cursor-pointer" onClick={() => startLogin('linkedin')}>🔹 Login with LinkedIn</li>
                </>
              )}
              {loggedIn && (
                <li className="cursor-pointer text-red-300" onClick={doLogout}>🚪 Logout</li>
              )}
            </ul>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-gray-700 flex items-center gap-2">
          <button onClick={() => fileInputRef.current.click()} className="text-lg">➕</button>
          <input
            type="file"
            accept=".pdf"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button className="text-lg" title="Tools" onClick={() => setShowTools(!showTools)}>🛠️</button>
          <select
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            title="Recognition language"
          >
            {languageOptions.map(opt => (
              <option key={opt.code} value={opt.code}>{opt.label}</option>
            ))}
          </select>
          <button className="text-lg" title="Voice" onClick={handleVoiceClick}>
            {recording ? "⏺️" : "🎙️"}
          </button>
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
