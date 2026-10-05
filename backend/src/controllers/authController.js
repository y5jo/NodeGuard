import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Incident from '../models/Incident.js';
import ChainOfCustodyLog from '../models/ChainOfCustodyLog.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_change_in_production';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Authentication error: ${error.message}` });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide both current and new passwords.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password successfully updated.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Failed to update password: ${error.message}` });
  }
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with that email already exists.' });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: role === 'ANALYST' ? 'ANALYST' : 'INVESTIGATOR',
    });

    return res.status(201).json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Registration failed: ${error.message}` });
  }
};

export const getUsers = async (req, res) => {
  try {
    const [users, assignmentCounts] = await Promise.all([
      User.find({ isActive: true }).select('name email role createdAt').sort({ createdAt: -1 }).lean(),
      Incident.aggregate([
        { $match: { assignedTo: { $ne: null } } },
        { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
      ]),
    ]);
    const countsByUserId = new Map(assignmentCounts.map(({ _id, count }) => [String(_id), count]));
    return res.status(200).json({
      success: true,
      users: users.map((user) => ({ ...user, assignedCaseCount: countsByUserId.get(String(user._id)) || 0 })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deactivateUser = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: { $in: ['INVESTIGATOR', 'ANALYST'] }, isActive: true });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Active investigator account not found.' });
    }

    user.isActive = false;
    await user.save();

    const assignedIncidents = await Incident.find({ assignedTo: user._id });
    if (assignedIncidents.length > 0) {
      await Incident.updateMany({ assignedTo: user._id }, { $set: { assignedTo: null } });

      await Promise.all(
        assignedIncidents.map((incident) =>
          ChainOfCustodyLog.create({
            incidentId: incident._id,
            evidenceFileId: null,
            performedBy: req.user?.id || null,
            action: 'CUSTODY_TRANSFER',
            details: `Staff member ${user.name} (${user.email}) deactivated by Admin ${req.user?.name || req.user?.email || 'Admin'}. Case unassigned and returned to intake pool.`,
            ipAddress: req.ip || '127.0.0.1',
          })
        )
      );
    }

    return res.status(200).json({ success: true, message: 'Staff account deactivated.' });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Invalid staff account ID.' });
  }
};

export default {
  login,
  changePassword,
  register,
  getUsers,
  deactivateUser,
};
