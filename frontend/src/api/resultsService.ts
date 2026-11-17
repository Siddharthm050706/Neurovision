import { apiClient, resolveApiUrl } from './client';
import type { ResultRecord } from '../types';

export const resultsService = {
  async getResults(jobId: string): Promise<ResultRecord> {
    const response = await apiClient.get<ResultRecord>(`/api/results/${jobId}`);
    return response.data;
  },

  getVisualizationUrl(jobId: string): string {
    return resolveApiUrl(`/api/results/${jobId}/visualization`);
  },

  async downloadVisualization(jobId: string): Promise<void> {
    const response = await apiClient.get<Blob>(`/api/results/${jobId}/visualization`, {
      responseType: 'blob',
    });
    const image = response.data;
    if (image.size === 0) {
      throw new Error('The segmentation PNG is empty.');
    }

    const blobUrl = window.URL.createObjectURL(image);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `neurovision_${jobId}_segmentation.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  },

  getMaskDownloadUrl(jobId: string, region: 'WT' | 'TC' | 'ET'): string {
    return resolveApiUrl(`/api/results/${jobId}/masks/${region}`);
  },

  getPreviewUrl(jobId: string, view: 'axial' | 'coronal' | 'sagittal'): string {
    return resolveApiUrl(`/api/results/${jobId}/previews/${view}`);
  },

  getDownloadZipUrl(jobId: string): string {
    return resolveApiUrl(`/api/results/${jobId}/download`);
  },

  async downloadZip(jobId: string): Promise<void> {
    const response = await apiClient.get(`/api/results/${jobId}/download`, {
      responseType: 'blob',
    });
    
    // Extract filename from header or fallback
    let filename = `neurovision_results_${jobId}.zip`;
    const disposition = response.headers['content-disposition'];
    if (disposition && disposition.indexOf('filename=') !== -1) {
      const match = disposition.match(/filename=(.+)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '').trim();
      }
    }

    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  },
};
