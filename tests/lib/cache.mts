import Redis from "ioredis";
import { logger } from "../../package/logger.mts";
var cacheDB = new Redis();
await new Promise<void>((resolve) => {
  cacheDB.once("connect", resolve);
});
logger.info("REDIS CONNECTED");
export default cacheDB;
