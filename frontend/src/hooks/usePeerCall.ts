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
      const uniqueId = attempt === 0 ? `medflow-${cleanUser}` : `medflow-${cleanUser}-${Math.random().toString(36).substring(2, 6)}`;

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
        console.log('[PeerJS] Online with ID:', id);
      });

      // Handle DataConnections for Instant Cross-Device P2P Sync
      peer.on('connection', (conn: any) => {
        conn.on('data', (data: any) => {
          if (data?.type === 'NEW_COMPLAINT' && data.complaint) {
            console.log('[P2P WebRTC] Received new consultation:', data.complaint);
            const raw = localStorage.getItem('medflow_shared_complaints');
            const existing = raw ? JSON.parse(raw) : [];
            const updated = [data.complaint, ...existing.filter((c: any) => String(c.id) !== String(data.complaint.id))];
            localStorage.setItem('medflow_shared_complaints', JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('medflow_p2p_sync'));
          } else if (data?.type === 'RESOLVE_COMPLAINT' && data.complaintId) {
            const raw = localStorage.getItem('medflow_shared_complaints');
            const existing = raw ? JSON.parse(raw) : [];
            const updated = existing.map((c: any) => String(c.id) === String(data.complaintId) ? { ...c, status: 'RESOLVED' } : c);
            localStorage.setItem('medflow_shared_complaints', JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('medflow_p2p_sync'));
          }
        });
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

  const triggerIncomingCall = useCallback((info: CallInfo) => {
    setIncomingCallInfo(info);
    setIsIncoming(true);
    if (onIncomingCall) onIncomingCall(info);
  }, [onIncomingCall]);

  const callPeer = useCallback(async (remotePeerId: string, complaintId: number | string, callerName?: string) => {
    const stream = await getMedia();
    setLocalStream(stream);

    if (peerRef.current && !peerRef.current.destroyed) {
      try {
        const call = peerRef.current.call(remotePeerId, stream, {
          metadata: { complaintId, doctorName: callerName || 'Doctor' }
        });
        if (call) {
          addRemoteStream(call);
        }
      } catch (err) {
        console.warn('[PeerJS] Call notice:', err);
      }
    }
    setIsCallActive(true);
  }, []);

  const answerCall = useCallback(async () => {
    const call = currentCallRef.current;
    const stream = localStream || await getMedia();
    setLocalStream(stream);

    if (call && stream) {
      try {
        call.answer(stream);
        addRemoteStream(call);
      } catch {}
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
