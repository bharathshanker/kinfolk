/// <reference types="vite/client" />
import { GoogleGenAI, Type as SchemaType } from "@google/genai";
import { ChatMessage, Person } from "../types";

// Helper to format context for the AI
const formatContext = (people: Person[]) => {
  return JSON.stringify(people.map(p => ({
    id: p.id,
    name: p.name,
    relation: p.relation,
    health: p.health.map(h => `${h.title} (${h.date})`),
    upcoming_todos: p.todos.filter(t => !t.isCompleted).map(t => `${t.title} due ${t.dueDate}`),
    notes: p.notes.map(n => n.title)
  })));
};

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "add_todo",
        description: "Add a new todo task for a person.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            person_name: { type: SchemaType.STRING, description: "Name of the person" },
            title: { type: SchemaType.STRING, description: "Task title" },
            due_date: { type: SchemaType.STRING, description: "Due date in YYYY-MM-DD format" }
          },
          required: ["person_name", "title", "due_date"]
        }
      },
      {
        name: "add_health_record",
        description: "Add a health record for a person.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            person_name: { type: SchemaType.STRING, description: "Name of the person" },
            title: { type: SchemaType.STRING, description: "Record title (e.g. Dentist Appt)" },
            date: { type: SchemaType.STRING, description: "Date in YYYY-MM-DD format" },
            notes: { type: SchemaType.STRING, description: "Optional notes" },
            type: { type: SchemaType.STRING, description: "Type: CHECKUP, MEDICATION, VACCINE, OTHER" }
          },
          required: ["person_name", "title", "date"]
        }
      },
      {
        name: "add_note",
        description: "Add a note for a person.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            person_name: { type: SchemaType.STRING, description: "Name of the person" },
            title: { type: SchemaType.STRING, description: "Note title" },
            content: { type: SchemaType.STRING, description: "Note content" }
          },
          required: ["person_name", "title", "content"]
        }
      },
      {
        name: "add_finance_record",
        description: "Add a financial record (expense, gift, etc.) for a person.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            person_name: { type: SchemaType.STRING, description: "Name of the person" },
            title: { type: SchemaType.STRING, description: "Description of expense/gift" },
            amount: { type: SchemaType.NUMBER, description: "Amount in USD" },
            type: { type: SchemaType.STRING, description: "Type: EXPENSE, GIFT, OWED, LENT" },
            date: { type: SchemaType.STRING, description: "Date in YYYY-MM-DD format" }
          },
          required: ["person_name", "title", "amount", "type", "date"]
        }
      }
    ]
  }
];

export interface GeminiResponse {
  text: string;
  toolCalls?: Array<{
    name: string;
    args: any;
  }>;
}

export const sendMessageToGemini = async (
  history: ChatMessage[],
  newMessage: string,
  peopleContext: Person[]
): Promise<GeminiResponse> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("API Key is missing");
    return { text: "I'm sorry, I can't connect to the service right now. Please check your API key configuration." };
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
    You are Kinfolk, a warm, nurturing, and highly organized personal family CRM assistant. 
    Your goal is to help the user manage their relationships, memories, and responsibilities for their loved ones.
    
    You have access to the user's current data: ${formatContext(peopleContext)}.
    
    Tone: Calm, joyful, empathetic, and trustworthy. Like a very organized, caring family member.
    
    Capabilities:
    1. Answer questions about the user's family/friends based on the context provided.
    2. Offer advice on gift ideas, health management, or event planning.
    3. You can ADD items to the database using the provided tools. If the user asks to add something, call the appropriate tool.
    
    Constraint: Keep answers concise but warm unless the user asks for a detailed plan.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite-preview-06-17",
      contents: [
        ...history.filter(h => h.role !== 'model').map(h => ({ role: h.role, parts: [{ text: h.text }] })), // Simplified history for stateless call or build proper chat history
        { role: 'user', parts: [{ text: newMessage }] }
      ],
      config: {
        systemInstruction: systemInstruction,
        tools: TOOLS,
      }
    });

    const responseText = response.text;
    const functionCalls = response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      return {
        text: responseText || "I'm on it.",
        toolCalls: functionCalls.map(fc => ({
          name: fc.name,
          args: fc.args
        }))
      };
    }

    return { text: responseText || "I'm not sure how to answer that, but I'm here to help!" };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "I had a little trouble thinking through that. Could you try asking again?" };
  }
};
