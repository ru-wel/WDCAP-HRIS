import * as usersService from "../services/users.service.js";

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await usersService.getAllUsers(req.user);
    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const actorId = req.user.id;

    const updated = await usersService.updateUserByEmployeeId(employeeId, req.body, actorId);

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const actorId = req.user.id;

    const deleted = await usersService.deleteUserByEmployeeId(employeeId, actorId);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
};
