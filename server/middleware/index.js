import cors from 'cors';
import express from 'express';

export const setupMiddleware = (app) => {
  // Enhanced CORS for React app on port 5173
  app.use(cors({
    origin: ['http://localhost:5174','http://192.168.6.185:5173','http://vd.rmt.com:5173','http://localhost:5173','https://inquisitive-croquembouche-cef1a7.netlify.app'],
    credentials: true
  }));
  
  app.use(express.json());
};