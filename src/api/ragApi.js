import { apiClient, unwrap } from './client';

export async function lookupRagChunks({ document_id, section_ids }) {
  const res = await apiClient.post('/api/v1/rag/chunks/lookup', { document_id, section_ids });
  return unwrap(res);
}

export async function listRagDocuments(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });

  const query = search.toString();
  const res = await apiClient.get(`/api/v1/rag/documents${query ? `?${query}` : ''}`);
  return unwrap(res);
}

export async function getRagDocument(documentId) {
  const res = await apiClient.get(`/api/v1/rag/documents/${encodeURIComponent(documentId)}`);
  return unwrap(res);
}

export async function searchRagEvidence(payload) {
  const res = await apiClient.post('/api/v1/rag/search', payload);
  return res;
}
