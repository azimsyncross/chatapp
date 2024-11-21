# Chat & Order System Documentation

## Overview
This system provides real-time chat functionality integrated with an order management system, using Socket.IO for real-time communication and Pusher for additional real-time features.

## Table of Contents
1. [Order Management](#order-management)
2. [Chat System](#chat-system)
3. [Real-time Features](#real-time-features)
4. [Moderator Functions](#moderator-functions)
5. [WebSocket Events](#websocket-events)
6. [Client Implementation Guide](#client-implementation-guide)

## Order Management

### Creating an Order
```javascript
// POST /api/orders
{
  "exchangeMethod": "exchange_method_id",
  "amount": 100,
  "notes": "Optional notes"
}
```
Response:
```javascript
{
  "success": true,
  "data": {
    "order": {
      "_id": "order_id",
      "status": "pending",
      // ... other order details
    },
    "chatRoomId": "chat_room_id"
  }
}
```

### Order Status Flow
1. `pending` - Initial state when order is created
2. `processing` - When moderator accepts the order
3. `completed` - Order successfully processed
4. `cancelled` - User cancelled the order
5. `rejected` - Moderator rejected the order

### Viewing Orders
```javascript
// GET /api/orders/my-orders - Get user's orders
// GET /api/orders/my-orders/:status - Filter by status
// GET /api/orders/all - For moderators
```

## Chat System

### Connection Setup
```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'your_jwt_token' }
});

// Handle connection
socket.on('connect', () => {
  console.log('Connected to chat server');
});

// Handle errors
socket.on('error', (error) => {
  console.error('Chat error:', error.message);
});
```

### Joining Chat Room
```javascript
// Join a chat room
socket.emit('chat:join', { 
  roomId: 'room_id',
  orderId: 'order_id'
});

// Listen for join confirmation
socket.on('chat:userJoined', (data) => {
  console.log(`${data.name} joined the chat`);
});
```

### Sending Messages
```javascript
// Text message
socket.emit('chat:message', {
  roomId: 'room_id',
  message: 'Hello, world!'
});

// Image message
socket.emit('chat:image', {
  roomId: 'room_id',
  file: imageFile // File object
});

// Listen for messages
socket.on('chat:message', (message) => {
  console.log('New message:', message);
});
```

### Typing Indicators
```javascript
// Emit typing status
socket.emit('chat:typing', {
  roomId: 'room_id',
  isTyping: true
});

// Listen for typing status
socket.on('user:typing', (data) => {
  console.log(`${data.name} is ${data.isTyping ? 'typing' : 'stopped typing'}`);
});
```

## Moderator Functions

### Accepting Orders
```javascript
socket.emit('moderator:accept', {
  roomId: 'room_id'
});

// Listen for moderator assignment
socket.on('moderator:joined', (data) => {
  console.log(`Moderator ${data.moderator.name} assigned`);
});
```

### Transferring Chat
```javascript
// Initiate transfer
socket.emit('moderator:initiateTransfer', {
  roomId: 'room_id',
  toModeratorId: 'moderator_id'
});

// Accept transfer (as target moderator)
socket.emit('moderator:acceptTransfer', {
  roomId: 'room_id'
});

// Listen for transfer events
socket.on('chat:transferring', (data) => {
  console.log(`Chat being transferred from ${data.from}`);
});

socket.on('moderator:changed', (data) => {
  console.log(`New moderator: ${data.newModerator.name}`);
});
```

### Cleaning Chat History
```javascript
socket.emit('chat:clean', {
  roomId: 'room_id'
});

socket.on('chat:cleaned', (data) => {
  console.log(`Chat cleaned by ${data.moderator.name}`);
  console.log(`${data.imagesDeleted} images deleted`);
});
```

## Real-time Notifications

### Pusher Events
```javascript
const pusher = new Pusher('your_key', {
  cluster: 'your_cluster'
});

// Subscribe to channels
const orderChannel = pusher.subscribe(`order-${orderId}`);
const moderatorChannel = pusher.subscribe('moderator-channel');

// Listen for events
orderChannel.bind('status-updated', (data) => {
  console.log(`Order status changed to ${data.status}`);
});

moderatorChannel.bind('new-order-chat', (data) => {
  console.log('New order received:', data);
});
```

### Status Updates
```javascript
socket.emit('order:updateStatus', {
  roomId: 'room_id',
  status: 'completed',
  notes: 'Optional notes'
});

// Listen for status updates
socket.on('order:statusUpdated', (data) => {
  console.log(`Order ${data.orderId} status: ${data.status}`);
});
```

## Client Implementation Guide

### Initial Setup
1. Connect to WebSocket server
2. Subscribe to Pusher channels
3. Set up event listeners

### Order Flow
1. Create order via REST API
2. Join created chat room
3. Wait for moderator assignment
4. Handle real-time updates

### Chat Flow
1. Join chat room
2. Handle message types (text/image)
3. Implement typing indicators
4. Handle moderator actions

### Error Handling
```javascript
// Socket.IO errors
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

// Pusher errors
channel.bind('pusher:error', (error) => {
  console.error('Pusher error:', error);
});
```

## Best Practices

1. Connection Management
   - Implement reconnection logic
   - Handle connection errors
   - Clean up event listeners

2. Message Handling
   - Implement message queuing
   - Handle failed message delivery
   - Cache messages locally

3. Image Upload
   - Validate file size and type
   - Show upload progress
   - Handle upload failures

4. Status Synchronization
   - Keep local state in sync
   - Handle offline scenarios
   - Implement retry mechanisms

5. Security
   - Always verify token expiration
   - Validate user permissions
   - Sanitize message content

## Rate Limits and Restrictions
- Maximum image size: 5MB
- Supported image formats: JPG, PNG, GIF
- Typing indicator debounce: 3 seconds
- Message cache duration: 5 minutes 