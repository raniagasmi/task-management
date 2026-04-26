import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum TaskDecisionStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO
  })
  status!: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM
  })
  priority!: TaskPriority;

  @Column({ type: 'varchar', length: 255 }) 
  assignedTo!: string;

  @Column({ type: 'varchar', length: 255 })
  createdBy!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  conversationId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  proposalId?: string;

  @Column({ type: 'text', nullable: true })
  rationale?: string;

  @Column({
    type: 'enum',
    enum: TaskDecisionStatus,
    default: TaskDecisionStatus.PENDING,
  })
  decisionStatus!: TaskDecisionStatus;

  @Column({ type: 'text', nullable: true })
  blockerNote?: string;

  @Column({ type: 'text', nullable: true })
  employeeComment?: string;

  @Column({ type: 'numeric', nullable: true })
  estimatedHours?: number;

  @Column({ type: 'int', default: 0 })
  order!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ nullable: true })
  dueDate!: Date;

  @Column({ type: 'boolean', nullable: true, default: true })
  active!: boolean;
}
