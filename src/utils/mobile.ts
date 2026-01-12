export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false

  const userAgent = navigator.userAgent || navigator.vendor || ''

  // Check for mobile user agents
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i

  // Also check screen width as a fallback
  const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 768

  return mobileRegex.test(userAgent) || isSmallScreen
}
