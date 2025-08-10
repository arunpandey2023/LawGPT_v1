import React, { useState, useEffect } from "react";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { initializeApp } from "firebase/app";

// ==== Firebase Config ====
const firebaseConfig = {
  apiKey: "AIzaSyATvdiXE7MOO8GUF70eypIMmm2mq9g1WPE",
  authDomain: "gtest-466709.firebaseapp.com",
  projectId: "gtest-466709",
  storageBucket: "gtest-466709.firebasestorage.app",
  messagingSenderId: "12898650108",
  appId: "1:12898650108:web:dbdaf27a951c6a9a48d479",
  measurementId: "G-NT1BFZN65Y",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export default function LawGPTApp() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  // Track auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // Google Login
  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Google login error:", err.message);
    }
  };

  // Email/Password Auth
  const handleAuth = async () => {
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error("Auth error:", err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // === Auth Page (ChatGPT style) ===
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0c10] text-white px-4">
        <div className="w-full max-w-md text-center">
          {/* Logo */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold">LawGPT</h1>
            <p className="text-gray-400 mt-1">
              {isSignUp
                ? "Create an account to get started"
                : "Sign in to your account"}
            </p>
          </div>

          {/* Email Input */}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 mb-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none"
          />

          {/* Password Input */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 mb-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none"
          />

          {/* Auth Button */}
          <button
            onClick={handleAuth}
            className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold"
          >
            {isSignUp ? "Sign Up" : "Sign In"}
          </button>

          {/* Google Auth */}
          <button
            onClick={handleGoogleLogin}
            className="w-full mt-3 bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold"
          >
            Continue with Google
          </button>

          {/* Switch Mode */}
          <p className="mt-4 text-gray-400">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <span
              className="text-green-500 cursor-pointer"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </span>
          </p>
        </div>
      </div>
    );
  }

  // === Main App (when logged in) ===
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Top Bar */}
      <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-4">
        <h1 className="text-xl font-bold">LawGPT</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-red-500 hover:underline"
        >
          Logout
        </button>
      </div>

      {/* Chat Area */}
      <div className="p-4 bg-gray-800 rounded-lg shadow-lg">
        <p>Welcome, {user.email}</p>
        <p className="mt-2">Your chat interface goes here...</p>
      </div>
    </div>
  );
}
