import express from 'express';
import multer from 'multer';
import DocumentController from './document.controller';
import { protect, requirePermission } from '../../middlewares/auth.middleware';
import { captureAuditContext } from '../../middlewares/audit.middleware';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB default
  },
});

// All document routes require authentication and asset management permission
router.use(protect);
router.use(requirePermission('manage:assets'));

// Upload document
router.post(
  '/',
  upload.single('file'),
  captureAuditContext({ module: 'documents', action: 'upload', entity: 'Document' }),
  DocumentController.uploadDocument
);

// List all documents
router.get('/', DocumentController.listDocuments);

// Get specific document
router.get('/:id', DocumentController.getDocument);

// Download document
router.get('/:id/download', DocumentController.downloadDocument);

// Delete document
router.delete(
  '/:id',
  captureAuditContext({ module: 'documents', action: 'delete', entity: 'Document' }),
  DocumentController.deleteDocument
);

// Get asset documents
router.get('/asset/:assetId', DocumentController.getAssetDocuments);

// Attach document to asset
router.post(
  '/asset/:assetId/attach',
  captureAuditContext({ module: 'documents', action: 'attach', entity: 'Document' }),
  DocumentController.attachDocumentToAsset
);

export default router;
