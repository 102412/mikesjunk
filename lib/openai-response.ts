type ResponsesPayload = {
  output_text?: string;
  output?: Array<{ content?: Array<{ text?: string }> }>;
};

export function getResponseText(payload: ResponsesPayload) {
  if (payload.output_text?.trim()) return payload.output_text;
  return payload.output?.flatMap(item => item.content ?? []).map(item => item.text ?? "").join("").trim() || undefined;
}
