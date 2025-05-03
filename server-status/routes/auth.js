/**
 * Auth routes for IoT Systems Labs Mock Server
 */
const express = require('express');
const router = express.Router();

// Login endpoint
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required'
    });
  }
  
  // Simple mock authentication
  if (username === 'admin' && password === 'password') {
    res.json({
      success: true,
      token: 'mock-jwt-token',
      user: {
        id: 1,
        username: 'admin',
        name: 'Admin User',
        role: 'admin'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });
  }
});

module.exports = router;