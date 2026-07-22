import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import LandingPage from './pages/LandingPage'
import MergePage from './pages/MergePage'
import SplitPage from './pages/SplitPage'
import ManagePage from './pages/ManagePage'
import ToImagePage from './pages/ToImagePage'
import CompressPage from './pages/CompressPage'
import WatermarkPage from './pages/WatermarkPage'
import UnwatermarkPage from './pages/UnwatermarkPage'
import ToWordPage from './pages/ToWordPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import SecurityPage from './pages/SecurityPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/merge" element={<MergePage />} />
        <Route path="/split" element={<SplitPage />} />
        <Route path="/manage" element={<ManagePage />} />
        <Route path="/to-image" element={<ToImagePage />} />
        <Route path="/compress" element={<CompressPage />} />
        <Route path="/watermark" element={<WatermarkPage />} />
        <Route path="/unwatermark" element={<UnwatermarkPage />} />
        <Route path="/to-word" element={<ToWordPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/security" element={<SecurityPage />} />
      </Route>
    </Routes>
  )
}
