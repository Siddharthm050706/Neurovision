import React from 'react';
import { AlertCircle } from 'lucide-react';

interface MedicalDisclaimerProps {
  variant?: 'light' | 'dark';
}

export const MedicalDisclaimer: React.FC<MedicalDisclaimerProps> = ({ variant = 'dark' }) => {
  const light = variant === 'light';

  return (
    <div className={`rounded-lg border p-3 text-xs flex items-start gap-2.5 ${
      light ? 'bg-white border-slate-200 text-slate-500' : 'bg-[#0f172a] border-cyan-900/40 text-slate-400'
    }`}>
      <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${light ? 'text-teal-700' : 'text-cyan-400'}`} />
      <div>
        <span className={`font-semibold ${light ? 'text-teal-800' : 'text-cyan-300'}`}>RESEARCH & EDUCATIONAL DISCLAIMER: </span>
        NeuroVision is an advanced AI medical image processing prototype. It is not an FDA-cleared diagnostic device and must not be used as a substitute for professional clinical diagnosis, radiological review, or medical treatment planning.
      </div>
    </div>
  );
};
