import { BaseApiService } from './base.service'
import type { UserProfile } from '@/types/api.types'

class UserProfilesService extends BaseApiService {
    constructor() {
        super('/user-profiles')
    }

    async getByUserId(userId: number): Promise<UserProfile | null> {
        return this.get<UserProfile | null>(`/${userId}`)
    }

    async create(data: Omit<UserProfile, 'id'>): Promise<UserProfile> {
        return this.post<UserProfile>('', data)
    }

    async update(userId: number, data: Partial<UserProfile>): Promise<UserProfile> {
        return this.patch<UserProfile>(`/${userId}`, data)
    }
}

export const userProfilesService = new UserProfilesService()
