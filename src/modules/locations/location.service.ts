import { Location, type ILocation, type LocationType } from './location.model';

type LocationInput = {
  name: string;
  type: LocationType;
  description?: string;
  address?: string;
  parentLocationId?: string;
};

type LocationUpdateInput = Partial<Omit<LocationInput, 'type'>>;

const normalizeText = (value: string) => value.trim();
const validLocationTypes: LocationType[] = ['office', 'branch', 'building', 'floor'];

const isValidLocationType = (type: unknown): type is LocationType => {
  return typeof type === 'string' && validLocationTypes.includes(type as LocationType);
};

export class LocationService {
  static async listLocations() {
    return Location.find({ isDeleted: false }).sort({ name: 1 }).populate('parentLocationId');
  }

  static async getLocationById(locationId: string) {
    return Location.findOne({ _id: locationId, isDeleted: false }).populate('parentLocationId');
  }

  static async findDuplicate(name: string, ignoreId?: string) {
    const query: Record<string, unknown> = { name: normalizeText(name), isDeleted: false };

    if (ignoreId) {
      query._id = { $ne: ignoreId };
    }

    return Location.findOne(query);
  }

  static async validateParentLocation(parentLocationId: string | undefined) {
    if (!parentLocationId) {
      return null;
    }

    const parentLocation = await Location.findOne({ _id: parentLocationId, isDeleted: false });
    if (!parentLocation) {
      const error = new Error('Parent location does not exist');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'parentLocationId', message: 'Parent location not found' }];
      throw error;
    }

    return parentLocation;
  }

  static async createLocation(input: LocationInput) {
    if (input.parentLocationId) {
      await this.validateParentLocation(input.parentLocationId);
    }

    const location = await Location.create({
      name: normalizeText(input.name),
      type: input.type,
      description: input.description?.trim() || '',
      address: input.address?.trim() || '',
      parentLocationId: input.parentLocationId ?? undefined,
    });

    return location;
  }

  static async updateLocation(locationId: string, input: LocationUpdateInput) {
    const location = await Location.findOne({ _id: locationId, isDeleted: false });
    if (!location) {
      return null;
    }

    if (typeof input.name === 'string') {
      location.name = normalizeText(input.name);
    }

    if (typeof input.description === 'string') {
      location.description = input.description.trim();
    }

    if (typeof input.address === 'string') {
      location.address = input.address.trim();
    }

    if (input.parentLocationId !== undefined) {
      if (input.parentLocationId) {
        await this.validateParentLocation(input.parentLocationId);
      }
      location.parentLocationId = input.parentLocationId ?? undefined;
    }

    await location.save();
    return location;
  }

  static async deleteLocation(locationId: string) {
    const location = await Location.findOne({ _id: locationId, isDeleted: false });
    if (!location) {
      return null;
    }

    location.isDeleted = true;
    await location.save();

    return location;
  }
}
