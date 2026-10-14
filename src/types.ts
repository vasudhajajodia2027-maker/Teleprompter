export interface Script {
  id: string;
  title: string;
  episodeTag?: string;
  category: 'active' | 'draft' | 'template';
  content: string;
  pacingWpm: number;
  updatedAt: string;
  wordCount: number;
  estimatedReadTime: string;
}

export interface LicenseStatus {
  isActive: boolean;
  key: string;
  plan: 'free' | 'lifetime' | 'monthly';
  seat: string;
  activatedAt?: string;
}

export interface PrompterSettings {
  fontSize: number;
  isNightMode: boolean;
  isMirrored: boolean;
  speedMode: 'slow' | 'auto' | 'fast';
  useWebcam: boolean;
  voiceSyncActive: boolean;
  containerWidthCh: number;
}
