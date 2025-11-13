import React from 'react';
import { Proposal } from '../../types';

interface ProjectStatusProps {
    proposal: Proposal;
}

const ProjectStatus: React.FC<ProjectStatusProps> = ({ proposal }) => {
    const filledConceptionFields = Object.values(proposal.conceptionSummary).filter(v => typeof v === 'string' && v.trim() !== '' && !v.startsWith('［待補')).length;
    const conceptionProgress = filledConceptionFields / 5;

    const chaptersWithContent = proposal.chapters.filter(c => c.content && c.content.trim() !== '' && c.content !== 'AI 生成中...').length;
    const writingProgress = proposal.chapters.length > 0 ? (chaptersWithContent / proposal.chapters.length) : 0;
    
    let status: string;
    let statusColor: string;
    let progressPercent: number;

    if (conceptionProgress < 1) {
        status = '構思中';
        statusColor = 'bg-blue-100 text-blue-800';
        progressPercent = conceptionProgress * 30;
    } else if (writingProgress < 1) {
        status = '撰寫中';
        statusColor = 'bg-orange-100 text-orange-800';
        progressPercent = 30 + (writingProgress * 70);
    } else {
        status = '待審查';
        statusColor = 'bg-green-100 text-green-800';
        progressPercent = 100;
    }

    if (filledConceptionFields === 0 && chaptersWithContent === 0) {
        status = '新計畫';
        statusColor = 'bg-gray-100 text-gray-800';
        progressPercent = 0;
    }
    
    // Show a sliver of progress for visual feedback even if percentage is 0
    const displayProgress = Math.max(2, Math.min(progressPercent, 100));

    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusColor}`}>
                    {status}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                    {Math.round(progressPercent)}%
                </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div 
                    className="bg-[#FF6B6B] h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${displayProgress}%` }}
                ></div>
            </div>
        </div>
    );
};

export default ProjectStatus;