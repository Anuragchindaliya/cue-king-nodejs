import { Router } from 'express';
import { protect } from '../../middlewares/auth.middleware';
import {
  createLobby,
  joinLobby,
  getLobbyEvents,
  castVote,
  sendMessage,
  toggleLock,
  finalizeBooking,
  paymentSuccess
} from './lobby.controller';

const router = Router();

// Host creates a lobby
router.post('/create', protect, createLobby);

// Guest or User joins lobby
router.post('/:lobbyId/join', joinLobby);

// SSE stream of lobby events
router.get('/:lobbyId/events', protect, getLobbyEvents);

// Cast or withdraw a vote
router.post('/:lobbyId/vote', protect, castVote);

// Send message in lobby chat
router.post('/:lobbyId/message', protect, sendMessage);

// Host toggles parameter locks
router.post('/:lobbyId/lock', protect, toggleLock);

// Host finalizes booking (initiates payment)
router.post('/:lobbyId/finalize', protect, finalizeBooking);

// Simulates payment gateway success confirmation
router.post('/:lobbyId/payment-success', paymentSuccess);

export default router;
