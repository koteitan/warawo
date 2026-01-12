import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Header } from './components/Header'
import { RelayStatusBar } from './components/RelayStatusBar'
import { AnalysisTable } from './components/AnalysisTable'
import { useNostr } from './hooks/useNostr'
import { dump } from './utils/debug'
import { dumprelaylist, dumpqueue0, dumpRelayFailures, dumpStatus, dumpsub, dumpsubsum } from './services/nostr'
import './App.css'

function App() {
  const { t } = useTranslation()
  const [useKind10002, setUseKind10002] = useState(true)
  const [useKind3, setUseKind3] = useState(true)
  const {
    pubkey,
    userProfile,
    userRelays,
    followeeAnalyses,
    relayStatuses,
    isLoading,
    isAnalyzing,
    canAnalyze,
    statusMessage,
    loadFromExtension,
    setPubkey,
    loadUserData,
    startAnalysis,
  } = useNostr()

  useEffect(() => {
    // Load pubkey from NIP-07 extension on page load
    loadFromExtension().then((pk) => {
      if (pk) {
        loadUserData(pk)
      }
    })
  }, [])

  // Expose debug functions to window for debugging
  useEffect(() => {
    const w = window as unknown as {
      dump: () => void
      dumprelaylist: () => void
      dumpqueue0: () => void
      dumpRelayFailures: () => void
      dumpStatus: () => void
      dumpsub: () => void
      dumpsubsum: () => void
    }
    w.dump = () => dump(userProfile, userRelays, followeeAnalyses)
    w.dumprelaylist = dumprelaylist
    w.dumpqueue0 = dumpqueue0
    w.dumpRelayFailures = dumpRelayFailures
    w.dumpStatus = dumpStatus
    w.dumpsub = dumpsub
    w.dumpsubsum = dumpsubsum
  }, [userProfile, userRelays, followeeAnalyses])

  const handlePubkeyChange = (pk: string) => {
    setPubkey(pk)
  }

  const handlePubkeyBlur = (pk: string) => {
    if (pk.trim()) {
      loadUserData(pk)
    }
  }

  const handleLoadFromExtension = async () => {
    const pk = await loadFromExtension()
    if (pk) {
      loadUserData(pk)
    }
  }

  return (
    <div className="app">
      <Header
        pubkey={pubkey}
        userProfile={userProfile}
        isLoading={isLoading}
        onPubkeyChange={handlePubkeyChange}
        onPubkeyBlur={handlePubkeyBlur}
        onLoadFromExtension={handleLoadFromExtension}
      />
      <main className="main">
        <div className="status-section">
          <RelayStatusBar statuses={relayStatuses} />
          {statusMessage && (
            <div className={`status-message${isLoading ? ' loading' : ''}`}>{statusMessage}</div>
          )}
        </div>
        {!pubkey && !isLoading && (
          <div className="empty-state">
            {t('messages.enterPubkey')}
          </div>
        )}
        {canAnalyze && (
          <div className="analyze-section">
            <button
              className="analyze-button"
              onClick={() => startAnalysis({ useKind10002, useKind3 })}
              disabled={isAnalyzing || (!useKind10002 && !useKind3)}
            >
              {t('actions.analyzeFollowees')}
            </button>
            <div className="kind-checkboxes">
              <label className="kind-checkbox-label">
                <input
                  type="checkbox"
                  checked={useKind10002}
                  onChange={(e) => setUseKind10002(e.target.checked)}
                  disabled={isAnalyzing}
                />
                kind:10002
              </label>
              <label className="kind-checkbox-label">
                <input
                  type="checkbox"
                  checked={useKind3}
                  onChange={(e) => setUseKind3(e.target.checked)}
                  disabled={isAnalyzing}
                />
                kind:3
              </label>
            </div>
          </div>
        )}
        {followeeAnalyses.length > 0 && userProfile && (
          <AnalysisTable
            userProfile={userProfile}
            userRelays={userRelays}
            followeeAnalyses={followeeAnalyses}
          />
        )}
      </main>
    </div>
  )
}

export default App
