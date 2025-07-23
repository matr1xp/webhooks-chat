import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { setFileData, removeFileData, clearFileCache, cleanupOldEntries } from '@/store/fileCacheSlice';

export function useFileCache() {
  const dispatch = useDispatch();
  const cache = useSelector((state: RootState) => state.fileCache.cache);

  const setFileCacheData = (messageId: string, data: string) => {
    dispatch(setFileData({ messageId, data }));
  };

  const removeFileCacheData = (messageId: string) => {
    dispatch(removeFileData(messageId));
  };

  const clearCache = () => {
    dispatch(clearFileCache());
  };

  const cleanupCache = (activeMessageIds: string[]) => {
    dispatch(cleanupOldEntries(activeMessageIds));
  };

  const getFileCacheData = (messageId: string): string | null => {
    return cache[messageId] || null;
  };

  return {
    cache,
    setFileCacheData,
    removeFileCacheData,
    clearCache,
    cleanupCache,
    getFileCacheData,
  };
}