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
    status?: boolean
    createdAt?: string
    updatedAt?: string
}

export interface Location {
    id: number
    name: string
    acronym: string
    state: string | null
    region: string | null
    status?: boolean
    createdAt?: string
    updatedAt?: string
}

export interface Team {
    id: number;
    name: string;
    description?: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
  }

  export interface ItemHeading {
    id: number;
    name: string;
    description?: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
  }

  // Item type with relations
  export interface Item {
    id: number;
    name: string;
    teamId?: number | null;
    headingId?: number | null;
    status: boolean;
    createdAt: string;
    updatedAt: string;

    // Related data (populated by backend join)
    team?: {
      id: number;
      name: string;
    } | null;
    heading?: {
      id: number;
      name: string;
    } | null;
  }

export interface Status {
    id: number
    name: string
    tenderCategory: string | null
    status?: boolean
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
