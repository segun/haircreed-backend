import { IsObject } from 'class-validator';

export class UpdateAppSettingsDto {
  @IsObject()
  settings: object;
}

export interface AppSettings {
  id: string;
  settings: any;
}
