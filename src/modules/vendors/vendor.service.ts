import { Vendor, type IVendor } from './vendor.model';

interface VendorInput {
  name: string;
  email?: string;
  phone?: string;
  taxNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  contactPerson?: string;
  rating?: number;
}

const normalizeText = (value: string) => value.trim();
const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizeTaxNumber = (value: string) => value.trim().toUpperCase();

export class VendorService {
  static async findDuplicate(email?: string, taxNumber?: string, excludeId?: string) {
    const conditions: any[] = [];

    if (email) {
      conditions.push({ email: normalizeEmail(email), isDeleted: false });
    }

    if (taxNumber) {
      conditions.push({ taxNumber: normalizeTaxNumber(taxNumber), isDeleted: false });
    }

    if (conditions.length === 0) {
      return null;
    }

    const query: any = { $or: conditions };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    return Vendor.findOne(query);
  }

  static async createVendor(input: VendorInput) {
    const duplicate = await this.findDuplicate(input.email, input.taxNumber);
    if (duplicate) {
      const errors = [];
      if (input.email && duplicate.email === normalizeEmail(input.email)) {
        errors.push({ field: 'email', message: 'Email already exists' });
      }
      if (input.taxNumber && duplicate.taxNumber === normalizeTaxNumber(input.taxNumber)) {
        errors.push({ field: 'taxNumber', message: 'Tax number already exists' });
      }

      const error = new Error('Duplicate vendor information');
      (error as any).statusCode = 409;
      (error as any).errors = errors;
      throw error;
    }

    const vendor = await Vendor.create({
      name: normalizeText(input.name),
      email: input.email ? normalizeEmail(input.email) : '',
      phone: input.phone?.trim() || '',
      taxNumber: input.taxNumber ? normalizeTaxNumber(input.taxNumber) : '',
      address: input.address?.trim() || '',
      city: input.city?.trim() || '',
      country: input.country?.trim() || '',
      website: input.website?.trim() || '',
      contactPerson: input.contactPerson?.trim() || '',
      rating: Math.min(5, Math.max(0, input.rating || 0)),
    });

    return vendor;
  }

  static async listVendors(page: number = 1, limit: number = 10) {
    const vendors = await Vendor.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Vendor.countDocuments({ isDeleted: false });

    return { vendors, total };
  }

  static async getVendorById(id: string) {
    const vendor = await Vendor.findOne({ _id: id, isDeleted: false });

    if (!vendor) {
      const error = new Error('Vendor not found');
      (error as any).statusCode = 404;
      (error as any).errors = [{ field: 'id', message: 'Vendor does not exist' }];
      throw error;
    }

    return vendor;
  }

  static async updateVendor(id: string, input: Partial<VendorInput>) {
    const vendor = await this.getVendorById(id);

    const duplicate = await this.findDuplicate(input.email, input.taxNumber, id);
    if (duplicate) {
      const errors = [];
      if (input.email && duplicate.email === normalizeEmail(input.email)) {
        errors.push({ field: 'email', message: 'Email already exists' });
      }
      if (input.taxNumber && duplicate.taxNumber === normalizeTaxNumber(input.taxNumber)) {
        errors.push({ field: 'taxNumber', message: 'Tax number already exists' });
      }

      const error = new Error('Duplicate vendor information');
      (error as any).statusCode = 409;
      (error as any).errors = errors;
      throw error;
    }

    if (input.name) vendor.name = normalizeText(input.name);
    if (input.email !== undefined) vendor.email = input.email ? normalizeEmail(input.email) : '';
    if (input.phone !== undefined) vendor.phone = input.phone?.trim() || '';
    if (input.taxNumber !== undefined) vendor.taxNumber = input.taxNumber ? normalizeTaxNumber(input.taxNumber) : '';
    if (input.address !== undefined) vendor.address = input.address?.trim() || '';
    if (input.city !== undefined) vendor.city = input.city?.trim() || '';
    if (input.country !== undefined) vendor.country = input.country?.trim() || '';
    if (input.website !== undefined) vendor.website = input.website?.trim() || '';
    if (input.contactPerson !== undefined) vendor.contactPerson = input.contactPerson?.trim() || '';
    if (input.rating !== undefined) vendor.rating = Math.min(5, Math.max(0, input.rating || 0));

    await vendor.save();
    return vendor;
  }

  static async deleteVendor(id: string) {
    const vendor = await this.getVendorById(id);
    vendor.isDeleted = true;
    await vendor.save();
    return vendor;
  }
}

export default VendorService;
