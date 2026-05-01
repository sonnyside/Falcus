import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();

export const WIDGET_KEY = "falcus:widget:sonny";