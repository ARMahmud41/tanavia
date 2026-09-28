// ============================================
// TANAVIA — File Upload Helper
// ============================================

import { API_URL } from './api';
import { getToken } from './auth';

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
}

/**
 * Upload a single image file to the server
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  const token = getToken();

  if (!token) {
    throw new Error('You must be logged in to upload files');
  }

  // Client-side validation
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File is larger than 5MB');
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/api/upload/product`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Don't set Content-Type — browser will set with boundary
    },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Upload failed');
  }

  return data.data as UploadResult;
}

/**
 * Upload multiple image files at once
 */
export async function uploadImages(files: File[]): Promise<UploadResult[]> {
  const token = getToken();

  if (!token) {
    throw new Error('You must be logged in to upload files');
  }

  if (files.length === 0) {
    return [];
  }

  const formData = new FormData();
  for (const file of files) {
    // Client-side validation per file
    if (!file.type.startsWith('image/')) {
      throw new Error(`${file.name} is not an image`);
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error(`${file.name} is larger than 5MB`);
    }
    formData.append('files', file);
  }

  const res = await fetch(`${API_URL}/api/upload/product/multiple`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Upload failed');
  }

  return data.data as UploadResult[];
}