import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Brain, Sparkles } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { resultsService } from '../api/resultsService';

const VIEWS = ['axial', 'coronal', 'sagittal'] as const;
type View = (typeof VIEWS)[number];

export const EnhancementPage: React.FC = () => {
  const { currentJobId, enhanceResult, processingStatus } = useAppStore();
  const [selectedView, setSelectedView] = useState<View>('axial');
  const [zoom, setZoom] = useState(1);
  const [enhancedUnavailable, setEnhancedUnavailable] = useState(false);

  if (!currentJobId) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-12 text-center">
        <Sparkles className="mx-auto h-10 w-10 text-teal-700" />
        <h2 className="text-lg font-semibold text-slate-900">No MRI scan loaded</h2>
        <p className="text-sm text-slate-600">Upload and process an MRI to view the saved enhancement output.</p>
        <Link to="/upload" className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800">
          Go to MRI Upload <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (processingStatus !== 'succeeded' || !enhanceResult) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto h-8 w-8 text-blue-700" />
        <h2 className="text-lg font-semibold text-slate-900">Enhancement output is not available</h2>
        <p className="text-sm leading-6 text-slate-600">
          Run MRI processing from the upload page first. Opening this page never starts enhancement again.
        </p>
        <Link to="/upload" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          Return to MRI Upload <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const enhancedUrl = resultsService.getPreviewUrl(currentJobId, selectedView);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 text-slate-800">
      <header>
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-teal-800">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>Clinical imaging workspace</span>
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Image Enhancement</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Review the enhanced {enhanceResult.modality} preview generated during processing.
          </p>
        </div>
      </header>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h3 className="text-xs font-semibold text-slate-900">Enhanced MRI controls</h3>
          <p className="mt-1 text-[11px] text-slate-500">Choose a slice and adjust the zoom level.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Enhanced MRI slice view">
            {VIEWS.map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => {
                  setSelectedView(view);
                  setEnhancedUnavailable(false);
                }}
                aria-pressed={selectedView === view}
                className={`rounded-md px-3 py-1.5 text-[11px] font-medium capitalize transition-colors ${
                  selectedView === view ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-white'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[11px] text-slate-600">
            Zoom
            <input
              type="range"
              min={0.75}
              max={2}
              step={0.25}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              aria-label="Image zoom"
              className="w-24 accent-teal-700"
            />
            <span className="w-10 font-mono">{Math.round(zoom * 100)}%</span>
          </label>
        </div>
      </section>

      <section aria-label="Enhanced MRI preview">
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Enhanced MRI <span className="font-normal text-slate-500">· {enhanceResult.modality} · {selectedView}</span>
            </h3>
            <p className="mt-1 text-[11px] text-slate-500">
              Saved enhancement result from the original processing operation.
            </p>
          </div>
          <div className="flex min-h-72 items-center justify-center overflow-auto bg-slate-950 p-3">
            {enhancedUnavailable ? (
              <p className="flex items-center gap-2 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4" /> Enhanced MRI preview is unavailable.
              </p>
            ) : (
              <img
                src={enhancedUrl}
                alt={`${enhanceResult.modality} ${selectedView} enhanced MRI preview`}
                onError={() => setEnhancedUnavailable(true)}
                className="max-h-[34rem] max-w-full object-contain transition-transform"
                style={{ transform: `scale(${zoom})` }}
              />
            )}
          </div>
        </article>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-slate-500">
          Image enhancement and segmentation results remain available for this MRI job.
        </p>
        <Link
          to="/processing"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-teal-400 hover:bg-teal-50"
        >
          <Brain className="h-4 w-4 text-teal-700" />
          View Tumor Segmentation
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
};
