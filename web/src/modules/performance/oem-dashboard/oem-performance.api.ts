import api from "@/lib/axios";

export const fetchOemSummary = (params: any) => api.get("/performance/oem/summary", { params }).then(r => r.data);

export const fetchOemTenders = (params: any) => api.get("/performance/oem/tenders", { params }).then(r => r.data);

export const fetchOemNotAllowed = (params: any) => api.get("/performance/oem/not-allowed", { params }).then(r => r.data);

export const fetchOemRfqs = (params: any) => api.get("/performance/oem/rfqs", { params }).then(r => r.data);

export const fetchOemTrends = (params: any) => api.get("/performance/oem/trends", { params }).then(r => r.data);

export const fetchOemScoring = (params: any) => api.get("/performance/oem/scoring", { params }).then(r => r.data);
