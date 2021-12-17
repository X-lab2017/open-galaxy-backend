// Copyright 2021 - present Xlab
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Service } from 'egg';
import requestretry from 'requestretry';

export default class NebulaService extends Service {

  public async exec<T>(q: string): Promise<T | null> {
    try {
      const nsid = await this.getNSID();
      const result = await this.execInternal(nsid, q);
      return result;
    } catch (e) {
      this.logger.info(`Error while exec gql, q=${q}, err=${e}`);
      return null;
    }
  }

  private async execInternal(nsid: string, q: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const config = this.app.config.nebula;
      const options = {
        url: config.gateway + 'exec',
        headers: {
          Cookie: `SameSite=None; ${config.nsidKey}=${nsid}`,
        },
        json: {
          gql: q,
        },
      };
      // this.logger.info(`Goona exec query=${q}`);
      requestretry.post(options, (err: any, _response: any, ret: NebulaResponse<any>) => {
        if (err) {
          return reject(`Exec request error ${err}`);
        }
        if (ret.code !== 0) {
          return reject(`Exec response code is not 0, ret=${JSON.stringify(ret)}`);
        }
        resolve(ret.data);
      });
    });
  }

  private async getNSID(): Promise<string> {
    return new Promise((resolve, reject) => {
      const config = this.app.config.nebula;
      const nsidKey = this.app.cache.get<string>(config.nsidKey);
      if (nsidKey) {
        return resolve(nsidKey);
      }

      const options = {
        url: config.gateway + 'connect',
        json: {
          username: config.username,
          password: config.password,
          address: config.address,
          port: config.port,
        },
      };
      requestretry.post(options, (err: any, response: any, ret: NebulaResponse<string>) => {
        if (err) {
          return reject(`Get NSID request error ${err}`);
        }
        if (ret.code !== 0) {
          return reject(`Get NSID response code is not 0, ret=${JSON.stringify(ret)}`);
        }
        const cookies: string[] = response.headers['set-cookie'];
        const cookieMap = this.parseCookie(cookies);
        if (!cookieMap.has(config.nsidKey)) {
          return reject(`NSID not included in response, cookies=${JSON.stringify(cookies)}`);
        }
        this.app.cache.set(config.nsidKey, cookieMap.get(config.nsidKey));
        resolve(cookieMap.get(config.nsidKey)!);
      });
    });
  }

  public close() {
    return new Promise(resolve => {
      const config = this.app.config.nebula;
      const nsid = this.app.cache.get<string>(config.nsidKey);
      if (!nsid) {
        return;
      }

      const options = {
        url: config.gateway + 'disconnect',
        headers: {
          Cookie: `SameSite=None; ${config.nsidKey}=${nsid}`,
        },
      };
      requestretry.post(options, resolve);
      this.logger.info('Nebula client closed.');
    });
  }

  public async init() {
    const config = this.app.config.nebula;
    this.logger.info('Start to init nebula index');
    const queries = [
      `USE ${config.space};`,
      'CREATE TAG INDEX IF NOT EXISTS repo_name ON repo(repo_name(20))',
      'CREATE TAG INDEX IF NOT EXISTS actor_login ON actor(actor_login(20))',
      'CREATE EDGE INDEX IF NOT EXISTS relationship_weight ON relationship(weight)',
      'REBUILD TAG INDEX;',
      'REBUILD EDGE INDEX;',
    ];
    for (const q of queries) {
      await this.exec(q);
    }
    this.logger.info('Init nebula index done.');
  }

  private parseCookie(cookies: string[]): Map<string, string> {
    const cookieMap = new Map<string, string>();
    cookies.forEach(c => {
      c.split(';').forEach(p => {
        const [k, v] = p.trim().split('=');
        cookieMap.set(k, v);
      });
    });
    return cookieMap;
  }

}

interface NebulaResponse<T = any> {
  code: number;
  data: T;
}
