import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Header } from './components/Header'
import { RelayStatusBar } from './components/RelayStatusBar'
import { AnalysisTable } from './components/AnalysisTable'
import { useNostr } from './hooks/useNostr'
import { dump } from './utils/debug'
import './App.css'

function App() {
  const { t } = useTranslation()
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

  // Expose dump function to window for debugging
  useEffect(() => {
    (window as unknown as { dump: () => void }).dump = () => dump(userProfile, userRelays, followeeAnalyses)
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
              onClick={startAnalysis}
              disabled={isAnalyzing}
            >
              {t('actions.analyzeFollowees')}
            </button>
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
