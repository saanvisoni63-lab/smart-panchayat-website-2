

require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const https = require('https');
const http = require('http');
const fs = require('fs');

// Models
const User = require('./User');
const Admin = require('./Admin');
const Application = require('./Application');
const SchemeStats = require('./SchemeStats');
const Complaint = require('./Complaint');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ----- Database setup (MongoDB) -----
function normalizeMongoUri(value) {
  if (typeof value !== 'string') return '';
  let v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  if (v && !(v.startsWith('mongodb://') || v.startsWith('mongodb+srv://'))) {
    // If an env var is set but malformed (common: extra prefix, copied value, etc),
    // ignore it and fall back to local default to avoid crashing the process.
    return '';
  }
  return v;
}

const MONGODB_URI = normalizeMongoUri(process.env.MONGODB_URI) || 'mongodb+srv://shaanuu08_db_user:Saanvi123@cluster0.zy6q12e.mongodb.net/?appName=Cluster0';

async function connectToMongoWithRetry() {
  const retryMs = Number(process.env.MONGO_RETRY_MS || 10_000);

  while (true) {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connected to MongoDB');
      return;
    } catch (err) {
      console.error('❌ MongoDB connection error:', err?.message || err);
      console.error(`Retrying MongoDB connection in ${retryMs}ms...`);
      await new Promise((r) => setTimeout(r, retryMs));
    }
  }
}

// Don't crash the entire service if MongoDB is temporarily unavailable (common on deploy).
connectToMongoWithRetry().catch((err) => {
  console.error('❌ Unexpected MongoDB connection loop error:', err?.message || err);
});

// ----- Middleware -----
app.use(express.json());

// Serve frontend files (index.html, script.js, style.css) from project root
app.use(express.static(__dirname));

// ----- Email setup (Nodemailer) -----
const SMTP_HOST = (process.env.SMTP_HOST || '').trim();
const SMTP_PORT = Number(process.env.SMTP_PORT);
const SMTP_USER = (process.env.SMTP_USER || '').trim();
const SMTP_PASS = process.env.SMTP_PASS || '';

const transporter =
  SMTP_HOST && Number.isFinite(SMTP_PORT) && SMTP_PORT > 0 && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: false, // must be false for 587
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    : null;

// ----- SMS setup (Simple HTTP-based) -----
// Supports multiple easy SMS providers or test mode
const SMS_MODE = process.env.SMS_MODE || 'test'; // 'test', 'textlocal', 'msg91', or 'custom'

if (SMS_MODE === 'test') {
  console.log('📱 SMS Mode: TEST (SMS will be logged to console and saved to sms_logs.txt)');
} else {
  console.log(`📱 SMS Mode: ${SMS_MODE.toUpperCase()}`);
  if (SMS_MODE === 'textlocal' && !process.env.TEXTLOCAL_API_KEY) {
    console.warn('⚠️  TEXTLOCAL_API_KEY not set; SMS will use test mode');
  } else if (SMS_MODE === 'msg91' && !process.env.MSG91_AUTH_KEY) {
    console.warn('⚠️  MSG91_AUTH_KEY not set; SMS will use test mode');
  }
}

// Utility: send email (non-fatal on error)
async function sendLoginEmail({ to, username }) {
  if (!transporter) return;

  const mailOptions = {
    from: process.env.MAIL_FROM || SMTP_USER,
    to,
    subject: 'Login Alert - Smart Panchayat',
    text: `Dear ${username},\n\nYou have successfully logged in to Smart Panchayat.\n\nIf this was not you, please contact your administrator immediately.\n\nThank you,\nSmart Panchayat Team`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Login email sent successfully to ${to}`);
  } catch (err) {
    console.error('Error sending login email:', err);
  }
}

// Utility: send application registration email
async function sendApplicationRegistrationEmail({ to, username, scheme, details }) {
  if (!transporter) return;
  const detailsStr = Object.entries(details || {}).filter(([k]) => k !== 'user').map(([k, v]) => `- ${k}: ${v}`).join('\n');
  const mailOptions = {
    from: process.env.MAIL_FROM || SMTP_USER,
    to,
    subject: `Application Submitted - ${scheme}`,
    text: `Dear ${username},\n\nYour application for '${scheme}' has been successfully submitted.\n\nHere are the details you provided:\n${detailsStr}\n\nYou can track the status in your dashboard.\n\nThank you,\nSmart Panchayat Team`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Registration email sent successfully to ${to}`);
  } catch (err) {
    console.error('Error sending registration email:', err);
  }
}

