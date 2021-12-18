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

export default class RepoService extends Service {

  private repoNetworkCacheKey(name: string) {
    return `RepoService_RepoNetwork_${name}`;
  }

  public async getRepoNetwork(name: string) {
    // try to get cache first
    const key = this.repoNetworkCacheKey(name);
    const cache = this.app.cache.get(key);
    if (cache) return cache;

    // request to get data
    const config = this.app.config.nebula;
    const result: NetworkResult = {
      nodes: [],
      edges: [],
    };
    await this.service.nebula.exec(`USE ${config.space}`);
    const relatedRepos = await this.service.nebula.exec<{ tables: RelatedRepos[] }>(`MATCH (n:repo{repo_name:"${name}"})<-[rel:relationship]-(r:repo) WITH n.influence AS self_inf, rel.weight AS w, r.repo_name AS name, r.influence AS inf RETURN name, self_inf, inf, w ORDER BY w DESC LIMIT 30`);
    if (!relatedRepos?.tables || relatedRepos.tables.length === 0) return null;
    result.nodes.push({ name, value: relatedRepos.tables[0].self_inf });
    relatedRepos.tables.forEach(i => {
      if (result.nodes.findIndex(n => n.name === i.name) >= 0) return;
      result.nodes.push({
        name: i.name,
        value: i.inf,
      });
      result.edges.push({
        source: name,
        target: i.name,
        weight: i.w,
      });
    });
    const repos = relatedRepos.tables.map(i => `"${i.name}"`);
    await Promise.all(repos.map(async (repo, index) => {
      if (index >= repo.length - 1) return;
      const relationships = await this.service.nebula.exec<{ tables: Relations[] }>(`MATCH (r1:repo{repo_name:${repo}})-[rel:relationship]->(r2:repo) WHERE r2.repo_name IN [${repos.slice(index + 1)}] RETURN r1.repo_name AS source, r2.repo_name AS target, rel.weight AS w;`);
      if (!relationships?.tables) return;
      relationships.tables.forEach(i => {
        result.edges.push({
          source: i.source,
          target: i.target,
          weight: i.w,
        });
      });
    }));

    this.app.cache.set(key, result);
    return result;
  }

  private developerNetworkCacheKey(name: string) {
    return `RepoService_DeveloperNetwork_${name}`;
  }

  public async getDeveloperNetwork(name: string) {
    // try to get cache first
    const key = this.developerNetworkCacheKey(name);
    const cache = this.app.cache.get(key);
    if (cache) return cache;

    // request to get data
    const config = this.app.config.nebula;
    const result: NetworkResult = {
      nodes: [],
      edges: [],
    };
    await this.service.nebula.exec(`USE ${config.space}`);
    const relatedActors = await this.service.nebula.exec<{ tables: RelatedDevelopers[] }>(`MATCH (n:repo{repo_name:"${name}"})<-[rel:relationship]-(r:actor) WITH rel.weight AS w, r.actor_login AS name RETURN name, w ORDER BY w DESC LIMIT 30`);
    if (!relatedActors?.tables || relatedActors.tables.length === 0) return null;
    relatedActors.tables.forEach(i => {
      if (result.nodes.findIndex(n => n.name === i.name) >= 0) return;
      result.nodes.push({
        name: i.name,
        value: i.w,
      });
    });
    const developers = relatedActors.tables.map(i => `"${i.name}"`);
    await Promise.all(developers.map(async (login, index) => {
      if (index >= developers.length - 1) return;
      const relationships = await this.service.nebula.exec<{ tables: Relations[] }>(`MATCH (a1:actor{actor_login:${login}})-[rel:relationship]->(a2:actor) WHERE a2.actor_login IN [${developers.slice(index + 1)}] RETURN a1.actor_login AS source, a2.actor_login AS target, rel.weight AS w;`);
      if (!relationships?.tables) return;
      relationships.tables.forEach(i => {
        result.edges.push({
          source: i.source,
          target: i.target,
          weight: i.w,
        });
      });
    }));

    this.app.cache.set(key, result);
    return result;
  }
}

interface RelatedRepos {
  self_inf: number;
  inf: number;
  name: string;
  w: number;
}

interface RelatedDevelopers {
  name: string;
  w: number;
}

interface Relations {
  source: string;
  target: string;
  w: number;
}

interface NetworkResult {
  nodes: Array<{ name: string, value: number }>;
  edges: Array<{ source: string; target: string; weight: number; }>;
}
