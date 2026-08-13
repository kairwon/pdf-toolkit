import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import LandingPage from './pages/LandingPage'

const MergePage = lazy(() => import('./pages/MergePage'))
const SplitPage = lazy(() => import('./pages/SplitPage'))
const ManagePage = lazy(() => import('./pages/ManagePage'))
const ToImagePage = lazy(() => import('./pages/ToImagePage'))
const CompressPage = lazy(() => import('./pages/CompressPage'))
const WatermarkPage = lazy(() => import('./pages/WatermarkPage'))
const UnwatermarkPage = lazy(() => import('./pages/UnwatermarkPage'))
const ToWordPage = lazy(() => import('./pages/ToWordPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const SecurityPage = lazy(() => import('./pages/SecurityPage'))
const VisaPrepPage = lazy(() => import('./pages/VisaPrepPage'))
const PortalReadyPage = lazy(() => import('./pages/PortalReadyPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const AllToolsPage = lazy(() => import('./pages/AllToolsPage'))
const GuidesPage = lazy(() => import('./pages/GuidesPage'))
const EditorialPolicyPage = lazy(() => import('./pages/EditorialPolicyPage'))
const EditorialTeamPage = lazy(() => import('./pages/EditorialTeamPage'))
const UniversityUploadGuidePage = lazy(() => import('./pages/UniversityUploadGuidePage'))
const SearchableNotesGuidePage = lazy(() => import('./pages/SearchableNotesGuidePage'))
const StudyPackGuidePage = lazy(() => import('./pages/StudyPackGuidePage'))
const CompressWithoutQualityGuidePage = lazy(() => import('./pages/CompressWithoutQualityGuidePage'))
const ReduceScannedPdfGuidePage = lazy(() => import('./pages/ReduceScannedPdfGuidePage'))
const PdfSubmissionChecklistPage = lazy(() => import('./pages/PdfSubmissionChecklistPage'))

export default function App() {
  const deferred = (page: ReactNode) => (
    <Suspense fallback={<div className="route-loading" role="status" aria-live="polite">Opening your private PDF workspace…</div>}>
      {page}
    </Suspense>
  )

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/tools" element={deferred(<AllToolsPage />)} />
        <Route path="/guides" element={deferred(<GuidesPage />)} />
        <Route path="/editorial-policy" element={deferred(<EditorialPolicyPage />)} />
        <Route path="/about/editorial-team" element={deferred(<EditorialTeamPage />)} />
        <Route path="/guides/compress-pdf-for-university-upload" element={deferred(<UniversityUploadGuidePage />)} />
        <Route path="/guides/make-scanned-notes-searchable" element={deferred(<SearchableNotesGuidePage />)} />
        <Route path="/guides/organize-pdf-study-notes" element={deferred(<StudyPackGuidePage />)} />
        <Route path="/guides/compress-pdf-without-losing-quality" element={deferred(<CompressWithoutQualityGuidePage />)} />
        <Route path="/guides/reduce-scanned-pdf-file-size" element={deferred(<ReduceScannedPdfGuidePage />)} />
        <Route path="/guides/pdf-submission-checklist" element={deferred(<PdfSubmissionChecklistPage />)} />
        <Route path="/merge" element={deferred(<MergePage />)} />
        <Route path="/split" element={deferred(<SplitPage />)} />
        <Route path="/manage" element={deferred(<ManagePage />)} />
        <Route path="/to-image" element={deferred(<ToImagePage />)} />
        <Route path="/compress" element={deferred(<CompressPage />)} />
        <Route path="/compress/visa" element={deferred(<CompressPage forcedGoal="visa" />)} />
        <Route path="/compress/exact" element={deferred(<CompressPage forcedGoal="exact" />)} />
        <Route path="/thesis-pdf-check" element={deferred(<CompressPage forcedGoal="thesis" />)} />
        <Route path="/watermark" element={deferred(<WatermarkPage />)} />
        <Route path="/unwatermark" element={deferred(<UnwatermarkPage />)} />
        <Route path="/to-word" element={deferred(<ToWordPage />)} />
        <Route path="/privacy" element={deferred(<PrivacyPage />)} />
        <Route path="/terms" element={deferred(<TermsPage />)} />
        <Route path="/security" element={deferred(<SecurityPage />)} />
        <Route path="/visa-prep" element={deferred(<VisaPrepPage />)} />
        <Route path="/portal-ready-pdf" element={deferred(<PortalReadyPage />)} />
        <Route path="/edit-pdf" element={<Navigate to="/manage" replace />} />
        <Route path="/pdf-to-excel" element={deferred(<NotFoundPage />)} />
        <Route path="/sign-pdf" element={deferred(<NotFoundPage />)} />
        <Route path="/unlock-pdf" element={deferred(<NotFoundPage />)} />
        <Route path="*" element={deferred(<NotFoundPage />)} />
      </Route>
    </Routes>
  )
}
