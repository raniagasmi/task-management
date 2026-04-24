import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('task_reminders')
export class TaskReminder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  taskId!: string;

  @Column({ type: 'varchar', length: 255 })
  userId!: string;

  @Column({ type: 'timestamptz' })
  remindAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt!: Date | null;

  @Column({ type: 'varchar', length: 512 })
  taskTitle!: string;

  @Column({ type: 'timestamptz', nullable: true })
  taskDueDate!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}

