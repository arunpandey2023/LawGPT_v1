import { useState } from "react";
import { supabase } from "./supabase";

export default function Auth({ onAuth }) {
  const [email, setEmail] = useState("");

  const handleLogin = async () => {
    await supabase.auth.signInWithOtp({ email });
    alert("Check your email for login link");
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="space-y-3">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email"
          className="border px-4 py-2"
        />
        <button onClick={handleLogin} className="bg-black text-white px-4 py-2">
          Login
        </button>
      </div>
    </div>
  );
}