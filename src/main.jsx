
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthContextProvider } from './components/layout/AuthContext.jsx'

createRoot(document.getElementById('root')).render(

  <AuthContextProvider>
    <App />
  </AuthContextProvider>


)
