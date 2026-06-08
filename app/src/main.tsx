import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ fontFamily: 'system-ui', padding: '2rem' }}>
      <h1>Sky-Fi Virtual Mast Wizard</h1>
      <p>Phase 0 scaffold — migrate components from <code>prototype/src/</code> into here.</p>
    </div>
  </StrictMode>,
)
