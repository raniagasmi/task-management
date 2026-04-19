import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

export interface AuditLogEntry {
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(
    @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
  ) {}

  async logAction(entry: AuditLogEntry) {
    return firstValueFrom(
      this.userClient.send({ cmd: 'audit_log_create' }, entry),
    );
  }

  async findAll() {
    return firstValueFrom(
      this.userClient.send({ cmd: 'audit_log_find_all' }, {}),
    );
  }
}
