const { stateOptions } = require("../config/data");

// Get all airlines without pagination, sorting, and search
const getAllStates = async (req, res, next) => {
  try {
    res.status(200).json(stateOptions);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch states",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getAllStates,
};
