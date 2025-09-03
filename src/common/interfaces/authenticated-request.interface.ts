import { Request } from 'express';
import { User } from '../../modules/users/user.entity';

export interface AuthenticatedRequest extends Request {
  user: User; // whatever type your User entity/interface is
}
