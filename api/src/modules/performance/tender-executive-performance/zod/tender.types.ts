import { TenderKpiBucket } from "./tender-buckets.type";

export interface TenderMeta {
    id: number;
    tenderNo: string | null;
    tenderName: string | null;
    organizationName: string | null;
    dueDate: Date;
    value: number;
    statusBucket: TenderKpiBucket;
}
