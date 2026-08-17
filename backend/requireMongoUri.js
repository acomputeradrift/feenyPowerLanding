export function requireMongoUri(uri) {
  if (typeof uri !== 'string' || uri.trim() === '') {
    throw new Error('MONGO_URI is required. Set it in backend/.env');
  }
  return uri;
}
