import { useState } from "react";
import { signIn, signUp } from "../services/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleRegister() {
    const { error } = await signUp(email, password);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Conta criada!");
  }

  async function handleLogin() {
    const { error } = await signIn(email, password);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Login feito!");
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="bg-zinc-900 p-8 rounded-2xl w-[350px] flex flex-col gap-4">
        <h1 className="text-white text-3xl font-bold text-center">
          FatorZ
        </h1>

        <input
          type="email"
          placeholder="Seu email"
          className="p-3 rounded-lg bg-zinc-800 text-white outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Sua senha"
          className="p-3 rounded-lg bg-zinc-800 text-white outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleRegister}
          className="bg-purple-600 p-3 rounded-lg"
        >
          Criar Conta
        </button>

        <button
          onClick={handleLogin}
          className="bg-white text-black p-3 rounded-lg"
        >
          Entrar
        </button>
      </div>
    </div>
  );
}