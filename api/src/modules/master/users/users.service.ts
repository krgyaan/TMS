import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { hash, verify } from 'argon2';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { users, type NewUser, type User } from '../../../db/users.schema';

export type SafeUser = Pick<
  User,
  | 'id'
  | 'name'
  | 'email'
  | 'username'
  | 'mobile'
  | 'isActive'
  | 'createdAt'
  | 'updatedAt'
>;

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async findAll(): Promise<User[]> {
    return this.db.select().from(users);
  }

  async findById(id: number): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result[0] ?? null;
  }

  async create(data: NewUser): Promise<User> {
    if (!data.password) {
      throw new Error('Password is required');
    }
    const hashed = await this.hashPassword(data.password);
    const rows = (await this.db
      .insert(users)
      .values({ ...data, password: hashed })
      .returning()) as unknown as User[];
    return rows[0];
  }

  async createFromGoogle(payload: {
    email: string;
    name?: string | null;
  }): Promise<User> {
    const randomPassword = randomBytes(32).toString('hex');
    const hashed = await this.hashPassword(randomPassword);
    const name = payload.name?.trim()?.length
      ? payload.name
      : payload.email.split('@')[0];
    const rows = (await this.db
      .insert(users)
      .values({
        name,
        email: payload.email,
        password: hashed,
        isActive: true,
      })
      .returning()) as unknown as User[];
    return rows[0];
  }

  async ensureUser(id: number): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async verifyPassword(user: User, candidate: string): Promise<boolean> {
    if (!candidate) {
      return false;
    }
    try {
      if (user.password?.startsWith('$argon2')) {
        return await verify(user.password, candidate);
      }
      return user.password === candidate;
    } catch {
      return false;
    }
  }

  sanitizeUser(user: User): SafeUser {
    const {
      id,
      name,
      email,
      username,
      mobile,
      isActive,
      createdAt,
      updatedAt,
    } = user;
    return {
      id,
      name,
      email,
      username,
      mobile,
      isActive,
      createdAt,
      updatedAt,
    };
  }
  private async hashPassword(plain: string) {
    return hash(plain);
  }
}
