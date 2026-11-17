import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Layers3,
  RefreshCw,
  ScanLine,
  Upload,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { healthService } from '../api/healthService';
import { modelService } from '../api/modelService';
import { resultsService } from '../api/resultsService';

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

interface StatCardProps {
  label: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  tone: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, detail, icon: Icon, tone }) => (
  <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      </div>
      <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
    </div>
    <p className="mt-3 text-xs text-slate-500">{detail}</p>
  </article>
);

interface PreviewPanelProps {
  title: string;
  src?: string;
  alt: string;
  emptyMessage: string;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ title, src, alt, emptyMessage }) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [src]);

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <h3 className="border-b border-slate-100 px-3 py-2.5 text-xs font-semibold text-slate-700">{title}</h3>
      <div className="flex aspect-[4/3] items-center justify-center bg-slate-50 p-2">
        {src && !imageError ? (
          <img
            src={src}
            alt={alt}
            className="max-h-full max-w-full object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="px-3 text-center">
            <AlertCircle className="mx-auto h-5 w-5 text-slate-400" aria-hidden="true" />
            <p className="mt-2 text-xs leading-5 text-slate-500">{imageError ? 'Preview could not be loaded.' : emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const {
    health,
    currentJobId,
    uploadData,
    segmentResult,
    enhanceResult,
    resultRecord,
    setHealth,
    setModelInfo,
    setResultRecord,
  } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const activeRecord = resultRecord?.job_id === currentJobId ? resultRecord : null;
  const activeSegment = segmentResult?.job_id === currentJobId ? segmentResult : null;

  const loadData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [healthResponse, modelResponse] = await Promise.all([
        healthService.getHealth(),
        modelService.getModelInfo(),
      ]);
      setHealth(healthResponse);
      setModelInfo(modelResponse);
    } catch (error: unknown) {
      setFetchError(
        error instanceof Error ? error.message : 'Failed to connect to NeuroVision backend API.',
      );
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentRecord = useCallback(async (force = false) => {
    if (!currentJobId || !activeSegment || (activeRecord && !force)) return;

    setRecordLoading(true);
    setRecordError(null);
    try {
      const record = await resultsService.getResults(currentJobId);
      setResultRecord(record);
    } catch (error: unknown) {
      setRecordError(error instanceof Error ? error.message : 'Failed to load analysis record.');
    } finally {
      setRecordLoading(false);
    }
  }, [activeRecord, activeSegment, currentJobId, setResultRecord]);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    void loadCurrentRecord();
  }, [loadCurrentRecord]);

  const isBackendOnline = health?.status === 'ok';
  const hasScan = Boolean(currentJobId || uploadData);
  const hasSegmentation = Boolean(activeSegment || activeRecord);
  const processingTime = activeRecord?.processing_time_seconds ?? activeSegment?.processing_time_seconds;
  const regionCounts = activeRecord?.region_voxels ?? activeSegment?.regions;
  const segmentationPreviewUrl = currentJobId && hasSegmentation
    ? resultsService.getVisualizationUrl(currentJobId)
    : undefined;
  const enhancedPreviewUrl = currentJobId && hasScan && enhanceResult?.job_id === currentJobId
    ? resultsService.getPreviewUrl(currentJobId, 'axial')
    : undefined;

  const stats = [
    {
      label: 'Total MRI Scans',
      value: hasScan ? '1' : '0',
      detail: 'Scans in the active workspace',
      icon: ScanLine,
      tone: 'bg-teal-50 text-teal-700',
    },
    {
      label: 'Segmented Cases',
      value: hasSegmentation ? '1' : '0',
      detail: 'Cases segmented in this session',
      icon: CheckCircle2,
      tone: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Average Processing Time',
      value: processingTime === undefined ? '—' : `${processingTime.toFixed(2)} s`,
      detail: processingTime === undefined ? 'No completed analysis yet' : 'Active session analysis',
      icon: Clock3,
      tone: 'bg-indigo-50 text-indigo-700',
    },
  ];

  const activityItems = useMemo(() => {
    const items = [];
    if (uploadData) {
      items.push({
        id: 'upload',
        title: 'MRI scan uploaded',
        detail: uploadData.filename,
        time: 'Active session',
        icon: Upload,
      });
    }
    if (hasSegmentation) {
      items.push({
        id: 'analysis',
        title: 'Segmentation completed',
        detail: resultRecord?.model || segmentResult?.model || 'Analysis result available',
        time: resultRecord?.created_at ? formatDate(resultRecord.created_at) : 'Active session',
        icon: Brain,
      });
    }
    return items;
  }, [activeRecord, activeSegment, hasSegmentation, uploadData]);

  const handleRefresh = async () => {
    setRecordError(null);
    await Promise.all([loadData(), loadCurrentRecord(true)]);
  };

  return (
    <div className="relative mx-auto w-full max-w-[1440px] space-y-6">
      <section className="relative z-10 flex flex-col justify-between gap-5 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white/85 via-white/80 to-sky-50/85 px-6 py-7 shadow-sm sm:px-8 lg:flex-row lg:items-center">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-800">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
            Diagnostic Research Console
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            NeuroVision Radiology Workspace
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Pretrained MONAI SegResNet multi-region tumor segmentation &amp; CLAHE contrast enhancement for 4D Brain MRI analysis.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800"
          >
            <Upload className="h-4 w-4" />
            Upload Brain MRI
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {fetchError && (
        <div role="alert" className="relative z-10 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Backend connection issue: {fetchError}
        </div>
      )}

      <section aria-label="Workspace statistics" className="relative z-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </section>

      <div className="relative z-10 grid items-stretch gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <section className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-teal-700" />
              <h2 className="text-sm font-semibold text-slate-900">Recent MRI Analysis</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              MRI previews and measurements from the active analysis session
            </p>
          </div>
          <Link
            to="/results"
            aria-disabled={!hasSegmentation}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
              hasSegmentation
                ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                : 'pointer-events-none border-slate-200 bg-slate-50 text-slate-400'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            View Results
          </Link>
        </div>

        <div className="grid flex-1 gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,3fr)_minmax(200px,1fr)]">
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <PreviewPanel
              title="Enhanced MRI"
              src={enhancedPreviewUrl}
              alt="CLAHE-enhanced axial MRI slice"
              emptyMessage={hasScan
                ? 'Generate an enhanced preview in the Enhancement workspace to display it here.'
                : 'Upload an MRI and generate an enhanced preview.'}
            />
            <PreviewPanel
              title="Segmentation Result"
              src={segmentationPreviewUrl}
              alt="MRI orthogonal visualization with tumor segmentation overlays"
              emptyMessage={hasSegmentation
                ? 'Segmentation visualization is not available for this analysis.'
                : 'Run segmentation to view the result.'}
            />
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-teal-700" />
                <h3 className="text-xs font-semibold text-slate-800">Tumor Region Information</h3>
              </div>
              <dl className="mt-3 divide-y divide-slate-200">
                {([
                  ['Whole Tumor (WT)', 'WT'],
                  ['Tumor Core (TC)', 'TC'],
                  ['Enhancing Tumor (ET)', 'ET'],
                ] as const).map(([label, region]) => (
                  <div key={region} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                    <dt className="text-slate-600">{label}</dt>
                    <dd className="font-mono font-semibold tabular-nums text-slate-900">
                      {regionCounts ? regionCounts[region].toLocaleString() : '—'}
                      {regionCounts && <span className="ml-1 font-sans font-normal text-slate-500">voxels</span>}
                    </dd>
                  </div>
                ))}
              </dl>
              {!regionCounts && <p className="mt-2 text-[11px] text-slate-500">Available after segmentation completes.</p>}
            </div>

          </aside>
        </div>
        </section>
        <article className="flex h-full min-w-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                <Activity className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Recent Activity</h2>
                <p className="mt-0.5 text-xs text-slate-500">Current workspace events</p>
              </div>
            </div>
            <span className={`h-2 w-2 rounded-full ${isBackendOnline ? 'bg-teal-500' : 'bg-slate-300'}`} title={isBackendOnline ? 'Backend connected' : 'Backend disconnected'} />
          </div>
          {activityItems.length ? (
            <ol className="flex-1 divide-y divide-slate-100 px-5">
              {activityItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id} className="flex items-start gap-3 py-4">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">{item.title}</p>
                      <p className="mt-1 truncate text-xs text-slate-500" title={item.detail}>{item.detail}</p>
                    </div>
                    <time className="shrink-0 pt-0.5 text-[11px] text-slate-400">{item.time}</time>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
              <Activity className="mx-auto h-6 w-6 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-600">No recent activity</p>
              <p className="mt-1 text-xs text-slate-500">Upload an MRI scan to start a workspace session.</p>
            </div>
          )}
        </article>
      </div>

      <article className="relative z-10 min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Recent Analysis Records</h2>
                <p className="mt-0.5 text-xs text-slate-500">Analysis details available for the active session</p>
              </div>
            </div>
            {recordLoading && <span className="text-xs text-slate-500">Loading record…</span>}
          </div>

          {recordError && (
            <p role="alert" className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-xs text-rose-800">
              Unable to load the analysis record: {recordError}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Scan / Patient</th>
                  <th className="px-5 py-3 font-semibold">Model</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hasSegmentation ? (
                  <tr className="text-slate-700">
                    <td className="whitespace-nowrap px-5 py-4">{activeRecord?.created_at ? formatDate(activeRecord.created_at) : '—'}</td>
                    <td className="max-w-40 truncate px-5 py-4" title={activeRecord?.patient_id || uploadData?.filename || ''}>
                      {activeRecord?.patient_id || uploadData?.filename || '—'}
                    </td>
                    <td className="px-5 py-4">{activeRecord?.model || activeSegment?.model || '—'}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-teal-50 px-2 py-1 font-medium capitalize text-teal-800">
                        {activeRecord?.status || activeSegment?.status || 'Completed'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums">
                      {processingTime === undefined ? '—' : `${processingTime.toFixed(2)} s`}
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                      {recordLoading ? 'Loading the current analysis…' : 'No analysis records available in this session.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">
            The connected API exposes the active job record only; historical records are not available here.
          </div>
      </article>
    </div>
  );
};
