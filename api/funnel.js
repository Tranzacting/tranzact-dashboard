export default async (req) => {
  return new Response(JSON.stringify({ status: "ok", time: new Date().toISOString() }), {
    headers: { "Content-Type": "application/json" }
  });
};
