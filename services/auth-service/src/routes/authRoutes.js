// services/auth-service/src/routes/authRoutes.js
// Maps HTTP verbs + paths to controller functions. Kept intentionally thin —
// all real logic lives in authController.js, this file is pure wiring.

const express = require('express');
const { registerNewUser, loginAndIssueToken } = require('../controllers/authController');

const router = express.Router();

router.post('/register', registerNewUser);
router.post('/login', loginAndIssueToken);

module.exports = router;