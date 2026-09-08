// services/auth-service/src/controllers/authController.js
// Handles registration and login. Passwords are hashed with bcrypt before ever touching the database — the database never stores or sees a plaintext password. On successful login, issues a JWT that the gateway's auth.middleware.js will later verify on protected routes (order-service, payment-service).


const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { insertNewUser, findUserByEmail } = require('../models/user.model')
const { createServiceLogger } = require('../../../../shared/logger');


const logger = createServiceLogger('auth-service')
const SALT_ROUNDS = 10;

async function registerNewUser(req,res) {
    const { email, password , fullName } = req.body;
    if(!email || !password || !fullName){
        return res.status(400).json({ error: 'email, password, and fullName are required' });
    }
    try {
        const existingUser = await findUserByEmail(email);
        if(existingUser){
            return res.status(409).json({error:'A user with this email already exists'})
        }

        const passwordHash = await bcrypt.hash(password,SALT_ROUNDS);
        const createdUser = await insertNewUser({email, passwordHash, fullName });

        logger.info(`New user registered: ${email}`);
        return res.status(201).json({ user: createdUser });
    } catch (err) {
        logger.error(`registerNewUser failed: ${err.message}`);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


async function loginAndIssueToken(req,res) {
    const {email, password} = req.body;

    if(!email || !password){
        return res.status(400).json({error: 'email and password required'});
    }

    try {
        const existingUser  = await findUserByEmail(email);
        if(!existingUser ){
            return res.status(401).json({ error: 'Invalid email or password '})
        }

        const passwordMatches = await bcrypt.compare(password, existingUser.password_hash);
        if(!passwordMatches){
            return res.status(401).json({error:'Invalid email or password'});
        }

        const accessToken = jwt.sign(
            { userId:existingUser.id, email:existingUser.email},
            process.env.JWT_SECRET,
            {expiresIn:'2h'}
        );
        logger.info(`User logged in: ${email}`);
        return res.status(200).json({accessToken});

    } catch (err) {
        logger.error(`loginAndIssueToken failed: ${err.message}`);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { registerNewUser, loginAndIssueToken };