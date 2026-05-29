import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankProfileEntity } from '../entities/bank-profile.entity';
import { encryptField, decryptField } from './field-crypto';
import { CreateBankProfileDto } from './dto/create-bank-profile.dto';
import { UpdateBankProfileDto } from './dto/update-bank-profile.dto';
import { anchorModeForThinScript } from './thin-script-core';

/** Plain overlay for Python tp_settings PAYTM[<profile>] (keys match tp_settings dict). */
export type BankProfileSnapshot = Record<string, string>;

@Injectable()
export class BanksService implements OnModuleInit {
  private encKey!: string;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(BankProfileEntity)
    private readonly repo: Repository<BankProfileEntity>,
  ) {}

  onModuleInit() {
    const k = this.config.get<string>('MERCHANT_ENCRYPTION_KEY');
    if (!k || !k.trim()) {
      console.warn(
        '[BanksService] MERCHANT_ENCRYPTION_KEY is not set — bank profile CRUD will reject writes until configured',
      );
    }
    this.encKey = k?.trim() ?? '';
  }

  private requireKey(): string {
    if (!this.encKey || this.encKey.length < 16) {
      throw new BadRequestException(
        'MERCHANT_ENCRYPTION_KEY must be configured (≥16 chars) to manage bank profiles',
      );
    }
    return this.encKey;
  }

  /**
   * Same rules as POST /jobs thin paths: under tp_127_executabes/, must look like
   * b_auto's TP_PAYTM_TXN_* or TP_PAYTM_NAME_* so operator anchor mode is unambiguous.
   */
  assertExecutableThinScript(path: string): void {
    const t = path.trim();
    if (!t.endsWith('.py') || t.startsWith('/') || t.includes('..')) {
      throw new BadRequestException(
        'executable_relative_path must be a safe relative path ending in .py',
      );
    }
    if (!t.startsWith('tp_127_executabes/')) {
      throw new BadRequestException(
        'executable_relative_path must start with tp_127_executabes/ (same layout as b_auto)',
      );
    }
    if (anchorModeForThinScript(t) === null) {
      throw new BadRequestException(
        `executable_relative_path must look like TP_PAYTM_TXN_*.py (transaction anchors) or TP_PAYTM_NAME_*.py (customer + txn), vendored from b_auto — got basename "${t.split(/[/\\]/).pop()}"`,
      );
    }
  }

  /** Operator UI: txn vs customer+txn fields — derived only from vendored thin filename. */
  private anchorModeFromExecutable(exe: string): 'txn' | 'name' {
    const m = anchorModeForThinScript(exe.trim());
    if (!m) {
      throw new BadRequestException(
        `Unrecognized thin script naming: ${exe.trim()}`,
      );
    }
    return m;
  }

  async listSafe(): Promise<
    {
      id: string;
      profileKey: string;
      mobileNumber: string;
      portalListingMid: string | null;
      executableRelativePath: string | null;
      /** null if admin has not set a vendored TP_PAYTM_* path yet */
      anchorMode: 'txn' | 'name' | null;
    }[]
  > {
    const rows = await this.repo.find({
      order: { profileKey: 'ASC' },
      select: [
        'id',
        'profileKey',
        'mobileNumber',
        'portalListingMid',
        'executableRelativePath',
      ],
    });
    return rows.map((r) => {
      const exe = r.executableRelativePath?.trim() ?? '';
      let anchorMode: 'txn' | 'name' | null = null;
      if (exe) {
        try {
          this.assertExecutableThinScript(exe);
          anchorMode = this.anchorModeFromExecutable(exe);
        } catch {
          anchorMode = null;
        }
      }
      return {
        id: r.id,
        profileKey: r.profileKey,
        mobileNumber: r.mobileNumber,
        portalListingMid: r.portalListingMid ?? null,
        executableRelativePath: exe || null,
        anchorMode,
      };
    });
  }

  async listAdmin(): Promise<
    {
      id: string;
      profileKey: string;
      mobileNumber: string;
      bankId: string;
      api: string;
      company: string;
      lastUtrChatId: string;
      merchant: string;
      portalListingMid: string | null;
      executableRelativePath: string | null;
      createdAt: Date;
      updatedAt: Date;
      hasPassword: boolean;
      hasTxnPass: boolean;
    }[]
  > {
    const rows = await this.repo.find({ order: { profileKey: 'ASC' } });
    return rows.map((r) => this.toPublicRow(r));
  }

  toPublicRow(m: BankProfileEntity): {
    id: string;
    profileKey: string;
    mobileNumber: string;
    bankId: string;
    api: string;
    company: string;
    lastUtrChatId: string;
    merchant: string;
    portalListingMid: string | null;
    executableRelativePath: string | null;
    createdAt: Date;
    updatedAt: Date;
    hasPassword: boolean;
    hasTxnPass: boolean;
  } {
    return {
      id: m.id,
      profileKey: m.profileKey,
      mobileNumber: m.mobileNumber,
      bankId: m.bankId,
      api: m.api,
      company: m.company,
      lastUtrChatId: m.lastUtrChatId,
      merchant: m.merchant,
      portalListingMid: m.portalListingMid ?? null,
      executableRelativePath: m.executableRelativePath ?? null,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      hasPassword: Boolean(m.passwordEnc),
      hasTxnPass: Boolean(m.txnPassEnc),
    };
  }

  async getOne(id: string): Promise<BankProfileEntity> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Bank profile ${id} not found`);
    return row;
  }

  async assertProfileMatchesBank(
    bankProfileId: string,
    profile: string,
  ): Promise<void> {
    const m = await this.getOne(bankProfileId);
    if (m.profileKey !== profile.trim()) {
      throw new BadRequestException(
        `bank.profile (${profile}) must match bank profile_key (${m.profileKey})`,
      );
    }
  }

  /** Internal worker: decrypted snapshot merged into PAYTM profile by run_bot.py */
  async snapshotForWorker(id: string): Promise<BankProfileSnapshot> {
    void this.requireKey();
    const m = await this.getOne(id);
    return this.snapshotFromEntity(m);
  }

  snapshotFromEntity(m: BankProfileEntity): BankProfileSnapshot {
    const secret = this.requireKey();
    return {
      mobile_number: m.mobileNumber,
      password: decryptField(m.passwordEnc, secret),
      bank_id: m.bankId,
      api: m.api,
      company: m.company,
      last_utr_chat_id: m.lastUtrChatId,
      merchant: m.merchant,
      txn_pass: decryptField(m.txnPassEnc, secret),
    };
  }

  /** Operator flow: minimal secrets for dashboard login + audit trail. */
  async getOperatorLoginAssist(id: string): Promise<{
    profileKey: string;
    mobileNumber: string;
    password: string;
    executableRelativePath: string | null;
    anchorMode: 'txn' | 'name';
  }> {
    const secret = this.requireKey();
    const m = await this.getOne(id);
    const exe = m.executableRelativePath?.trim() ?? '';
    if (!exe) {
      throw new BadRequestException(
        'Merchant has no executable_relative_path — admin must set the vendored TP_PAYTM_*.py path (same as b_auto / PyCharm).',
      );
    }
    this.assertExecutableThinScript(exe);
    return {
      profileKey: m.profileKey,
      mobileNumber: m.mobileNumber,
      password: decryptField(m.passwordEnc, secret),
      executableRelativePath: exe,
      anchorMode: this.anchorModeFromExecutable(exe),
    };
  }

  /** Admin UI: decrypted credentials for copy/paste (trusted device only). */
  async getAdminDetail(id: string): Promise<{
    id: string;
    profileKey: string;
    mobileNumber: string;
    password: string;
    bankId: string;
    api: string;
    company: string;
    lastUtrChatId: string;
    merchant: string;
    portalListingMid: string | null;
    txnPass: string;
    executableRelativePath: string | null;
  }> {
    const secret = this.requireKey();
    const m = await this.getOne(id);
    return {
      id: m.id,
      profileKey: m.profileKey,
      mobileNumber: m.mobileNumber,
      password: decryptField(m.passwordEnc, secret),
      bankId: m.bankId,
      api: m.api,
      company: m.company,
      lastUtrChatId: m.lastUtrChatId,
      merchant: m.merchant,
      portalListingMid: m.portalListingMid ?? null,
      txnPass: decryptField(m.txnPassEnc, secret),
      executableRelativePath: m.executableRelativePath ?? null,
    };
  }

  async create(dto: CreateBankProfileDto): Promise<BankProfileEntity> {
    const secret = this.requireKey();
    const profileKey = dto.profileKey.trim();
    const exists = await this.repo.exist({ where: { profileKey } });
    if (exists) {
      throw new BadRequestException(`profileKey ${profileKey} already exists`);
    }
    const exePath = (dto.executableRelativePath ?? '').trim();
    if (exePath) this.assertExecutableThinScript(exePath);

    const listingMidRaw = (dto.portalListingMid ?? '').trim();

    const row = this.repo.create({
      profileKey,
      mobileNumber: (dto.mobileNumber ?? '').trim(),
      passwordEnc: encryptField(dto.password ?? '', secret),
      bankId: dto.bankId.trim(),
      api: dto.api.trim(),
      company: dto.company.trim(),
      lastUtrChatId: dto.lastUtrChatId.trim(),
      portalListingMid: listingMidRaw || null,
      merchant: dto.merchant.trim(),
      txnPassEnc: encryptField(dto.txnPass, secret),
      executableRelativePath: exePath || null,
    });
    return this.repo.save(row);
  }

  async update(id: string, dto: UpdateBankProfileDto): Promise<BankProfileEntity> {
    const secret = this.requireKey();
    const m = await this.getOne(id);
    if (dto.profileKey !== undefined && dto.profileKey.trim() !== m.profileKey) {
      const pk = dto.profileKey.trim();
      const clash = await this.repo.exist({
        where: { profileKey: pk },
      });
      if (clash)
        throw new BadRequestException(`profileKey ${pk} already in use`);
      m.profileKey = pk;
    }
    if (dto.mobileNumber !== undefined) m.mobileNumber = dto.mobileNumber.trim();
    if (dto.bankId !== undefined) m.bankId = dto.bankId.trim();
    if (dto.api !== undefined) m.api = dto.api.trim();
    if (dto.company !== undefined) m.company = dto.company.trim();
    if (dto.lastUtrChatId !== undefined)
      m.lastUtrChatId = dto.lastUtrChatId.trim();
    if (dto.merchant !== undefined) m.merchant = dto.merchant.trim();
    if (dto.portalListingMid !== undefined) {
      const raw = dto.portalListingMid;
      if (raw === null) m.portalListingMid = null;
      else {
        const t = raw.trim();
        m.portalListingMid = t === '' ? null : t;
      }
    }
    if (dto.password !== undefined)
      m.passwordEnc = encryptField(dto.password, secret);
    if (dto.txnPass !== undefined)
      m.txnPassEnc = encryptField(dto.txnPass, secret);
    if (dto.executableRelativePath !== undefined) {
      if (dto.executableRelativePath === null) {
        m.executableRelativePath = null;
      } else {
        const t = dto.executableRelativePath.trim();
        if (!t) m.executableRelativePath = null;
        else {
          this.assertExecutableThinScript(t);
          m.executableRelativePath = t;
        }
      }
    }
    return this.repo.save(m);
  }

  async remove(id: string): Promise<{ id: string; profileKey: string }> {
    void this.requireKey();
    const m = await this.getOne(id);
    const profileKey = m.profileKey;
    await this.repo.remove(m);
    return { id, profileKey };
  }
}
