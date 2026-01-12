import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { UserProfile } from '../types'
import { hasNip07Extension } from '../services/nip07'
import { hexToNpub } from '../utils/pubkey'
import { VERSION_NAME } from '../version'

function UserInfo({ profile }: { profile: UserProfile }) {
  const [imgError, setImgError] = useState(false)

  // Reset error state when picture URL changes
  useEffect(() => {
    setImgError(false)
  }, [profile.picture])

  return (
    <div className="user-info">
      {profile.picture && !imgError ? (
        <img
          src={profile.picture}
          alt=""
          className="user-icon"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="user-icon-placeholder" />
      )}
      <span className="user-name">{profile.name || ''}</span>
      <span className="user-display-name">{profile.display_name || ''}</span>
    </div>
  )
}

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
          <UserInfo profile={userProfile} />
        )}
      </div>
    </header>
  )
}
