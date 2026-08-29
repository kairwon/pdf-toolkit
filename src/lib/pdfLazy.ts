import type { ScanCleanupOptions } from './pdf'

type PdfModule = typeof import('./pdf')
let pdfModule: Promise<PdfModule> | undefined

function loadPdf() {
  pdfModule ??= import('./pdf')
  return pdfModule
}

export const getPageCount = async (...args: Parameters<PdfModule['getPageCount']>) => (await loadPdf()).getPageCount(...args)
export const renderPageToCanvas = async (...args: Parameters<PdfModule['renderPageToCanvas']>) => (await loadPdf()).renderPageToCanvas(...args)
export const imagesToPdf = async (...args: Parameters<PdfModule['imagesToPdf']>) => (await loadPdf()).imagesToPdf(...args)
export const inspectPdfForm = async (...args: Parameters<PdfModule['inspectPdfForm']>) => (await loadPdf()).inspectPdfForm(...args)
export const updatePdfForm = async (...args: Parameters<PdfModule['updatePdfForm']>) => (await loadPdf()).updatePdfForm(...args)
export const inspectPdfStructure = async (...args: Parameters<PdfModule['inspectPdfStructure']>) => (await loadPdf()).inspectPdfStructure(...args)
export const readPdfDocumentInfo = async (...args: Parameters<PdfModule['readPdfDocumentInfo']>) => (await loadPdf()).readPdfDocumentInfo(...args)
export const updatePdfDocumentInfo = async (...args: Parameters<PdfModule['updatePdfDocumentInfo']>) => (await loadPdf()).updatePdfDocumentInfo(...args)
export const analyzePdfForSubmission = async (...args: Parameters<PdfModule['analyzePdfForSubmission']>) => (await loadPdf()).analyzePdfForSubmission(...args)
export const mergePdfs = async (...args: Parameters<PdfModule['mergePdfs']>) => (await loadPdf()).mergePdfs(...args)
export const mergePdfPages = async (...args: Parameters<PdfModule['mergePdfPages']>) => (await loadPdf()).mergePdfPages(...args)
export const arrangePdfPages = async (...args: Parameters<PdfModule['arrangePdfPages']>) => (await loadPdf()).arrangePdfPages(...args)
export const rotatePages = async (...args: Parameters<PdfModule['rotatePages']>) => (await loadPdf()).rotatePages(...args)
export const cropPdfPages = async (...args: Parameters<PdfModule['cropPdfPages']>) => (await loadPdf()).cropPdfPages(...args)
export const compressPdf = async (...args: Parameters<PdfModule['compressPdf']>) => (await loadPdf()).compressPdf(...args)
export const addWatermark = async (...args: Parameters<PdfModule['addWatermark']>) => (await loadPdf()).addWatermark(...args)
export const inspectWatermarks = async (...args: Parameters<PdfModule['inspectWatermarks']>) => (await loadPdf()).inspectWatermarks(...args)
export const removeWatermark = async (...args: Parameters<PdfModule['removeWatermark']>) => (await loadPdf()).removeWatermark(...args)
export const classifyPdf = async (...args: Parameters<PdfModule['classifyPdf']>) => (await loadPdf()).classifyPdf(...args)
export const cleanScannedPdf = async (...args: Parameters<PdfModule['cleanScannedPdf']>) => (await loadPdf()).cleanScannedPdf(...args)
export const makePdfSearchable = async (...args: Parameters<PdfModule['makePdfSearchable']>) => (await loadPdf()).makePdfSearchable(...args)
export const pdfToWord = async (...args: Parameters<PdfModule['pdfToWord']>) => (await loadPdf()).pdfToWord(...args)

export const DEFAULT_SCAN_CLEANUP: ScanCleanupOptions = {
  grayscale: true,
  contrast: 18,
  removeBackground: 8,
  renderScale: 1.8,
  jpegQuality: 0.82,
  deskewDegrees: 0,
}

export type {
  ArrangePdfPage,
  NewPdfFormField,
  PdfDocumentInfo,
  PdfFormFieldInfo,
  PdfStructureCleanup,
  PdfStructureInspection,
  ScanCleanupOptions,
  SubmissionAnalysis,
  WatermarkInspection,
} from './pdf'
