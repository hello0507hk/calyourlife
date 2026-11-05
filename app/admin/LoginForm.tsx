'use client';

import { useActionState } from 'react';
import { Lock } from 'lucide-react';
import { login, type LoginState } from './actions';

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex items-center gap-2">
        <Lock className="size-5 text-amber-400" />
        <h1 className="font-serif text-lg font-bold text-amber-100">算命網後台</h1>
      </div>
      <label className="flex flex-col gap-1.5 text-sm text-slate-300">
        管理員密碼
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-base text-slate-100 outline-none focus:border-amber-500"
        />
      </label>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 font-bold text-slate-950 disabled:opacity-60"
      >
        {pending ? '登入中…' : '登入'}
      </button>
    </form>
  );
}
