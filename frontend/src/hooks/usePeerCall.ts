import { useRef, useState, useCallback, useEffect } from 'react';

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
  callPeer: (remotePeerId: string, complaintId: number | string, callerName?: string) => void;
  triggerIncomingCall: (info: CallInfo) => void;
  answerCall: () => void;
  endCall: () => void;
}

const RELAY_TOPIC = 'medflow_sih_live_consultations_v2026';

function createFallbackStream(): MediaStream {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = '#0d9488';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('MedFlow Live Video Feed', 150, 240);
  }
  const stream = (canvas as any).captureStream ? (canvas as any).captureStream(15) : new MediaStream();
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const dest = audioCtx.createMediaStreamDestination();
    dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
  } catch {}
  return stream;
}

export function usePeerCall(onIncomingCall?: (info: CallInfo) => void): UsePeerCallReturn {
  const peerRef = useRef<any>(null);
  const currentCallRef = useRef<any>(null);
  const currentUserIdRef = useRef<string>('');
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isIncoming, setIsIncoming] = useState(false);
  const [incomingCallInfo, setIncomingCallInfo] = useState<CallInfo | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const getMedia = async (): Promise<MediaStream> => {
    try {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      try {
        return await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      } catch {
        return createFallbackStream();
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

  const createPeerInstance = useCallback((userId: string, attempt = 0) => {
    import('peerjs').then(({ default: Peer }) => {
      const cleanUser = userId.toLowerCase().replace(/[^a-z0-9]/g, '');
      const uniqueSuffix = attempt === 0 ? Math.random().toString(36).substring(2, 6) : `${Date.now().toString().slice(-4)}${Math.random().toString(36).substring(2, 4)}`;
      const uniqueId = `medflow-${cleanUser}-${uniqueSuffix}`;

      const peer = new Peer(uniqueId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      });

      peerRef.current = peer;
      (window as any).__medflow_peer = peer;

      peer.on('open', (id: string) => {
        setMyPeerId(id);
        console.log('[PeerJS] Online with unique ID:', id);

        // Announce presence via Cloud Relay
        try {
          fetch(`https://ntfy.sh/${RELAY_TOPIC}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'PEER_PRESENCE',
              userId: currentUserIdRef.current,
              peerId: id
            })
          }).catch(() => {});
        } catch {}
      });

      peer.on('call', async (call: any) => {
        console.log('[PeerJS] Incoming WebRTC call from:', call.peer);
        const info: CallInfo = {
          peerId: call.peer,
          doctorName: call.metadata?.doctorName || 'Doctor',
          complaintId: call.metadata?.complaintId || 0
        };
        setIncomingCallInfo(info);
        setIsIncoming(false);
        setIsCallActive(true);
        if (onIncomingCall) onIncomingCall(info);

        const stream = await getMedia();
        setLocalStream(stream);
        call.answer(stream);
        addRemoteStream(call);
        currentCallRef.current = call;
      });

      peer.on('error', (err: any) => {
        console.warn('[PeerJS] Error notice:', err.type || err);
        if (err.type === 'unavailable-id' && attempt < 3) {
          createPeerInstance(userId, attempt + 1);
        }
      });
    });
  }, [onIncomingCall]);

  const initPeer = useCallback((userId: string) => {
    if (peerRef.current && !peerRef.current.destroyed) return;
    currentUserIdRef.current = userId;
    createPeerInstance(userId);
  }, [createPeerInstance]);

  // Listen to Global Cloud Signaling for fallback call triggers
  useEffect(() => {
    let sse: EventSource | null = null;
    try {
      sse = new EventSource(`https://ntfy.sh/${RELAY_TOPIC}/sse`);
      sse.onmessage = async (event) => {
        try {
          const raw = JSON.parse(event.data);
          const parsed = typeof raw.message === 'string' ? JSON.parse(raw.message) : (raw.message || raw);
          
          if (parsed && parsed.type === 'CALL_SIGNAL') {
            const cleanUser = (currentUserIdRef.current || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const isForMe = parsed.toPeerId === myPeerId || 
                            (cleanUser && parsed.toPeerId && parsed.toPeerId.includes(cleanUser));

            if (isForMe && !isCallActive && !isIncoming) {
              console.log('[Cloud Signal] Incoming call request from:', parsed.callerName);
              const info: CallInfo = {
                peerId: parsed.fromPeerId,
                doctorName: parsed.callerName || 'Doctor',
                complaintId: parsed.complaintId || 0
              };
              setIncomingCallInfo(info);
              setIsIncoming(true);
              if (onIncomingCall) onIncomingCall(info);
              const stream = await getMedia();
              setLocalStream(stream);
            }
          }
        } catch {}
      };
    } catch {}

    return () => {
      if (sse) sse.close();
    };
  }, [myPeerId, isCallActive, isIncoming, onIncomingCall]);

  const triggerIncomingCall = useCallback((info: CallInfo) => {
    setIncomingCallInfo(info);
    setIsIncoming(true);
    if (onIncomingCall) onIncomingCall(info);
  }, [onIncomingCall]);

  const callPeer = useCallback(async (remotePeerId: string, complaintId: number | string, callerName?: string) => {
    const stream = await getMedia();
    setLocalStream(stream);

    // 1. Broadcast Cloud Signaling so receiver's modal rings unconditionally
    try {
      fetch(`https://ntfy.sh/${RELAY_TOPIC}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'CALL_SIGNAL',
          toPeerId: remotePeerId,
          fromPeerId: myPeerId,
          callerName: callerName || 'Doctor / Patient',
          complaintId
        })
      }).catch(() => {});
    } catch {}

    // 2. Direct WebRTC P2P Call via PeerJS
    if (peerRef.current && !peerRef.current.destroyed) {
      try {
        const call = peerRef.current.call(remotePeerId, stream, {
          metadata: { complaintId, doctorName: callerName || 'Doctor' }
        });
        if (call) {
          addRemoteStream(call);
        }
      } catch (err) {
        console.warn('[PeerJS] Direct call notice:', err);
      }
    }
    setIsCallActive(true);
  }, [myPeerId]);

  const answerCall = useCallback(async () => {
    const call = currentCallRef.current;
    const stream = localStream || await getMedia();
    setLocalStream(stream);

    if (call && stream) {
      try {
        call.answer(stream);
        addRemoteStream(call);
      } catch {}
    } else if (incomingCallInfo?.peerId && peerRef.current) {
      // Connect back to caller if direct answer was delayed
      try {
        const outCall = peerRef.current.call(incomingCallInfo.peerId, stream, {
          metadata: { complaintId: incomingCallInfo.complaintId, doctorName: 'Connected User' }
        });
        if (outCall) addRemoteStream(outCall);
      } catch {}
    }
    setIsIncoming(false);
    setIsCallActive(true);
  }, [localStream, incomingCallInfo]);

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
