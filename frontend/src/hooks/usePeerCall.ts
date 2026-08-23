import { useRef, useState, useCallback } from 'react';

export interface CallInfo {
  peerId: string;
  doctorName: string;
  complaintId: number | string;
}

export interface UsePeerCallReturn {
  myPeerId: string | null;
  isCallActive: boolean;
  isIncoming: boolean;
  incomingCallInfo: CallInfo | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  initPeer: (userId: string) => void;
  callPeer: (remotePeerId: string, complaintId: number | string, doctorName?: string) => void;
  triggerIncomingCall: (info: CallInfo) => void;
  answerCall: () => void;
  endCall: () => void;
}

export function usePeerCall(onIncomingCall?: (info: CallInfo) => void): UsePeerCallReturn {
  const peerRef = useRef<any>(null);
  const currentCallRef = useRef<any>(null);
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isIncoming, setIsIncoming] = useState(false);
  const [incomingCallInfo, setIncomingCallInfo] = useState<CallInfo | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const getMedia = async () => {
    try {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      try {
        return await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      } catch {
        return null;
      }
    }
  };

  const addRemoteStream = (call: any) => {
    call.on('stream', (stream: MediaStream) => {
      setRemoteStream(stream);
      setIsCallActive(true);
      setIsIncoming(false);
    });
    call.on('close', () => endCall());
    call.on('error', () => endCall());
    currentCallRef.current = call;
  };

  const initPeer = useCallback((userId: string) => {
    if (peerRef.current && !peerRef.current.destroyed) return;
    import('peerjs').then(({ default: Peer }) => {
      const sanitizedId = `medflow-${userId.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      const peer = new Peer(sanitizedId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      });
      peerRef.current = peer;

      peer.on('open', (id: string) => {
        setMyPeerId(id);
        console.log('[PeerJS] Connected with ID:', id);
      });

      peer.on('call', async (call: any) => {
        const info: CallInfo = {
          peerId: call.peer,
          doctorName: call.metadata?.doctorName || 'Doctor',
          complaintId: call.metadata?.complaintId || 0
        };
        setIncomingCallInfo(info);
        setIsIncoming(true);
        if (onIncomingCall) onIncomingCall(info);

        const stream = await getMedia();
        if (stream) setLocalStream(stream);
        currentCallRef.current = call;
      });

      peer.on('error', (err: any) => {
        console.warn('[PeerJS] Notice:', err.type || err);
      });
    });
  }, [onIncomingCall]);

  const triggerIncomingCall = useCallback((info: CallInfo) => {
    setIncomingCallInfo(info);
    setIsIncoming(true);
    if (onIncomingCall) onIncomingCall(info);
  }, [onIncomingCall]);

  const callPeer = useCallback(async (remotePeerId: string, complaintId: number | string, doctorName?: string) => {
    if (!peerRef.current) return;
    const stream = await getMedia();
    if (!stream) {
      alert('Camera & microphone permissions are required for video consultations.');
      return;
    }
    setLocalStream(stream);
    const call = peerRef.current.call(remotePeerId, stream, {
      metadata: { complaintId, doctorName: doctorName || 'Doctor' }
    });
    if (call) {
      addRemoteStream(call);
    }
    setIsCallActive(true);
  }, []);

  const answerCall = useCallback(async () => {
    const call = currentCallRef.current;
    const stream = localStream || await getMedia();
    if (stream) setLocalStream(stream);

    if (call && stream) {
      call.answer(stream);
      addRemoteStream(call);
    }
    setIsIncoming(false);
    setIsCallActive(true);
  }, [localStream]);

  const endCall = useCallback(() => {
    if (currentCallRef.current) {
      try { currentCallRef.current.close(); } catch {}
    }
    localStream?.getTracks().forEach(t => t.stop());
    remoteStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setIsCallActive(false);
    setIsIncoming(false);
    setIncomingCallInfo(null);
    currentCallRef.current = null;
  }, [localStream, remoteStream]);

  return {
    myPeerId, isCallActive, isIncoming, incomingCallInfo, localStream, remoteStream,
    initPeer, callPeer, triggerIncomingCall, answerCall, endCall
  };
}
