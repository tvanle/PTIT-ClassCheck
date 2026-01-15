import { Role } from '../constants/roles.constant';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
}
