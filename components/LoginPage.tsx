import React, { useState } from 'react';
import { User } from '../types';

interface LoginPageProps {
  onLogin: (username: string, password: string) => User | null;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = onLogin(username, password);
    if (user) {
      setError('');
      // The onLogin function in App.tsx will handle setting state and localStorage
    } else {
      setError('帳號或密碼錯誤，請再試一次。');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg border border-slate-200/80">
        <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-[#FF6B6B] rounded-xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M25 75V25L50 43.75V93.75L25 75Z" fill="currentColor" fillOpacity={0.7}/>
                        <path d="M50 43.75L75 25V75L50 93.75V43.75Z" fill="currentColor"/>
                    </svg>
                </div>
                <div className="text-left">
                    <h1 className="font-bold text-2xl text-slate-800 leading-tight">PlanA Co-Studio</h1>
                    <p className="text-slate-500 text-sm leading-tight">PlanA 智策共創室</p>
                </div>
            </div>
          <h2 className="text-xl font-semibold text-slate-700">歡迎回來！請登入您的帳號</h2>
        </div>
        <form className="space-y-6" onSubmit={handleLoginSubmit}>
          <div>
            <label
              htmlFor="username"
              className="text-sm font-medium text-slate-700"
            >
              使用者帳號
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-[#FF6B6B] focus:border-[#FF6B6B] sm:text-sm"
              placeholder="admin"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="text-sm font-medium text-slate-700"
            >
              密碼
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-[#FF6B6B] focus:border-[#FF6B6B] sm:text-sm"
              placeholder="password"
            />
          </div>
          
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#FF6B6B] hover:bg-[#fa5a5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B6B] transition-transform transform hover:scale-105"
            >
              登入
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;