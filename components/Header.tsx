import React from 'react';
import { LLMProvider } from '../types';

interface HeaderProps {
    llmProvider: LLMProvider;
    setLlmProvider: (provider: LLMProvider) => void;
}

const Header: React.FC<HeaderProps> = ({ llmProvider, setLlmProvider }) => {
    return (
        <header className="px-6 md:px-8 py-4 bg-white shrink-0 border-b border-slate-200/70">
            <div className="flex justify-between items-center">
                {/* Left Side: Search Bar */}
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                        <SearchIcon className="w-5 h-5 text-gray-400" />
                    </span>
                    <input
                        type="text"
                        placeholder="搜尋..."
                        className="w-full max-w-xs pl-11 pr-4 py-2.5 border border-gray-200/70 bg-slate-50 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] shadow-sm transition-all"
                    />
                </div>

                 {/* Right Side: Controls and User Profile */}
                 <div className="flex items-center space-x-6">
                    {/* LLM Provider Selector */}
                    <div className="flex items-center gap-6">
                        <span className="text-sm font-semibold text-slate-500 hidden sm:inline">AI 模型:</span>
                        <div className="flex gap-4">
                            {Object.values(LLMProvider).map(provider => (
                                <button
                                    key={provider}
                                    onClick={() => setLlmProvider(provider)}
                                    className={`px-1 py-1 text-sm font-semibold transition-colors relative after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:h-[3px] after:w-full after:transition-transform after:scale-x-0 after:origin-center hover:after:scale-x-100 ${
                                        llmProvider === provider ? 'text-[#FF6B6B] after:scale-x-100 after:bg-[#FF6B6B]' : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    {provider}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

// --- ICONS ---
const SearchIcon = ({className = 'w-6 h-6'}: {className?: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);

export default Header;