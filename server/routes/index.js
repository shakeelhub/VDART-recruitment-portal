import express from 'express';
import mongoose from 'mongoose';
import authRoutes from './auth.js';
import hrTagRoutes from './hrTag.js';
import itRoutes from './it.js';
import hrOpsRoutes from './hrOps.js';
import adminRoutes from './admin.js';
import ldRoutes from './ldRoutes.js';
import deliveryRoutes from './delivery.js';
import venkatRoutes from './venkat.js';
import emailRoutes from './email.js';

const router = express.Router();

// Root route
router.get('/', (req, res) => {
  res.json({
    message: 'VDart Portal Server Running!',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Auth routes
router.use('/api/auth', authRoutes);

// HR Tag routes
router.use('/api/hr-tag', hrTagRoutes);

// IT Team routes
router.use('/api/it', itRoutes);

// HR Ops routes
router.use('/api/hr-ops', hrOpsRoutes);

// Admin routes
router.use('/api/admin', adminRoutes);

// L&D routes
router.use('/api/ld', ldRoutes);

// Delivery routes
router.use('/api/delivery', deliveryRoutes);

// Venkat routes
router.use('/api/venkat', venkatRoutes);

// Email routes (Updated path)
router.use('/api/email', emailRoutes);

export default router;