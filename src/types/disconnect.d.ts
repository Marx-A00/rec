declare module 'disconnect' {
  export interface DiscogsOptions {
    consumerKey?: string;
    consumerSecret?: string;
    userToken?: string;
    userAgent?: string;
  }

  export interface SearchOptions {
    query?: string;
    type?: string;
    title?: string;
    artist?: string;
    format?: string;
    per_page?: number;
    page?: number;
  }

  export class Client {
    constructor(options: DiscogsOptions);
    database(): Database;
  }

  export class Database {
    search(options: SearchOptions): Promise<any>;
    getMaster(id: number | string): Promise<any>;
    getRelease(id: number | string): Promise<any>;
  }

  export default {
    Client
  };
} 