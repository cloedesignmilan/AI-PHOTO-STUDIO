
export interface EditingParams {
  aspectRatio: string;
  lightingStyle: string;
  cameraPerspective: string;
}

export interface ImageData {
  base64: string;
  mimeType: string;
}

export interface HistoryItem {
  id: string;
  imageUrl: string;
  prompt: string;
  params: EditingParams;
}
