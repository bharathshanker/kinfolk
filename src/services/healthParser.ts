/// <reference types="vite/client" />
import { GoogleGenAI } from '@google/genai';

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
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY in .env file.');
  }

  const ai = new GoogleGenAI({ apiKey });

  // Construct the inline data part
  // @google/generative-ai expects { inlineData: { data: ..., mimeType: ... } }
  const filePart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  };

  try {
    const response = await ai.models.generateContent({
      // `gemini-3-flash-preview` requires OAuth/Vertex auth and fails with API keys.
      // `gemini-2.5-flash-lite-preview-06-17` supports API-key auth used by this app.
      model: 'gemini-2.5-flash-lite-preview-06-17',
      contents: [
        { text: EXTRACTION_PROMPT },
        filePart,
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text ?? '';
    const jsonText = extractJson(responseText);
    return JSON.parse(jsonText) as ExtractedReport;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse report with Gemini: ${message}`);
  }
};
