# OpenGalaxy Backend

We provide Nebula Graph Database based data interface for OpenGalaxy.

## Interface

The interfaces contains:

#### Status inspect

- path: `/repo/status`
- return: database sizes if the service is running, the result will be like:
```
{
  "repo": 9557442,
  "actor": 4486704,
  "relationship": 200604333
}
```

#### Repo network

- path: `/repo/repo_network/:owner/:repo` like `/repo/repo_network/microsoft/vscode`
- return: object which will fit the network component from echarts.

#### Developer network

- path: `/repo/developer_network/:owner/:repo` like `/repo/developer_network/microsoft/vscode`
- return: object which will fit the network component from echarts.

## How to use

Run the commands after git clone.
```
npm install
npm start
```
