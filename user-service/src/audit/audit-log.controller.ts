import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuditLogService } from './audit-log.service';

@Controller()
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @MessagePattern({ cmd: 'audit_log_create' })
  async create(@Payload() payload: Parameters<AuditLogService['create']>[0]) {
    return this.auditLogService.create(payload);
  }

  @MessagePattern({ cmd: 'audit_log_find_all' })
  async findAll() {
    return this.auditLogService.findAll();
  }
}
