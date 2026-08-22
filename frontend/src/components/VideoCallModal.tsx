import React, { useEffect, useRef } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Phone } from 'lucide-react';

interface VideoCallModalProps {
  isActive: boolean;
  isIncoming: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callerName: string;
  onAnswer: () => void;
  onEnd: () => void;
}

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  isActive, isIncoming, localStream, remoteStream, callerName, onAnswer, onEnd
}) => {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isCamOff, setIsCamOff] = React.useState(false);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const toggleMute = () => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(m => !m);
  };

  const toggleCam = () => {
    localStream?.getVideoTracks().forEach(t => { t.enabled = isCamOff; });
    setIsCamOff(c => !c);
  };

  if (!isActive && !isIncoming) return null;

  // Incoming call banner
  if (isIncoming && !isActive) {
    return (
      <div style={{
        position: 'fixed', top: '80px', right: '24px', zIndex: 99999,
        background: '#0f172a', color: '#fff', borderRadius: '16px',
        padding: '20px 24px', width: '300px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column', gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>👨‍⚕️</div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Incoming Video Call</div>
            <div style={{ fontSize: '1rem', fontWeight: 800 }}>{callerName}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onEnd} style={{ flex: 1, background: '#dc2626', border: 'none', borderRadius: '10px', padding: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <PhoneOff size={16} /> Decline
          </button>
          <button onClick={onAnswer} style={{ flex: 1, background: '#16a34a', border: 'none', borderRadius: '10px', padding: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Phone size={16} /> Accept
          </button>
        </div>
      </div>
    );
  }

  // Active call full screen
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: '#0f172a', display: 'flex', flexDirection: 'column'
    }}>
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
      />

      <div style={{ position: 'absolute', top: '20px', left: '20px', color: '#fff', zIndex: 10 }}>
        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>In video consultation with</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{callerName}</div>
      </div>

      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute', bottom: '100px', right: '20px',
          width: '160px', height: '120px', borderRadius: '12px',
          objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)', zIndex: 10
        }}
      />

      <div style={{
        position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: '16px', zIndex: 10
      }}>
        <button onClick={toggleMute} style={{ width: '56px', height: '56px', borderRadius: '50%', border: 'none', background: isMuted ? '#ef4444' : 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
        <button onClick={onEnd} style={{ width: '64px', height: '64px', borderRadius: '50%', border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PhoneOff size={26} />
        </button>
        <button onClick={toggleCam} style={{ width: '56px', height: '56px', borderRadius: '50%', border: 'none', background: isCamOff ? '#ef4444' : 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isCamOff ? <VideoOff size={22} /> : <Video size={22} />}
        </button>
      </div>
    </div>
  );
};