// Utility: send application status email
async function sendApplicationStatusEmail({ to, username, scheme, status, adminRemark }) {
  if (!transporter) return;
  let remarkText = adminRemark ? `\n\nAdmin Remark: ${adminRemark}` : '';
  const mailOptions = {
    from: process.env.MAIL_FROM || SMTP_USER,
    to,
    subject: `Application Status Updated - ${scheme}`,
    text: `Dear ${username},\n\nThe status of your application for '${scheme}' has been updated to: ${status}.${remarkText}\n\nYou can view more details in your user dashboard.\n\nThank you,\nSmart Panchayat Team`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Status email sent successfully to ${to}`);
  } catch (err) {
    console.error('Error sending status email:', err);
  }
}

// Utility: send password reset email (used by forgot-password route)
async function sendPasswordResetEmail({ to, username }) {
  if (!transporter) return;

  const mailOptions = {
    from: process.env.MAIL_FROM || SMTP_USER,
    to,
    subject: 'Password Changed - Smart Panchayat',
    text: `Dear ${username},\n\nYour password has been successfully reset as requested.\n\nThank you,\nSmart Panchayat Team`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent successfully to ${to}`);
  } catch (err) {
    console.error('Error sending password reset email:', err);
  }
}

// Utility: send SMS (simple HTTP-based, supports multiple providers)
async function sendLoginSMS({ to, username }) {
  const message = `Smart Panchayat: Hello ${username}, you have successfully logged in.`;

  // Test mode: Just log the SMS
  if (SMS_MODE === 'test') {
    const logEntry = `[${new Date().toISOString()}] SMS to ${to}: ${message}\n`;
    console.log(`📱 [TEST MODE] SMS would be sent:`);
    console.log(`   To: ${to}`);
    console.log(`   Message: ${message}`);

    // Also save to file for reference
    try {
      fs.appendFileSync('sms_logs.txt', logEntry);
    } catch (e) {
      // Ignore file write errors
    }
    return;
  }

  // TextLocal (India - Easy setup: https://www.textlocal.in/)
  if (SMS_MODE === 'textlocal' && process.env.TEXTLOCAL_API_KEY) {
    try {
      const sender = process.env.TEXTLOCAL_SENDER || 'TXTLCL';
      const apiKey = process.env.TEXTLOCAL_API_KEY;
      // Remove + from phone number for TextLocal
      const phone = to.replace(/^\+/, '');
      const url = `https://api.textlocal.in/send/?apikey=${encodeURIComponent(apiKey)}&numbers=${encodeURIComponent(phone)}&message=${encodeURIComponent(message)}&sender=${encodeURIComponent(sender)}`;

      const response = await new Promise((resolve, reject) => {
        https.get(url, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve({ json: () => JSON.parse(data), ok: res.statusCode === 200 });
            } catch (e) {
              reject(e);
            }
          });
        }).on('error', reject);
      });
      const data = await response.json();

      if (data.status === 'success') {
        console.log(`✅ SMS sent successfully to ${to} via TextLocal`);
      } else {
        console.error(`❌ TextLocal SMS error: ${data.errors?.[0]?.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(`❌ Error sending SMS via TextLocal:`, err.message);
    }
    return;
  }

  // MSG91 (India - Easy setup: https://msg91.com/)
  if (SMS_MODE === 'msg91' && process.env.MSG91_AUTH_KEY) {
    try {
      const authKey = process.env.MSG91_AUTH_KEY;
      const sender = process.env.MSG91_SENDER || 'SMSPAN';
      const phone = to.replace(/^\+91/, '91').replace(/^\+/, ''); // MSG91 format

      const url = 'https://api.msg91.com/api/v2/sendsms';
      const payload = JSON.stringify({
        sender: sender,
        route: '4', // Transactional route
        country: '91',
        sms: [{
          message: message,
          to: [phone]
        }]
      });

      const response = await new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
          hostname: urlObj.hostname,
          path: urlObj.pathname + urlObj.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'authkey': authKey,
            'Content-Length': Buffer.byteLength(payload)
          }
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve({ json: () => JSON.parse(data), ok: res.statusCode === 200 });
            } catch (e) {
              reject(e);
            }
          });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
      });

      const data = await response.json();
      if (data.type === 'success') {
        console.log(`✅ SMS sent successfully to ${to} via MSG91`);
      } else {
        console.error(`❌ MSG91 SMS error: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(`❌ Error sending SMS via MSG91:`, err.message);
    }
    return;
  }

  // Fallback to test mode if provider not configured
  console.warn(`⚠️  SMS provider not configured; logging SMS instead`);
  const logEntry = `[${new Date().toISOString()}] SMS to ${to}: ${message}\n`;
  console.log(`📱 [TEST MODE] SMS would be sent:`);
  console.log(`   To: ${to}`);
  console.log(`   Message: ${message}`);

  // Also save to file for reference
  try {
    fs.appendFileSync('sms_logs.txt', logEntry);
    console.log(`✅ SMS logged to sms_logs.txt`);
  } catch (e) {
    console.error(`❌ Error writing SMS log:`, e.message);
  }
}

