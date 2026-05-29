import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BotTaskEntity } from './bot-task.entity';
import { CreateBotTaskDto } from './dto/create-bot-task.dto';
import { PaytmMerchantsService } from '../merchants/paytm-merchants.service';
import { OpsLaunchersService } from '../ops-launchers/ops-launchers.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class BotTasksService {
  constructor(
    @InjectRepository(BotTaskEntity)
    private readonly repo: Repository<BotTaskEntity>,
    private readonly merchants: PaytmMerchantsService,
    private readonly config: ConfigService,
    private readonly opsLaunchers: OpsLaunchersService,
    private readonly events: EventsService,
  ) {}

  private emitTask(task: BotTaskEntity): void {
    this.events.emit({
      type: 'task_update',
      id: task.id,
      profileKey: task.profileKey,
      module: task.module,
      status: task.status,
      createdAt: task.createdAt instanceof Date
        ? task.createdAt.toISOString()
        : String(task.createdAt),
    });
  }

  async create(dto: CreateBotTaskDto, email: string): Promise<BotTaskEntity> {
    const task = this.repo.create({
      merchantId:    dto.merchantId,
      profileKey:    dto.profileKey,
      module:        dto.module,
      settingsKey:   dto.settingsKey,
      loginType:     dto.loginType,
      status:        'pending',
      claimedBy:     null,
      createdByEmail: email,
    });
    const saved = await this.repo.save(task);
    this.emitTask(saved);
    return saved;
  }

  /** Active tasks (everything except done). */
  listActive(): Promise<BotTaskEntity[]> {
    return this.repo.find({
      where: { status: In(['pending', 'running', 'stop_requested']) },
      order: { createdAt: 'ASC' },
    });
  }

  async requestStop(id: string): Promise<BotTaskEntity> {
    const task = await this.repo.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    if (task.status === 'running') {
      task.status = 'stop_requested';
    } else {
      // Still pending — mark done immediately
      task.status = 'done';
    }
    const saved = await this.repo.save(task);
    this.emitTask(saved);
    return saved;
  }

  /**
   * Atomically claim the next pending task for a given launcher.
   * Returns the task with decrypted merchant credentials, or null if nothing pending.
   */
  async claimNext(launcherId: string): Promise<Record<string, unknown> | null> {
    const task = await this.repo.findOne({
      where: { status: 'pending' },
      order: { createdAt: 'ASC' },
    });
    if (!task) return null;

    task.status = 'running';
    task.claimedBy = launcherId;
    const saved = await this.repo.save(task);
    this.emitTask(saved);

    // Fetch decrypted merchant credentials
    const merchantDetail = await this.merchants.getAdminDetail(task.merchantId);

    return {
      id:          saved.id,
      profileKey:  saved.profileKey,
      module:      saved.module,
      settingsKey: saved.settingsKey,
      loginType:   saved.loginType,
      values: {
        bank_id:          merchantDetail.bankId,
        api:              merchantDetail.api,
        company:          merchantDetail.company,
        merchant:         merchantDetail.merchant,
        last_utr_chat_id: merchantDetail.lastUtrChatId,
        gmail_id:         merchantDetail.mobileNumber,
        password:         merchantDetail.password,
      },
    };
  }

  /** Return stop_requested tasks claimed by this launcher. */
  getStopRequests(launcherId: string): Promise<BotTaskEntity[]> {
    return this.repo.find({
      where: { status: 'stop_requested', claimedBy: launcherId },
    });
  }

  async markDone(id: string): Promise<void> {
    await this.repo.update(id, { status: 'done' });
    // Emit a minimal done event so the UI removes the task instantly
    this.events.emit({
      type: 'task_update',
      id,
      profileKey: '',
      module: '',
      status: 'done',
      createdAt: '',
    });
  }
}
