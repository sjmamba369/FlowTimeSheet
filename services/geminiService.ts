import { GoogleGenAI } from "@google/genai";
import { Timesheet, EntryType } from "../types";

const API_KEY = process.env.API_KEY || '';

export const auditTimesheet = async (timesheet: Timesheet): Promise<string> => {
  if (!API_KEY) {
    return "AI Audit Unavailable: Missing API Key.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    // Construct a textual representation of the timesheet
    const entryDetails = timesheet.entries.map(e => 
      `- Date: ${e.date}, Type: ${e.type}, Hours: ${e.hours}`
    ).join('\n');

    const prompt = `
      Act as a strict HR Timesheet Auditor. Review the following timesheet for anomalies.
      
      Rules:
      1. Employees should generally not work more than 7 consecutive days.
      2. 'Shift Allowance' should typically be accompanied by 'Regular' hours on the same day if it's a split shift, or it might be standalone. Just flag if it looks odd (e.g. 8 hours of just allowance).
      3. Check for any single day with > 12 hours.
      4. Provide a brief, bulleted summary of the hours breakdown by type.

      Timesheet Data:
      Employee: ${timesheet.employeeName}
      Period: ${timesheet.periodStart} to ${timesheet.periodEnd}
      
      Entries:
      ${entryDetails}

      Output Format:
      **Summary**: [Brief breakdown]
      **Flags**: [List of potential issues or "None detected"]
      **Recommendation**: [Approve / Request Clarification]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini Audit Error:", error);
    return "Error performing AI audit. Please check console.";
  }
};

export const generateRejectionDraft = async (timesheet: Timesheet, rawReason: string): Promise<string> => {
   if (!API_KEY) return rawReason;

   try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const prompt = `
      Draft a professional and polite rejection comment for a timesheet.
      
      Context:
      Employee: ${timesheet.employeeName}
      Manager's Raw Reason: "${rawReason}"
      
      The tone should be constructive. Keep it under 2 sentences.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    return response.text || rawReason;
   } catch (error) {
       return rawReason;
   }
}