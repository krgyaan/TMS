import { extendedDuration } from 'node_modules/zod/v4/core/regexes.cjs';
import type { TimerWithComputed } from './timer.types';
import { CurrentUser } from '../auth/decorators';

export type FrontendTimerStatus = 'NOT_STARTED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'OVERDUE' | 'TIMER_NOT_FOUND' | 'STOPPED';

export interface FrontendTimerData {
    remainingSeconds: number;
    status: FrontendTimerStatus;
    stepName: string;
    deadline?: Date | null;
}

export function transformTimerForFrontend(timer: TimerWithComputed | null, defaultStage?: string): FrontendTimerData {
    if (!timer) {
        // Return a default timer object so frontend always has something to render
        // This ensures the timer field is always present in the response
        return {
            remainingSeconds: 0,
            status: 'TIMER_NOT_FOUND',
            stepName: defaultStage || 'unknown',
        };
    }

    // we need three things
    // 1) deadline 2) start_from 
    // 3) stage time -> purely for users to view
    // if ended then-> overdue  -> if -> ended_at > deadline
    // will decrease if running && deadline > Date.now() (GREEN)
    // will increase if running && deadline < Date.now().getTime();

    //FOR COMPLETED OR PAUSED
    //for completed we will check with deadline - ended_at OR deadline - paused_at

    // Convert milliseconds to seconds
    let status: FrontendTimerStatus;
    let remainingSeconds = 0;
    const startTime = timer?.startedAt ? timer.startedAt.getTime() : null;
    const endTime   = timer?.endedAt ? timer.endedAt?.getTime() : null;
    const deadline = timer?.deadlineAt ? timer.deadlineAt.getTime() : null;

    if(!deadline || !startTime ){
        return {
            remainingSeconds: 0,
            status: 'TIMER_NOT_FOUND',
            stepName: defaultStage || 'unknown',
        };
    }

    if(timer.status == 'completed' || timer.status == 'paused' || timer.status == 'stopped'){
        switch (timer.status) {
            case 'completed':
                status = 'COMPLETED';
                break;
            case 'paused':
                status = 'PAUSED';
                break;
            case 'stopped':
                status = 'STOPPED';
                break;
            default:
                status = 'NOT_STARTED';
        }
        if(deadline && endTime){
            remainingSeconds = (deadline - endTime)/1000;
        }
    } else {
        //RUNNING TIMERS
        if(!startTime){
            //the timer has not started
            status = 'NOT_STARTED';
            remainingSeconds = 0;
        } else {
            //checking if overdue or running 
            const currTime = Date.now();
            remainingSeconds = Math.floor((deadline - currTime) / 1000);

            if (remainingSeconds > 0) {
                // The timer is running and not overdue
                status = 'RUNNING';
            } else {
                status = 'OVERDUE';
                // Show as positive increasing seconds for overdue
                remainingSeconds = Math.abs(remainingSeconds);
            }

        }
    }

    return {
        remainingSeconds,
        status,
        stepName: timer.stage,
        deadline: timer.deadlineAt || null,
    };
}


    // Map status from lowercase to uppercase format

    // if (timer.isOverdue && timer.status === 'running') {
    //     status = 'OVERDUE';
    // } else {
    //     switch (timer.status) {
    //         case 'running':
    //             status = 'RUNNING';
    //             break;
    //         case 'paused':
    //             status = 'PAUSED';
    //             break;
    //         case 'completed':
    //             status = 'COMPLETED';
    //             break;
    //         case 'cancelled':
    //             status = 'COMPLETED';  // Treat cancelled as completed
    //             break;
    //         case 'not_started':
    //         default:
    //             status = 'NOT_STARTED';
    //             break;
    //     }
    // }
