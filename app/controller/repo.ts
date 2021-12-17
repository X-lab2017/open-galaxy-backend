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

import { Controller } from 'egg';

export default class RepoController extends Controller {

  public async status() {
    const config = this.app.config.nebula;
    const queries = [
      `USE ${config.space};`,
      'SHOW STATS;',
    ];
    const results: any[] = [];
    for (const q of queries) {
      results.push(await this.service.nebula.exec(q));
    }

    const result: any[] = results[results.length - 1].tables;
    const resultObj: { [key: string]: any } = {};
    result.forEach(item => {
      resultObj[item.Name] = item.Count;
    });

    this.ctx.body = {
      repo: resultObj.repo,
      actor: resultObj.actor,
      relationship: resultObj.relationship,
    };
  }

  public async repoNetwork() {
    const { owner, repo } = this.ctx.params;
    const repoName = `${owner}/${repo}`;
    const result = await this.service.repo.getRepoNetwork(repoName);
    if (!result) {
      this.ctx.body = { error: 'No valid data' };
      return;
    }
    this.ctx.body = result;
  }

  public async developerNetwork() {
    const { owner, repo } = this.ctx.params;
    const repoName = `${owner}/${repo}`;
    const result = await this.service.repo.getDeveloperNetwork(repoName);
    if (!result) {
      this.ctx.body = { error: 'No valid data' };
      return;
    }
    this.ctx.body = result;
  }

}
