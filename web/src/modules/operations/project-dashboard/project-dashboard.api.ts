// src/api/projectsMaster.api.ts
import api from "@/lib/axios";
import type { ProjectMaster } from "@/services/api/projects-master.service";
import type { ProjectDashboardResponse } from "./project-dashboard.type";

export interface ProjectDashboardMaster {
    id: number;
    projectName: string;
}

const BASE_URL = "/projects";

export const fetchDashboardDetailsById = async (id: number): Promise<any> => {
    const res = await api.get<ProjectDashboardResponse>(`${BASE_URL}/${id}`);
    return res.data;
};
