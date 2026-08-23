import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Phone, User2 } from 'lucide-react';

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
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(err => console.log('Remote play policy:', err));
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(err => console.log('Local play policy:', err));
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
        padding: '20px 24px', width: '320px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', gap: '14px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>👨‍⚕️</div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Incoming Video Call</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>{callerName}</div>
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

  // Active call full screen view
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: '#090d16', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center'
    }}>
      {/* Remote full-screen video */}
      {remoteStream ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: '#fff' }}>
          <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
            <User2 size={48} />
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>Connecting video feed with {callerName}...</div>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Please ensure camera and mic access are allowed.</div>
        </div>
      )}

      {/* Caller name header badge */}
      <div style={{
        position: 'absolute', top: '24px', left: '24px', color: '#fff', zIndex: 10,
        background: 'rgba(15, 23, 42, 0.75)', padding: '10px 18px', borderRadius: '12px',
        backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)'
      }}>
        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>In live consultation with</div>
        <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{callerName}</div>
      </div>

      {/* Self View (Picture-in-Picture) */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute', bottom: '110px', right: '24px',
          width: '180px', height: '135px', borderRadius: '16px',
          objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 10
        }}
      />

      {/* Action Controls Bar */}
      <div style={{
        position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: '20px', zIndex: 10, background: 'rgba(15, 23, 42, 0.8)',
        padding: '12px 24px', borderRadius: '9999px', backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <button onClick={toggleMute} style={{ width: '52px', height: '52px', borderRadius: '50%', border: 'none', background: isMuted ? '#ef4444' : 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
        <button onClick={onEnd} style={{ width: '60px', height: '60px', borderRadius: '50%', border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'translateY(-4px)' }}>
          <PhoneOff size={26} />
        </button>
        <button onClick={toggleCam} style={{ width: '52px', height: '52px', borderRadius: '50%', border: 'none', background: isCamOff ? '#ef4444' : 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isCamOff ? <VideoOff size={22} /> : <Video size={22} />}
        </button>
      </div>
    </div>
  );
};
