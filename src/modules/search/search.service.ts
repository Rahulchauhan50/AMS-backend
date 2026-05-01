import { Asset } from '../assets/asset.model';
import { Employee } from '../employees/employee.model';
import { Vendor } from '../vendors/vendor.model';
import { Contract } from '../contracts/contract.model';
import { Room } from '../rooms/room.model';
import { Document } from '../documents/document.model';

export class SearchService {
  /**
   * Perform global search across all entities
   */
  static async globalSearch(query: string, limit: number = 100): Promise<Record<string, any>> {
    if (!query || query.trim().length === 0) {
      return {
        query,
        results: {},
        totalResults: 0,
        generatedAt: new Date(),
      };
    }

    const searchTerm = query.trim();
    const regexQuery = new RegExp(searchTerm, 'i');
    const limitPerCategory = Math.min(limit, 100);

    // Search assets
    const assets = await Asset.find(
      {
        isDeleted: false,
        $or: [
          { assetTag: regexQuery },
          { name: regexQuery },
          { serialNumber: regexQuery },
          { deviceModel: regexQuery },
          { description: regexQuery },
        ],
      },
      ['assetTag', 'name', 'serialNumber', 'cost', 'categoryId', 'statusId']
    )
      .limit(limitPerCategory)
      .lean()
      .exec();

    // Search employees
    const employees = await Employee.find(
      {
        isDeleted: false,
        $or: [
          { employeeId: regexQuery },
          { firstName: regexQuery },
          { lastName: regexQuery },
          { email: regexQuery },
          { phoneNumber: regexQuery },
        ],
      },
      ['employeeId', 'firstName', 'lastName', 'email', 'designation', 'departmentId']
    )
      .limit(limitPerCategory)
      .lean()
      .exec();

    // Search vendors
    const vendors = await Vendor.find(
      {
        isDeleted: false,
        $or: [
          { vendorName: regexQuery },
          { email: regexQuery },
          { phoneNumber: regexQuery },
          { contactPerson: regexQuery },
        ],
      },
      ['vendorName', 'email', 'phoneNumber', 'contactPerson', 'rating']
    )
      .limit(limitPerCategory)
      .lean()
      .exec();

    // Search contracts
    const contracts = await Contract.find(
      {
        isDeleted: false,
        $or: [{ contractNumber: regexQuery }, { description: regexQuery }],
      },
      ['contractNumber', 'contractType', 'status', 'vendorId', 'amount', 'startDate', 'endDate']
    )
      .limit(limitPerCategory)
      .lean()
      .exec();

    // Search rooms
    const rooms = await Room.find(
      {
        isDeleted: false,
        $or: [{ roomName: regexQuery }, { roomType: regexQuery }],
      },
      ['roomName', 'roomType', 'capacity', 'locationId']
    )
      .limit(limitPerCategory)
      .lean()
      .exec();

    // Search documents
    const documents = await Document.find(
      {
        isDeleted: false,
        $or: [{ documentName: regexQuery }, { description: regexQuery }, { documentPath: regexQuery }],
      },
      ['documentName', 'documentType', 'description', 'linkedAssetId', 'linkedEntityType', 'uploadedDate']
    )
      .limit(limitPerCategory)
      .lean()
      .exec();

    const totalResults =
      assets.length + employees.length + vendors.length + contracts.length + rooms.length + documents.length;

    return {
      query: searchTerm,
      results: {
        assets: { count: assets.length, data: assets },
        employees: { count: employees.length, data: employees },
        vendors: { count: vendors.length, data: vendors },
        contracts: { count: contracts.length, data: contracts },
        rooms: { count: rooms.length, data: rooms },
        documents: { count: documents.length, data: documents },
      },
      totalResults,
      generatedAt: new Date(),
    };
  }

