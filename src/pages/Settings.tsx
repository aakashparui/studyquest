import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Bell, Download, Keyboard, Palette, Timer, Trash2, Upload } from 'lucide-react';
import { useStudy } from '../store/useStudy';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/Modal';
import { NumberStepper, Segmented, Toggle } from '../components/ui/Controls';
import { AmbientControl } from '../components/Dashboard/AmbientControl';
import { InstallCard } from '../components/Settings/InstallCard';
import { SHORTCUTS } from '../hooks/useKeyboardShortcuts';
import type { AnimationIntensity, ThemeName } from '../types/study';

export function SettingsPage(): ReactElement {
  const {
    state,
    updateTimerSettings,
    updatePrefs,
    resetAll,
    exportState,
    importState,
    notifications,
    storageAvailable,
  } = useStudy();

  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { timer, prefs } = state;

  const handleFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    try {
      const text = await file.text();
      setPendingImport(text);
    } catch {
      setPendingImport(null);
    }
  };

  const notificationHint = (): string => {
    switch (notifications.support) {
      case 'unsupported':
        return 'This browser does not support notifications.';
      case 'denied':
        return 'Blocked in your browser settings — sound and the in-app summary still work.';
      case 'granted':
        return 'Permission granted.';
      default:
        return 'You will be asked for permission once.';
    }
  };

  return (
    <div className="space-y-4">
      {!storageAvailable && (
        <div className="rounded-2xl border border-amber/40 bg-amber/10 p-4 text-sm text-ink">
          Local storage is unavailable in this browser session, so progress will not survive a
          refresh. Private-browsing modes often cause this.
        </div>
      )}

      <InstallCard />

      <Card title="Timer" subtitle="Session lengths and what happens between them">
        <div className="divide-y divide-line/70">
          <NumberStepper
            label="Focus duration"
            unit="min"
            min={1}
            max={180}
            value={timer.focusMinutes}
            onChange={(focusMinutes) => updateTimerSettings({ focusMinutes })}
          />
          <NumberStepper
            label="Short break"
            unit="min"
            min={1}
            max={60}
            value={timer.shortBreakMinutes}
            onChange={(shortBreakMinutes) => updateTimerSettings({ shortBreakMinutes })}
          />
          <NumberStepper
            label="Long break"
            unit="min"
            min={1}
            max={90}
            value={timer.longBreakMinutes}
            onChange={(longBreakMinutes) => updateTimerSettings({ longBreakMinutes })}
          />
          <NumberStepper
            label="Sessions before long break"
            min={1}
            max={12}
            value={timer.sessionsBeforeLongBreak}
            onChange={(sessionsBeforeLongBreak) =>
              updateTimerSettings({ sessionsBeforeLongBreak })
            }
          />
          <Toggle
            label="Auto-start breaks"
            description="Begin the break as soon as a focus session ends."
            checked={timer.autoStartBreak}
            onChange={(autoStartBreak) => updateTimerSettings({ autoStartBreak })}
          />
          <Toggle
            label="Auto-start focus"
            description="Begin the next focus session as soon as a break ends."
            checked={timer.autoStartFocus}
            onChange={(autoStartFocus) => updateTimerSettings({ autoStartFocus })}
          />
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          <Timer size={13} aria-hidden />
          Changes apply to the next session you start.
        </p>
      </Card>

      <Card title="Notifications & sound">
        <div className="divide-y divide-line/70">
          <Toggle
            label="Browser notifications"
            description={notificationHint()}
            checked={prefs.notifications && notifications.support === 'granted'}
            disabled={notifications.support === 'unsupported' || notifications.support === 'denied'}
            onChange={async (next) => {
              if (!next) {
                updatePrefs({ notifications: false });
                return;
              }
              const result = await notifications.request();
              updatePrefs({ notifications: result === 'granted' });
            }}
          />
          <Toggle
            label="Sound effects"
            description="Clicks, session chimes, level-ups and achievements."
            checked={prefs.sound}
            onChange={(sound) => updatePrefs({ sound })}
          />
        </div>
        <div className="mt-4 border-t border-line/70 pt-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Bell size={14} aria-hidden /> Ambient sound
          </p>
          <AmbientControl
            compact
            value={prefs.ambient}
            volume={prefs.ambientVolume}
            onChange={(ambient) => updatePrefs({ ambient })}
            onVolume={(ambientVolume) => updatePrefs({ ambientVolume })}
          />
        </div>
      </Card>

      <Card title="Appearance">
        <div className="space-y-4">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <Palette size={14} aria-hidden /> Theme
            </p>
            <Segmented<ThemeName>
              label="Theme"
              value={prefs.theme}
              onChange={(theme) => updatePrefs({ theme })}
              options={[
                { value: 'dark', label: '🌙 Dark' },
                { value: 'light', label: '☀️ Light' },
              ]}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Animation intensity</p>
            <Segmented<AnimationIntensity>
              label="Animation intensity"
              value={prefs.animation}
              onChange={(animation) => updatePrefs({ animation })}
              options={[
                { value: 'full', label: 'Full' },
                { value: 'subtle', label: 'Subtle' },
                { value: 'off', label: 'Off' },
              ]}
            />
            <p className="mt-2 text-xs text-muted">
              Subtle keeps transitions but stops the background drift and glow. Off disables
              animation entirely.
            </p>
          </div>
        </div>
      </Card>

      <Card title="Keyboard shortcuts">
        <ul className="divide-y divide-line/70">
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.keys} className="flex items-center justify-between gap-4 py-2.5">
              <span className="text-sm text-ink-soft">{shortcut.action}</span>
              <kbd className="rounded-lg border border-line bg-raised px-2.5 py-1 text-xs font-bold text-ink">
                {shortcut.keys}
              </kbd>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          <Keyboard size={13} aria-hidden />
          Shortcuts are ignored while you are typing in a field.
        </p>
      </Card>

      <Card title="Data" subtitle="Everything lives in this browser. Keep a backup if it matters.">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportState} icon={<Download size={15} aria-hidden />}>
            Export JSON
          </Button>
          <Button
            variant="secondary"
            onClick={() => fileRef.current?.click()}
            icon={<Upload size={15} aria-hidden />}
          >
            Import JSON
          </Button>
          <Button
            variant="danger"
            onClick={() => setConfirmReset(true)}
            icon={<Trash2 size={15} aria-hidden />}
          >
            Reset all data
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>
        <dl className="num mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">Sessions stored</dt>
            <dd className="font-bold text-ink">{state.sessions.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Subjects</dt>
            <dd className="font-bold text-ink">{state.subjects.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Total XP</dt>
            <dd className="font-bold text-ink">{state.xp.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Tracking since</dt>
            <dd className="font-bold text-ink">
              {new Date(state.createdAt).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </Card>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all data?"
        description="XP, levels, streaks, sessions, subjects, achievements and settings are permanently deleted from this browser. This cannot be undone."
        confirmLabel="Delete everything"
        destructive
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          resetAll();
        }}
      >
        <p className="text-sm text-muted">
          Export your data first if you want to keep a copy.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingImport !== null}
        title="Replace your data?"
        description="Importing overwrites the progress currently stored in this browser."
        confirmLabel="Import and replace"
        destructive
        onCancel={() => setPendingImport(null)}
        onConfirm={() => {
          if (pendingImport) importState(pendingImport);
          setPendingImport(null);
        }}
      />
    </div>
  );
}
