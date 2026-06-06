import React, { useState } from "react";
import { SessionStatus } from "@/types";

interface BottomToolbarProps {
  sessionStatus: SessionStatus;
  onToggleConnection: () => void;
  isPTTActive: boolean;
  setIsPTTActive: (val: boolean) => void;
  isPTTUserSpeaking: boolean;
  handleTalkButtonDown: () => void;
  handleTalkButtonUp: () => void;
  isEventsPaneExpanded: boolean;
  setIsEventsPaneExpanded: (val: boolean) => void;
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (val: boolean) => void;
  codec: string;
  onCodecChange: (newCodec: string) => void;
}

function VoiceDisclaimerModal({
  onContinue,
  onCancel,
}: {
  onContinue: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <h2 className="text-white font-semibold text-base">Voice Mode Notice</h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            Voice interactions consume more system resources and may use credits faster
            than text-based interactions.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            You can disconnect at any time using the Disconnect button.
          </p>
          <div className="flex gap-3 pt-1">
            <button
              onClick={onContinue}
              className="flex-1 bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Continue
            </button>
            <button
              onClick={onCancel}
              className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm px-4 py-2.5 rounded-xl hover:bg-gray-50 dark:bg-gray-900 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BottomToolbar({
  sessionStatus,
  onToggleConnection,
  isPTTActive,
  setIsPTTActive,
  isPTTUserSpeaking,
  handleTalkButtonDown,
  handleTalkButtonUp,
  isEventsPaneExpanded,
  setIsEventsPaneExpanded,
  isAudioPlaybackEnabled,
  setIsAudioPlaybackEnabled,
  codec,
  onCodecChange,
}: BottomToolbarProps) {
  const isConnected = sessionStatus === "CONNECTED";
  const isConnecting = sessionStatus === "CONNECTING";
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const handleCodecChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onCodecChange(e.target.value);
  };

  const handleConnectClick = () => {
    if (isConnected) {
      onToggleConnection();
    } else {
      setShowDisclaimer(true);
    }
  };

  function getConnectionButtonLabel() {
    if (isConnected) return "Disconnect";
    if (isConnecting) return "Connecting...";
    return "Connect";
  }

  function getConnectionButtonClasses() {
    const baseClasses = "text-white text-base p-2 w-36 rounded-md h-full";
    const cursorClass = isConnecting ? "cursor-not-allowed" : "cursor-pointer";
    if (isConnected) return `bg-red-600 hover:bg-red-700 ${cursorClass} ${baseClasses}`;
    return `bg-black hover:bg-gray-900 ${cursorClass} ${baseClasses}`;
  }

  return (
    <>
      {showDisclaimer && (
        <VoiceDisclaimerModal
          onContinue={() => {
            setShowDisclaimer(false);
            onToggleConnection();
          }}
          onCancel={() => setShowDisclaimer(false)}
        />
      )}

      <div className="p-4 flex flex-row items-center justify-center gap-x-8">
        <button
          onClick={handleConnectClick}
          className={getConnectionButtonClasses()}
          disabled={isConnecting}
        >
          {getConnectionButtonLabel()}
        </button>

        <div className="flex flex-row items-center gap-2">
          <input
            id="push-to-talk"
            type="checkbox"
            checked={isPTTActive}
            onChange={(e) => setIsPTTActive(e.target.checked)}
            disabled={!isConnected}
            className="w-4 h-4"
          />
          <label htmlFor="push-to-talk" className="flex items-center cursor-pointer">
            Push to talk
          </label>
          <button
            onMouseDown={handleTalkButtonDown}
            onMouseUp={handleTalkButtonUp}
            onTouchStart={handleTalkButtonDown}
            onTouchEnd={handleTalkButtonUp}
            disabled={!isPTTActive}
            className={
              (isPTTUserSpeaking ? "bg-gray-300" : "bg-gray-200") +
              " py-1 px-4 cursor-pointer rounded-md" +
              (!isPTTActive ? " bg-gray-100 dark:bg-gray-800 text-gray-400" : "")
            }
          >
            Talk
          </button>
        </div>

        <div className="flex flex-row items-center gap-1">
          <input
            id="audio-playback"
            type="checkbox"
            checked={isAudioPlaybackEnabled}
            onChange={(e) => setIsAudioPlaybackEnabled(e.target.checked)}
            disabled={!isConnected}
            className="w-4 h-4"
          />
          <label htmlFor="audio-playback" className="flex items-center cursor-pointer">
            Audio playback
          </label>
        </div>

        <div className="flex flex-row items-center gap-2">
          <input
            id="logs"
            type="checkbox"
            checked={isEventsPaneExpanded}
            onChange={(e) => setIsEventsPaneExpanded(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="logs" className="flex items-center cursor-pointer">
            Logs
          </label>
        </div>

        <div className="flex flex-row items-center gap-2">
          <div>Codec:</div>
          <select
            id="codec-select"
            value={codec}
            onChange={handleCodecChange}
            className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none cursor-pointer"
          >
            <option value="opus">Opus (48 kHz)</option>
            <option value="pcmu">PCMU (8 kHz)</option>
            <option value="pcma">PCMA (8 kHz)</option>
          </select>
        </div>
      </div>
    </>
  );
}

export default BottomToolbar;
