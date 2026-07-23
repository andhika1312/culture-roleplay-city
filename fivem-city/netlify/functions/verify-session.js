const { requireAuth } = require('./_auth');
const { json, handleOptions } = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();

  const auth = requireAuth(event, ['founder', 'dev', 'admin']);
  if (!auth.ok) return json(auth.status, { error: auth.message });

  return json(200, {
    user: {
      username: auth.user.username,
      role: auth.user.role,
      display_name: auth.user.display_name
    }
  });
};
