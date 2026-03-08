import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

interface ProviderStatus {
  name: string;
  installed: boolean;
  version: string | null;
}

type Step = 'welcome' | 'detecting' | 'select' | 'login' | 'done';

const PROVIDER_META: Record<string, { icon: string; label: string; desc: string }> = {
  claude: { icon: '◆', label: 'Claude', desc: 'Anthropic CLI · Browser OAuth' },
  codex:  { icon: '⬡', label: 'Codex',  desc: 'OpenAI Codex CLI · Browser OAuth' },
  ollama: { icon: '○', label: 'Ollama', desc: 'Local models · No login needed' },
};

const MOCK_PROVIDERS: ProviderStatus[] = [
  { name: 'claude', installed: true,  version: '1.2.3' },
  { name: 'codex',  installed: false, version: null },
  { name: 'ollama', installed: true,  version: '0.5.1' },
];

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep]         = useState<Step>('welcome');
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loginMsg, setLoginMsg] = useState('');
  const [error, setError]       = useState('');

  const detect = async () => {
    setStep('detecting');
    try {
      const result = IS_TAURI
        ? await invoke<ProviderStatus[]>('detect_providers')
        : (await new Promise<ProviderStatus[]>(r => setTimeout(() => r(MOCK_PROVIDERS), 900)));
      setProviders(result);
    } catch {
      setProviders(MOCK_PROVIDERS);
    }
    setStep('select');
  };

  const login = async (provider: string) => {
    setSelected(provider);
    setStep('login');
    setError('');
    try {
      const msg = IS_TAURI
        ? await invoke<string>('start_provider_login', { provider })
        : `${PROVIDER_META[provider]?.label ?? provider} login gestart — volg de browser-instructies`;
      setLoginMsg(msg);
    } catch (e) {
      setError(String(e));
    }
  };

  const finish = () => {
    localStorage.setItem('oa_onboarded', 'true');
    onComplete();
  };

  return (
    <div className="flex items-center justify-center h-screen bg-oa-bg text-oa-text font-sans">
      <div className="w-full max-w-md px-8 py-10 rounded-2xl bg-[#1e2433] border border-[#2d3548] shadow-2xl">

        {step === 'welcome' && (
          <div className="text-center space-y-6">
            <div className="text-5xl font-bold text-[#22d3ee] tracking-tight">Open Agents</div>
            <p className="text-[#8b95a5] text-sm leading-relaxed">
              Orchestrate AI agents from your desktop.<br />
              Let's set up your LLM provider in a few steps.
            </p>
            <button
              onClick={detect}
              className="w-full py-3 rounded-xl bg-[#22d3ee] text-[#0f1117] font-semibold hover:bg-[#06b6d4] transition-colors"
            >
              Get started →
            </button>
          </div>
        )}

        {step === 'detecting' && (
          <div className="text-center space-y-4">
            <div className="text-2xl font-semibold">Detecting providers…</div>
            <div className="flex justify-center gap-1 pt-2">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-[#22d3ee]"
                  style={{ animation: `ccPulse 1.2s ${i * 0.2}s ease-in-out infinite` }}
                />
              ))}
            </div>
          </div>
        )}

        {step === 'select' && (
          <div className="space-y-5">
            <div>
              <div className="text-xl font-semibold mb-1">Choose a provider</div>
              <p className="text-[#8b95a5] text-xs">Select the LLM CLI tool you want to use.</p>
            </div>
            <div className="space-y-3">
              {providers.map(p => {
                const meta = PROVIDER_META[p.name] ?? { icon: '?', label: p.name, desc: '' };
                return (
                  <button
                    key={p.name}
                    onClick={() => p.installed && login(p.name)}
                    disabled={!p.installed}
                    className={[
                      'w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
                      p.installed
                        ? 'border-[#2d3548] hover:border-[#22d3ee] hover:bg-[#22d3ee10] cursor-pointer'
                        : 'border-[#2d3548] opacity-40 cursor-not-allowed',
                    ].join(' ')}
                  >
                    <span className="text-2xl text-[#22d3ee]">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{meta.label}</div>
                      <div className="text-xs text-[#8b95a5] truncate">{meta.desc}</div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.installed ? 'bg-[#4ade8020] text-[#4ade80]' : 'bg-[#f8717120] text-[#f87171]'
                    }`}>
                      {p.installed ? (p.version ?? 'found') : 'not found'}
                    </span>
                  </button>
                );
              })}
            </div>
            {providers.every(p => !p.installed) && (
              <p className="text-[#f87171] text-xs text-center pt-1">
                No providers found. Install <code>claude</code>, <code>codex</code>, or <code>ollama</code> first.
              </p>
            )}
          </div>
        )}

        {step === 'login' && selected && (
          <div className="space-y-5 text-center">
            <div className="text-3xl text-[#22d3ee]">{PROVIDER_META[selected]?.icon}</div>
            <div className="text-xl font-semibold">Logging in to {PROVIDER_META[selected]?.label ?? selected}</div>
            {loginMsg && <p className="text-[#8b95a5] text-sm">{loginMsg}</p>}
            {error && <p className="text-[#f87171] text-sm">{error}</p>}
            {!error && (
              <p className="text-[#8b95a5] text-xs">
                Your browser opened. Complete the login there, then come back.
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setStep('select')}
                className="flex-1 py-2.5 rounded-xl border border-[#2d3548] text-sm hover:border-[#8b95a5] transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep('done')}
                className="flex-1 py-2.5 rounded-xl bg-[#22d3ee] text-[#0f1117] font-semibold text-sm hover:bg-[#06b6d4] transition-colors"
              >
                Done logging in
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center space-y-6">
            <div className="text-4xl">✓</div>
            <div className="text-xl font-semibold text-[#4ade80]">You're all set!</div>
            <p className="text-[#8b95a5] text-sm">
              {selected
                ? `Connected to ${PROVIDER_META[selected]?.label ?? selected}. Ready to run agents.`
                : 'Setup complete. Ready to run agents.'}
            </p>
            <button
              onClick={finish}
              className="w-full py-3 rounded-xl bg-[#22d3ee] text-[#0f1117] font-semibold hover:bg-[#06b6d4] transition-colors"
            >
              Open dashboard →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
