import mongoose from 'mongoose';

export class DataUnavailableError extends Error {
  constructor(message = 'Analytics data is unavailable (MongoDB not connected)') {
    super(message);
    this.name = 'DataUnavailableError';
    this.code = 'DATA_UNAVAILABLE';
  }
}

export function isDbReady() {
  return mongoose.connection.readyState === 1;
}

/** Fail fast instead of letting Mongoose buffer the query for 10 s while the DB is down. */
export function requireDb(isReady = isDbReady) {
  if (!isReady()) throw new DataUnavailableError();
}
