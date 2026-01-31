/// <reference types="vite/client" />
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ExtractedMarker {
  name: string;
  code?: string | null;
  value?: number | null;
  valueText?: string | null;
  unit?: string | null;
  referenceRange?: string | null;
}

export interface ExtractedReport {
  labName?: string | null;
  testDate?: string | null;
  markers: ExtractedMarker[];
}

const EXTRACTION_PROMPT = `
You are a medical lab report parser. Extract all biomarker values from this blood test report.

Return a JSON object with this structure:
{
  "labName": "string",
  "testDate": "YYYY-MM-DD",
  "markers": [
    {
      "name": "marker name as shown",
      "code": "standardized code (HBA1C, LDL, etc.)",
      "value": number or null,
      "valueText": "string for non-numeric",
      "unit": "unit as shown",
      "referenceRange": "min-max as shown"
    }
  ]
}

Rules:
- Respond with JSON only. No markdown, no explanations.
- Use null for missing values.
- Be thorough and extract ALL markers.
`;

const extractJson = (raw: string) => {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start == -1 || end == -1 || end <= start) {
    throw new Error('Unable to parse JSON from Gemini response.');
  }
  return raw.slice(start, end + 1);
};

export const parseHealthReport = async (base64Data: string, mimeType = 'application/pdf'): Promise<ExtractedReport> => {
  // Use the VITE_GEMINI_API_KEY from .env
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY in .env file.');
  }

  // Debug log to verify key loading (safe)
  console.log('[HealthParser] Using API Key starting with:', apiKey.substring(0, 4) + '...');

  // Initialize standard Gemini API Client
  const genAI = new GoogleGenerativeAI(apiKey);

  // Use gemini-3-flash-preview as requested
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

  // Construct the inline data part
  // @google/generative-ai expects { inlineData: { data: ..., mimeType: ... } }
  const filePart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  };

  const result = await model.generateContent([
    EXTRACTION_PROMPT,
    filePart
  ]);
  const response = result.response;
  const responseText = response.text();

  const jsonText = extractJson(responseText);
  return JSON.parse(jsonText) as ExtractedReport;
};
