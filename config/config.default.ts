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

import { Context, EggAppConfig, PowerPartial } from 'egg';

export default () => {
  const config = {} as PowerPartial<EggAppConfig>;

  config.keys = 'Something';

  config.security = {
    csrf: {
      enable: false,
      ignoreJSON: true,
    },
  };

  config.cors = {
    origin: (ctx: Context) => ctx.get('origin'),
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
  };

  config.nebula = {
    gateway: 'http://127.0.0.1:8080/api/db/',
    username: '',
    password: '',
    address: '',
    port: 9669,
    nsidKey: 'common-nsid',
    space: '',
  };

  config.cluster = {
    listen: {
      port: 8668,
    },
  };

  return {
    ...config,
  };
};
