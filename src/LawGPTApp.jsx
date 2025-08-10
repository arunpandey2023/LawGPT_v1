import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

// --- Firebase (inline, using your working config) ---
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyATvdiXE7MOO8GUF70eypIMmm2mq9g1WPE",
  authDomain: "gtest-466709.firebaseapp.com",
  projectId: "gtest-466709",
  storageBucket: "gtest-466709.firebasestorage.app",
  messagingSenderId: "12898650108",
  appId: "1:12898650108:web:dbdaf27a951c6a9a48d479",
  measurementId: "G-NT1BFZN65Y",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export default function LawGPTApp() {
  // ---------- Auth state ----------
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");

  // ---------- Chat state ----------
  const [messages, setMessages] = useState([
    { type: "bot", text: "Welcome to LawGPT! How can I assist you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // ---------- UI state ----------
  const [showTools, setShowTools] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const topbarRef = useRef(null);
  const toolsRef = useRef(null);
  const shareRef = useRef(null);
  const fileInputRef = useRef(null);

  // ---------- Voice ----------
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en-IN");
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
    { code: "kn-IN", label: "Kannada" },
  ];

  // ---------- Auth page state ----------
  const [authMode, setAuthMode] = useState("signin"); // or "signup"
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // ---------- Effects ----------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setLoggedIn(true);
        setUserName(u.displayName || u.email || "User");
      } else {
        setLoggedIn(false);
        setUserName("");
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      const t = e.target;
      const inShare = shareRef.current && shareRef.current.contains(t);
      const inTools = toolsRef.current && toolsRef.current.contains(t);
      const inTopbar = topbarRef.current && topbarRef.current.contains(t);
      if (!inShare && !inTools && !inTopbar) {
        setShowShare(false);
        setShowTools(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // ---------- Auth handlers ----------
  const handleGoogleAuth = async () => {
    setAuthError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error(e);
      setAuthError(e?.message || "Google sign-in failed");
    }
  };
  const handleEmailPassword = async (mode) => {
    setAuthError("");
    try {
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (e) {
      console.error(e);
      setAuthError(e?.message || "Authentication failed");
    }
  };
  const handleResetPassword = async () => {
    setAuthError("");
    try {
      if (!authEmail) return setAuthError("Enter your email to receive reset link.");
      await sendPasswordResetEmail(auth, authEmail);
      alert("Password reset email sent.");
    } catch (e) {
      console.error(e);
      setAuthError(e?.message || "Could not send reset email");
    }
  };
  const handleLogout = async () => {
    try { await signOut(auth); } catch {}

  };

  // ---------- Chat handlers ----------
  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = { type: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    try {
      const response = await axios.post(
        "https://mailabs.app.n8n.cloud/webhook/query",
        { message: userMessage.text }
      );
      const botMessage = response.data?.output || "Sorry, I couldn't understand that.";
      setMessages((prev) => [...prev, { type: "bot", text: botMessage }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { type: "bot", text: "There was an error processing your request." },
      ]);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post("https://mailabs.app.n8n.cloud/webhook/summary", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("File uploaded successfully!");
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  // ---------- Tools ----------
  const escapeHtml = (str = "") =>
    str.replace(/[&<>\"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const handlePrintLast = () => {
    const last = [...messages].reverse().find((m) => m && typeof m.text === "string" && m.text.trim().length > 0);
    if (!last) return alert("No messages to print yet.");
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
    if (!messages?.length) return alert("No messages to save yet.");
    const text = messages
      .map((m) => `${m.type === "user" ? "You" : "LawGPT"}: ${m.text}`)
      .join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    a.href = url;
    a.download = `lawgpt_session_${stamp}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ---------- Share ----------
  const getLastShareText = () => {
    const last = [...messages].reverse().find((m) => m && typeof m.text === "string" && m.text.trim().length > 0);
    return last ? last.text : "";
  };
  const closeMenus = () => { setShowShare(false); setShowTools(false); };
  const handleShareSlack = () => {
    const appUrl = "slack://open";
    const webUrl = "https://slack.com/app_redirect?";
    let opened = false;
    try { const w = window.open(appUrl, "_blank"); opened = !!w; } catch {}
    if (!opened) window.open(webUrl, "_blank");
    closeMenus();
  };
  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(getLastShareText() || "Shared from LawGPT");
    window.open(`https://wa.me/?text=${text}`, "_blank");
    closeMenus();
  };
  const handleShareEmailGmail = () => {
    const subject = encodeURIComponent("LawGPT Share");
    const body = encodeURIComponent(getLastShareText() || "");
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&tf=1&su=${subject}&body=${body}`, "_blank");
    closeMenus();
  };
  const handleShareDrive = () => {
    window.open("https://drive.google.com/drive/my-drive", "_blank");
    closeMenus();
  };

  // ---------- Voice ----------
  const handleVoiceClick = () => {
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
        const text = (finalTranscript + " " + interim).trim();
        if (text) setInput(text);
      };
      rec.onerror = () => setRecording(false);
      rec.onend = () => setRecording(false);
      recognitionRef.current = rec;
    }
    recognitionRef.current.lang = selectedLanguage || "en-IN";
    if (!recording) {
      try { setRecording(true); recognitionRef.current.start(); }
      catch { setRecording(false); }
    } else {
      recognitionRef.current.stop();
      setRecording(false);
    }
  };

  // ---------- Mini helpers ----------
  const newChat = () => setMessages([{ type: "bot", text: "New chat started. How can I assist you?" }]);
  const searchChat = () => alert("Search chat is under development.");
  const openLibrary = () => window.open("https://njdg.ecourts.gov.in/njdg_v3/", "_blank");
  const openRepository = () => alert("Case repository opening soon.");

  // ---------- Render ----------
  return (
    <>
      {!loggedIn ? (
        // ===== Auth Page (ChatGPT-like) =====
        <div className="min-h-screen flex items-center justify-center bg-[#0b0c10] text-white px-4">
          <div className="w-full max-w-md">
            {/* Brand */}
            <div className="flex flex-col items-center mb-8">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shadow-lg">
                <span className="text-black font-bold">L</span>
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight">
                {authMode === "signin" ? "Sign in to LawGPT" : "Create your LawGPT account"}
              </h1>
              <p className="mt-1 text-sm text-gray-400">Your AI legal workspace</p>
            </div>

            {/* Card */}
            <div className="rounded-2xl border border-gray-800 bg-[#0f1115] shadow-xl overflow-hidden">
              <div className="p-6">
                <button
                  onClick={handleGoogleAuth}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-700 bg-[#111318] px-4 py-2.5 text-sm font-medium hover:bg-[#141821] transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 48 48" className="-ml-1" aria-hidden="true" focusable="false">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.8 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c10 0 19-7.3 19-20 0-1.2-.1-2.3-.4-3.5z"/>
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 15.6 4 8.5 8.7 6.3 14.7z"/>
                    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.4-5.1l-6.2-5.1C29.2 35.6 26.8 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.6 5.1C8.4 39.3 15.6 44 24 44z"/>
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3.1 5.1-5.9 6.4l6.2 5.1C38.7 36.7 44 31.8 44 24c0-1.2-.1-2.3-.4-3.5z"/>
                  </svg>
                  Continue with Google
                </button>

                {/* Divider */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-800"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-[#0f1115] px-2 text-xs uppercase tracking-wider text-gray-500">
                      or
                    </span>
                  </div>
                </div>

                {/* Email form */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      className="w-full rounded-lg bg-[#0b0d12] border border-gray-800 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 transition-colors"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Password</label>
                    <input
                      type="password"
                      placeholder="********"
                      className="w-full rounded-lg bg-[#0b0d12] border border-gray-800 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 transition-colors"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                    />
                  </div>

                  {authError && <div className="text-red-400 text-sm">{authError}</div>}

                  {authMode === "signin" ? (
                    <button
                      onClick={() => handleEmailPassword("signin")}
                      className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-black transition-colors"
                    >
                      Sign in
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEmailPassword("signup")}
                      className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-black transition-colors"
                    >
                      Create account
                    </button>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <button onClick={handleResetPassword} className="underline hover:text-gray-300">
                      Forgot password?
                    </button>
                    <button
                      onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}
                      className="underline hover:text-gray-300"
                    >
                      {authMode === "signin" ? "Create an account" : "I already have an account"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-800 text-center text-[11px] text-gray-500">
                By continuing, you agree to our Terms and acknowledge our Privacy Policy.
              </div>
            </div>
          </div>
        </div>
      ) : (
        // ===== Main App UI =====
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
              <p className="text-sm text-gray-400">{userName || "User"}</p>
              <button
                onClick={handleLogout}
                className="mt-2 text-xs text-gray-400 hover:text-white underline"
              >
                Logout
              </button>
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
                  onClick={() => setShowShare(!showShare)}
                >
                  🔗 Share
                </button>
                <button
                  className="text-sm px-2 py-1 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700"
                  title="Tools"
                  onClick={() => setShowTools(!showTools)}
                >
                  🛠️ Tools
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-md max-w-xl whitespace-pre-wrap ${msg.type === "user" ? "bg-white text-black self-end" : "bg-gray-700 self-start"}`}
                >
                  {msg.text}
                </div>
              ))}
              {loading && <div className="text-gray-400">LawGPT is typing...</div>}
            </div>

            {/* Tools Popup */}
            {showTools && (
              <div ref={toolsRef} className="absolute top-12 right-28 bg-gray-800 border border-gray-700 p-3 rounded z-20 shadow-lg">
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

            {/* Input Area */}
            <div className="p-4 border-t border-gray-700 flex items-center gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="text-lg">➕</button>
              <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

              <select
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                title="Recognition language"
              >
                {languageOptions.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
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
              <button className="px-4 py-2 rounded-md bg-white text-black hover:bg-gray-300" onClick={handleSend}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
