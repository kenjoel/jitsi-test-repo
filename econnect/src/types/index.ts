// User types
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'user' | 'service-provider';
  createdAt: Date;
  updatedAt: Date;
}

// Event types
export interface Event {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  createdBy: string; // User ID
  isPublic: boolean;
  maxParticipants?: number;
  participants: string[]; // Array of User IDs
  jitsiRoomName: string;
  createdAt: Date;
  updatedAt: Date;
}

// Meeting types
export interface Meeting {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  hostId: string; // User ID
  participants: Participant[];
  jitsiRoomName: string;
  recordingEnabled: boolean;
  recordingStarted?: Date;
  recordingEnded?: Date;
  recordingUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Participant {
  userId: string;
  displayName: string;
  role: 'moderator' | 'viewer';
  joinTime: Date;
  leaveTime?: Date;
}

// Recording types
export interface Recording {
  id: string;
  meetingId: string;
  eventId: string;
  ownerId: string; // User ID
  title?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  fileSize?: number; // in bytes
  fileType: string;
  url: string;
  s3Key: string;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics types
export interface MeetingAnalytics {
  id: string;
  meetingId: string;
  eventId: string;
  hostId: string; // User ID
  participantCount: number;
  averageDuration: number; // in seconds
  peakParticipants: number;
  startTime: Date;
  endTime: Date;
  participants: ParticipantAnalytics[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ParticipantAnalytics {
  userId: string;
  displayName: string;
  joinTime: Date;
  leaveTime?: Date;
  duration?: number; // in seconds
  role: 'moderator' | 'viewer';
}

// Virtual Space types
export interface VirtualTable {
  id: string;
  eventId: string;
  name: string;
  capacity: number;
  participants: string[]; // Array of User IDs
  createdAt: Date;
  updatedAt: Date;
}

// Service types
export interface Service {
  id: string;
  providerId: string; // User ID
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  availability: {
    days: string[]; // e.g., ['Monday', 'Tuesday', ...]
    startTime: string; // e.g., '09:00'
    endTime: string; // e.g., '17:00'
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceRequest {
  id: string;
  serviceId: string;
  requesterId: string; // User ID
  providerId: string; // User ID
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  requestedTime: Date;
  scheduledTime?: Date;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Jitsi types
export interface JitsiMeetConfig {
  roomName: string;
  width: string | number;
  height: string | number;
  parentNode: HTMLElement;
  configOverwrite?: {
    startWithAudioMuted?: boolean;
    startWithVideoMuted?: boolean;
    prejoinPageEnabled?: boolean;
    disableDeepLinking?: boolean;
    [key: string]: any;
  };
  interfaceConfigOverwrite?: {
    TOOLBAR_BUTTONS?: string[];
    SHOW_JITSI_WATERMARK?: boolean;
    [key: string]: any;
  };
  jwt?: string;
  onload?: () => void;
}

export interface JitsiMeetExternalAPI {
  executeCommand: (command: string, ...args: any[]) => void;
  addListener: (event: string, listener: (data: any) => void) => void;
  removeListener: (event: string, listener: (data: any) => void) => void;
  dispose: () => void;
  getParticipantsInfo: () => any[];
  getDisplayName: (id: string) => string;
  getVideoQuality: () => string;
  isAudioMuted: () => boolean;
  isVideoMuted: () => boolean;
}