// ----- Routes -----

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Smart Panchayat backend running' });
});

// Signup - create user in DB
app.post('/api/signup', async (req, res) => {
  try {
    const { username, email, phone, password } = req.body || {};

    if (!username || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await User.create({
      username,
      email,
      phone,
      password_hash: passwordHash,
      // init new fields
      viewedSchemes: false,
      lastActiveAt: new Date()
    });

    return res.json({ success: true, message: 'Account created successfully. Please login.' });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Forgot Password - reset password
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body || {};

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email and new password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No user found with that email' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.password_hash = passwordHash;
    await user.save();

    // Send confirmation email asynchronously (non-fatal)
    sendPasswordResetEmail({ to: email, username: user.username }).catch((err) => {
      console.error('Password reset email error:', err?.message || err);
    });

    return res.json({ success: true, message: 'Password has been reset successfully. Please login with your new password.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// User activity tracking - scheme view
app.post('/api/user/activity/scheme-view', async (req, res) => {
  try {
    const { username, schemeName } = req.body;
    if (!username) return res.status(400).json({ success: false, message: 'Username required' });

    // Update User model
    await User.findOneAndUpdate(
      { username },
      { viewedSchemes: true, lastActiveAt: new Date() }
    );

    // Update SchemeStats model if schemeName provided
    if (schemeName) {
      await SchemeStats.findOneAndUpdate(
        { schemeName },
        { $addToSet: { interestedUsers: username } },
        { upsert: true, new: true }
      );
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Activity tracking error:', err);
    return res.status(500).json({ success: false });
  }
});

// User activity tracking - scheme applied click
app.post('/api/schemes/apply-click', async (req, res) => {
  try {
    const { username, schemeName } = req.body;
    if (!username || !schemeName) {
      return res.status(400).json({ success: false, message: 'Username and schemeName required' });
    }

    await SchemeStats.findOneAndUpdate(
      { schemeName },
      {
        $addToSet: { appliedUsers: username }
      },
      { upsert: true, new: true }
    );

    return res.json({ success: true, message: 'Marked as applied' });
  } catch (err) {
    console.error('Apply tracking error:', err);
    return res.status(500).json({ success: false });
  }
});

// Admin stats - users viewing vs applying
app.get('/api/admin/users/stats', async (req, res) => {
  try {
    // 1. Get all users
    const allUsers = await User.find({}, 'username email phone viewedSchemes created_at lastActiveAt');

    // 2. Get all applications to determine who has applied
    const applications = await Application.find({}, 'details.user applicantName');

    // Create a set of usernames who have applied
    // Note: application.details.user stores the username
    const applicantUsernames = new Set();
    applications.forEach(app => {
      if (app.details && app.details.user) {
        applicantUsernames.add(app.details.user);
      }
    });

    // 3. Categorize users
    const viewersOnly = []; // Users who viewed schemes but have NEVER applied
    const applicants = [];  // Users who have applied (regardless of viewing)

    allUsers.forEach(user => {
      const hasApplied = applicantUsernames.has(user.username);

      if (hasApplied) {
        // Find how many apps they submitted
        const appCount = applications.filter(a => a.details && a.details.user === user.username).length;
        applicants.push({
          username: user.username,
          phone: user.phone,
          email: user.email,
          applicationCount: appCount,
          lastActive: user.lastActiveAt
        });
      } else if (user.viewedSchemes) {
        // Only viewed, never applied
        viewersOnly.push({
          username: user.username,
          phone: user.phone,
          email: user.email,
          lastActive: user.lastActiveAt
        });
      }
    });

    return res.json({
      success: true,
      viewers: viewersOnly,
      applicants: applicants
    });

  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Login - validate user, send email + SMS, return user info (password-based)
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Trigger email + SMS asynchronously; don't block response
    sendLoginEmail({ to: user.email, username: user.username }).catch((err) => {
      console.error('Email send error:', err.message);
    });
    // Expect phone numbers to include country code, e.g. +91XXXXXXXXXX
    console.log(`📱 Triggering SMS for user: ${user.username}, phone: ${user.phone}`);
    sendLoginSMS({ to: user.phone, username: user.username }).catch((err) => {
      console.error('SMS send error:', err.message);
    });

    return res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Admin registration
app.post('/api/admin/register', async (req, res) => {
  try {
    const { username, password, email, phone } = req.body || {};

    if (!username || !password || !email || !phone) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const existing = await Admin.findOne({ username });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Admin username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await Admin.create({
      username,
      password_hash: passwordHash,
      email,
      phone
    });

    return res.json({ success: true, message: 'Admin account created successfully. Please login.' });
  } catch (err) {
    console.error('Admin signup error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const passwordOk = await bcrypt.compare(password, admin.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    return res.json({
      success: true,
      message: 'Admin login successful',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get all applications (admin only)
app.get('/api/admin/applications', async (req, res) => {
  try {
    // In a real app, verify admin session/token here
    // For now, we'll return all applications from database (optional feature)
    const applications = await Application.find().sort({ submittedAt: -1 });
    return res.json({
      success: true,
      message: 'Applications retrieved',
      applications // return data if available
    });
  } catch (err) {
    console.error('Get applications error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get all users (admin only)
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username email phone created_at createdAt _id').sort({ createdAt: -1, created_at: -1 });
    return res.json({ success: true, users });
  } catch (err) {
    console.error('Get all users error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get scheme tracking stats (admin only)
app.get('/api/admin/scheme-tracking', async (req, res) => {
  try {
    const stats = await SchemeStats.find();

    const formattedStats = stats.map(s => ({
      schemeName: s.schemeName,
      schemeType: 'Government Scheme',
      clicks: (s.interestedUsers ? s.interestedUsers.length : 0) + (s.appliedUsers ? s.appliedUsers.length : 0),
      viewedBy: s.interestedUsers || [],
      appliedBy: s.appliedUsers || []
    }));

    return res.json({ success: true, stats: formattedStats });
  } catch (err) {
    console.error('Scheme stats error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Update application status (admin only)
app.post('/api/admin/applications/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message } = req.body || {};

    if (!status || !['Approved', 'Rejected', 'Pending', 'Under Review', 'Under Process'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Valid status is required' });
    }

    // Try to update actual DB if id is a valid mongo ID
    let updatedApp = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      const updateData = { status };
      if (message !== undefined) {
        updateData.adminRemark = message;
      }
      updatedApp = await Application.findByIdAndUpdate(id, updateData, { new: true });
    }

    // Trigger email notification if user exists
    if (updatedApp && updatedApp.details && updatedApp.details.user && updatedApp.details.user !== 'guest') {
      User.findOne({ username: updatedApp.details.user }).then(userDoc => {
        if (userDoc && userDoc.email) {
          sendApplicationStatusEmail({
            to: userDoc.email,
            username: userDoc.username,
            scheme: updatedApp.scheme,
            status: updatedApp.status,
            adminRemark: updatedApp.adminRemark
          });
        }
      }).catch(err => console.error('Error fetching user for status email:', err));
    }

    return res.json({
      success: true,
      message: `Application status updated to ${status}`,
      applicationId: id,
      status: status
    });
  } catch (err) {
    console.error('Update application status error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Submit a new application
app.post('/api/applications', async (req, res) => {
  try {
    // We expect: applicantName, scheme (or type), details object, status (optional)
    const { applicantName, scheme, details, username } = req.body;

    if (!applicantName || !scheme) {
      return res.status(400).json({ success: false, message: 'Applicant Name and Scheme are required' });
    }

    const newApp = await Application.create({
      applicantName,
      scheme,
      status: 'Pending',
      submittedAt: new Date(),
      details: {
        ...details,
        user: username // Store username in details for filtering later
      }
    });

    // Send registration email
    if (username && username !== 'guest') {
      User.findOne({ username }).then(userDoc => {
        if (userDoc && userDoc.email) {
          sendApplicationRegistrationEmail({
            to: userDoc.email,
            username: userDoc.username,
            scheme,
            details
          });
        }
      }).catch(err => console.error('Error fetching user for registration email:', err));
    }

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      applicationId: newApp._id
    });

  } catch (err) {
    console.error('Submit application error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get applications for a specific user
app.get('/api/applications', async (req, res) => {
  try {
    const { username } = req.query;
    let query = {};

    if (username) {
      // Filter by username stored in details.user
      query = { "details.user": username };
    }

    const apps = await Application.find(query).sort({ submittedAt: -1 });

    return res.json({
      success: true,
      applications: apps
    });

  } catch (err) {
    console.error('Get user applications error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ----- COMPLAINTS (Ticket System) -----

// Submit a new complaint
app.post('/api/complaints', async (req, res) => {
  try {
    const { applicantName, type, description, username } = req.body;

    if (!applicantName || !type || !description) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const complaintId = 'CMP-' + Date.now();
    const newComplaint = await Complaint.create({
      complaintId,
      applicantName,
      type,
      description,
      username: username || 'guest',
      status: 'Open'
    });

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      complaintId: newComplaint.complaintId
    });

  } catch (err) {
    console.error('Submit complaint error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get complaints for a specific user
app.get('/api/complaints', async (req, res) => {
  try {
    const { username } = req.query;
    let query = {};
    if (username) {
      query = { username };
    }

    const complaints = await Complaint.find(query).sort({ createdAt: -1 });
    return res.json({ success: true, complaints });
  } catch (err) {
    console.error('Get user complaints error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get all complaints (admin only)
app.get('/api/admin/complaints', async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    return res.json({ success: true, complaints });
  } catch (err) {
    console.error('Get all complaints error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Update complaint status (admin only)
app.post('/api/admin/complaints/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminResponse } = req.body || {};

    if (!status || !['Open', 'In Progress', 'Resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Valid status is required' });
    }

    // `id` is the `complaintId` field (CMP-XXXX)
    const updated = await Complaint.findOneAndUpdate(
      { complaintId: id },
      { status, adminResponse: adminResponse || '' },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    return res.json({
      success: true,
      message: `Complaint ticket updated successfully`,
      complaint: updated
    });
  } catch (err) {
    console.error('Update complaint status error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Fallback: serve index.html for root
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Smart Panchayat backend listening on http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser to use the app.`);
});

// Handle port conflicts with helpful error message
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ ERROR: Port ${PORT} is already in use!\n`);
    console.error('To fix this, run one of these commands:');
    console.error(`  1. bash kill-port.sh    (kills processes on ports 3000/4000)`);
    console.error(`  2. lsof -ti :${PORT} | xargs kill -9    (kills process on port ${PORT})`);
    console.error(`  3. Change PORT in .env file to a different number\n`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});


