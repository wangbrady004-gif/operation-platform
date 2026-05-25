import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpsLauncherEntity } from './ops-launcher.entity';

@Injectable()
export class OpsLaunchersService {
  constructor(
    @InjectRepository(OpsLauncherEntity)
    private readonly repo: Repository<OpsLauncherEntity>,
  ) {}

  list(): Promise<OpsLauncherEntity[]> {
    return this.repo.find({ order: { createdAt: 'ASC' } });
  }

  /** Call before generating — throws if launcher exists and doesn't need update. */
  async assertCanGenerate(launcherId: string): Promise<void> {
    const existing = await this.repo.findOne({ where: { launcherId } });
    if (existing && !existing.needsUpdate) {
      throw new BadRequestException(
        `Launcher "${launcherId}" already exists. Mark it for update first.`,
      );
    }
  }

  /** Record a successful generation (create or reset needsUpdate). */
  async recordGeneration(
    launcherId: string,
    botRoot: string | null,
    email: string,
  ): Promise<OpsLauncherEntity> {
    const existing = await this.repo.findOne({ where: { launcherId } });
    if (existing) {
      existing.botRoot = botRoot;
      existing.needsUpdate = false;
      existing.createdByEmail = email;
      return this.repo.save(existing);
    }
    return this.repo.save(
      this.repo.create({ launcherId, botRoot, needsUpdate: false, createdByEmail: email }),
    );
  }

  async markForUpdate(id: string): Promise<OpsLauncherEntity> {
    await this.repo.update(id, { needsUpdate: true });
    return this.repo.findOneOrFail({ where: { id } });
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
