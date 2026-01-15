import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/attendance',
})
export class AttendanceGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private sessionRooms: Map<string, Set<string>> = new Map();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Clean up from all rooms
    this.sessionRooms.forEach((clients, room) => {
      clients.delete(client.id);
    });
  }

  @SubscribeMessage('join_session')
  handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { attendanceSessionId: string },
  ) {
    const room = `session_${data.attendanceSessionId}`;
    client.join(room);

    if (!this.sessionRooms.has(room)) {
      this.sessionRooms.set(room, new Set());
    }
    this.sessionRooms.get(room)!.add(client.id);

    console.log(`Client ${client.id} joined room ${room}`);
    return { success: true, room };
  }

  @SubscribeMessage('leave_session')
  handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { attendanceSessionId: string },
  ) {
    const room = `session_${data.attendanceSessionId}`;
    client.leave(room);

    if (this.sessionRooms.has(room)) {
      this.sessionRooms.get(room)!.delete(client.id);
    }

    console.log(`Client ${client.id} left room ${room}`);
    return { success: true };
  }

  // Emit new QR token to all clients in the session room
  emitQrUpdate(attendanceSessionId: string, newToken: string) {
    const room = `session_${attendanceSessionId}`;
    this.server.to(room).emit('qr_updated', {
      attendanceSessionId,
      token: newToken,
      timestamp: Date.now(),
    });
  }

  // Emit when a student checks in
  emitCheckin(
    attendanceSessionId: string,
    data: {
      studentId: string;
      status: string;
      checkinTime: Date;
    },
  ) {
    const room = `session_${attendanceSessionId}`;
    this.server.to(room).emit('student_checked_in', {
      attendanceSessionId,
      ...data,
    });
  }

  // Emit session closed event
  emitSessionClosed(attendanceSessionId: string) {
    const room = `session_${attendanceSessionId}`;
    this.server.to(room).emit('session_closed', {
      attendanceSessionId,
      closedAt: new Date(),
    });
  }

  // Emit attendance stats update
  emitStatsUpdate(
    attendanceSessionId: string,
    stats: {
      total: number;
      present: number;
      late: number;
      absent: number;
    },
  ) {
    const room = `session_${attendanceSessionId}`;
    this.server.to(room).emit('stats_updated', {
      attendanceSessionId,
      stats,
    });
  }
}
