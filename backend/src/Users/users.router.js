// backend/users/users.routers.js
const express = require('express');
//import {verifyToken} from '../Auth/auth.middleware.js';
const userController = require('./users.controller');

const router = express.Router();

//Thinking of making it take in username as parameter 
router.get('/:id', userController.getUserProfile);
router.patch('/:id', userController.updateUserProfile);  // Change PUT to PATCH
router.delete('/:id', userController.deleteUserProfile);

router.get('/:id/watchlists', userController.getUserWatchlists);

module.exports = router;
