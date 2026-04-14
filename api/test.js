module.exports = async (req, res) => {
  console.log("Test endpoint called");
  res.status(200).json({
    message: "Test endpoint works",
    timestamp: new Date().toISOString()
  });
};
