import express from 'express';
import { RoomController } from './room.controller';
import { protect } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/auth.middleware';
import { captureAuditContext } from '../../middlewares/audit.middleware';

const router = express.Router();

// All room routes require authentication and permission to manage rooms
router.use(protect);
router.use(requirePermission('manage:rooms'));

// List all rooms
router.get('/', RoomController.listRooms);

// Get assets assigned to a room
router.get('/:id/assets', RoomController.getRoomAssets);

// Get room asset history
router.get('/:id/asset-history', RoomController.getRoomAssetHistory);

// Create a new room
router.post(
  '/',
  captureAuditContext({ module: 'rooms', action: 'create', entity: 'Room' }),
  RoomController.createRoom
);

// Get room by ID
router.get('/:id', RoomController.getRoom);

// Update room by ID
router.patch(
  '/:id',
  captureAuditContext({ module: 'rooms', action: 'update', entity: 'Room' }),
  RoomController.updateRoom
);

// Delete room by ID
router.delete(
  '/:id',
  captureAuditContext({ module: 'rooms', action: 'delete', entity: 'Room' }),
  RoomController.deleteRoom
);

// Get rooms by location
router.get('/location/:locationId', RoomController.getRoomsByLocation);

export default router;
