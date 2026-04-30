import { Employee, type IEmployee, type EmployeeStatus } from './employee.model';

interface EmployeeInput {
  employeeId: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
  manager?: string;
  status?: EmployeeStatus;
}

const normalizeText = (value: string) => value.trim();

export class EmployeeService {
  static async findDuplicate(employeeId: string, excludeId?: string) {
    const query: any = {
      employeeId: normalizeText(employeeId),
      isDeleted: false,
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    return Employee.findOne(query);
  }

  static async createEmployee(input: EmployeeInput) {
    const duplicate = await this.findDuplicate(input.employeeId);
    if (duplicate) {
      const error = new Error('Employee with this ID already exists');
      (error as any).statusCode = 409;
      (error as any).errors = [{ field: 'employeeId', message: 'Duplicate employee ID' }];
      throw error;
    }

    const employee = await Employee.create({
      employeeId: normalizeText(input.employeeId),
      name: normalizeText(input.name),
      email: input.email?.trim().toLowerCase() || '',
      phone: input.phone?.trim() || '',
      department: input.department?.trim() || '',
      designation: input.designation?.trim() || '',
      manager: input.manager?.trim() || '',
      status: input.status || 'active',
    });

    return employee;
  }

  static async listEmployees(
    status?: EmployeeStatus,
    department?: string,
    page: number = 1,
    limit: number = 10
  ) {
    const query: any = { isDeleted: false };
    if (status) {
      query.status = status;
    }
    if (department) {
      query.department = normalizeText(department);
    }

    const employees = await Employee.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Employee.countDocuments(query);

    return { employees, total };
  }

  static async getEmployeeById(id: string) {
    const employee = await Employee.findOne({ _id: id, isDeleted: false });

    if (!employee) {
      const error = new Error('Employee not found');
      (error as any).statusCode = 404;
      (error as any).errors = [{ field: 'id', message: 'Employee does not exist' }];
      throw error;
    }

    return employee;
  }

  static async updateEmployee(id: string, input: Partial<EmployeeInput>) {
    const employee = await this.getEmployeeById(id);

    if (input.employeeId && input.employeeId !== employee.employeeId) {
      const duplicate = await this.findDuplicate(input.employeeId, id);
      if (duplicate) {
        const error = new Error('Employee with this ID already exists');
        (error as any).statusCode = 409;
        (error as any).errors = [{ field: 'employeeId', message: 'Duplicate employee ID' }];
        throw error;
      }
      employee.employeeId = normalizeText(input.employeeId);
    }

    if (input.name) employee.name = normalizeText(input.name);
    if (input.email !== undefined) employee.email = input.email?.trim().toLowerCase() || '';
    if (input.phone !== undefined) employee.phone = input.phone?.trim() || '';
    if (input.department !== undefined) employee.department = input.department?.trim() || '';
    if (input.designation !== undefined) employee.designation = input.designation?.trim() || '';
    if (input.manager !== undefined) employee.manager = input.manager?.trim() || '';
    if (input.status) employee.status = input.status;

    await employee.save();
    return employee;
  }

  static async deleteEmployee(id: string) {
    const employee = await this.getEmployeeById(id);
    employee.isDeleted = true;
    await employee.save();
    return employee;
  }

  // HRMS sync placeholder - returns mock employee data
  static async syncWithHRMS() {
    // Mock HRMS response
    const mockHRMSEmployees = [
      {
        employeeId: 'EMP001',
        name: 'John Smith',
        email: 'john.smith@company.com',
        phone: '+1-555-0101',
        department: 'Engineering',
        designation: 'Senior Developer',
        manager: 'Alice Johnson',
        hrmsId: 'HRMS-EMP-001',
      },
      {
        employeeId: 'EMP002',
        name: 'Sarah Williams',
        email: 'sarah.williams@company.com',
        phone: '+1-555-0102',
        department: 'Operations',
        designation: 'Operations Manager',
        manager: 'Bob Wilson',
        hrmsId: 'HRMS-EMP-002',
      },
      {
        employeeId: 'EMP003',
        name: 'Michael Brown',
        email: 'michael.brown@company.com',
        phone: '+1-555-0103',
        department: 'Finance',
        designation: 'Financial Analyst',
        manager: 'Carol Davis',
        hrmsId: 'HRMS-EMP-003',
      },
    ];

    const syncedEmployees = [];
    const now = new Date();

    for (const hrmsData of mockHRMSEmployees) {
      let employee = await Employee.findOne({
        employeeId: hrmsData.employeeId,
        isDeleted: false,
      });

      if (!employee) {
        // Create new employee
        employee = await Employee.create({
          ...hrmsData,
          status: 'active',
          syncedAt: now,
        });
      } else {
        // Update existing employee
        employee.name = hrmsData.name;
        employee.email = hrmsData.email;
        employee.phone = hrmsData.phone;
        employee.department = hrmsData.department;
        employee.designation = hrmsData.designation;
        employee.manager = hrmsData.manager;
        employee.hrmsId = hrmsData.hrmsId;
        employee.syncedAt = now;
        await employee.save();
      }

      syncedEmployees.push(employee);
    }

    return {
      synced: syncedEmployees.length,
      employees: syncedEmployees,
      syncedAt: now,
    };
  }

  // Placeholder for employee assets
  static async getEmployeeAssets(employeeId: string) {
    const employee = await this.getEmployeeById(employeeId);
    
    // Placeholder - in future phases, this will fetch actual assigned assets
    return {
      employeeId: employee._id,
      assets: [],
      total: 0,
    };
  }

  // Placeholder for employee history
  static async getEmployeeHistory(employeeId: string, page: number = 1, limit: number = 10) {
    const employee = await this.getEmployeeById(employeeId);
    
    // Placeholder - in future phases, this will fetch audit logs related to this employee
    return {
      employeeId: employee._id,
      history: [],
      total: 0,
      page,
      limit,
    };
  }
}

export default EmployeeService;
