import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { UserProfile } from '../types'
import { hasNip07Extension } from '../services/nip07'
import { hexToNpub } from '../utils/pubkey'
import { VERSION_NAME } from '../version'

interface HeaderProps {
  pubkey: string
  userProfile: UserProfile | null
  isLoading: boolean
  onPubkeyChange: (pubkey: string) => void
  onPubkeyBlur: (pubkey: string) => void
  onLoadFromExtension: () => void
}

export function Header({
  pubkey,
  userProfile,
  isLoading,
  onPubkeyChange,
  onPubkeyBlur,
  onLoadFromExtension,
}: HeaderProps) {
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    if (pubkey) {
      setInputValue(hexToNpub(pubkey))
    } else {
      setInputValue('')
    }
  }, [pubkey])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    onPubkeyChange(e.target.value)
  }

  const handleBlur = () => {
    if (inputValue) {
      onPubkeyBlur(inputValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onPubkeyBlur(inputValue)
    }
  }

  return (
    <header className="header">
      <h1 className="app-title">(｡&gt;_&lt;)o--{t('app.title')} {VERSION_NAME}</h1>
      <div className="toolbar">
        <label className="pubkey-label">
          as pubkey:
          <input
            type="text"
            className="pubkey-input"
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={t('header.pubkeyPlaceholder')}
          />
        </label>
        {hasNip07Extension() && (
          <button
            className="nip07-button"
            onClick={onLoadFromExtension}
            disabled={isLoading}
          >
            {t('header.loadFromExtension')}
          </button>
        )}
        {userProfile && (
          <div className="user-info">
            {userProfile.picture && (
              <img
                src={userProfile.picture}
                alt=""
                className="user-icon"
              />
            )}
            <span className="user-name">{userProfile.name || ''}</span>
            <span className="user-display-name">{userProfile.display_name || ''}</span>
          </div>
        )}
      </div>
    </header>
  )
}
