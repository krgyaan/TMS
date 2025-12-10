import { BaseApiService } from './base.service'
import type { User, CreateUserDto, UpdateUserDto } from '@/types/api.types'

class UsersService extends BaseApiService {
    constructor() {
        super('/users')
    }

    async getAll(): Promise<User[]> {
        return this.get<User[]>()
    }

    async getById(id: number): Promise<User> {
        return this.get<User>(`/${id}`)
    }

    async create(data: CreateUserDto): Promise<User> {
        return this.post<User>('', data)
    }

    async update(id: number, data: UpdateUserDto): Promise<User> {
        return this.patch<User>(`/${id}`, data)
    }

    async deleteUser(id: number): Promise<void> {
        return this.delete<void>(`/${id}`)
    }
}

export const usersService = new UsersService()
