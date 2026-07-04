import { io, Socket } from 'socket.io-client'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9691'

let socket: Socket | null = null

export function getRealtimeSocket(): Socket {
  if (!socket) {
    socket = io(`${API_BASE_URL}/realtime`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: false,
    })
  }
  return socket
}

export function disconnectRealtimeSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
