import { generateJitsiToken as generateToken } from './firebase';
import { User } from '../types';

// Jitsi configuration
const jitsiDomain = process.env.REACT_APP_JITSI_DOMAIN || 'meet.jitsi';
const jitsiAppId = process.env.REACT_APP_JITSI_APP_ID || '';
const jitsiAppSecret = process.env.REACT_APP_JITSI_APP_SECRET || '';

interface JitsiTokenOptions {
  roomName: string;
  user: User;
  isModerator?: boolean;
  expiresIn?: number; // in seconds
}

interface JitsiMeetOptions {
  roomName: string;
  width?: string | number;
  height?: string | number;
  parentNode?: HTMLElement;
  configOverwrite?: Record<string, any>;
  interfaceConfigOverwrite?: Record<string, any>;
  jwt?: string;
  onload?: () => void;
}

// Generate a JWT token for Jitsi authentication
const generateJitsiToken = async ({
  roomName,
  user,
  isModerator = false,
  expiresIn = 3600, // Default to 1 hour
}: JitsiTokenOptions): Promise<string> => {
  try {
    // Call Firebase Cloud Function to generate token
    const result = await generateToken({
      roomName,
      userId: user.id,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.photoURL || '',
      isModerator,
      expiresIn,
    });

    return (result.data as { token: string }).token;
  } catch (error) {
    console.error('Error generating Jitsi token:', error);
    throw error;
  }
};

// Initialize Jitsi Meet API
const initJitsiMeetAPI = (options: JitsiMeetOptions) => {
  return new Promise<any>((resolve, reject) => {
    try {
      // @ts-ignore - JitsiMeetExternalAPI is loaded from external script
      const api = new JitsiMeetExternalAPI(jitsiDomain, {
        roomName: options.roomName,
        width: options.width || '100%',
        height: options.height || '100%',
        parentNode: options.parentNode,
        configOverwrite: {
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          ...(options.configOverwrite || {}),
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone',
            'camera',
            'closedcaptions',
            'desktop',
            'fullscreen',
            'fodeviceselection',
            'hangup',
            'profile',
            'chat',
            'recording',
            'livestreaming',
            'etherpad',
            'sharedvideo',
            'settings',
            'raisehand',
            'videoquality',
            'filmstrip',
            'feedback',
            'stats',
            'shortcuts',
            'tileview',
            'videobackgroundblur',
            'download',
            'help',
            'mute-everyone',
          ],
          ...(options.interfaceConfigOverwrite || {}),
        },
        jwt: options.jwt,
        onload: () => {
          if (options.onload) options.onload();
          resolve(api);
        },
      });
    } catch (error) {
      console.error('Error initializing Jitsi Meet API:', error);
      reject(error);
    }
  });
};

// Start recording a Jitsi meeting
const startRecording = (api: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      api.executeCommand('startRecording', {
        mode: 'file', // Options: file, stream
      });
      
      api.addListener('recordingStatusChanged', (status: { on: boolean }) => {
        if (status.on) {
          resolve();
        }
      });
      
      // Timeout in case the recording doesn't start
      setTimeout(() => {
        reject(new Error('Recording start timeout'));
      }, 10000);
    } catch (error) {
      console.error('Error starting recording:', error);
      reject(error);
    }
  });
};

// Stop recording a Jitsi meeting
const stopRecording = (api: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      api.executeCommand('stopRecording', 'file');
      
      api.addListener('recordingStatusChanged', (status: { on: boolean }) => {
        if (!status.on) {
          resolve();
        }
      });
      
      // Timeout in case the recording doesn't stop
      setTimeout(() => {
        reject(new Error('Recording stop timeout'));
      }, 10000);
    } catch (error) {
      console.error('Error stopping recording:', error);
      reject(error);
    }
  });
};

// Get participant information from Jitsi meeting
const getParticipants = (api: any): any[] => {
  try {
    return api.getParticipantsInfo();
  } catch (error) {
    console.error('Error getting participants:', error);
    return [];
  }
};

// Add event listeners to Jitsi API
const addJitsiEventListeners = (
  api: any,
  eventHandlers: Record<string, (...args: any[]) => void>
): void => {
  Object.entries(eventHandlers).forEach(([event, handler]) => {
    api.addListener(event, handler);
  });
};

// Remove event listeners from Jitsi API
const removeJitsiEventListeners = (
  api: any,
  eventHandlers: Record<string, (...args: any[]) => void>
): void => {
  Object.entries(eventHandlers).forEach(([event, handler]) => {
    api.removeListener(event, handler);
  });
};

export {
  generateJitsiToken,
  initJitsiMeetAPI,
  startRecording,
  stopRecording,
  getParticipants,
  addJitsiEventListeners,
  removeJitsiEventListeners,
};
