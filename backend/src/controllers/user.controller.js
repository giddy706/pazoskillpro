const { asyncHandler } = require('../utils/asyncHandler');
const { success, error } = require('../utils/response');
const { NotFoundError } = require('../utils/errors');
const userService = require('../services/user.service');

exports.listUsers = asyncHandler(async (req, res) => {
    const users = await userService.listAll();
    return success(res, { users });
});

exports.updateRole = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    const user = await userService.updateRole(id, role);
    return success(res, { user, message: 'Role updated' });
});

exports.remove = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await userService.remove(id);
    return success(res, { message: 'User deleted' });
});
