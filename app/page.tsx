"use client";

import { useState } from "react";

export default function AutomationButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [duration, setDuration] = useState<number | null>(null);

  async function runAutomation() {
    setLoading(true);
    setDuration(null);
    const start = performance.now();
    try {
      const response = await fetch("/api/book-food");
      const data = await response.json();
      if (!response.ok) {
        const errorMessage = data.error || "Failed to complete task.";
        setResult(`Error: ${errorMessage}`);
        // console.error(errorMessage);
        return;
      }
      setResult(data.message || "Success");
    } catch (err) {
      setResult(
        `Error: ${
          err instanceof Error ? err.message : "An unknown error occurred."
        }`
      );
      console.error(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
      const end = performance.now();
      setDuration(end - start);
    }
  }

  return (
    <div className="grid place-items-center min-h-screen">
      <button
        onClick={runAutomation}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        {loading ? "Running..." : "Run Automation"}
      </button>
      {result && <p className="mt-4">{result}</p>}
      {duration !== null && (
        <p className="mt-2 text-sm text-gray-500">
          Time taken: {duration.toFixed(2)} ms
        </p>
      )}
    </div>
  );
}
