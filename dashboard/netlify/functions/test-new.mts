export default async (req: Request): Promise<Response> => {
  return new Response(JSON.stringify({ test: "new function" }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/test-new" };
