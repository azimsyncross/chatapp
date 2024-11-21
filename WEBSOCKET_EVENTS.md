# WebSocket Events Documentation

## Connection
Connect to WebSocket server with authentication:
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

## Events

### User Status Events
1. `user:online`
   - Emitted when a user connects
   - Data: `{ userId, name }`

2. `user:offline`
   - Emitted when a user disconnects
   - Data: `{ userId, name }`

3. `user:typing`
   - Emitted when a user is typing
   - Data: `{ userId, name, isTyping, roomId }`

### Chat Events
1. `chat:join`
   - Client emits to join a chat room
   - Data: `roomId`

2. `chat:leave`
   - Client emits to leave a chat room
   - Data: `roomId`

3. `chat:message`
   - Client emits to send a message
   - Data: `{ roomId, message }`
   - Server responds with: `{ message, user: { _id, name }, timestamp }`

4. `chat:userJoined`
   - Server emits when user joins room
   - Data: `{ userId, name }`

5. `chat:userLeft`
   - Server emits when user leaves room
   - Data: `{ userId, name }`

### Authentication Events
1. `auth:sessionExpired`
   - Server emits when user needs to re-authenticate
   - Data: `{ message }`

### Moderator Events
1. `moderator:action`
   - Server emits when moderator takes action
   - Data: `{ action, moderator: { id, name }, timestamp }`

### Additional Chat Room Events

### Chat History Management
1. `chat:clean`
   - Moderator emits to clean chat history
   - Data: `{ roomId }`

2. `chat:cleaned`
   - Server emits to room when chat is cleaned
   - Data: `{ moderator: { id, name }, timestamp, imagesDeleted }`

3. `chat:cleanConfirmed`
   - Server emits to moderator when cleaning is complete
   - Data: `{ success: true, imagesDeleted }`

### Chat Room Management
1. `chatRoom:create`
   - Client emits to create a new chat room
   - Data: `{ name: string }`

2. `moderator:roomRequest`
   - Server emits to all moderators when new room is created
   - Data: `{ roomId, creator: { id, name }, roomName }`

3. `moderator:joinRoom`
   - Moderator emits to join a room
   - Data: `{ roomId }`

4. `moderator:joined`
   - Server emits to room when moderator joins
   - Data: `{ moderator: { id, name } }`

5. `moderator:roomTaken`
   - Server emits to other moderators when room is taken
   - Data: `{ roomId, moderator: { id, name } }`

### Chat Transfer Events
1. `moderator:initiateTransfer`
   - Moderator emits to initiate transfer
   - Data: `{ roomId, toModeratorId }`

2. `moderator:transferRequest`
   - Server emits to target moderator
   - Data: `{ roomId, from: { id, name }, roomName }`

3. `chat:transferring`
   - Server emits to room during transfer
   - Data: `{ from: string, timestamp: Date }`

4. `moderator:acceptTransfer`
   - Target moderator emits to accept transfer
   - Data: `{ roomId }`

5. `moderator:changed`
   - Server emits to room when transfer completes
   - Data: `{ newModerator: { id, name } }`

## Error Handling
```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

socket.on('error', (error) => {
  console.error('Socket error:', error.message);
});
```

## Best Practices
1. Always handle connection errors
2. Implement reconnection logic
3. Clean up event listeners when disconnecting
4. Use room-based communication for private messages
5. Implement typing indicators with debouncing 