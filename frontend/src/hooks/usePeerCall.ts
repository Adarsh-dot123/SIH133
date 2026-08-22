import { useRef, useState, useCallback } from 'react';

export interface CallInfo {
  peerId: string;
  doctorName: string;
  complaintId: number;
}

export interface UsePeerCallReturn {
  myPeerId: string | null;
  isCallActive: boolean;
  isIncoming: boolean;
  incomingCallInfo: CallInfo | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  initPeer: (userId: string) => void;
  callPeer: (remotePeerId: string, complaintId: number) => void;
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
      try { return await navigator.mediaDevices.getUserMedia({ video: false, audio: true }); }
      catch { return null; }
    }
  };

  const addRemoteStream = (call: any) => {
    call.on('stream', (stream: MediaStream) => {
      setRemoteStream(stream);
      setIsCallActive(true);
    });
    call.on('close', () => endCall());
    call.on('error', () => endCall());
    currentCallRef.current = call;
  };

  const initPeer = useCallback((userId: string) => {
    if (peerRef.current) return;
    import('peerjs').then(({ default: Peer }) => {
      const sanitizedId = `medflow-${userId.replace(/[^a-zA-Z0-9]/g, '')}`;
      const peer = new Peer(sanitizedId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
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

      peer.on('error', (err: any) => console.error('[PeerJS] error:', err));
    });
  }, [onIncomingCall]);

  const callPeer = useCallback(async (remotePeerId: string, complaintId: number) => {
    if (!peerRef.current) return;
    const stream = await getMedia();
    if (!stream) { alert('Camera/mic access required for video call.'); return; }
    setLocalStream(stream);
    const call = peerRef.current.call(remotePeerId, stream, {
      metadata: { complaintId }
    });
    addRemoteStream(call);
    setIsCallActive(true);
  }, []);

  const answerCall = useCallback(async () => {
    const call = currentCallRef.current;
    if (!call) return;
    const stream = localStream || await getMedia();
    if (!stream) { alert('Camera/mic access required.'); return; }
    setLocalStream(stream);
    call.answer(stream);
    addRemoteStream(call);
    setIsIncoming(false);
    setIsCallActive(true);
  }, [localStream]);

  const endCall = useCallback(() => {
    currentCallRef.current?.close();
    localStream?.getTracks().forEach(t => t.stop());
    remoteStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setIsCallActive(false);
    setIsIncoming(false);
    setIncomingCallInfo(null);
    currentCallRef.current = null;
  }, [localStream, remoteStream]);

  return { myPeerId, isCallActive, isIncoming, incomingCallInfo, localStream, remoteStream, initPeer, callPeer, answerCall, endCall };
}
