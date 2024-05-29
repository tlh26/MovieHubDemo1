// backend/users/users.controller.js
const userService = require('./users.services');

// exports.getUserProfile = async (req, res) => {
//     const userId = req.params.userId;
//     try {
//         const user = await userService.getUserProfile(userId);
//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }
//         res.json(user);
//     } catch (error) {
//         res.status(500).json({ message: 'Error retrieving user profile', error });
//     }
// };

exports.getUserProfile = async (req, res) => {
    console.log('getUserProfile called');
    try {
        const userId = req.params.id;
        console.log(`Fetching user profile for ID: ${userId}`);
        const userProfile = await userService.getUserProfile(userId);

        if (userProfile) {
            res.status(200).json(userProfile);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};


exports.updateUserProfile = async (req, res) => {
    const userId = req.params.id;
    const updates = req.body;
    try {
        const updatedUser = await userService.updateUserProfile(userId, updates);
        if (updatedUser) {
            res.status(200).json(updatedUser);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

exports.deleteUserProfile = async (req, res) => {
    try {
        const result = await userService.deleteUserProfile(req.params.id);
        if (result) {
            res.status(200).json({ message: 'User deleted successfully' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user profile', error: error.message });
    }
};