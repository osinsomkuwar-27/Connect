import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { Badge, IconButton, TextField } from '@mui/material';
import { Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import styles from '../styles/videoComponent.module.css';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import server from '../environment';

// ── Module-level peer connection map ─────────────────────────────────────────
// Keyed by remote socketId → RTCPeerConnection
var connections = {};

const peerConfigConnections = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Free TURN server for when STUN alone is blocked (symmetric NAT)
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
    ],
};

// ── Helper: create a black silent MediaStream placeholder ────────────────────
// Used when local media isn't ready yet so we can still send a track to peers.
function createBlackSilence() {
    // black video track
    const canvas = Object.assign(document.createElement('canvas'), {
        width: 640,
        height: 480,
    });
    canvas.getContext('2d').fillRect(0, 0, 640, 480);
    const videoTrack = Object.assign(canvas.captureStream().getVideoTracks()[0], {
        enabled: false,
    });

    // silent audio track
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    const audioTrack = Object.assign(dst.stream.getAudioTracks()[0], {
        enabled: false,
    });

    return new MediaStream([videoTrack, audioTrack]);
}

// ── Component ────────────────────────────────────────────────────────────────
export default function VideoMeetComponent() {
    const socketRef    = useRef(null);
    const socketIdRef  = useRef(null);
    const localVideoref = useRef(null);
    // videoRef mirrors the videos state so event-handler closures can read
    // the current list without stale closure issues.
    const videoRef = useRef([]);

    const [videoAvailable, setVideoAvailable] = useState(true);
    const [audioAvailable, setAudioAvailable] = useState(true);
    const [video,          setVideo]          = useState(true);
    const [audio,          setAudio]          = useState(true);
    const [screen,         setScreen]         = useState(false);
    const [showModal,      setModal]          = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(false);
    const [messages,       setMessages]       = useState([]);
    const [message,        setMessage]        = useState('');
    const [newMessages,    setNewMessages]    = useState(0);   // fixed: was 3
    const [askForUsername, setAskForUsername] = useState(true);
    const [username,       setUsername]       = useState('');
    const [videos,         setVideos]         = useState([]);

    // ── On mount: request camera/mic permissions ──────────────────────────
    useEffect(() => {
        getPermissions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── After username submitted: attach local stream to preview video ────
    useEffect(() => {
        if (!askForUsername && localVideoref.current && window.localStream) {
            localVideoref.current.srcObject = window.localStream;
        }
    }, [askForUsername]);

    // ── Screen share toggled ──────────────────────────────────────────────
    useEffect(() => {
        if (screen) {
            getDisplayMedia();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [screen]);

    // ─────────────────────────────────────────────────────────────────────
    // getPermissions — ask for camera + mic on page load
    // ─────────────────────────────────────────────────────────────────────
    const getPermissions = async () => {
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                setVideoAvailable(false);
                setAudioAvailable(false);
                setScreenAvailable(false);
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            const hasVideo = stream.getVideoTracks().length > 0;
            const hasAudio = stream.getAudioTracks().length > 0;

            setVideoAvailable(hasVideo);
            setAudioAvailable(hasAudio);
            setVideo(hasVideo);
            setAudio(hasAudio);
            setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

            window.localStream = stream;
            if (localVideoref.current) {
                localVideoref.current.srcObject = stream;
            }
        } catch (err) {
            console.warn('getPermissions error:', err);
            setVideoAvailable(false);
            setAudioAvailable(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────
    // addTracksToPeer — replaces deprecated addStream()
    // Adds every track from the given MediaStream to the RTCPeerConnection.
    // ─────────────────────────────────────────────────────────────────────
    const addTracksToPeer = (pc, stream) => {
        stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
        });
    };

    // ─────────────────────────────────────────────────────────────────────
    // replaceTracksOnPeer — replaces deprecated addStream() for renegotiation
    // Replaces existing senders' tracks with those from the new stream.
    // ─────────────────────────────────────────────────────────────────────
    const replaceTracksOnPeer = async (pc, stream) => {
        const senders = pc.getSenders();
        const tracks  = stream.getTracks();

        for (const track of tracks) {
            const sender = senders.find((s) => s.track && s.track.kind === track.kind);
            if (sender) {
                await sender.replaceTrack(track).catch((e) => console.warn(e));
            } else {
                pc.addTrack(track, stream);
            }
        }
    };

    // ─────────────────────────────────────────────────────────────────────
    // getUserMediaSuccess — called after user grants a new stream
    // (e.g., re-toggling camera or mic)
    // ─────────────────────────────────────────────────────────────────────
    const getUserMediaSuccess = async (stream) => {
        // Stop the old tracks cleanly
        try {
            window.localStream?.getTracks().forEach((t) => t.stop());
        } catch (e) {
            console.warn(e);
        }

        window.localStream = stream;
        if (localVideoref.current) {
            localVideoref.current.srcObject = stream;
        }

        // Renegotiate with every connected peer
        for (const id in connections) {
            if (id === socketIdRef.current) continue;

            await replaceTracksOnPeer(connections[id], stream);

            const description = await connections[id].createOffer();
            await connections[id].setLocalDescription(description);
            socketRef.current.emit(
                'signal',
                id,
                JSON.stringify({ sdp: connections[id].localDescription })
            );
        }

        // Handle tracks ending (e.g., user unplugs camera)
        stream.getTracks().forEach((track) => {
            track.onended = async () => {
                setVideo(false);
                setAudio(false);

                try {
                    localVideoref.current?.srcObject
                        ?.getTracks()
                        .forEach((t) => t.stop());
                } catch (e) {
                    console.warn(e);
                }

                const silence = createBlackSilence();
                window.localStream = silence;
                if (localVideoref.current) {
                    localVideoref.current.srcObject = silence;
                }

                for (const id in connections) {
                    await replaceTracksOnPeer(connections[id], silence);

                    const description = await connections[id].createOffer();
                    await connections[id].setLocalDescription(description);
                    socketRef.current.emit(
                        'signal',
                        id,
                        JSON.stringify({ sdp: connections[id].localDescription })
                    );
                }
            };
        });
    };

    // ─────────────────────────────────────────────────────────────────────
    // getUserMedia — refresh stream when video/audio toggles change
    // ─────────────────────────────────────────────────────────────────────
    const getUserMedia = () => {
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices
                .getUserMedia({ video, audio })
                .then(getUserMediaSuccess)
                .catch((e) => console.warn(e));
        } else {
            try {
                localVideoref.current?.srcObject?.getTracks().forEach((t) => t.stop());
            } catch (e) {
                console.warn(e);
            }
        }
    };

    // ─────────────────────────────────────────────────────────────────────
    // getDisplayMedia / getDisplayMediaSuccess — screen sharing
    // ─────────────────────────────────────────────────────────────────────
    const getDisplayMedia = () => {
        if (!navigator.mediaDevices.getDisplayMedia) return;

        navigator.mediaDevices
            .getDisplayMedia({ video: true, audio: true })
            .then(getDisplayMediaSuccess)
            .catch((e) => {
                console.warn('getDisplayMedia error:', e);
                setScreen(false);
            });
    };

    const getDisplayMediaSuccess = async (stream) => {
        try {
            window.localStream?.getTracks().forEach((t) => t.stop());
        } catch (e) {
            console.warn(e);
        }

        window.localStream = stream;
        if (localVideoref.current) {
            localVideoref.current.srcObject = stream;
        }

        for (const id in connections) {
            if (id === socketIdRef.current) continue;

            await replaceTracksOnPeer(connections[id], stream);

            const description = await connections[id].createOffer();
            await connections[id].setLocalDescription(description);
            socketRef.current.emit(
                'signal',
                id,
                JSON.stringify({ sdp: connections[id].localDescription })
            );
        }

        stream.getTracks().forEach((track) => {
            track.onended = async () => {
                setScreen(false);

                try {
                    localVideoref.current?.srcObject?.getTracks().forEach((t) => t.stop());
                } catch (e) {
                    console.warn(e);
                }

                // Fall back to camera after screen share ends
                getUserMedia();
            };
        });
    };

    // ─────────────────────────────────────────────────────────────────────
    // gotMessageFromServer — handles incoming SDP + ICE from a peer
    // ─────────────────────────────────────────────────────────────────────
    const gotMessageFromServer = (fromId, message) => {
        const signal = JSON.parse(message);

        if (fromId === socketIdRef.current) return;

        const pc = connections[fromId];
        if (!pc) {
            console.warn('gotMessageFromServer: no peer connection for', fromId);
            return;
        }

        if (signal.sdp) {
            pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
                .then(() => {
                    if (signal.sdp.type === 'offer') {
                        return pc
                            .createAnswer()
                            .then((description) => pc.setLocalDescription(description))
                            .then(() => {
                                socketRef.current.emit(
                                    'signal',
                                    fromId,
                                    JSON.stringify({ sdp: pc.localDescription })
                                );
                            });
                    }
                })
                .catch((e) => console.warn('setRemoteDescription error:', e));
        }

        if (signal.ice) {
            pc.addIceCandidate(new RTCIceCandidate(signal.ice)).catch((e) =>
                console.warn('addIceCandidate error:', e)
            );
        }
    };

    // ─────────────────────────────────────────────────────────────────────
    // handleRemoteTrack — replaces deprecated onaddstream
    // Fires whenever a remote peer adds a track to the connection.
    // ─────────────────────────────────────────────────────────────────────
    const handleRemoteTrack = (socketListId, event) => {
        // event.streams[0] is the remote MediaStream
        const remoteStream = event.streams[0];
        if (!remoteStream) return;

        const existing = videoRef.current.find((v) => v.socketId === socketListId);

        if (existing) {
            setVideos((prev) => {
                const updated = prev.map((v) =>
                    v.socketId === socketListId
                        ? { ...v, stream: remoteStream }
                        : v
                );
                videoRef.current = updated;
                return updated;
            });
        } else {
            const newVideo = {
                socketId: socketListId,
                stream: remoteStream,
                autoplay: true,
                playsinline: true,
            };
            setVideos((prev) => {
                const updated = [...prev, newVideo];
                videoRef.current = updated;
                return updated;
            });
        }
    };

    // ─────────────────────────────────────────────────────────────────────
    // connectToSocketServer — initialise Socket.IO + all event handlers
    // ─────────────────────────────────────────────────────────────────────
    const connectToSocketServer = () => {
        // Remove `secure: false` — on Render (HTTPS) the browser MUST use WSS.
        // Socket.IO auto-selects wss:// when the page is served over HTTPS.
        socketRef.current = io(server, {
            transports: ['websocket', 'polling'],
        });

        socketRef.current.on('signal', gotMessageFromServer);

        socketRef.current.on('connect', () => {
            // Store our own socket ID immediately
            socketIdRef.current = socketRef.current.id;

            // Join the room using the URL path (e.g. /abc123) as the key.
            // Using only the pathname avoids mismatches between http/https
            // or between different frontend deploy URLs.
            const roomId = window.location.pathname;
            socketRef.current.emit('join-call', roomId);

            socketRef.current.on('chat-message', addMessage);

            socketRef.current.on('user-left', (id) => {
                // Clean up the peer connection
                if (connections[id]) {
                    connections[id].close();
                    delete connections[id];
                }
                setVideos((prev) => {
                    const updated = prev.filter((v) => v.socketId !== id);
                    videoRef.current = updated;
                    return updated;
                });
            });

            // ── user-joined ──────────────────────────────────────────────
            // `id`      = the socket that just joined (may be us or a peer)
            // `clients` = current list of ALL sockets in the room (including us)
            socketRef.current.on('user-joined', (id, clients) => {
                // Build / refresh a RTCPeerConnection for every client in the room
                clients.forEach((socketListId) => {
                    // Don't duplicate existing connections
                    if (connections[socketListId]) return;

                    const pc = new RTCPeerConnection(peerConfigConnections);
                    connections[socketListId] = pc;

                    // ICE candidates → relay via signalling server
                    pc.onicecandidate = (event) => {
                        if (event.candidate) {
                            socketRef.current.emit(
                                'signal',
                                socketListId,
                                JSON.stringify({ ice: event.candidate })
                            );
                        }
                    };

                    // ── ontrack replaces deprecated onaddstream ──────────
                    pc.ontrack = (event) => {
                        handleRemoteTrack(socketListId, event);
                    };

                    // Add our local tracks to the new peer connection.
                    // Fall back to a black/silent placeholder if we don't have a stream yet.
                    const streamToSend =
                        window.localStream ?? createBlackSilence();
                    if (!window.localStream) {
                        window.localStream = streamToSend;
                    }
                    addTracksToPeer(pc, streamToSend);
                });

                // Only the newly arrived client creates offers to all existing peers.
                // This prevents duplicate offer/answer races.
                if (id === socketIdRef.current) {
                    for (const id2 in connections) {
                        if (id2 === socketIdRef.current) continue;

                        const pc = connections[id2];

                        pc.createOffer()
                            .then((description) => pc.setLocalDescription(description))
                            .then(() => {
                                // Use the captured `pc` reference — NOT connections[id2] —
                                // to avoid the no-loop-func unsafe closure warning.
                                socketRef.current.emit(
                                    'signal',
                                    id2,
                                    JSON.stringify({ sdp: pc.localDescription })
                                );
                            })
                            .catch((e) => console.warn('createOffer error:', e));
                    }
                }
            });
        });

        socketRef.current.on('connect_error', (err) => {
            console.error('Socket.IO connect_error:', err.message);
        });
    };

    // ─────────────────────────────────────────────────────────────────────
    // Track enable/disable helpers
    // ─────────────────────────────────────────────────────────────────────
    const toggleTrackEnabled = (kind, enabled) => {
        if (!window.localStream) return;
        const track = window.localStream
            .getTracks()
            .find((t) => t.kind === kind);
        if (track) track.enabled = enabled;
    };

    const handleVideo = () => {
        setVideo((prev) => {
            toggleTrackEnabled('video', !prev);
            return !prev;
        });
    };

    const handleAudio = () => {
        setAudio((prev) => {
            toggleTrackEnabled('audio', !prev);
            return !prev;
        });
    };

    const handleScreen = () => {
        setScreen((prev) => !prev);
    };

    const handleEndCall = () => {
        try {
            // Stop all local tracks
            window.localStream?.getTracks().forEach((t) => t.stop());
            // Close all peer connections
            Object.values(connections).forEach((pc) => pc.close());
            connections = {};
            // Disconnect socket
            socketRef.current?.disconnect();
        } catch (e) {
            console.warn(e);
        }
        window.location.href = '/';
    };

    // ─────────────────────────────────────────────────────────────────────
    // Chat
    // ─────────────────────────────────────────────────────────────────────
    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prev) => [...prev, { sender, data }]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prev) => prev + 1);
        }
    };

    const sendMessage = () => {
        if (!message.trim()) return;
        socketRef.current.emit('chat-message', message, username);
        setMessage('');
    };

    const handleChatOpen = () => {
        setModal(true);
        setNewMessages(0);
    };

    // ─────────────────────────────────────────────────────────────────────
    // Entry: user clicks "Connect" in the lobby
    // ─────────────────────────────────────────────────────────────────────
    const connect = () => {
        setAskForUsername(false);
        // Give React one tick to re-render before we touch the DOM
        setTimeout(() => {
            setVideo(videoAvailable);
            setAudio(audioAvailable);
            connectToSocketServer();
        }, 0);
    };

    // ─────────────────────────────────────────────────────────────────────
    // JSX
    // ─────────────────────────────────────────────────────────────────────
    return (
        <div>
            {askForUsername ? (
                /* ── LOBBY ─────────────────────────────────────────────── */
                <div className={styles.lobbyContainer}>
                    <h2>Enter into Lobby</h2>
                    <TextField
                        id="lobby-username"
                        label="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        variant="outlined"
                        size="small"
                        fullWidth
                        sx={{ maxWidth: '320px' }}
                        onKeyDown={(e) => e.key === 'Enter' && connect()}
                    />
                    <Button
                        variant="contained"
                        onClick={connect}
                        fullWidth
                        sx={{ maxWidth: '320px' }}
                        disabled={!username.trim()}
                    >
                        Connect
                    </Button>

                    <video ref={localVideoref} autoPlay muted playsInline />
                </div>
            ) : (
                /* ── MEETING ROOM ──────────────────────────────────────── */
                <div className={styles.meetVideoContainer}>

                    {/* Chat panel */}
                    {showModal && (
                        <div className={styles.chatRoom}>
                            <div className={styles.chatContainer}>
                                <h1>Chat</h1>

                                <div className={styles.chattingDisplay}>
                                    {messages.length !== 0 ? (
                                        messages.map((item, index) => (
                                            <div style={{ marginBottom: '20px' }} key={index}>
                                                <p style={{ fontWeight: 'bold' }}>{item.sender}</p>
                                                <p>{item.data}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p>No Messages Yet</p>
                                    )}
                                </div>

                                <div className={styles.chattingArea}>
                                    <TextField
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                        id="chat-input"
                                        label="Enter your message"
                                        variant="outlined"
                                        size="small"
                                    />
                                    <Button variant="contained" onClick={sendMessage}>
                                        Send
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Control bar */}
                    <div className={styles.buttonContainers}>
                        <IconButton onClick={handleVideo} style={{ color: 'white' }}>
                            {video ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>

                        <IconButton onClick={handleEndCall} style={{ color: 'red' }}>
                            <CallEndIcon />
                        </IconButton>

                        <IconButton onClick={handleAudio} style={{ color: 'white' }}>
                            {audio ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>

                        {screenAvailable && (
                            <IconButton onClick={handleScreen} style={{ color: 'white' }}>
                                {screen ? <ScreenShareIcon /> : <StopScreenShareIcon />}
                            </IconButton>
                        )}

                        <Badge badgeContent={newMessages} max={999} color="warning">
                            <IconButton
                                onClick={handleChatOpen}
                                style={{ color: 'white' }}
                            >
                                <ChatIcon />
                            </IconButton>
                        </Badge>
                    </div>

                    {/* Local (PiP) video */}
                    <video
                        className={styles.meetUserVideo}
                        ref={localVideoref}
                        autoPlay
                        muted
                        playsInline
                    />

                    {/* Remote videos */}
                    <div className={styles.conferenceView}>
                        {videos.map((v) => (
                            <div key={v.socketId}>
                                <video
                                    data-socket={v.socketId}
                                    ref={(ref) => {
                                        if (ref && v.stream) {
                                            ref.srcObject = v.stream;
                                        }
                                    }}
                                    autoPlay
                                    playsInline
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}