  /**
   * Advanced search with filters by entity type
   */
  static async advancedSearch(
    query: string,
    filters?: {
      entityType?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Record<string, any>> {
    if (!query || query.trim().length === 0) {
      return {
        query,
        results: [],
        totalResults: 0,
        generatedAt: new Date(),
      };
    }

    const searchTerm = query.trim();
    const regexQuery = new RegExp(searchTerm, 'i');
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    const entityType = filters?.entityType?.toLowerCase();

    let results: any[] = [];
    let totalResults = 0;

    switch (entityType) {
      case 'asset':
        results = await Asset.find(
          {
            isDeleted: false,
            $or: [
              { assetTag: regexQuery },
              { name: regexQuery },
              { serialNumber: regexQuery },
              { deviceModel: regexQuery },
              { description: regexQuery },
            ],
          },
          ['assetTag', 'name', 'serialNumber', 'cost', 'categoryId', 'statusId']
        )
          .skip(offset)
          .limit(limit)
          .lean()
          .exec();

        totalResults = await Asset.countDocuments({
          isDeleted: false,
          $or: [
            { assetTag: regexQuery },
            { name: regexQuery },
            { serialNumber: regexQuery },
            { deviceModel: regexQuery },
            { description: regexQuery },
          ],
        });
        break;

      case 'employee':
        results = await Employee.find(
          {
            isDeleted: false,
            $or: [
              { employeeId: regexQuery },
              { firstName: regexQuery },
              { lastName: regexQuery },
              { email: regexQuery },
              { phoneNumber: regexQuery },
            ],
          },
          ['employeeId', 'firstName', 'lastName', 'email', 'designation', 'departmentId']
        )
          .skip(offset)
          .limit(limit)
          .lean()
          .exec();

        totalResults = await Employee.countDocuments({
          isDeleted: false,
          $or: [
            { employeeId: regexQuery },
            { firstName: regexQuery },
            { lastName: regexQuery },
            { email: regexQuery },
            { phoneNumber: regexQuery },
          ],
        });
        break;

      case 'vendor':
        results = await Vendor.find(
          {
            isDeleted: false,
            $or: [
              { vendorName: regexQuery },
              { email: regexQuery },
              { phoneNumber: regexQuery },
              { contactPerson: regexQuery },
            ],
          },
          ['vendorName', 'email', 'phoneNumber', 'contactPerson', 'rating']
        )
          .skip(offset)
          .limit(limit)
          .lean()
          .exec();

        totalResults = await Vendor.countDocuments({
          isDeleted: false,
          $or: [
            { vendorName: regexQuery },
            { email: regexQuery },
            { phoneNumber: regexQuery },
            { contactPerson: regexQuery },
          ],
        });
        break;

      case 'contract':
        results = await Contract.find(
          {
            isDeleted: false,
            $or: [{ contractNumber: regexQuery }, { description: regexQuery }],
          },
          ['contractNumber', 'contractType', 'status', 'vendorId', 'amount', 'startDate', 'endDate']
        )
          .skip(offset)
          .limit(limit)
          .lean()
          .exec();

        totalResults = await Contract.countDocuments({
          isDeleted: false,
          $or: [{ contractNumber: regexQuery }, { description: regexQuery }],
        });
        break;

      case 'room':
        results = await Room.find(
          {
            isDeleted: false,
            $or: [{ roomName: regexQuery }, { roomType: regexQuery }],
          },
          ['roomName', 'roomType', 'capacity', 'locationId']
        )
          .skip(offset)
          .limit(limit)
          .lean()
          .exec();

        totalResults = await Room.countDocuments({
          isDeleted: false,
          $or: [{ roomName: regexQuery }, { roomType: regexQuery }],
        });
        break;

      case 'document':
        results = await Document.find(
          {
            isDeleted: false,
            $or: [{ documentName: regexQuery }, { description: regexQuery }, { documentPath: regexQuery }],
          },
          ['documentName', 'documentType', 'description', 'linkedAssetId', 'linkedEntityType', 'uploadedDate']
        )
          .skip(offset)
          .limit(limit)
          .lean()
          .exec();

        totalResults = await Document.countDocuments({
          isDeleted: false,
          $or: [{ documentName: regexQuery }, { description: regexQuery }, { documentPath: regexQuery }],
        });
        break;

      default:
        // If no entity type specified, do global search
        return this.globalSearch(searchTerm, limit);
    }

    return {
      query: searchTerm,
      entityType: entityType || 'all',
      results,
      totalResults,
      offset,
      limit,
      generatedAt: new Date(),
    };
  }
}
