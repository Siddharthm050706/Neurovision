import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { resultsService } from '../api/resultsService';
import type { ResultRecord } from '../types';

export const ProcessingPage: React.FC = () => {
  const { currentJobId, segmentResult, resultRecord, setResultRecord } = useAppStore();
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [recordLoading, setRecordLoading] = useState(true);

  useEffect(() => {
    if (currentJobId && !resultRecord) {
      let isCurrentRequest = true;
      resultsService
        .getResults(currentJobId)
        .then((res: ResultRecord) => {
          if (isCurrentRequest && useAppStore.getState().currentJobId === currentJobId) {
            setResultRecord(res);
          }
        })
        .catch((err) => {
          if (isCurrentRequest) console.warn('Could not preload result record:', err);
        })
        .finally(() => {
          if (isCurrentRequest) setRecordLoading(false);
        });

      return () => {
        isCurrentRequest = false;
      };
    }

    return undefined;
  }, [currentJobId, resultRecord, setResultRecord]);

  if (!currentJobId) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
          <Eye className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">No active Brain MRI job</h2>
        <p className="text-sm text-slate-600">
          Upload and process an MRI scan to view the multi-region visualization.
        </p>
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-semibold"
        >
          <span>Go to MRI Upload</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (!segmentResult && !resultRecord && recordLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
        <RefreshCw className="h-7 w-7 animate-spin text-teal-700" />
        <p className="text-sm">Loading saved segmentation results...</p>
      </div>
    );
  }

  if (!segmentResult && !resultRecord) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Eye className="mx-auto h-9 w-9 text-teal-700" />
        <h2 className="text-lg font-semibold text-slate-900">Segmentation results are not available</h2>
        <p className="text-sm leading-6 text-slate-600">
          Process an MRI from the upload page first. Opening this viewer never runs segmentation again.
        </p>
        <Link to="/upload" className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800">
          Go to MRI Upload <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const visUrl = resultsService.getVisualizationUrl(currentJobId);
  const regions = segmentResult?.regions || resultRecord?.region_voxels || { WT: 0, TC: 0, ET: 0 };
  void (segmentResult?.processing_time_seconds || resultRecord?.processing_time_seconds);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-900">
            <Eye className="h-5 w-5 text-teal-700" />
            <span>Tumor Segmentation — Orthogonal 3-View Workspace</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Axial, Coronal, and Sagittal cross-sections demonstrating multi-label tumor boundaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom & View Controls */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 text-slate-600">
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.75}
              title="Zoom Out"
              className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-40"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              title="Reset Zoom"
              className="rounded px-2 py-1 font-mono text-xs text-teal-800 hover:bg-teal-50"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 2.5}
              title="Zoom In"
              className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-40"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="mx-1 h-4 w-px bg-slate-200" />
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

        </div>
      </div>

      {/* Main Image Viewport */}
      <div
        className={`relative overflow-hidden rounded-xl border border-slate-200 bg-[#0a0f18] shadow-lg transition-all ${
          isFullscreen ? 'fixed inset-4 z-50 flex flex-col' : 'min-h-[500px]'
        }`}
      >
        {isFullscreen && (
          <div className="flex items-center justify-between border-b border-slate-200 bg-white p-3 text-xs">
            <span className="font-mono text-teal-800">NEUROVISION SEGMENTATION VIEW — FULLSCREEN</span>
            <button
              onClick={() => setIsFullscreen(false)}
              className="rounded bg-slate-100 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-200"
            >
              Close
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto flex items-center justify-center p-4">
          {imageLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a0f18]/80 z-10">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
              <div className="font-mono text-xs text-slate-200">
                Loading generated MRI segmentation overlay...
              </div>
            </div>
          )}

          {imageError ? (
            <div className="text-center p-8 space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <div className="text-sm font-semibold text-rose-300">
                Visualization Image Unavailable
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                The visualization artifact could not be retrieved. Please verify that segmentation was executed with visualization enabled.
              </p>
              <Link
                to="/processing"
                className="mt-2 inline-flex items-center gap-1.5 rounded bg-white px-3 py-1.5 font-mono text-xs text-teal-800 hover:bg-teal-50"
              >
                Return to Processing
              </Link>
            </div>
          ) : (
            <img
              src={visUrl}
              alt="NeuroVision Orthogonal Multi-Region Tumor Segmentation"
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
              }}
              className="max-w-full h-auto object-contain select-none rounded shadow-md"
            />
          )}
        </div>
      </div>

      {/* Tumor Region Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* WT Card */}
        <div className="space-y-3 rounded-xl border border-cyan-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-tumor-wt flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-tumor-wt" />
              WT — Whole Tumor
            </span>
            <span className="font-mono text-[10px] text-slate-500">Class Label 2 / In Channel 1</span>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-slate-900">
              {regions.WT.toLocaleString()}
            </div>
            <div className="mt-0.5 text-xs text-slate-600">
              Encompasses total edema, core, and enhancing regions
            </div>
          </div>
        </div>

        {/* TC Card */}
        <div className="space-y-3 rounded-xl border border-amber-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-tumor-tc flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-tumor-tc" />
              TC — Tumor Core
            </span>
            <span className="font-mono text-[10px] text-slate-500">Class Label 1 / In Channel 0</span>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-slate-900">
              {regions.TC.toLocaleString()}
            </div>
            <div className="mt-0.5 text-xs text-slate-600">
              Includes non-enhancing & enhancing solid active tumor
            </div>
          </div>
        </div>

        {/* ET Card */}
        <div className="space-y-3 rounded-xl border border-rose-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-tumor-et flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-tumor-et" />
              ET — Enhancing Tumor
            </span>
            <span className="font-mono text-[10px] text-slate-500">Class Label 4 / In Channel 2</span>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-slate-900">
              {regions.ET.toLocaleString()}
            </div>
            <div className="mt-0.5 text-xs text-slate-600">
              Hyper-intense T1ce active neo-vascularized rim
            </div>
          </div>
        </div>
      </div>

      {/* Overlap Disclaimer Note */}
      <div className="flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-xs text-slate-600">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          <span className="font-semibold text-slate-800">Spatial Region Overlap: </span>
          The WT (Whole Tumor), TC (Tumor Core), and ET (Enhancing Tumor) masks are hierarchically nested in 3D anatomical space (ET ⊆ TC ⊆ WT). Voxel counts must not be summed together.
        </div>
      </div>
    </div>
  );
};
