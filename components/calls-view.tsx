"use client";

import * as React from "react";
import { useApp } from "@/components/app-context";
import { getReviewCalls, submitReviewCallChoice } from "./calls-actions";
import { Icon } from "@/components/icons";
import type { Bead } from "@/lib/schema";

function extractSections(description: string) {
  let what = "";
  let whatYouDo = "";
  const matchWhat = description.match(/WHAT:\s*([\s\S]*?)(?=\n\s*[A-Z\s]+:|$)/i);
  if (matchWhat) {
    what = matchWhat[1].trim();
  }
  const matchDo = description.match(/WHAT YOU DO:\s*([\s\S]*?)(?=\n\s*[A-Z\s]+:|$)/i);
  if (matchDo) {
    whatYouDo = matchDo[1].trim();
  }
  return { what, whatYouDo };
}

function parseLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline break-all">
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function CallsView() {
  const { loading: appLoading } = useApp();
  const [calls, setCalls] = React.useState<Bead[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [inputs, setInputs] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState<Record<string, boolean>>({});

  const refresh = React.useCallback(async () => {
    const data = await getReviewCalls();
    setCalls(data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    let mounted = true;
    getReviewCalls().then(data => {
      if (mounted) {
        setCalls(data);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  const handleAction = async (id: string, message: string, close: boolean) => {
    setSubmitting(prev => ({ ...prev, [id]: true }));
    await submitReviewCallChoice(id, message, close);
    setInputs(prev => ({ ...prev, [id]: "" }));
    setSubmitting(prev => ({ ...prev, [id]: false }));
    if (close) {
      refresh();
    }
  };

  if (loading || appLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        Loading review calls...
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-zinc-500">
        <Icon name="check" size={48} className="mb-4 opacity-50" />
        <p>No open review calls.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-zinc-950 text-zinc-300">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-2 mb-6">
          <Icon name="gate" size={24} /> Review Calls
        </h1>
        {calls.map(call => {
          const { what, whatYouDo } = extractSections(call.description || "");
          const hasSections = !!what || !!whatYouDo;
          
          return (
            <div key={call.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-medium text-zinc-100">{call.title}</h2>
                <span className="text-xs text-zinc-500 font-mono">{call.id}</span>
              </div>
              
              <div className="text-sm text-zinc-400 mb-4 whitespace-pre-wrap">
                {hasSections ? (
                  <div className="space-y-3">
                    {what && (
                      <div>
                        <strong className="text-zinc-300 block mb-1">WHAT:</strong>
                        {parseLinks(what)}
                      </div>
                    )}
                    {whatYouDo && (
                      <div>
                        <strong className="text-zinc-300 block mb-1">WHAT YOU DO:</strong>
                        {parseLinks(whatYouDo)}
                      </div>
                    )}
                    <div className="pt-2 border-t border-zinc-800/50 mt-2">
                      <details>
                        <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-400">Full details</summary>
                        <div className="mt-2 text-zinc-500">
                           {parseLinks(call.description)}
                        </div>
                      </details>
                    </div>
                  </div>
                ) : (
                  parseLinks(call.description || "")
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-col gap-3">
                <textarea
                  value={inputs[call.id] || ""}
                  onChange={e => setInputs(prev => ({ ...prev, [call.id]: e.target.value }))}
                  placeholder="Type your decision or notes here..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 min-h-[80px]"
                />
                
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(call.id, "Request more information", false)}
                      disabled={submitting[call.id]}
                      className="px-3 py-1.5 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50"
                    >
                      Need More Info
                    </button>
                    <button
                      onClick={() => handleAction(call.id, "Request visual diagram of the change", false)}
                      disabled={submitting[call.id]}
                      className="px-3 py-1.5 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50"
                    >
                      Request Diagram
                    </button>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(call.id, inputs[call.id], false)}
                      disabled={submitting[call.id] || !inputs[call.id]}
                      className="px-3 py-1.5 text-xs font-medium rounded bg-blue-900/40 text-blue-400 hover:bg-blue-900/60 disabled:opacity-50 border border-blue-900/50"
                    >
                      Save Note Only
                    </button>
                    <button
                      onClick={() => handleAction(call.id, inputs[call.id], true)}
                      disabled={submitting[call.id]}
                      className="px-3 py-1.5 text-xs font-medium rounded bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60 disabled:opacity-50 border border-emerald-900/50"
                    >
                      Submit & Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
