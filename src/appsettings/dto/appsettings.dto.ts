export type Settings = {
    vatRate: number;
    businessName?: string;
    businessLogo?: string;
}

export class UpdateAppSettingsDto {
  settings: Settings;
}

export interface AppSettings {
  id: string;
  settings: Settings;
}
