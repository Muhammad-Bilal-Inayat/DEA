import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const MasterPanelPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/server', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 space-y-3">
      <div className="w-8 h-8 border-3 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
      <p className="text-xs font-semibold text-slate-400">Redirecting to Central Server Hub...</p>
    </div>
  );
};

