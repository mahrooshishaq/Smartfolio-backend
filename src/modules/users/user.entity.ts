import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ type: 'varchar', nullable: true })
  password: string | null;

  @Column({ type:'varchar', nullable: true, unique: true })  // <-- Google ID field
  googleId: string | null;

  @Column()
  name!: string;

  @Column({ default: false })
  isVerified!: boolean;

 @Column({ type: 'text', nullable: true })
  refreshTokenHash: string | null;

  @Column({ type: 'varchar' , nullable: true })
  otpHash: string | null; // store hashed OTP

  @Column({ type: 'timestamptz', nullable: true })
  otpExpiry: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  refreshTokenIssuedAt: Date | null;

 @Column({ type: 'text', nullable: true })
 resetTokenHash: string | null;

 @Column({ type: 'timestamp', nullable: true })
 resetTokenExpiry: Date | null;


@Column({ default: false })
isLoggedin!: boolean;

}
