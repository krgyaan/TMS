export interface PaginatedResponse<T> {
    data: T[]
    total: number
    page: number
    limit: number
}

export interface ApiError {
    message: string
    statusCode: number
    error?: string
}

export interface User {
    id: number
    name: string
    email: string
    username: string | null
    mobile: string | null
    role?: string
    designation?: string
    team?: string
    isActive?: boolean
    createdAt?: string
    updatedAt?: string
}

export interface ApiResponse<T = any> {
    data?: T
    user?: T
    message?: string
    status?: number
}

export interface ApiError {
    message: string
    statusCode: number
    error?: string
}
// Company types
export interface Company {
    id: string
    name: string
    industryId: string
    locationId: string
    isActive: boolean
    logo?: string
    createdAt: string
    updatedAt: string
}
