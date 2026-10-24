import { useEffect, useState } from 'react';
import { sendToActiveTab } from '../../src/shared/messages';

export default function App() {
  const [tabUrl, setTabUrl] = useState<string>('…');
  const [pingResult, setPingResult] = useState<string>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => setTabUrl(tab?.url ?? 'No active tab'));
  }, []);

  async function handlePing() {
    setBusy(true);
    setPingResult('');
    const response = await sendToActiveTab({ type: 'PING' });
    if (response.type === 'PING_RESULT') {
      setPingResult(`Title: ${response.title}\nURL: ${response.url}`);
    } else {
      setPingResult(response.message);
    }
    setBusy(false);
  }

  return (
    <main className="flex flex-col gap-4 p-4 text-sm">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">ProposalPilot</h1>
        <p className="opacity-80">ProposalPilot is running</p>
      </header>

      <section className="rounded-lg border border-slate-500/40 p-3">
        <p className="mb-1 text-xs uppercase opacity-60">Active tab</p>
        <p className="break-all font-mono text-xs">{tabUrl}</p>
      </section>

      <button
        type="button"
        onClick={() => void handlePing()}
        disabled={busy}
        className="rounded-md bg-teal-600 px-3 py-2 font-medium text-white hover:bg-teal-500 disabled:opacity-50"
      >
        {busy ? 'Pinging…' : 'Ping page'}
      </button>

      {pingResult ? (
        <pre className="whitespace-pre-wrap rounded-lg border border-slate-500/40 p-3 text-xs">
          {pingResult}
        </pre>
      ) : null}
    </main>
  );
}
