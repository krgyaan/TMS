import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
    PdfExtractionJobData,
    PdfExtractionJobResult,
    PdfExtractionJobState,
    PdfExtractionJobStatusResponse,
} from './types/pdf-extraction.types';

export interface EnqueueExtractionResult {
    jobId: string;
    status: 'enqueued' | 'existing_active';
}

@Injectable()
export class PdfExtractionProducer {
    constructor(
        @Inject('PDF_EXTRACTION_QUEUE')
        private readonly queue: Queue<PdfExtractionJobData, PdfExtractionJobResult>,
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger,
    ) {}

    /**
     * Enqueues a PDF extraction job with deterministic deduplication by tenderId.
     * If a job is already waiting/active/delayed for this tender, returns the existing job.
     * If a previous job completed or failed, removes it and enqueues a fresh extraction.
     */
    async enqueueExtraction(data: PdfExtractionJobData): Promise<EnqueueExtractionResult> {
        const jobId = `extract-tender-${data.tenderId}`;

        const existingJob = await this.queue.getJob(jobId);
        if (existingJob) {
            const state = await existingJob.getState();
            if (state === 'active' || state === 'waiting' || state === 'delayed') {
                this.logger.info(
                    `[PdfExtractionProducer] Job ${jobId} is currently '${state}'. Returning existing job without re-queueing.`,
                    { tenderId: data.tenderId, jobId, state },
                );
                return { jobId, status: 'existing_active' };
            }

            this.logger.info(
                `[PdfExtractionProducer] Job ${jobId} previously finished with state '${state}'. Removing old job for fresh run.`,
                { tenderId: data.tenderId, jobId, state },
            );
            await existingJob.remove();
        }

        await this.queue.add('extract-pdf', data, {
            jobId,
            attempts: 2,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
            removeOnComplete: {
                age: 24 * 3600, // keep for 24 hours
                count: 1000,
            },
            removeOnFail: {
                age: 7 * 24 * 3600, // keep for 7 days
                count: 5000,
            },
        });

        this.logger.info(
            `[PdfExtractionProducer] Enqueued extraction job ${jobId} for tender ${data.tenderId}`,
            { tenderId: data.tenderId, jobId, pdfPath: data.pdfPath, userId: data.userId },
        );

        return { jobId, status: 'enqueued' };
    }

    /**
     * Retrieves the status, execution progress, results, or failure reason for a given job.
     */
    async getJobStatus(jobId: string): Promise<PdfExtractionJobStatusResponse | null> {
        const job = await this.queue.getJob(jobId);
        if (!job) {
            return null;
        }

        const state = (await job.getState()) as PdfExtractionJobState;

        return {
            jobId: (job.id as string) || jobId,
            state,
            progress: job.progress,
            data: job.data,
            result: state === 'completed' ? (job.returnvalue as PdfExtractionJobResult) : null,
            failedReason: state === 'failed' ? job.failedReason : null,
        };
    }
}
