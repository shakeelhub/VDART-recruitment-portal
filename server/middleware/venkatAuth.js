import jwt from 'jsonwebtoken';

export const venkatAuth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-2024');
    
    if (!decoded.isVenkat) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    req.venkat = decoded;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};