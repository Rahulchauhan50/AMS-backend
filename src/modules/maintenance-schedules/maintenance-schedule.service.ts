import { MaintenanceSchedule, type IMaintenanceSchedule } from './maintenance-schedule.model';
import { Asset } from '../assets/asset.model';

export class MaintenanceScheduleService {
  static calculateNextServiceDate(lastDate: Date, frequency: string, interval: number): Date {
    const next = new Date(lastDate);

    switch (frequency) {
      case 'DAILY':
        next.setDate(next.getDate() + interval);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + interval * 7);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + interval);
        break;
      case 'QUARTERLY':
        next.setMonth(next.getMonth() + interval * 3);
        break;
      case 'YEARLY':
        next.setFullYear(next.getFullYear() + interval);
        break;
      default:
        next.setMonth(next.getMonth() + 1);
    }

    return next;
  }

  static async createMaintenanceSchedule(
    assetId: string,
    frequency: string,
    interval: number,
    reminderDaysBefore?: number,
    description?: string,
    startDate?: Date
  ) {
    // Validate asset exists
    const asset = await Asset.findOne({ _id: assetId, isDeleted: false });
    if (!asset) {
      const error = new Error('Asset not found');
      (error as any).statusCode = 404;
      (error as any).errors = [{ field: 'assetId', message: 'Asset does not exist' }];
      throw error;
    }

    const baseDate = startDate || new Date();
    const nextServiceDate = this.calculateNextServiceDate(baseDate, frequency, interval);

    const schedule = await MaintenanceSchedule.create({
      assetId,
      frequency: frequency as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
      interval,
      nextServiceDate,
      reminderDaysBefore: reminderDaysBefore ?? 7,
      description: description || '',
      isActive: true,
    });

    return schedule;
  }

  static async getMaintenanceSchedule(id: string) {
    const schedule = await MaintenanceSchedule.findOne({ _id: id, isDeleted: false });
    if (!schedule) {
      const error = new Error('Maintenance schedule not found');
      (error as any).statusCode = 404;
      (error as any).errors = [{ field: 'id', message: 'Maintenance schedule does not exist' }];
      throw error;
    }
    return schedule;
  }

  static async listMaintenanceSchedules(
    filters?: {
      assetId?: string;
      isActive?: boolean;
      upcomingOnly?: boolean; // Within next 30 days
    },
    page: number = 1,
    limit: number = 20
  ) {
    const query: any = { isDeleted: false };

    if (filters?.assetId) {
      query.assetId = filters.assetId;
    }

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters?.upcomingOnly) {
      const now = new Date();
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      query.nextServiceDate = { $lte: thirtyDaysLater, $gte: now };
      query.isActive = true;
    }

    const schedules = await MaintenanceSchedule.find(query)
      .sort({ nextServiceDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await MaintenanceSchedule.countDocuments(query);

    return {
      schedules,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  static async updateMaintenanceSchedule(
    id: string,
    updates: {
      frequency?: string;
      interval?: number;
      nextServiceDate?: Date;
      reminderDaysBefore?: number;
      description?: string;
      isActive?: boolean;
    }
  ) {
    const schedule = await this.getMaintenanceSchedule(id);

    if (updates.frequency !== undefined) {
      schedule.frequency = updates.frequency as any;
    }
    if (updates.interval !== undefined) {
      schedule.interval = updates.interval;
    }
    if (updates.nextServiceDate !== undefined) {
      schedule.nextServiceDate = updates.nextServiceDate;
    }
    if (updates.reminderDaysBefore !== undefined) {
      schedule.reminderDaysBefore = updates.reminderDaysBefore;
    }
    if (updates.description !== undefined) {
      schedule.description = updates.description;
    }
    if (updates.isActive !== undefined) {
      schedule.isActive = updates.isActive;
    }

    await schedule.save();
    return schedule;
  }

  static async recordMaintenanceCompleted(id: string) {
    const schedule = await this.getMaintenanceSchedule(id);

    schedule.lastServiceDate = new Date();
    const nextServiceDate = this.calculateNextServiceDate(schedule.lastServiceDate, schedule.frequency, schedule.interval);
    schedule.nextServiceDate = nextServiceDate;

    await schedule.save();
    return schedule;
  }

  static async deleteMaintenanceSchedule(id: string) {
    const schedule = await this.getMaintenanceSchedule(id);
    schedule.isDeleted = true;
    await schedule.save();
    return schedule;
  }

  static async getUpcomingReminders(daysAhead: number = 30) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const reminders = await MaintenanceSchedule.find({
      isDeleted: false,
      isActive: true,
      nextServiceDate: { $lte: futureDate, $gte: now },
    }).sort({ nextServiceDate: 1 });

    return reminders;
  }
}

export default MaintenanceScheduleService;
