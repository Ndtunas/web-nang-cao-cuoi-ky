/**
 * Generic TypeORM Repository mock class.
 * Simulates findOne, find, save, create, delete, remove, update, count, createQueryBuilder.
 */
export class MockRepository<T = any> {
  private data: T[] = [];
  private _mockImpl: ((...args: any[]) => any) | null = null;

  constructor(initialData: T[] = []) {
    this.data = [...initialData];
  }

  private _removeReturn: T | null = null;

  setMockImpl(fn: (...args: any[]) => any) {
    this._mockImpl = fn;
  }

  setRemoveReturned(entity: T) {
    this._removeReturn = entity;
  }

  private _findOneReturn: T | null = null;

  setFindOneReturned(entity: T | null) {
    this._findOneReturn = entity;
  }

  private _findReturn: T[] = [];

  setFindReturned(entities: T[]) {
    this._findReturn = [...entities];
  }

  private _saveReturn: T | null = null;

  setSaveReturned(entity: T) {
    this._saveReturn = entity;
  }

  private toDateValue(v: any): string {
    if (v instanceof Date) {
      const y = v.getFullYear();
      const m = String(v.getMonth() + 1).padStart(2, '0');
      const day = String(v.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return String(v ?? '');
  }

  private matchesItem(item: any, where: any): boolean {
    return Object.keys(where).every((k) => {
      const itemVal = item[k];
      const queryVal = where[k];
      return this.toDateValue(itemVal) === this.toDateValue(queryVal);
    });
  }

  async findOne(opts?: { where?: any; relations?: any; order?: any }): Promise<T | null> {
    if (this._findOneReturn !== null) {
      const result = this._findOneReturn;
      this._findOneReturn = null;
      return result;
    }
    if (this._mockImpl) return this._mockImpl('findOne', opts);
    if (!opts?.where) return this.data[0] ?? null;
    const targets = Array.isArray(opts.where) ? opts.where : [opts.where];
    for (const cond of targets) {
      const found = this.data.find((item: any) => this.matchesItem(item, cond));
      if (found) return found;
    }
    return null;
  }

  async find(opts?: {
    where?: any;
    relations?: any;
    order?: any;
    take?: number;
  }): Promise<T[]> {
    if (this._findReturn.length > 0) {
      const result = [...this._findReturn];
      this._findReturn = [];
      return result;
    }
    if (this._mockImpl) return this._mockImpl('find', opts) as T[];
    let result = [...this.data];
    if (opts?.where) {
      const targets = Array.isArray(opts.where) ? opts.where : [opts.where];
      result = result.filter((item: any) =>
        targets.some((cond: any) => this.matchesItem(item, cond)),
      );
    }
    if (opts?.order) {
      const orderKeys = Object.keys(opts.order);
      result.sort((a: any, b: any) => {
        for (const key of orderKeys) {
          const dir = opts.order[key] === 'ASC' ? 1 : -1;
          if (a[key] < b[key]) return -1 * dir;
          if (a[key] > b[key]) return 1 * dir;
        }
        return 0;
      });
    }
    if (opts?.take) result = result.slice(0, opts.take);
    return result;
  }

  async save(entity: Partial<T>): Promise<T> {
    if (this._saveReturn !== null) return this._saveReturn;
    if (this._mockImpl) return this._mockImpl('save', entity) as T;
    if ((entity as any).id) {
      const idx = this.data.findIndex((e: any) => e.id === (entity as any).id);
      if (idx >= 0) {
        this.data[idx] = { ...this.data[idx], ...entity } as T;
        return this.data[idx];
      }
    }
    const created = { ...entity, id: (entity as any).id ?? String(Date.now()) } as T;
    this.data.push(created);
    return created;
  }

  create(entityLike: Partial<T>): T {
    return { ...entityLike, id: (entityLike as any).id ?? String(Date.now()) } as T;
  }

  async delete(opts: any): Promise<any> {
    if (this._mockImpl) return this._mockImpl('delete', opts);
    const criteria = opts?.where ?? opts;
    if (!criteria || Object.keys(criteria).length === 0) return { affected: this.data.length };
    const keys = Object.keys(criteria);
    const before = this.data.length;
    this.data = this.data.filter((item: any) =>
      !keys.every((k) => item[k] === criteria[k]),
    );
    return { affected: before - this.data.length };
  }

  async remove(entity: T): Promise<T> {
    if (this._mockImpl) return this._mockImpl('remove', entity) as T;
    if (this._removeReturn !== null) return this._removeReturn;
    this.data = this.data.filter((e: any) => e.id !== (entity as any).id);
    return entity;
  }

  async update(id: any, partial: Partial<T>): Promise<any> {
    if (this._mockImpl) return this._mockImpl('update', id, partial);
    const idx = this.data.findIndex((e: any) => e.id === id);
    if (idx >= 0) {
      this.data[idx] = { ...this.data[idx], ...partial } as T;
    }
    return { affected: idx >= 0 ? 1 : 0 };
  }

  async count(opts?: { where?: any }): Promise<number> {
    if (this._mockImpl) return this._mockImpl('count', opts) as number;
    if (!opts?.where) return this.data.length;
    return this.data.filter((item: any) => this.matchesItem(item, opts.where)).length;
  }

  createQueryBuilder(_alias = 'entity'): any {
    const repo = this;
    return {
      repo,
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(repo.data),
      getRawMany: jest.fn().mockResolvedValue(repo.data),
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ identifiers: [] }),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(repo.data[0] ?? null),
    };
  }

  /** Reset stored data */
  reset(newData: T[] = []) {
    this.data = [...newData];
    this._mockImpl = null;
    this._findOneReturn = null;
    this._findReturn = [];
    this._saveReturn = null;
    this._removeReturn = null;
  }

  /** Add item to store */
  add(...items: T[]) {
    this.data.push(...items);
  }

  /** Get all stored data */
  getAll() {
    return [...this.data];
  }
}
