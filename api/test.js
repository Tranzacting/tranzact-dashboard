module.exports = async (req) => {
  console.log("Test endpoint called");
  return new Response(JSON.stringify({
    message: "Test endpoint works",
    timestamp: new Date().toISOString()
  }), {
    headers: { "Content-Type": "application/json" },
    status: 200
  });
};
