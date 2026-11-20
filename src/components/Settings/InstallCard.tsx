import type { ReactElement } from 'react';
import { CheckCircle2, Share, Smartphone } from 'lucide-react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export function InstallCard(): ReactElement {
  const { canInstall, installed, needsManualSteps, install } = useInstallPrompt();

  return (
    <Card
      title="Install"
      subtitle="Add StudyQuest to your home screen and it opens full-screen and offline."
    >
      {installed ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-mint">
          <CheckCircle2 size={16} aria-hidden />
          Installed — you are running the app version.
        </p>
      ) : canInstall ? (
        <Button
          variant="primary"
          onClick={() => void install()}
          icon={<Smartphone size={16} aria-hidden />}
        >
          Install StudyQuest
        </Button>
      ) : needsManualSteps ? (
        <ol className="space-y-2 text-sm text-ink-soft">
          <li className="flex items-start gap-2">
            <Share size={15} className="mt-0.5 shrink-0 text-cyan" aria-hidden />
            Tap the Share button in Safari&apos;s toolbar.
          </li>
          <li className="pl-[23px]">Choose &ldquo;Add to Home Screen&rdquo;.</li>
          <li className="pl-[23px]">Open StudyQuest from the new icon.</li>
        </ol>
      ) : (
        <p className="text-sm text-muted">
          Open this page in Chrome, Edge or Safari on your phone to install it. On a desktop
          browser, look for the install icon in the address bar. Installing is only offered over
          <span className="font-semibold text-ink-soft"> https</span> or on{' '}
          <span className="font-semibold text-ink-soft">localhost</span>.
        </p>
      )}
      <p className="mt-3 text-xs text-muted">
        Your progress stays on the device that recorded it. Use Export and Import below to move it.
      </p>
    </Card>
  );
}
