/**
 * SecureMemory Unit Tests
 * Tests secure storage and automatic cleanup of sensitive data
 */

import { SecureMemory, secureMemory, PrivateKeyHandle } from '../utils/SecureMemory';

describe('SecureMemory', () => {
  beforeEach(() => {
    secureMemory.clearAll();
  });

  afterEach(() => {
    secureMemory.clearAll();
  });

  describe('store and retrieve', () => {
    it('should store and retrieve data', () => {
      const data = Buffer.from('sensitive private key data');
      secureMemory.store('test-key', data);

      const retrieved = secureMemory.retrieve('test-key');
      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent key', () => {
      const retrieved = secureMemory.retrieve('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should return a copy of data, not reference', () => {
      const data = Buffer.from('test data');
      secureMemory.store('test-key', data);

      const retrieved = secureMemory.retrieve('test-key');
      retrieved![0] = 0xFF; // Modify retrieved buffer

      const retrievedAgain = secureMemory.retrieve('test-key');
      expect(retrievedAgain![0]).not.toBe(0xFF); // Original unchanged
    });
  });

  describe('clear', () => {
    it('should remove data from memory', () => {
      const data = Buffer.from('sensitive data');
      secureMemory.store('test-key', data);
      
      expect(secureMemory.has('test-key')).toBe(true);
      
      secureMemory.clear('test-key');
      
      expect(secureMemory.has('test-key')).toBe(false);
      expect(secureMemory.retrieve('test-key')).toBeNull();
    });

    it('should handle clearing non-existent key gracefully', () => {
      expect(() => secureMemory.clear('non-existent')).not.toThrow();
    });
  });

  describe('TTL expiration', () => {
    it('should auto-clear data after TTL', (done) => {
      const data = Buffer.from('temporary data');
      secureMemory.store('ttl-key', data, 100); // 100ms TTL

      expect(secureMemory.has('ttl-key')).toBe(true);

      setTimeout(() => {
        expect(secureMemory.has('ttl-key')).toBe(false);
        done();
      }, 150);
    });
  });

  describe('clearAll', () => {
    it('should clear all stored data', () => {
      secureMemory.store('key1', Buffer.from('data1'));
      secureMemory.store('key2', Buffer.from('data2'));
      secureMemory.store('key3', Buffer.from('data3'));

      secureMemory.clearAll();

      expect(secureMemory.has('key1')).toBe(false);
      expect(secureMemory.has('key2')).toBe(false);
      expect(secureMemory.has('key3')).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return memory statistics', () => {
      secureMemory.store('key1', Buffer.from('data1'));
      secureMemory.store('key2', Buffer.from('data2'));

      const stats = secureMemory.getStats();

      expect(stats.entries).toBe(2);
      expect(stats.tags).toContain('key1');
      expect(stats.tags).toContain('key2');
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = SecureMemory.getInstance();
      const instance2 = SecureMemory.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('PrivateKeyHandle', () => {
    it('should store private key securely', () => {
      const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const handle = new PrivateKeyHandle(privateKey);

      expect(handle.getTag()).toMatch(/^pk_\d+_[a-z0-9]+$/);
      
      handle.destroy();
    });

    it('should allow access to private key via use()', () => {
      const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const handle = new PrivateKeyHandle(privateKey);

      const accessed = handle.use((key) => {
        expect(key).toBe(privateKey);
        return 'success';
      });

      expect(accessed).toBe('success');
      
      handle.destroy();
    });

    it('should throw if key accessed after destruction', () => {
      const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const handle = new PrivateKeyHandle(privateKey);
      
      handle.destroy();

      expect(() => {
        handle.use(() => 'test');
      }).toThrow('Private key no longer available');
    });
  });

  describe('process cleanup handlers', () => {
    it('should register exit handlers', () => {
      const processOnSpy = jest.spyOn(process, 'on');
      
      // Create new instance to trigger constructor
      SecureMemory.getInstance();

      expect(processOnSpy).toHaveBeenCalledWith('exit', expect.any(Function));
      expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(processOnSpy).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
    });
  });
});
