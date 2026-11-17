import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Brain,
  CheckCircle2,
  FileUp,
  LoaderCircle,
  ScanLine,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { uploadService } from '../api/uploadService';
import { enhancementService } from '../api/enhancementService';
import { segmentationService } from '../api/segmentationService';

const MAX_FILE_SIZE_BYTES = 150 * 1024 * 1024;
function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentJobId,
    uploadData,
    setJob,
    resetSession,
    processingStatus,
    segmentationStatus,
    enhancementStatus,
    segmentationError,
    enhancementError,
    setProcessingStatus,
    setSegmentationStatus,
    setEnhancementStatus,
    setSegmentationError,
    setEnhancementError,
    setSegmentResult,
    setEnhanceResult,
    isUploading,
    uploadProgress,
    setIsUploading,
    isSegmenting,
    isEnhancing,
    setIsSegmenting,
    setIsEnhancing,
    setUploadProgress,
    setError,
    error,
  } = useAppStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasUploadedVolume = Boolean(currentJobId && uploadData);
  const isProcessing = isSegmenting || isEnhancing || processingStatus === 'processing';
  const completedOperations = [enhancementStatus, segmentationStatus].filter((status) => status === 'succeeded').length;
  const processingProgress = Math.round((completedOperations / 2) * 100);
  const operationItems = [
    { label: 'Image enhancement', icon: Sparkles, status: enhancementStatus, error: enhancementError },
    { label: 'Tumor segmentation', icon: Brain, status: segmentationStatus, error: segmentationError },
  ];

  const validateAndSelectFile = (file: File) => {
    setValidationMessage(null);
    setError(null);
    const name = file.name.toLowerCase();

    if (!name.endsWith('.nii') && !name.endsWith('.nii.gz')) {
      setValidationMessage('Unsupported file type. Select one 4D NIfTI volume with a .nii or .nii.gz extension.');
      return;
    }
    if (file.size === 0) {
      setValidationMessage('This file is empty. Select a non-empty NIfTI volume.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setValidationMessage(`File size is ${formatBytes(file.size)}. The upload limit is 150 MB.`);
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (isUploading) return;
    const file = event.dataTransfer.files.item(0);
    if (file) validateAndSelectFile(file);
  };

  const handleBrowseChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.item(0);
    if (file) validateAndSelectFile(file);
    event.target.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setValidationMessage(null);
    try {
      const response = await uploadService.uploadMRI(selectedFile, setUploadProgress);
      setJob(response.job_id, response);
      setSelectedFile(null);
    } catch (uploadError: unknown) {
      setError(uploadError instanceof Error ? uploadError.message : 'MRI upload or validation failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    if (hasUploadedVolume) {
      resetSession();
    }
    setSelectedFile(null);
    setValidationMessage(null);
    setError(null);
  };

  const handleProcessMRI = async () => {
    if (!currentJobId || !uploadData || isProcessing || selectedFile) return;

    const shouldEnhance = enhancementStatus !== 'succeeded';
    const shouldSegment = segmentationStatus !== 'succeeded';
    if (!shouldEnhance && !shouldSegment) return;

    setProcessingStatus('processing');
    setError(null);
    if (shouldEnhance) {
      setEnhancementStatus('processing');
      setEnhancementError(null);
      setIsEnhancing(true);
    }
    if (shouldSegment) {
      setSegmentationStatus('processing');
      setSegmentationError(null);
      setIsSegmenting(true);
    }

    const tasks = await Promise.allSettled([
      shouldEnhance
        ? enhancementService.runEnhancement(currentJobId).then((result) => {
            if (useAppStore.getState().currentJobId !== currentJobId) return;
            setEnhanceResult(result);
            setEnhancementStatus('succeeded');
          }).catch((operationError: unknown) => {
            if (useAppStore.getState().currentJobId === currentJobId) {
              const message = operationError instanceof Error ? operationError.message : 'Image enhancement failed.';
              setEnhancementError(message);
              setEnhancementStatus('failed');
            }
            throw operationError;
          })
        : Promise.resolve(),
      shouldSegment
        ? segmentationService.runSegmentation(currentJobId, { generate_visualization: true }).then((result) => {
            if (useAppStore.getState().currentJobId !== currentJobId) return;
            setSegmentResult(result);
            setSegmentationStatus('succeeded');
          }).catch((operationError: unknown) => {
            if (useAppStore.getState().currentJobId === currentJobId) {
              const message = operationError instanceof Error ? operationError.message : 'Tumor segmentation failed.';
              setSegmentationError(message);
              setSegmentationStatus('failed');
            }
            throw operationError;
          })
        : Promise.resolve(),
    ]);

    if (useAppStore.getState().currentJobId !== currentJobId) return;

    setIsEnhancing(false);
    setIsSegmenting(false);
    if (tasks.every((task) => task.status === 'fulfilled')) {
      setProcessingStatus('succeeded');
      setError(null);
    } else {
      setProcessingStatus('failed');
      setError('One or more processing operations failed. Retry the failed operation below.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 text-slate-800">
      <header>
        <div className="flex items-center gap-2 text-xs font-medium text-teal-800">
          <ScanLine className="h-4 w-4" aria-hidden="true" />
          <span>Clinical imaging workspace</span>
        </div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Upload Brain MRI
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          Upload one 4D NIfTI volume, then process it once for image enhancement and tumor segmentation.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <Upload className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {hasUploadedVolume ? 'Replace or upload an MRI volume' : 'Select an MRI volume'}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Drag a NIfTI file into the area below, or browse your device.
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".nii,.nii.gz,application/gzip"
          onChange={handleBrowseChange}
          className="sr-only"
          aria-label="Choose a NIfTI MRI volume"
        />
        <div
          onDragEnter={(event) => {
            event.preventDefault();
            if (!isUploading) setDragActive(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false);
          }}
          onDrop={handleDrop}
          className={`flex min-h-56 flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-8 text-center transition-colors ${
            dragActive
              ? 'border-teal-500 bg-teal-50'
              : 'border-slate-300 bg-slate-50/70 hover:border-teal-400 hover:bg-teal-50/50'
          } ${isUploading ? 'pointer-events-none opacity-70' : ''}`}
        >
          <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
            dragActive ? 'bg-teal-100 text-teal-800' : 'bg-white text-teal-700 shadow-sm ring-1 ring-slate-200'
          }`}>
            <FileUp className="h-7 w-7" aria-hidden="true" />
          </span>
          {selectedFile ? (
            <div className="mt-4 max-w-full">
              <p className="break-all text-sm font-semibold text-slate-900">{selectedFile.name}</p>
              <p className="mt-1 text-xs text-slate-500">{formatBytes(selectedFile.size)} · Ready for server validation</p>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-900">
                {dragActive ? 'Drop the MRI volume to select it' : 'Drag and drop your NIfTI volume here'}
              </p>
              <p className="mt-1 text-xs text-slate-500">A single 4D volume containing FLAIR, T1, T1ce, and T2 channels</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-teal-400 hover:bg-teal-50 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileUp className="h-3.5 w-3.5" />
            Browse Files
          </button>
          <p className="mt-3 text-[11px] text-slate-400">NIfTI only · Maximum file size 150 MB</p>
        </div>

        {selectedFile && !isUploading && (
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove file
            </button>
            <button
              type="button"
              onClick={handleUpload}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload and validate
            </button>
          </div>
        )}

        {isUploading && (
          <div className="mt-4 rounded-lg border border-teal-100 bg-teal-50/70 p-4" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs font-medium text-teal-900">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Uploading and validating MRI volume
              </span>
              <span className="font-mono text-xs font-semibold text-teal-800">{uploadProgress}%</span>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-teal-100"
              role="progressbar"
              aria-label="MRI upload progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={uploadProgress}
            >
              <div className="h-full rounded-full bg-teal-600 transition-[width] duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-600">
              The server checks NIfTI readability, 4D dimensions, and all four non-empty modality channels.
            </p>
          </div>
        )}

        {validationMessage && (
          <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <p>{validationMessage}</p>
          </div>
        )}
        {error && processingStatus === 'idle' && (
          <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
            <p>{error}</p>
          </div>
        )}
      </section>

      {hasUploadedVolume && uploadData && (
        <section className="overflow-hidden rounded-xl border border-teal-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-teal-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-900">MRI volume verified and uploaded</h2>
                <p className="mt-1 break-all text-xs text-slate-600">{uploadData.filename}</p>
              </div>
            </div>
            <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-teal-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-800">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
              Ready for analysis
            </span>
          </div>

          <div className="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white p-4">
              <p className="text-[11px] font-medium text-slate-500">Volume dimensions</p>
              <p className="mt-1.5 break-words font-mono text-sm font-semibold text-slate-900">{uploadData.dimensions.join(' × ')}</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[11px] font-medium text-slate-500">File size</p>
              <p className="mt-1.5 font-mono text-sm font-semibold text-slate-900">{formatBytes(uploadData.file_size_bytes)}</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[11px] font-medium text-slate-500">Modality channels</p>
              <p className="mt-1.5 font-mono text-sm font-semibold text-slate-900">{uploadData.modalities} / 4</p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <button
              type="button"
              onClick={handleRemove}
              disabled={isProcessing}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
              title="Clear the active MRI from this browser session"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove MRI
            </button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Replace MRI
              </button>
            </div>
          </div>
          <p className="px-5 pb-3 text-[10px] leading-4 text-slate-400">
            Remove MRI clears the active browser session. The current backend does not provide an endpoint to delete a previously uploaded server file.
          </p>
        </section>
      )}

      {hasUploadedVolume && uploadData && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">MRI processing</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Run enhancement and tumor segmentation together. Results are saved for the viewer pages.
              </p>
            </div>
            {processingStatus !== 'succeeded' && (
              <button
                type="button"
                onClick={handleProcessMRI}
                disabled={isProcessing || Boolean(selectedFile)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {isProcessing ? 'Processing MRI...' : processingStatus === 'failed' ? 'Retry failed operation' : 'Process MRI'}
              </button>
            )}
          </div>

          {processingStatus !== 'idle' && (
            <div className="mt-5 space-y-4" aria-live="polite">
              <div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">Overall progress</span>
                  <span className="font-mono text-slate-600">{completedOperations} of 2 complete</span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-label="MRI processing progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={processingProgress}
                >
                  <div
                    className="h-full rounded-full bg-teal-600 transition-[width] duration-300"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {operationItems.map(({ label, icon: Icon, status, error: operationError }) => (
                  <div key={label} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                        <Icon className="h-4 w-4 text-teal-700" />
                        {label}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                        status === 'succeeded' ? 'text-teal-700' : status === 'failed' ? 'text-rose-700' : 'text-slate-500'
                      }`}>
                        {status === 'processing' && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                        {status === 'succeeded' && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {status === 'failed' ? 'Failed' : status === 'succeeded' ? 'Complete' : status === 'processing' ? 'Running' : 'Waiting'}
                      </span>
                    </div>
                    {operationError && (
                      <p role="alert" className="mt-2 text-[11px] leading-5 text-rose-700">{operationError}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {processingStatus === 'failed' && error && (
            <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800">
              {error}
            </p>
          )}

          {processingStatus === 'succeeded' && (
            <div className="mt-5 space-y-4" aria-live="polite">
              <p className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm font-medium text-teal-900">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-700" />
                MRI enhancement and tumor segmentation completed successfully.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/enhancement')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-teal-400 hover:bg-teal-50"
                >
                  <Sparkles className="h-4 w-4 text-teal-700" />
                  View Image Enhancement
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/processing')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800"
                >
                  <Brain className="h-4 w-4" />
                  View Tumor Segmentation
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
