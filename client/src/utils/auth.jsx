import api from "../services/api";

export const registerUser = (data) => {
  return api.post("/auth/register/", data);
};

export const loginUser = async (data) => {
  const res = await api.post("/auth/login/", data);
  localStorage.setItem("token", res.data.access);
  return res;
};

export const isAuthenticated = () => {
  return !!localStorage.getItem("token");
};

export const logoutUser = () => {
  localStorage.removeItem("token");
};
