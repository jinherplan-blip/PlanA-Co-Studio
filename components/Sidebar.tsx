import React from 'react';
import { Stage, User } from '../types';

interface SidebarProps {
  activeStage: Stage;
  onStageSelect: (stage: Stage) => void;
  user: User | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeStage, onStageSelect, user, onLogout }) => {
  const topLevelStages = [Stage.MANAGEMENT, Stage.STRATEGY_AND_INSPIRATION, Stage.INFORMATION, Stage.COMPARISON];
  if (user?.role === '管理員') {
    topLevelStages.push(Stage.SETTINGS);
  }

  const icons: { [key in Stage]: React.ReactElement } = {
    [Stage.MANAGEMENT]: <HomeIcon />,
    [Stage.INFORMATION]: <InboxIcon />,
    [Stage.STRATEGY_AND_INSPIRATION]: <StarIcon />,
    [Stage.PROJECT]: <div />, // Placeholder, not shown
    [Stage.COMPARISON]: <ChartBarIcon />,
    [Stage.SETTINGS]: <CogIcon />,
  };

  return (
     <aside className="w-64 bg-white flex flex-col flex-shrink-0 rounded-2xl shadow-lg shadow-slate-200/50">
        <button
            onClick={() => onStageSelect(Stage.MANAGEMENT)}
            className="flex items-center space-x-3 p-5 h-20 w-full text-left hover:bg-slate-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#FF6B6B]"
            aria-label="返回專案工作台"
            title="返回專案工作台"
        >
            <div className="w-10 h-10 bg-[#FF6B6B] rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-white" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M25 75V25L50 43.75V93.75L25 75Z" fill="currentColor" fillOpacity={0.7}/>
                    <path d="M50 43.75L75 25V75L50 93.75V43.75Z" fill="currentColor"/>
                </svg>
            </div>
            <h1 className="font-bold text-base text-slate-800">PlanA Co-Studio</h1>
        </button>
      
        <nav className="flex-1 px-4 py-6">
            <h2 className="px-3 mb-2 text-xs font-semibold text-slate-400 tracking-wider uppercase">選單</h2>
            <div className="space-y-1">
            {topLevelStages.map((stage) => {
                const isActive = activeStage === stage || (activeStage === Stage.PROJECT && stage === Stage.MANAGEMENT);
                return (
                <button
                    key={stage}
                    title={stage}
                    onClick={() => onStageSelect(stage)}
                    className={`w-full flex items-center px-3 py-2.5 text-sm group transition-colors duration-200 rounded-lg ${
                    isActive ? 'bg-[#FF6B6B] text-white font-semibold shadow-md shadow-red-200' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                >
                    {React.cloneElement(icons[stage] as React.ReactElement<{className?: string}>, { className: `w-5 h-5 mr-3 transition-colors duration-200 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}` })}
                    <span>{stage}</span>
                </button>
                );
            })}
            </div>
        </nav>
        
        {user && (
            <div className="mt-auto p-4 border-t border-slate-200/60">
                <div className="flex items-center space-x-3 mb-4">
                    <img src={user.avatarUrl} alt="User Avatar" className="w-10 h-10 rounded-full" />
                    <div>
                        <p className="font-semibold text-sm text-slate-800">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.title}</p>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center px-3 py-2 text-sm group transition-colors duration-200 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                >
                    <LogoutIcon className="w-5 h-5 mr-3 text-slate-400 group-hover:text-red-500" />
                    <span>登出</span>
                </button>
            </div>
        )}
      </aside>
  );
};

// --- ICONS (Outline Style to match target) ---
const HomeIcon = ({className = 'w-6 h-6'}: {className?: string}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a.75.75 0 011.06 0l8.955 8.955M3 10.5v.75a4.5 4.5 0 004.5 4.5h7.5a4.5 4.5 0 004.5-4.5v-.75m-15 6V21a.75.75 0 00.75.75h13.5a.75.75 0 00.75-.75v-3.75" />
  </svg>
);

const InboxIcon = ({className = 'w-6 h-6'}: {className?: string}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.012-1.244h3.86M2.25 9h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.012-1.244h3.86m-19.5 0a2.25 2.25 0 0 1-2.25-2.25V6.75A2.25 2.25 0 0 1 2.25 4.5h19.5A2.25 2.25 0 0 1 24 6.75v.75a2.25 2.25 0 0 1-2.25 2.25M12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
  </svg>
);

const StarIcon = ({className = 'w-6 h-6'}: {className?: string}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 21.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>
);

const ChartBarIcon = ({className = 'w-6 h-6'}: {className?: string}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const CogIcon = ({className = 'w-6 h-6'}: {className?: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0 0 15 0m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1 1 15 0" />
    </svg>
);


const LogoutIcon = ({className = 'w-6 h-6'}: {className?: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
    </svg>
);


export default Sidebar;