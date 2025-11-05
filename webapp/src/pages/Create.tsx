import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject, useUpdateProject, useLaunchProject } from '../hooks/useProjects';
import { ChevronLeft, Loader2, CheckCircle, Circle } from 'lucide-react';
import { triggerSuccess, triggerError, triggerImpact } from '../lib/haptics';

const STEPS = [
  { id: 1, name: 'Metadata', description: 'Name, symbol, image' },
  { id: 2, name: 'Bundle', description: 'Wallets & amounts' },
  { id: 3, name: 'Review', description: 'Check everything' },
];

export function CreatePage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { data: project, isLoading, refetch } = useProject(projectId);
  const { mutate: updateProject } = useUpdateProject();
  const { mutate: launchProject, isPending: isLaunching } = useLaunchProject();

  const [currentStep, setCurrentStep] = useState(1);
  const [metadata, setMetadata] = useState({
    name: project?.name || '',
    symbol: project?.symbol || '',
    description: project?.description || '',
    twitter: project?.twitter || '',
    telegram: project?.telegram || '',
    website: project?.website || '',
  });

  const [bundle, setBundle] = useState({
    walletCount: project?.bundleCount || 0,
    amountPerWallet: project?.buyAmountPerWallet || 0,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  const handleSaveMetadata = () => {
    updateProject(
      {
        id: projectId!,
        updates: metadata,
      },
      {
        onSuccess: () => {
          triggerSuccess();
          setCurrentStep(2);
          refetch();
        },
        onError: () => {
          triggerError();
        },
      }
    );
  };

  const handleSaveBundle = () => {
    updateProject(
      {
        id: projectId!,
        updates: {
          bundleCount: bundle.walletCount,
          buyAmountPerWallet: bundle.amountPerWallet,
        },
      },
      {
        onSuccess: () => {
          triggerSuccess();
          setCurrentStep(3);
          refetch();
        },
        onError: () => {
          triggerError();
        },
      }
    );
  };

  const handleLaunch = () => {
    triggerImpact();
    launchProject(projectId!, {
      onSuccess: () => {
        triggerSuccess();
        navigate('/portfolio');
      },
      onError: () => {
        triggerError();
      },
    });
  };

  const totalCost = (bundle.walletCount * bundle.amountPerWallet) + 0.005; // + Jito tip

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 text-primary hover:opacity-70 transition"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <h1 className="text-2xl font-bold">Create Token</h1>
        <div className="w-5" />
      </div>

      {/* Steps */}
      <div className="flex justify-between items-center gap-2">
        {STEPS.map((step) => (
          <div key={step.id} className="flex-1">
            <button
              onClick={() => setCurrentStep(step.id)}
              disabled={step.id > currentStep}
              className="w-full text-center disabled:opacity-50"
            >
              <div className="flex items-center justify-center mb-2">
                {step.id < currentStep ? (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                ) : step.id === currentStep ? (
                  <Circle className="w-8 h-8 text-primary" />
                ) : (
                  <Circle className="w-8 h-8 text-muted" />
                )}
              </div>
              <p className="text-xs font-medium">{step.name}</p>
            </button>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-64">
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Token Name *</label>
              <input
                type="text"
                placeholder="My Awesome Token"
                value={metadata.name}
                onChange={(e) => setMetadata({ ...metadata, name: e.target.value })}
                className="w-full mt-2 px-4 py-2 bg-input rounded-lg border border-border focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Symbol *</label>
              <input
                type="text"
                placeholder="MAT"
                maxLength={10}
                value={metadata.symbol}
                onChange={(e) => setMetadata({ ...metadata, symbol: e.target.value.toUpperCase() })}
                className="w-full mt-2 px-4 py-2 bg-input rounded-lg border border-border focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                placeholder="Describe your token..."
                rows={3}
                value={metadata.description}
                onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                className="w-full mt-2 px-4 py-2 bg-input rounded-lg border border-border focus:border-primary focus:outline-none"
              />
            </div>

            <div className="border-t border-border pt-4 mt-4">
              <p className="text-sm text-muted-foreground mb-4">Socials (Optional)</p>
              
              <input
                type="text"
                placeholder="Twitter handle (without @)"
                value={metadata.twitter}
                onChange={(e) => setMetadata({ ...metadata, twitter: e.target.value })}
                className="w-full mb-2 px-4 py-2 bg-input rounded-lg border border-border focus:border-primary focus:outline-none text-sm"
              />

              <input
                type="text"
                placeholder="Telegram group (without @)"
                value={metadata.telegram}
                onChange={(e) => setMetadata({ ...metadata, telegram: e.target.value })}
                className="w-full mb-2 px-4 py-2 bg-input rounded-lg border border-border focus:border-primary focus:outline-none text-sm"
              />

              <input
                type="text"
                placeholder="Website URL"
                value={metadata.website}
                onChange={(e) => setMetadata({ ...metadata, website: e.target.value })}
                className="w-full px-4 py-2 bg-input rounded-lg border border-border focus:border-primary focus:outline-none text-sm"
              />
            </div>

            <button
              onClick={handleSaveMetadata}
              disabled={!metadata.name || !metadata.symbol}
              className="w-full mt-6 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition font-medium"
            >
              Continue to Bundle
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Number of Bundle Wallets</label>
              <input
                type="number"
                min="0"
                max="100"
                value={bundle.walletCount}
                onChange={(e) => setBundle({ ...bundle, walletCount: Number(e.target.value) })}
                className="w-full mt-2 px-4 py-2 bg-input rounded-lg border border-border focus:border-primary focus:outline-none"
              />
              <p className="text-xs text-muted-foreground mt-1">Set to 0 for dev-buy only</p>
            </div>

            <div>
              <label className="text-sm font-medium">SOL per Wallet</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={bundle.amountPerWallet}
                onChange={(e) => setBundle({ ...bundle, amountPerWallet: Number(e.target.value) })}
                className="w-full mt-2 px-4 py-2 bg-input rounded-lg border border-border focus:border-primary focus:outline-none"
              />
            </div>

            {/* Summary */}
            <div className="bg-muted rounded-lg p-4 space-y-2 mt-6">
              <div className="flex justify-between text-sm">
                <span>Total Buy Amount:</span>
                <span className="font-mono font-bold">{(bundle.walletCount * bundle.amountPerWallet).toFixed(3)} SOL</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Jito Tip:</span>
                <span className="font-mono">0.005 SOL</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
                <span>Total Required:</span>
                <span className="font-mono">{totalCost.toFixed(3)} SOL</span>
              </div>
            </div>

            <button
              onClick={handleSaveBundle}
              className="w-full mt-6 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium"
            >
              Review Launch
            </button>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">Token Details</h3>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-mono">{project.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Symbol:</span>
                  <span className="font-mono">{project.symbol}</span>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">Bundle Configuration</h3>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wallets:</span>
                  <span className="font-mono">{bundle.walletCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Per Wallet:</span>
                  <span className="font-mono">{bundle.amountPerWallet.toFixed(3)} SOL</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border font-bold">
                  <span>Total Cost:</span>
                  <span className="font-mono">{totalCost.toFixed(3)} SOL</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-sm">
              <p className="text-yellow-600 font-medium mb-2">⚠️ Important</p>
              <p className="text-yellow-600/80">
                Make sure your wallets have enough SOL funded before launching. The token will be created immediately after confirming.
              </p>
            </div>

            <button
              onClick={handleLaunch}
              disabled={isLaunching}
              className="w-full mt-6 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition font-medium flex items-center justify-center gap-2"
            >
              {isLaunching && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLaunching ? 'Launching...' : '🚀 Launch Token'}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-2 justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 transition font-medium"
        >
          Previous
        </button>
        {currentStep < 3 && (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            className="flex-1 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/90 transition font-medium"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

