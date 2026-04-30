import { Room, type IRoom } from './room.model';
import { Location } from '../locations/location.model';

interface RoomInput {
  name: string;
  type: 'meeting' | 'conference' | 'training' | 'storage';
  description?: string;
  capacity?: number;
  locationId: string;
}

const normalizeText = (value: string) => value.trim();

export class RoomService {
  static async validateLocationExists(locationId: string) {
    const location = await Location.findById(locationId);
    if (!location || location.isDeleted) {
      const error = new Error('Location not found');
      (error as any).statusCode = 400;
      (error as any).errors = { locationId: 'Location does not exist' };
      throw error;
    }
  }

  static async findDuplicate(name: string, locationId: string, excludeId?: string) {
    const query: any = {
      name: normalizeText(name),
      locationId,
      isDeleted: false,
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    return Room.findOne(query);
  }

  static async createRoom(input: RoomInput) {
    await this.validateLocationExists(input.locationId);

    const duplicate = await this.findDuplicate(input.name, input.locationId);
    if (duplicate) {
      const error = new Error('Room with this name already exists in this location');
      (error as any).statusCode = 409;
      (error as any).errors = { name: 'Duplicate room name in location' };
      throw error;
    }

    const room = await Room.create({
      name: normalizeText(input.name),
      type: input.type,
      description: input.description?.trim() || '',
      capacity: input.capacity || 0,
      locationId: input.locationId,
    });

    return room.populate('locationId');
  }

  static async listRooms(
    locationId?: string,
    page: number = 1,
    limit: number = 10
  ) {
    const query: any = { isDeleted: false };
    if (locationId) {
      query.locationId = locationId;
    }

    const rooms = await Room.find(query)
      .populate('locationId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Room.countDocuments(query);

    return { rooms, total };
  }

  static async getRoomById(id: string) {
    const room = await Room.findOne({ _id: id, isDeleted: false }).populate(
      'locationId'
    );

    if (!room) {
      const error = new Error('Room not found');
      (error as any).statusCode = 404;
      (error as any).errors = { id: 'Room does not exist' };
      throw error;
    }

    return room;
  }

  static async updateRoom(id: string, input: Partial<RoomInput>) {
    const room = await this.getRoomById(id);

    if (input.locationId && input.locationId !== room.locationId.toString()) {
      await this.validateLocationExists(input.locationId);
    }

    if (input.name) {
      const duplicate = await this.findDuplicate(input.name, input.locationId || room.locationId.toString(), id);
      if (duplicate) {
        const error = new Error('Room with this name already exists in this location');
        (error as any).statusCode = 409;
        (error as any).errors = { name: 'Duplicate room name in location' };
        throw error;
      }
      room.name = normalizeText(input.name);
    }

    if (input.type) room.type = input.type;
    if (input.description !== undefined) room.description = input.description?.trim() || '';
    if (input.capacity !== undefined) room.capacity = input.capacity || 0;
    if (input.locationId) room.locationId = input.locationId as any;

    await room.save();
    return room.populate('locationId');
  }

  static async deleteRoom(id: string) {
    const room = await this.getRoomById(id);
    room.isDeleted = true;
    await room.save();
    return room;
  }
}

export default RoomService;
