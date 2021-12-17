// This file is created by egg-ts-helper@1.29.1
// Do not modify this file!!!!!!!!!

import 'egg';
import ExportRepo from '../../../app/controller/repo';

declare module 'egg' {
  interface IController {
    repo: ExportRepo;
  }
}
