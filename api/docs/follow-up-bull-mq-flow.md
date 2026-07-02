> A complete guide to how BullMQ queues, schedulers, and workers are wired in our followups project.
> Read this before touching anything related to queues.

---

## 🧠 Core Mental Model (Never Forget)

> **API adds jobs → Redis stores jobs → Worker consumes jobs**

NestJS does **not** connect producers and consumers.
**Redis is the bridge.**

```
[ Scheduler / API ]  --adds-->  [ Redis Queue ]  --pulled by-->  [ Worker Process ]
```

---

## 🧱 The 4 Core Building Blocks

### 1️⃣ Queue Definition (Producer Side)

**File:** `src/infra/queue/queue.module.ts`

Responsibilities:

- Creates Redis connection
- Creates BullMQ Queue
- Exposes queue via DI token: `'FOLLOWUP_QUEUE'`

This is the **only place** where the queue is created.

---

### 2️⃣ Scheduler (Job Creator)

**File:** `follow-up/follow-up.scheduler.ts`

Runs via cron in **API process**.

It does **not** send mail.

It only does:

```ts
queue.add("send-followup", { followupId });
```

This writes jobs into Redis.

---

### 3️⃣ Worker (Job Consumer)

**File:** `follow-up/follow-up.worker.ts`

Runs in **worker process**.

```ts
new Worker("followup-mail-queue", async job => {
    followUpService.processFollowupMail(job.data.followupId);
});
```

This watches Redis and processes jobs.

It has no idea the scheduler exists.

---

### 4️⃣ Worker Bootstrap

**File:** `worker.ts`

```ts
createApplicationContext(FollowupWorkerModule);
```

Starts Nest **without HTTP server**.
Loads only services required by the worker.

---

## ❌ Why `@nestjs/bullmq` Was Removed

Nest Bull works like this:

```
@Processor → Nest auto creates worker
BullModule.registerQueue → Nest owns queue
```

Your architecture requires:

```
Manual Worker process
Manual Queue
Separated API and Worker
```

These two patterns **cannot coexist**.

> Rule: ❌ No `@nestjs/bullmq` for this queue.

---

## 🧭 Why `QueueModule` Must Be Imported in `FollowUpModule`

Even though it is `@Global()`.

Because **Global ≠ Instantiated**.

A module must be imported somewhere for Nest to create its providers.

```
FollowUpModule imports QueueModule
→ queue actually exists
```

---

## 🚫 Why WorkerModule Must NOT Import FollowUpModule

`FollowUpModule` contains:

- Scheduler
- Cron jobs
- Queue producers

If worker imports it:

> Worker will also enqueue jobs every minute ❌

So worker only imports:

- DatabaseModule
- MailerModule
- GoogleIntegrationModule
- FollowUpService (directly)

---

## 🏷️ Queue Name vs Job Name (Critical)

```ts
new Worker("followup-mail-queue", ...)
```

This is **queue name**.

```ts
queue.add("send-followup", data);
```

This is **job name**.

Worker receives:

```ts
job.name === "send-followup";
```

Do **not** mix them.

---

## 🔄 What Happens When Scheduler Runs

1. Cron triggers
2. DB queried
3. For each followup:

```
Redis key: bull:followup-mail-queue:wait
Job stored
```

No mail is sent yet.

---

## 🔄 What Happens When Worker Runs

Worker continuously polls Redis.

When job appears:

```
wait → active → completed
```

Mail is sent during `active`.

---

## 📊 Queue States Meaning

| State     | Meaning                   |
| --------- | ------------------------- |
| waiting   | jobs sitting in queue     |
| active    | currently being processed |
| delayed   | scheduled for later       |
| completed | done                      |
| failed    | errored                   |

“Active: 2” means concurrency = 2.

Not two queues.

---

## 🧰 Debug & Maintenance Scripts

### Check queue status

```bash
pnpm exec ts-node src/infra/queue/check-queue.ts
```

### Clean queue

```bash
pnpm exec ts-node clean-queue.ts
```

### Force clean (including active)

Stop worker first, then:

```bash
pnpm exec ts-node force-clean.ts
```

---

## 🔐 Why Scheduler Is Disabled in Worker

```ts
@Cron("* * * * *", {
  disabled: process.env.WORKER === "true",
})
```

Because `FollowUpModule` is also used in API.

We must prevent scheduler from running in worker process.

---

## 🗺️ Final Architecture

### API Process

```
AppModule
  └─ FollowUpModule
       ├─ QueueModule
       └─ FollowupScheduler
```

### Worker Process

```
FollowupWorkerModule
  ├─ FollowUpService
  └─ FollowupWorker
```

Connected via:

```
Redis → followup-mail-queue
```

---

## ⚠️ Common Mistakes to Avoid

| Mistake                            | Result                     |
| ---------------------------------- | -------------------------- |
| Adding `@Processor`                | Nest spawns hidden workers |
| Importing FollowUpModule in worker | Scheduler runs twice       |
| Not importing QueueModule          | Queue token undefined      |
| Using queue name as job name       | Worker logic breaks        |
| Cleaning queue while worker runs   | Active jobs remain         |

---

## 🧾 Golden Rules

1. Only **QueueModule** creates the queue
2. Only **follow-up.worker.ts** creates the worker
3. API never creates workers
4. Worker never creates jobs
5. No `@nestjs/bullmq`
6. Queue name ≠ job name
7. WorkerModule must not import modules with schedulers

---

## 🧠 One-Line Summary

> Scheduler produces jobs → Redis stores them → Worker consumes them.

          (every minute)

Cron ────────────────┐
↓
Find due followups
↓
Push jobs to Redis
↓
┌─────────────────┐
│ REDIS │ ← job queue lives here
└─────────────────┘
↓
Worker pulls jobs
↓
FollowUpService → MailerService
