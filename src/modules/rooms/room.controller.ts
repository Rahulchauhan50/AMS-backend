import { Request, Response, NextFunction } from 'express';
import { errorResponse, successResponse } from '../../common/response/response.formatter';
import { RoomService } from './room.service';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { AssetService } from '../assets/asset.service';

const validationError = (field: string, message: string) => [{ field, message }];
const VALID_ROOM_TYPES = ['meeting', 'conference', 'training', 'storage'];

export class RoomController {
  static async createRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, type, description, capacity, locationId } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('name', 'Room name is required')));
      }

      if (!type || !VALID_ROOM_TYPES.includes(type)) {
        return res.status(400).json(errorResponse('Validation failed', validationError('type', `Type must be one of: ${VALID_ROOM_TYPES.join(', ')}`)));
      }

      if (!locationId || typeof locationId !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('locationId', 'Location ID is required')));
      }

      const room = await RoomService.createRoom({
        name,
        type,
        description,
        capacity,
        locationId,
      });

      if (room) {
        await AuditLogService.record(res.locals.auditContext, {
          oldValue: null,
          newValue: room,
        });
      }

      return res.status(201).json(successResponse('Room created successfully', room));
    } catch (error: any) {
      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      if (error?.statusCode === 409 && error?.errors) {
        return res.status(409).json(errorResponse('Validation failed', error.errors));
      }

      next(error);
    }
  }

  static async listRooms(req: Request, res: Response, next: NextFunction) {
    try {
      const locationId = (req.query.locationId as string) || undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 10);

      const { rooms, total } = await RoomService.listRooms(locationId, page, limit);

      return res.status(200).json(
        successResponse('Rooms retrieved successfully', rooms, {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        })
      );
    } catch (error) {
      next(error);
    }
  }

  static async getRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const room = await RoomService.getRoomById(req.params.id as string);

      return res.status(200).json(successResponse('Room retrieved successfully', room));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Room not found'));
      }

      next(error);
    }
  }

  static async updateRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, type, description, capacity, locationId } = req.body;

      if (type && !VALID_ROOM_TYPES.includes(type)) {
        return res.status(400).json(errorResponse('Validation failed', validationError('type', `Type must be one of: ${VALID_ROOM_TYPES.join(', ')}`)));
      }

      const updatedRoom = await RoomService.updateRoom(req.params.id as string, {
        name,
        type,
        description,
        capacity,
        locationId,
      });

      if (updatedRoom) {
        await AuditLogService.record(res.locals.auditContext, {
          oldValue: null,
          newValue: updatedRoom,
        });
      }

      return res.status(200).json(successResponse('Room updated successfully', updatedRoom));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Room not found'));
      }

      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      if (error?.statusCode === 409 && error?.errors) {
        return res.status(409).json(errorResponse('Validation failed', error.errors));
      }

      next(error);
    }
  }

  static async deleteRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const deletedRoom = await RoomService.deleteRoom(req.params.id as string);

      if (deletedRoom) {
        await AuditLogService.record(res.locals.auditContext, {
          oldValue: null,
          newValue: deletedRoom,
        });
      }

      return res.status(200).json(successResponse('Room deleted successfully', deletedRoom));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Room not found'));
      }

      next(error);
    }
  }

  static async getRoomsByLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 10);

      const { rooms, total } = await RoomService.listRooms(req.params.locationId as string, page, limit);

      return res.status(200).json(
        successResponse('Rooms for location retrieved successfully', rooms, {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        })
      );
    } catch (error) {
      next(error);
    }
  }

  static async getRoomAssets(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 10);

      const { assets, total } = await AssetService.listAssetsByRoom(req.params.id as string, page, limit);

      return res.status(200).json(
        successResponse('Room assets retrieved successfully', assets, {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        })
      );
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Room not found'));
      }

      next(error);
    }
  }

  static async getRoomAssetHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 10);

      const history = await RoomService.getRoomAssetHistory(req.params.id as string, page, limit);

      return res.status(200).json(successResponse('Room asset history retrieved successfully', history.events, history.metadata));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Room not found'));
      }

      next(error);
    }
  }
}
