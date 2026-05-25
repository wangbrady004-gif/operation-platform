import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('paytm_merchants')
export class PaytmMerchantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Same key used in tp_settings_2_0.PAYTM, e.g. PAYTM_VKTRADING_MID1 */
  @Column({ name: 'profile_key', unique: true })
  profileKey: string;

  @Column({ name: 'mobile_number' })
  mobileNumber: string;

  @Column({ name: 'password_enc', type: 'text' })
  passwordEnc: string;

  @Column({ name: 'bank_id' })
  bankId: string;

  @Column({ type: 'text' })
  api: string;

  @Column({ type: 'text' })
  company: string;

  @Column({ name: 'last_utr_chat_id' })
  lastUtrChatId: string;

  /**
   * Paytm business portal search ID (MID / listing code), entered by admins for operator copy UX.
   * Not part of the worker PAYTM[<profile>] overlay.
   */
  @Column({ name: 'portal_listing_mid', type: 'varchar', length: 128, nullable: true })
  portalListingMid: string | null;

  @Column()
  merchant: string;

  @Column({ name: 'txn_pass_enc', type: 'text' })
  txnPassEnc: string;

  /**
   * Thin bot file for run_paytm_bot.py — e.g. tp_127_executabes/TP_PAYTM_TXN_MID.py
   */
  @Column({ name: 'executable_relative_path', type: 'varchar', length: 512, nullable: true })
  executableRelativePath: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
