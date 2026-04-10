import { useEffect, useState } from 'react'
import { checkLegacySessionOnLoad } from '../assets/FinalsAssignment/LegacySessionContext.jsx'
import LegacyNavbar from '../assets/FinalsAssignment/LegacyNavbar.jsx'
import LegacyPageLayout from '../assets/FinalsAssignment/LegacyPageLayout.jsx'

const BACKEND_BASE_URL = 'http://localhost/FinalsAssignment'
const DEFAULT_CONTENT_STYLE = { height: '100%', minHeight: '1000px' }

function WoodWorkshopWrapper({ onNavigate, isLoginDisabled = false, contentStyle = DEFAULT_CONTENT_STYLE, children }) {
  const [backendAvailable, setBackendAvailable] = useState(false)
  const [loginLabel, setLoginLabel] = useState('Login')
  const [loginDisabled, setLoginDisabled] = useState(isLoginDisabled)

  useEffect(() => {
    const { user, expired } = checkLegacySessionOnLoad()
    if (user?.username) {
      setLoginLabel(`Welcome,${user.username}`)
      setLoginDisabled(isLoginDisabled)
    } else if (expired) {
      setLoginLabel('Login')
      setLoginDisabled(isLoginDisabled)
    } else {
      setLoginLabel('Login')
      setLoginDisabled(isLoginDisabled)
    }

    fetch(`${BACKEND_BASE_URL}/products.php?input=test`, { method: 'GET' })
      .then((response) => setBackendAvailable(response.ok))
      .catch(() => setBackendAvailable(false))
  }, [isLoginDisabled])

  return (
    <LegacyPageLayout
      navbar={(
        <LegacyNavbar
          backendAvailable={backendAvailable}
          backendBaseUrl={BACKEND_BASE_URL}
          onGoHome={() => onNavigate?.('home')}
          onGoProduct={() => onNavigate?.('product')}
          onGoFurniture={() => onNavigate?.('furniture')}
          onGoLogin={() => onNavigate?.('login')}
          loginLabel={loginLabel}
          isLoginDisabled={loginDisabled}
        />
      )}
      contentStyle={contentStyle}
    >
      {typeof children === 'function'
        ? children({
          backendAvailable,
          loginLabel,
          setNavbarLoginState: ({ loginLabel: nextLabel, isLoginDisabled: nextDisabled }) => {
            if (typeof nextLabel === 'string') {
              setLoginLabel(nextLabel)
            }
            if (typeof nextDisabled === 'boolean') {
              setLoginDisabled(nextDisabled)
            }
          },
        })
        : children}
    </LegacyPageLayout>
  )
}

export default WoodWorkshopWrapper
