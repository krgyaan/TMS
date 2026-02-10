export const isRedisEnabled = process.env.NODE_ENV === "production";

export const redisConnection = {
    host: "127.0.0.1",
    port: 6379,
};
