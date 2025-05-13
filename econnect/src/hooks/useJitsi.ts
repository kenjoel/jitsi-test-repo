import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { JitsiMeetExternalAPI } from '../types';
import { initJitsiMeetAPI, generateJitsiToken } from '../services/jitsi';

interface UseJitsiProps {
  roomName: string;
  isHost?: boolean;
  onParticipantJoined?: (participant: any) => void;
  onParticipantLeft?: (participant: any) => void;
  onVideoConferenceJoined?: (participant: any) => void;
  onVideoConferenceLeft?: (participant: any) => void;
}

interface UseJitsiReturn {
  jitsiAPI: JitsiMeetExternalAPI | null;
  isLoading: boolean;
  error: Error | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const useJitsi = ({
  roomName,
  isHost = false,
  onParticipantJoined,
  onParticipantLeft,
  onVideoConferenceJoined,
  onVideoConferenceLeft,
}: UseJitsiProps): UseJitsiReturn => {
  const [jitsiAPI, setJitsiAPI] = useState<JitsiMeetExternalAPI | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { userProfile } = useAuth();

  useEffect(() => {
    // Don't initialize if the container ref is not available or no user is logged in
    if (!containerRef.current || !userProfile) {
      return;
    }

    const initJitsi = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Generate JWT token for authentication
        const token = await generateJitsiToken({
          roomName,
          user: userProfile,
          isModerator: isHost,
        });

        // Get the container element (we've already checked it's not null above)
        const container = containerRef.current as HTMLElement;

        // Initialize Jitsi Meet
        const api = await initJitsiMeetAPI({
          roomName,
          width: '100%',
          height: '100%',
          parentNode: container,
          jwt: token,
          configOverwrite: {
            prejoinPageEnabled: false,
            startWithAudioMuted: !isHost,
            startWithVideoMuted: !isHost,
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
              ...(isHost ? ['recording', 'livestreaming'] : []),
              'etherpad',
              'sharedvideo',
              'settings',
              'raisehand',
              'videoquality',
              'filmstrip',
              'invite',
              'feedback',
              'stats',
              'shortcuts',
              'tileview',
              'videobackgroundblur',
              'download',
              'help',
              ...(isHost ? ['mute-everyone', 'security'] : []),
            ],
            SHOW_JITSI_WATERMARK: false,
          },
        });

        // Set up event listeners
        const eventHandlers: Record<string, (...args: any[]) => void> = {};
        
        if (onParticipantJoined) {
          eventHandlers['participantJoined'] = onParticipantJoined;
        }

        if (onParticipantLeft) {
          eventHandlers['participantLeft'] = onParticipantLeft;
        }

        if (onVideoConferenceJoined) {
          eventHandlers['videoConferenceJoined'] = onVideoConferenceJoined;
        }

        if (onVideoConferenceLeft) {
          eventHandlers['videoConferenceLeft'] = onVideoConferenceLeft;
        }

        // Add event listeners
        Object.entries(eventHandlers).forEach(([event, handler]) => {
          api.addListener(event, handler);
        });

        setJitsiAPI(api);
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing Jitsi:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize Jitsi'));
        setIsLoading(false);
      }
    };

    initJitsi();

    // Cleanup function
    return () => {
      if (jitsiAPI) {
        // Remove event listeners
        if (onParticipantJoined) {
          jitsiAPI.removeListener('participantJoined', onParticipantJoined);
        }

        if (onParticipantLeft) {
          jitsiAPI.removeListener('participantLeft', onParticipantLeft);
        }

        if (onVideoConferenceJoined) {
          jitsiAPI.removeListener('videoConferenceJoined', onVideoConferenceJoined);
        }

        if (onVideoConferenceLeft) {
          jitsiAPI.removeListener('videoConferenceLeft', onVideoConferenceLeft);
        }

        // Dispose of the Jitsi API
        jitsiAPI.dispose();
        setJitsiAPI(null);
      }
    };
  }, [
    roomName,
    isHost,
    userProfile,
    onParticipantJoined,
    onParticipantLeft,
    onVideoConferenceJoined,
    onVideoConferenceLeft,
  ]);

  return { jitsiAPI, isLoading, error, containerRef };
};

export default useJitsi;
