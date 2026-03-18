
import React, { useState } from 'react';
import { Flatmate, FlatEvent, TaskStatus } from '../types';
import { BarChart3, Brain, FileText, ChevronRight, History, Activity, TrendingUp, CheckCircle } from 'lucide-react';
import { generateAISummary } from '../services/geminiService';

interface AnalyticsViewProps {
  flatmates: Flatmate[];
  events: FlatEvent[];
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ flatmates, events }) => {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const totalTasks = events.length;
  const completedTasks = events.filter(e => e.status === TaskStatus.VERIFIED).length;
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    try {
      const summary = await generateAISummary(events, flatmates);
      setAiSummary(summary);
    } catch (error) {
      console.error(error);
      setAiSummary("Unable to generate summary at this time. Please ensure internal data systems are operational.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 space-y-3 max-h-[calc(100vh-200px)] overflow-hidden">
      {/* High Level Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white p-3 rounded border border-gray-200 shadow-sm">
          <div className="flex items-center gap-1.5 text-[#6264A7] mb-1">
            <TrendingUp size={14} />
            <span className="text-[9px] font-bold uppercase tracking-widest">Throughput</span>
          </div>
          <div className="text-xl font-bold">{completionRate}%</div>
          <p className="text-[9px] text-gray-500">System efficiency</p>
        </div>
        <div className="bg-white p-3 rounded border border-gray-200 shadow-sm">
          <div className="flex items-center gap-1.5 text-green-600 mb-1">
            <CheckCircle size={14} />
            <span className="text-[9px] font-bold uppercase tracking-widest">Verified</span>
          </div>
          <div className="text-xl font-bold">{completedTasks}</div>
          <p className="text-[9px] text-gray-500">Units resolved</p>
        </div>
      </div>

      <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-[#464775]" />
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Reliability Index</h2>
          </div>
        </div>
        
        <div className="p-3 space-y-3">
          {flatmates.map((mate) => (
            <div key={mate.id} className="space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-2">
                  <img src={mate.avatar} className="w-5 h-5 rounded-full" alt="" />
                  <span className="font-semibold text-gray-700">{mate.name}</span>
                </div>
                <div className="font-bold">{mate.score}/100</div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
                <div 
                  className="bg-[#6264A7] h-full transition-all duration-700 ease-out" 
                  style={{ width: `${mate.score}%` }} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#464775] text-white rounded shadow-sm p-4 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-2 relative z-10">
          <Brain size={16} className="text-purple-300" />
          <h2 className="text-[10px] font-bold uppercase tracking-widest">AI Intelligence</h2>
        </div>
        
        {aiSummary ? (
          <div className="bg-white/10 p-3 rounded border border-white/20 text-xs relative z-10">
             <p className="italic font-light opacity-90">"{aiSummary}"</p>
             <button onClick={() => setAiSummary(null)} className="mt-2 text-[10px] font-bold uppercase text-white hover:underline">Dismiss</button>
          </div>
        ) : (
          <button 
            disabled={isGenerating}
            onClick={handleGenerateSummary}
            className="w-full bg-white text-[#464775] py-2.5 rounded text-[11px] font-bold flex items-center justify-center gap-2 hover:bg-gray-100 disabled:opacity-50 transition-all z-10 relative"
          >
            {isGenerating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#464775]" /> : "Run Diagnostics"}
          </button>
        )}
      </div>

      <div className="bg-white rounded border border-gray-200 shadow-sm p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-[#464775]">
            <History size={14} />
          </div>
          <span className="text-[11px] font-bold text-gray-700">Archived Sprints</span>
        </div>
        <ChevronRight size={14} className="text-gray-300" />
      </div>
    </div>
  );
};

export default AnalyticsView;
