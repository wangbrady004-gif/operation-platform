import { UserRole } from '../entities/user.entity';

export type JwtPayloadUser = {
  sub: string;
  email: string;
  role: UserRole;
};
