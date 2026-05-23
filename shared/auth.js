export const getUser = () => {
  try {
    const raw = localStorage.getItem("user");
    if (raw && raw !== "undefined") return JSON.parse(raw);
  } catch (e) {
    console.error("Corrupted user state, clearing...", e);
    localStorage.clear();
  }
  return {};
};

export const getToken = () => localStorage.getItem("token");

export const isAuthenticated = () => !!getToken();

export const logout = (navigate) => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  if (navigate) navigate("/login");
  else window.location.href = "/login";
};

export const setSession = (token, user) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};
