export const LocalStorageAdapter = {
  async save(key: string, value: any) {
    if (typeof localStorage === 'undefined') throw new Error('localStorage not available');
    localStorage.setItem(key, JSON.stringify(value));
  },
  async load(key: string) {
    if (typeof localStorage === 'undefined') throw new Error('localStorage not available');
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }
};
