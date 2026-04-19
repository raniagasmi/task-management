import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../schemas/audit-log.schema';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async create(entry: Partial<AuditLog>) {
    return this.auditLogModel.create(entry);
  }

  async findAll() {
    return this.auditLogModel.find().sort({ createdAt: -1 }).limit(200);
  }
}
